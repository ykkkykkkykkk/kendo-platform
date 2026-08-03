import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { findSimilarAccounts } from '../utils/similarNickname.js';
import { touchLastSeen, clientIp } from '../middleware/auth.js';
import { serverError } from '../utils/apiError.js';

const router = Router();

// POST /api/auth/register — 팬 가입/로그인
// body: { nickname, phone, home_dojo? }
router.post('/register', async (req, res) => {
  const { nickname, phone, home_dojo } = req.body;
  if (!nickname?.trim())
    return res.status(400).json({ error: '닉네임을 입력해주세요.' });
  if (!phone || !/^\d{4}$/.test(phone))
    return res.status(400).json({ error: '휴대폰 끝 4자리를 숫자로 입력해주세요.' });

  const trimmedNick = nickname.trim().slice(0, 10);
  const phoneKey    = `${trimmedNick}_${phone}`;

  const { rows: [existing] } = await db.execute({
    sql:  'SELECT * FROM users WHERE phone = ?',
    args: [phoneKey],
  });

  let user = existing;
  if (!user) {
    // 새 계정이 생기는 순간이다. 예전에는 여기서 조용히 만들어버려서,
    // 닉네임이나 번호를 한 글자만 잘못 입력해도 기존 계정에 못 들어가고
    // 계정이 하나 더 생겼다(픽·팔로우가 그대로 남겨진 채로).
    // 그래서 확인을 받고, 비슷한 기존 계정이 있으면 알려준다.
    if (!req.body.confirm_new) {
      const { rows: others } = await db.execute(
        "SELECT nickname, phone FROM users WHERE phone NOT LIKE '검도팬_%'"
      );
      return res.status(409).json({
        error: '처음 오신 것 같습니다. 새 계정을 만들까요?',
        new_account: true,
        nickname: trimmedNick,
        suggestions: findSimilarAccounts(trimmedNick, phone, others),
      });
    }

    await db.execute({
      sql:  'INSERT INTO users (phone, nickname, home_dojo, signup_ip) VALUES (?, ?, ?, ?)',
      args: [phoneKey, trimmedNick, home_dojo?.trim() || null, clientIp(req)],
    });
    const { rows: [newUser] } = await db.execute({
      sql:  'SELECT * FROM users WHERE phone = ?',
      args: [phoneKey],
    });
    user = newUser;
  }

  touchLastSeen(user.id, clientIp(req));

  const token = jwt.sign(
    { userId: user.id, nickname: user.nickname, role: user.role ?? 'fan' },
    process.env.JWT_SECRET,
    { expiresIn: '365d' },
  );

  res.json({ token, user });
});

// POST /api/auth/player-login — 선수 로그인
// body: { username, password }
router.post('/player-login', async (req, res) => {
  const { username, password } = req.body;
  if (!username?.trim() || !password)
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });

  const { rows: [user] } = await db.execute({
    sql:  "SELECT * FROM users WHERE username = ? AND role = 'player'",
    args: [username.trim()],
  });

  if (!user || !user.password_hash)
    return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid)
    return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });

  touchLastSeen(user.id, clientIp(req));

  const token = jwt.sign(
    { userId: user.id, nickname: user.nickname, role: 'player', playerId: user.player_id },
    process.env.JWT_SECRET,
    { expiresIn: '90d' },
  );

  res.json({ token, user });
});

/* ══════════════ 카카오 로그인 ══════════════
 *
 * 닉네임+휴대폰 끝 4자리 방식은 본인 확인이 안 돼 같은 사람이 계정을 몇 개든 만들 수 있었다.
 * 카카오는 회원 고유번호를 주므로 kakao_id를 UNIQUE로 묶으면 중복 가입이 원천 차단된다.
 *
 * 흐름
 *   1) 클라이언트가 카카오 SDK로 access token을 받아 /kakao 로 보낸다
 *   2) 서버가 그 토큰으로 카카오에 직접 물어 신원을 확인한다 (클라이언트 말을 믿지 않는다)
 *   3) kakao_id가 이미 있으면 바로 로그인
 *      없으면 needs_choice를 돌려주고, 클라이언트가 '새로 시작' / '기존 계정 연결'을 묻는다
 *   4) 새로 시작 → /kakao/signup,  기존 계정 연결 → /kakao/link
 */

// 테스트에서 가짜 카카오 서버로 바꿔 끼울 수 있게 env로 뺀다. 평소에는 진짜 카카오다.
const KAKAO_API = process.env.KAKAO_API_BASE ?? 'https://kapi.kakao.com';
const KAKAO_ME  = `${KAKAO_API}/v2/user/me`;

/** 액세스 토큰으로 카카오에 신원을 확인한다. 위조 토큰은 여기서 걸린다. */
async function verifyKakao(accessToken) {
  const r = await fetch(KAKAO_ME, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) return null;
  const data = await r.json();
  if (!data?.id) return null;
  return {
    kakaoId:  String(data.id),           // 숫자로 오지만 크기 때문에 문자열로 다룬다
    nickname: data.properties?.nickname
           ?? data.kakao_account?.profile?.nickname
           ?? null,
  };
}

