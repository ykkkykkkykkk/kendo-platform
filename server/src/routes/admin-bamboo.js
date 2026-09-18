// 관리자 — 죽도 신청 심사 · 어뷰징 확인.
//
// 죽도는 실제로 물건이 나가므로 자동 지급을 하지 않는다. 여기서 사람이 승인해야만 나간다.
//
// 어뷰징 표시는 전부 '표시'일 뿐 자동 차단이 아니다. 특히 같은 IP는 막지 않는다 —
// 도장 와이파이나 가정용 공유기를 쓰면 같은 도장 관원과 가족이 통째로 같은 IP로 잡힌다.
// 판단은 관리자가 한다.
import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { serverError } from '../utils/apiError.js';
import { GOAL, LIMITS, kstMonth, getProgress, syncWater } from '../utils/bamboo.js';

const router = Router();

/* 이 라우터는 신청자의 이름·연락처·배송지를 그대로 돌려준다. 인증이 빠지면
   주소록이 통째로 공개되고, 남의 신청을 아무나 승인할 수 있다. */
router.use(requireAdmin);

/** 설정값 읽기(월 지급 상한 등). 없으면 기본값. */
async function setting(key, fallback) {
  const { rows: [r] } = await db.execute({
    sql: 'SELECT value FROM bamboo_settings WHERE key = ?', args: [key],
  });
  return r?.value ?? fallback;
}

