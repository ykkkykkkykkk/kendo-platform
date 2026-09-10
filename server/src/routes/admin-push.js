// 어드민 푸시 발송 (관리자 전용).
//
// 질문·댓글 같은 이벤트 알림은 notify()가 자동으로 보낸다. 여기는 사람이 직접 쏘는 쪽 —
// 대회 공지, 대진표 발표, 픽 마감 임박처럼 코드가 알 수 없는 소식이다.
//
// 전체 발송은 되돌릴 수 없다. 그래서
//  1) 보내기 전에 대상 수를 먼저 알려주고(estimate),
//  2) 보낸 내용은 전부 push_broadcasts에 남긴다.
import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { serverError } from '../utils/apiError.js';
import { sendPushToUsers, subscriptionsOf } from '../utils/push.js';

const router = Router();
router.use(requireAdmin);

// 팔로워 수를 채우려고 만든 시드 계정(가라팬)은 대상에서 뺀다 — 알림함만 더럽힌다.
const NOT_SEED = "(u.phone IS NULL OR u.phone NOT LIKE '검도팬_%')";

const TARGETS = ['all', 'players', 'fans', 'player_followers', 'user'];

/** 발송 대상 회원 id 목록과 사람이 읽을 대상 이름. */
async function resolveTargets({ target, playerId, userId }) {
  if (target === 'player_followers') {
    const id = Number(playerId);
    if (!id) throw new Error('선수를 선택해주세요.');
    const { rows: [p] } = await db.execute({
      sql: 'SELECT name FROM players WHERE id = ?', args: [id],
    });
    if (!p) throw new Error('없는 선수입니다.');
    const { rows } = await db.execute({
      sql: `SELECT f.user_id AS id FROM follows f
            JOIN users u ON u.id = f.user_id
            WHERE f.player_id = ? AND ${NOT_SEED}`,
      args: [id],
    });
    return { ids: rows.map((r) => r.id), label: `${p.name} 선수 팬`, ref: id };
  }

  if (target === 'user') {
    const id = Number(userId);
    if (!id) throw new Error('회원을 선택해주세요.');
    const { rows: [u] } = await db.execute({
      sql: 'SELECT id, nickname FROM users WHERE id = ?', args: [id],
    });
    if (!u) throw new Error('없는 회원입니다.');
    return { ids: [u.id], label: `${u.nickname}(#${u.id})`, ref: u.id };
  }

  const where =
    target === 'players' ? "u.role = 'player'"
    : target === 'fans'  ? `u.role != 'player' AND ${NOT_SEED}`
    : NOT_SEED;                                   // all
  const label =
    target === 'players' ? '선수 계정 전체'
    : target === 'fans'  ? '팬 회원 전체'
    : '전체 회원';

  const { rows } = await db.execute(`SELECT u.id FROM users u WHERE ${where}`);
  return { ids: rows.map((r) => r.id), label, ref: null };
}

// GET /api/admin/push/stats — 알림을 켠 사람이 얼마나 되는지
router.get('/push/stats', async (_req, res) => {
  try {
    const { rows: [s] } = await db.execute(
      'SELECT COUNT(*) AS devices, COUNT(DISTINCT user_id) AS users FROM push_subscriptions'
    );
    const { rows: [m] } = await db.execute(
      `SELECT COUNT(*) AS members,
              SUM(CASE WHEN role = 'player' THEN 1 ELSE 0 END) AS players
       FROM users u WHERE ${NOT_SEED}`
    );
    res.json({
      devices: s.devices ?? 0,
      users:   s.users   ?? 0,
      members: m.members ?? 0,
      players: m.players ?? 0,
    });
  } catch (e) { serverError(res, e, 'push-stats'); }
});

// GET /api/admin/push/estimate?target=all — 보내기 전에 대상 수를 확인한다
router.get('/push/estimate', async (req, res) => {
  try {
    const target = req.query.target ?? 'all';
    if (!TARGETS.includes(target)) return res.status(400).json({ error: '잘못된 대상입니다.' });

    const { ids, label } = await resolveTargets({
      target, playerId: req.query.playerId, userId: req.query.userId,
    });
    const devices = ids.length ? (await subscriptionsOf(ids)).length : 0;
    res.json({ label, userCount: ids.length, deviceCount: devices });
  } catch (e) {
    // resolveTargets가 던지는 건 입력이 잘못된 경우다 (없는 선수·회원 등)
    return res.status(400).json({ error: e.message ?? '대상을 확인하지 못했습니다.' });
  }
});

/* GET /api/admin/push/user-search?q=닉네임 — 테스트 발송 대상 고르기.
 * 회원 관리 화면에는 회원 번호가 안 보인다. 번호를 외워서 넣으라고 할 수 없으니
 * 닉네임으로 찾아 고르게 한다. 알림 켠 기기 수를 같이 보여줘야
 * '보냈는데 안 오는' 계정을 고르는 일이 없다. */