const signFan = (user) => jwt.sign(
  { userId: user.id, nickname: user.nickname, role: user.role ?? 'fan', playerId: user.player_id ?? null },
  process.env.JWT_SECRET,
  { expiresIn: '365d' },
);

// POST /api/auth/kakao — 카카오 로그인 (기존 연결 계정이 있으면 바로 입장)
router.post('/kakao', async (req, res) => {
  try {
    const info = await verifyKakao(req.body?.accessToken);
    if (!info) return res.status(401).json({ error: '카카오 인증에 실패했습니다. 다시 시도해주세요.' });

    const { rows: [user] } = await db.execute({
      sql: 'SELECT * FROM users WHERE kakao_id = ?', args: [info.kakaoId],
    });

    if (user) {
      touchLastSeen(user.id, clientIp(req));
      delete user.password_hash;
      return res.json({ token: signFan(user), user });
    }

    // 처음 보는 카카오 계정. 새로 만들지, 쓰던 계정에 붙일지 물어봐야 한다.
    res.json({ needs_choice: true, kakao_nickname: info.nickname });
  } catch (e) { serverError(res, e, 'kakao-login'); }
});

// POST /api/auth/kakao/signup — 카카오로 새 계정 만들기
// body: { accessToken, nickname?, home_dojo? }
router.post('/kakao/signup', async (req, res) => {
  try {
    const info = await verifyKakao(req.body?.accessToken);
    if (!info) return res.status(401).json({ error: '카카오 인증에 실패했습니다. 다시 시도해주세요.' });

    // 이미 만들어져 있으면 그대로 로그인시킨다 (버튼 두 번 눌러도 계정이 두 개 생기지 않게)
    const { rows: [dup] } = await db.execute({
      sql: 'SELECT * FROM users WHERE kakao_id = ?', args: [info.kakaoId],
    });
    if (dup) {
      touchLastSeen(dup.id, clientIp(req));
      delete dup.password_hash;
      return res.json({ token: signFan(dup), user: dup });
    }

    const nickname = (req.body?.nickname ?? info.nickname ?? '검도팬').trim().slice(0, 10);
    if (!nickname) return res.status(400).json({ error: '닉네임을 입력해주세요.' });

    const ip = clientIp(req);
    await db.execute({
      sql: `INSERT INTO users (nickname, home_dojo, kakao_id, signup_ip, last_ip, last_seen_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      args: [nickname, req.body?.home_dojo?.trim() || null, info.kakaoId, ip, ip],
    });
    const { rows: [created] } = await db.execute({
      sql: 'SELECT * FROM users WHERE kakao_id = ?', args: [info.kakaoId],
    });

    delete created.password_hash;
    res.json({ token: signFan(created), user: created, created: true });
  } catch (e) { serverError(res, e, 'kakao-signup'); }
});

// POST /api/auth/kakao/link — 쓰던 계정을 카카오에 연결
// body: { accessToken, nickname, phone }  ← 예전 로그인 정보 그대로
router.post('/kakao/link', async (req, res) => {
  try {
    const { nickname, phone } = req.body ?? {};
    const info = await verifyKakao(req.body?.accessToken);
    if (!info) return res.status(401).json({ error: '카카오 인증에 실패했습니다. 다시 시도해주세요.' });

    if (!nickname?.trim() || !/^\d{4}$/.test(phone ?? ''))
      return res.status(400).json({ error: '쓰시던 닉네임과 휴대폰 끝 4자리를 입력해주세요.' });

    // 이 카카오 계정이 이미 다른 계정에 물려 있으면 막는다
    const { rows: [already] } = await db.execute({
      sql: 'SELECT nickname FROM users WHERE kakao_id = ?', args: [info.kakaoId],
    });
    if (already)
      return res.status(409).json({ error: `이 카카오 계정은 이미 '${already.nickname}'에 연결돼 있습니다.` });

    const phoneKey = `${nickname.trim().slice(0, 10)}_${phone}`;
    const { rows: [target] } = await db.execute({
      sql: 'SELECT * FROM users WHERE phone = ?', args: [phoneKey],
    });
    if (!target)
      return res.status(404).json({ error: '그 정보로 가입된 계정이 없습니다. 닉네임과 번호를 다시 확인해주세요.' });
    if (target.kakao_id)
      return res.status(409).json({ error: '이 계정은 이미 다른 카카오 계정에 연결돼 있습니다.' });

    const ip = clientIp(req);
    await db.execute({
      sql: `UPDATE users SET kakao_id = ?, kakao_linked_at = datetime('now'),
                             last_ip = ?, last_seen_at = datetime('now')
            WHERE id = ?`,
      args: [info.kakaoId, ip, target.id],
    });
    const { rows: [linked] } = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?', args: [target.id],
    });

    delete linked.password_hash;
    res.json({ token: signFan(linked), user: linked, linked: true });
  } catch (e) { serverError(res, e, 'kakao-link'); }
});

export default router;