/** 이번 달 몇 자루가 나갔는지 (승인+발송 기준) */
async function monthlyIssued() {
  const month = kstMonth();
  const { rows: [r] } = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM shinai_requests
          WHERE status IN ('approved','shipped')
            AND strftime('%Y-%m', datetime(COALESCE(approved_at, created_at), '+9 hours')) = ?`,
    args: [month],
  });
  return Number(r?.n ?? 0);
}

// GET /api/admin/shinai/requests?status=pending
router.get('/shinai/requests', async (req, res) => {
  try {
    const status = String(req.query.status ?? 'pending');
    const where  = status === 'all' ? '' : 'WHERE r.status = ?';
    const args   = status === 'all' ? [] : [status];

    const { rows } = await db.execute({
      sql: `SELECT r.*, u.nickname, u.username, u.created_at AS user_created_at,
                   b.water, b.cycle, b.streak_days, b.started_at
            FROM shinai_requests r
            JOIN users u ON u.id = r.user_id
            LEFT JOIN bamboo_progress b ON b.user_id = r.user_id
            ${where}
            ORDER BY r.created_at DESC
            LIMIT 200`,
      args,
    });

    /* 중복 배송지·연락처 경고. 숫자·공백을 털어 비교한다 —
       '010-1234-5678'과 '01012345678'은 같은 번호이고, 주소는 띄어쓰기가 제각각이다. */
    const { rows: all } = await db.execute(
      `SELECT id, user_id, phone, address, status, created_at FROM shinai_requests`
    );
    const key = (r) => ({
      phone: String(r.phone ?? '').replace(/\D/g, ''),
      addr:  String(r.address ?? '').replace(/\s/g, ''),
    });
    const keyed = all.map((r) => ({ ...r, ...key(r) }));

    for (const r of rows) {
      const k = key(r);
      const samePhone = keyed.filter((x) => x.id !== r.id && x.phone && x.phone === k.phone);
      const sameAddr  = keyed.filter((x) => x.id !== r.id && x.addr  && x.addr  === k.addr);
      r.warn_phone   = samePhone.length;
      r.warn_address = sameAddr.length;
      r.warn_other_user = [...samePhone, ...sameAddr].some((x) => x.user_id !== r.user_id);
    }

    const limit  = Number(await setting('monthly_shinai_limit', '10'));
    const issued = await monthlyIssued();
    const { rows: [pend] } = await db.execute(
      "SELECT COUNT(*) AS n FROM shinai_requests WHERE status = 'pending'"
    );

    res.json({
      requests: rows,
      pending_count: Number(pend?.n ?? 0),
      monthly: { issued, limit, month: kstMonth(), over: issued >= limit },
    });
  } catch (e) { serverError(res, e, 'admin-shinai'); }
});

// PUT /api/admin/shinai/requests/:id — { status, note }
router.put('/shinai/requests/:id', async (req, res) => {
  try {
    const id     = Number(req.params.id);
    const status = String(req.body?.status ?? '');
    const note   = String(req.body?.note ?? '').trim().slice(0, 300) || null;

    if (!['approved', 'rejected', 'shipped'].includes(status))
      return res.status(400).json({ error: '상태가 올바르지 않습니다.' });

    const { rows: [r] } = await db.execute({
      sql: 'SELECT * FROM shinai_requests WHERE id = ?', args: [id],
    });
    if (!r) return res.status(404).json({ error: '신청을 찾을 수 없습니다.' });

    // 같은 상태로 다시 바꾸는 건 실패가 아니다(목록이 낡았거나 두 번 눌린 것)
    if (r.status === status) return res.json({ ok: true, already: true, request: r });

    if (status === 'approved') {
      const limit  = Number(await setting('monthly_shinai_limit', '10'));
      const issued = await monthlyIssued();
      if (issued >= limit && !req.body?.force)
        return res.status(409).json({
          error: `이번 달 지급 상한(${limit}자루)에 도달했습니다. 다음 달 대기로 두거나 상한을 올려주세요.`,
          code: 'monthly_limit', issued, limit,
        });
    }

    await db.execute({
      sql: `UPDATE shinai_requests
            SET status = ?, admin_note = ?,
                approved_at = CASE WHEN ? = 'approved' AND approved_at IS NULL
                                   THEN datetime('now') ELSE approved_at END,
                shipped_at  = CASE WHEN ? = 'shipped'  AND shipped_at  IS NULL
                                   THEN datetime('now') ELSE shipped_at END
            WHERE id = ?`,
      args: [status, note, status, status, id],
    });

    /* 발송이 확정되면 대나무를 리셋한다. 회차를 올리므로 물은 0부터 다시 시작하고,
       지난 기록은 water_logs에 그대로 남아 어뷰징 추적이 끊기지 않는다.
       1주 쿨다운 뒤에 다시 자란다. */
    if (status === 'shipped') {
      await getProgress(r.user_id);
      await db.execute({
        sql: `UPDATE bamboo_progress
              SET cycle = cycle + 1, water = 0, stage = 0, streak_days = 0,
                  completed_at = NULL, last_attendance_date = NULL,
                  cooldown_until = datetime('now', ?)
              WHERE user_id = ?`,
        args: [`+${LIMITS.cooldownDays} days`, r.user_id],
      });
    }

    const { rows: [updated] } = await db.execute({
      sql: 'SELECT * FROM shinai_requests WHERE id = ?', args: [id],
    });
    res.json({ ok: true, request: updated });
  } catch (e) { serverError(res, e, 'admin-shinai-update'); }
});

/* GET /api/admin/bamboo/abuse — 어뷰징 의심 목록.
   전부 '확인해 보라'는 신호일 뿐 자동으로 막지 않는다. */
router.get('/bamboo/abuse', async (_req, res) => {
  try {
    // 1) 짧은 응원 댓글을 반복하는 사람 (물은 안 나갔어도 도배는 도배다)
    const { rows: shortSpam } = await db.execute(`
      SELECT u.id, u.nickname, COUNT(*) AS n
      FROM post_comments c JOIN users u ON u.id = c.user_id
      WHERE length(trim(c.content)) < ${LIMITS.commentMinChars}
        AND c.created_at >= datetime('now', '-14 days')
      GROUP BY u.id HAVING n >= 5
      ORDER BY n DESC LIMIT 50
    `);

    // 2) 같은 IP에서 여러 명이 가입 — 표시만 한다(도장 와이파이가 흔하다)
    const { rows: sameIp } = await db.execute(`
      SELECT ip_hash, COUNT(DISTINCT invitee_id) AS n,
             GROUP_CONCAT(DISTINCT inviter_id) AS inviters
      FROM invites
      WHERE ip_hash IS NOT NULL
      GROUP BY ip_hash HAVING n >= 3
      ORDER BY n DESC LIMIT 50
    `);

    // 3) 비정상적으로 빠른 적립 — 하루에 받을 수 있는 최대치를 넘긴 날
    const maxPerDay = 2 + 1 * LIMITS.commentPerDay + 1 + 5;   // 출석+댓글+게시판+연속보너스
    const { rows: fast } = await db.execute({
      sql: `SELECT u.id, u.nickname,
                   date(datetime(w.created_at, '+9 hours')) AS day,
                   SUM(w.amount) AS got
            FROM water_logs w JOIN users u ON u.id = w.user_id
            WHERE w.revoked_at IS NULL AND w.source NOT IN ('pick','pick_bonus','invite')
            GROUP BY u.id, day
            HAVING got > ?
            ORDER BY got DESC LIMIT 50`,
      args: [maxPerDay],
    });

    // 4) 회수된 물이 많은 사람 (쓰고 지우기 반복)
    const { rows: revoked } = await db.execute(`
      SELECT u.id, u.nickname, COUNT(*) AS n, SUM(w.amount) AS points
      FROM water_logs w JOIN users u ON u.id = w.user_id
      WHERE w.revoked_at IS NOT NULL
      GROUP BY u.id HAVING n >= 3
      ORDER BY n DESC LIMIT 50
    `);

    res.json({
      short_comments: shortSpam,
      same_ip: sameIp,
      fast_water: fast,
      revoked: revoked,
      note: 'IP는 기록·표시만 합니다. 도장 와이파이·가정용 공유기 때문에 자동 차단하지 않습니다.',
    });
  } catch (e) { serverError(res, e, 'admin-bamboo-abuse'); }
});

// GET /api/admin/bamboo/settings · PUT — 월 지급 상한
router.get('/bamboo/settings', async (_req, res) => {
  try {
    const { rows } = await db.execute('SELECT key, value FROM bamboo_settings');
    res.json({
      settings: Object.fromEntries(rows.map((r) => [r.key, r.value])),
      monthly: { issued: await monthlyIssued(), month: kstMonth() },
      goal: GOAL,
    });
  } catch (e) { serverError(res, e, 'admin-bamboo-settings'); }
});

router.put('/bamboo/settings', async (req, res) => {
  try {
    const { key, value } = req.body ?? {};
    if (!['monthly_shinai_limit'].includes(String(key)))
      return res.status(400).json({ error: '바꿀 수 없는 설정입니다.' });
    const v = String(value ?? '').trim();
    if (!/^\d+$/.test(v)) return res.status(400).json({ error: '숫자를 입력해주세요.' });

    await db.execute({
      sql: `INSERT INTO bamboo_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      args: [key, v],
    });
    res.json({ ok: true, key, value: v });
  } catch (e) { serverError(res, e, 'admin-bamboo-settings-put'); }
});

export default router;