router.get('/push/user-search', async (req, res) => {
  try {
    const q = (req.query.q ?? '').trim();
    if (!q) return res.json([]);
    const like = `%${q}%`;
    const { rows } = await db.execute({
      sql: `SELECT u.id, u.nickname, u.role, u.home_dojo, d.name AS dojo_name,
                   (SELECT COUNT(*) FROM push_subscriptions s WHERE s.user_id = u.id) AS devices
            FROM users u
            LEFT JOIN dojos d ON d.id = u.dojo_id
            WHERE ${NOT_SEED} AND (u.nickname LIKE ? OR u.username LIKE ?)
            ORDER BY devices DESC, u.nickname
            LIMIT 20`,
      args: [like, like],
    });
    res.json(rows);
  } catch (e) { serverError(res, e, 'push-user-search'); }
});

// GET /api/admin/push/broadcasts — 발송 이력
router.get('/push/broadcasts', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const { rows } = await db.execute({
      sql: 'SELECT * FROM push_broadcasts ORDER BY id DESC LIMIT ?', args: [limit],
    });
    res.json(rows);
  } catch (e) { serverError(res, e, 'push-broadcasts'); }
});

/** 알림함에도 남긴다. 한 건씩 넣으면 수백 번 왕복하므로 묶어서 넣는다. */
async function saveToInbox(ids, { body, link }) {
  const CHUNK = 100;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const part = ids.slice(i, i + CHUNK);
    await db.execute({
      sql: `INSERT INTO notifications (user_id, type, message, link)
            VALUES ${part.map(() => '(?, ?, ?, ?)').join(', ')}`,
      args: part.flatMap((id) => [id, 'admin_notice', body, link ?? null]),
    });
  }
}

// POST /api/admin/push/send — 실제 발송
router.post('/push/send', async (req, res) => {
  try {
    const title = (req.body?.title ?? '').trim();
    const body  = (req.body?.body  ?? '').trim();
    const link  = (req.body?.link  ?? '').trim() || '/';
    const target = req.body?.target ?? 'all';
    const saveInbox = req.body?.saveInbox === true;

    if (!title) return res.status(400).json({ error: '제목을 입력해주세요.' });
    if (!body)  return res.status(400).json({ error: '내용을 입력해주세요.' });
    // 잠금화면은 두 줄쯤에서 잘린다. 길면 뒤가 안 보이니 아예 막는다.
    if (title.length > 40) return res.status(400).json({ error: '제목은 40자까지입니다.' });
    if (body.length > 120) return res.status(400).json({ error: '내용은 120자까지입니다.' });
    if (!link.startsWith('/')) return res.status(400).json({ error: '링크는 /로 시작하는 앱 안 주소여야 합니다.' });
    if (!TARGETS.includes(target)) return res.status(400).json({ error: '잘못된 대상입니다.' });

    let resolved;
    try {
      resolved = await resolveTargets({ target, playerId: req.body?.playerId, userId: req.body?.userId });
    } catch (e) { return res.status(400).json({ error: e.message }); }

    const { ids, label, ref } = resolved;
    if (!ids.length) return res.status(400).json({ error: '보낼 대상이 없습니다.' });

    const devices = (await subscriptionsOf(ids)).length;
    if (!devices && !saveInbox)
      return res.status(400).json({ error: '대상 중 알림을 켠 기기가 없습니다.' });

    const { lastInsertRowid } = await db.execute({
      sql: `INSERT INTO push_broadcasts
              (title, body, link, target, target_ref, target_label, user_count, device_count, save_inbox)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [title, body, link, target, ref, label, ids.length, devices, saveInbox ? 1 : 0],
    });
    const logId = Number(lastInsertRowid);

    // 기기가 많으면 발송에 몇십 초가 걸린다. 어드민 화면을 붙잡아 두지 않고
    // 이력 행에 결과를 적는다 — 화면은 이력을 다시 불러 상태를 본다.
    res.json({ ok: true, id: logId, userCount: ids.length, deviceCount: devices, label });

    (async () => {
      try {
        if (saveInbox) await saveToInbox(ids, { body, link });
        // 공지는 저마다 다른 소식이라 링크가 같아도 합쳐지면 안 된다 (발송 번호로 구분)
        const stats = await sendPushToUsers(ids, { title, body, link, tag: `notice-${logId}` });
        await db.execute({
          sql: `UPDATE push_broadcasts
                SET sent = ?, failed = ?, removed = ?, device_count = ?,
                    status = 'done', finished_at = datetime('now')
                WHERE id = ?`,
          args: [stats.sent, stats.failed, stats.removed, stats.devices, logId],
        });
        console.log(`[push] 브로드캐스트 #${logId} 완료 — 성공 ${stats.sent} / 실패 ${stats.failed}`);
      } catch (e) {
        console.error('[push] 브로드캐스트 실패', e);
        await db.execute({
          sql: `UPDATE push_broadcasts SET status = 'error', error = ?, finished_at = datetime('now')
                WHERE id = ?`,
          args: [String(e.message ?? e).slice(0, 300), logId],
        }).catch(() => {});
      }
    })();
  } catch (e) { serverError(res, e, 'push-send'); }
});

export default router;
