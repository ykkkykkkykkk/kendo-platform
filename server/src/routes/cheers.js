import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { serverError } from '../utils/apiError.js';
import { notify } from '../utils/notify.js';
import { gradeInfo, TRUE_FAN_DAYS } from '../utils/fanGrade.js';

const router = Router();

/* 응원의 하루는 한국 자정에 끊는다. SQLite의 now는 UTC라 +9시간을 더해야
   한국 날짜가 나온다. 이 표현식이 여러 곳에 나오므로 상수로 둔다. */
const KST_TODAY = "date('now','+9 hours')";
/* 다음 한국 자정을 UTC 시각으로. 클라이언트는 이걸 받아 현지 시간으로 표시한다. */
const NEXT_RESET = `datetime(${KST_TODAY}, '+1 day', '-9 hours')`;

/** 이 사람이 이 선수를 며칠 응원했는지. */
async function cheerDays(userId, playerId) {
  const { rows: [r] } = await db.execute({
    sql:  'SELECT COUNT(*) AS n FROM fan_cheers WHERE user_id = ? AND player_id = ?',
    args: [userId, playerId],
  });
  return Number(r?.n ?? 0);
}

// ── GET /api/cheers/mine ─────────────────────────────────────
// 마이페이지용. 내가 응원한 선수별 누적 일수와 등급.
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.execute({
      sql: `SELECT player_id, COUNT(*) AS days
            FROM fan_cheers WHERE user_id = ?
            GROUP BY player_id`,
      args: [req.user.userId],
    });
    // { [playerId]: {days, grade, ...} } 형태가 화면에서 쓰기 편하다
    const out = {};
    for (const r of rows) out[r.player_id] = gradeInfo(Number(r.days));
    res.json(out);
  } catch (e) { serverError(res, e, 'cheers/mine'); }
});

// ── GET /api/cheers/player/fans ──────────────────────────────
// 선수 본인만. 나를 응원한 팬 목록.
// 닉네임과 등급만 내보낸다. 실명·연락처·이메일은 쿼리에 아예 넣지 않는다.
router.get('/player/fans', requireAuth, async (req, res) => {
  if (req.user.role !== 'player' || !req.user.playerId)
    return res.status(403).json({ error: '선수 계정만 볼 수 있습니다.' });

  try {
    const playerId = req.user.playerId;

    const { rows } = await db.execute({
      sql: `SELECT u.nickname,
                   COUNT(*) AS days,
                   MAX(CASE WHEN c.cheer_date = ${KST_TODAY} THEN 1 ELSE 0 END) AS today
            FROM fan_cheers c
            JOIN users u ON u.id = c.user_id
            WHERE c.player_id = ?
            GROUP BY c.user_id, u.nickname
            ORDER BY days DESC, u.nickname ASC`,
      args: [playerId],
    });

    const fans = rows.map((r) => ({
      nickname: r.nickname,
      today:    !!Number(r.today),
      ...gradeInfo(Number(r.days)),
    }));

    res.json({
      todayCount: fans.filter((f) => f.today).length,
      totalCount: fans.length,
      fans,
    });
  } catch (e) { serverError(res, e, 'cheers/player/fans'); }
});

// ── GET /api/cheers/:playerId/top ────────────────────────────
// 찐팬 명단(공개). 100일 이상 응원한 사람의 닉네임만, 오래 응원한 순.
router.get('/:playerId/top', async (req, res) => {
  try {
    const { rows } = await db.execute({
      sql: `SELECT u.nickname, COUNT(*) AS days
            FROM fan_cheers c
            JOIN users u ON u.id = c.user_id
            WHERE c.player_id = ?
            GROUP BY c.user_id, u.nickname
            HAVING days >= ?
            ORDER BY days DESC, u.nickname ASC
            LIMIT 50`,
      args: [req.params.playerId, TRUE_FAN_DAYS],
    });
    res.json(rows.map((r) => ({ nickname: r.nickname, days: Number(r.days) })));
  } catch (e) { serverError(res, e, 'cheers/top'); }
});

// ── GET /api/cheers/:playerId/me ─────────────────────────────
// 이 선수에 대한 내 응원 상태.
router.get('/:playerId/me', requireAuth, async (req, res) => {
  try {
    const playerId = req.params.playerId;

    const { rows: [row] } = await db.execute({
      sql: `SELECT (SELECT COUNT(*) FROM fan_cheers
                    WHERE user_id = ? AND player_id = ?) AS days,
                   (SELECT 1 FROM fan_cheers
                    WHERE user_id = ? AND player_id = ? AND cheer_date = ${KST_TODAY}) AS today,
                   ${NEXT_RESET} AS next_reset`,
      args: [req.user.userId, playerId, req.user.userId, playerId],
    });

    res.json({
      cheeredToday: !!row?.today,
      nextResetAt:  row?.next_reset ?? null,
      ...gradeInfo(Number(row?.days ?? 0)),
    });
  } catch (e) { serverError(res, e, 'cheers/me'); }
});

// ── POST /api/cheers ─────────────────────────────────────────
// body: { playerId } — 오늘의 응원. 하루 1회.
router.post('/', requireAuth, async (req, res) => {
  const { playerId } = req.body ?? {};
  if (!playerId) return res.status(400).json({ error: 'playerId가 필요합니다.' });

  try {
    const { rows: [player] } = await db.execute({
      sql:  'SELECT id, name, slug FROM players WHERE id = ?',
      args: [playerId],
    });
    if (!player) return res.status(404).json({ error: '선수를 찾을 수 없습니다.' });

    /* 하루 1회는 UNIQUE 제약이 보장한다. 조회 후 INSERT 하면 두 번 눌렀을 때
       사이에 끼어들 여지가 생기므로, 그냥 넣어보고 걸리면 이미 한 것으로 본다. */
    try {
      await db.execute({
        sql:  `INSERT INTO fan_cheers (user_id, player_id, cheer_date)
               VALUES (?, ?, ${KST_TODAY})`,
        args: [req.user.userId, player.id],
      });
    } catch (e) {
      if (e.message?.includes('UNIQUE')) {
        const days = await cheerDays(req.user.userId, player.id);
        const { rows: [t] } = await db.execute(`SELECT ${NEXT_RESET} AS next_reset`);
        return res.status(409).json({
          error: '오늘은 이미 응원했습니다.',
          alreadyCheered: true,
          nextResetAt: t?.next_reset ?? null,
          ...gradeInfo(days),
        });
      }
      throw e;
    }

    const days   = await cheerDays(req.user.userId, player.id);
    const before = gradeInfo(days - 1);   // 방금 넣은 한 건을 뺀 상태
    const after  = gradeInfo(days);
    const gradeUp = after.grade !== before.grade;

    // 등급이 오른 순간만 알린다. 매일 알리면 금방 꺼버린다.
    if (gradeUp) {
      notify([req.user.userId], {
        type:    'fan_grade',
        message: `${after.gradeEmoji} ${player.name} ${after.gradeLabel}이 되었어요!`,
        link:    `/players/${player.slug}`,
      }).catch(() => { /* 알림 실패가 응원을 막을 이유는 없다 */ });
    }

    const { rows: [t] } = await db.execute(`SELECT ${NEXT_RESET} AS next_reset`);

    res.json({
      ok: true,
      playerName:  player.name,
      gradeUp,
      nextResetAt: t?.next_reset ?? null,
      ...after,
    });
  } catch (e) { serverError(res, e, 'cheers/post'); }
});

export default router;
