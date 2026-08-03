import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { findSimilarAccounts } from '../utils/similarNickname.js';
import { touchLastSeen, clientIp } from '../middleware/auth.js';

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

export default router;
