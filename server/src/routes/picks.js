import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { serverError } from '../utils/apiError.js';

const router = Router();

// ─── 공통 헬퍼: division → tournament pick_deadline 조회 ─────────
async function getDeadline(divisionId) {
  const { rows } = await db.execute({
    sql:  `SELECT t.pick_deadline
           FROM tournament_divisions td
           JOIN tournaments t ON t.id = td.tournament_id
           WHERE td.id = ?`,
    args: [divisionId],
  });
  return rows[0]?.pick_deadline ?? null;
}

// ─── A-1. 대회 + 부문 목록 ───────────────────────────────────────
// GET /api/tournaments-with-divisions
router.get('/tournaments-with-divisions', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const { rows: tournaments } = await db.execute(
      `SELECT * FROM tournaments
       ORDER BY CASE status WHEN '진행' THEN 0 WHEN '예정' THEN 1 WHEN '종료' THEN 2 END,
                start_date DESC`
    );

    const result = [];
    for (const t of tournaments) {
      const { rows: divisions } = await db.execute({
        sql: `SELECT td.id, td.division_type, td.participant_count,
                     tp.id AS pick_id, tp.is_locked, tp.score
              FROM tournament_divisions td
              LEFT JOIN tournament_picks tp
                ON tp.division_id = td.id AND tp.user_id = ?
              WHERE td.tournament_id = ?`,
        args: [userId, t.id],
      });

      result.push({
        ...t,
        divisions: divisions.map((d) => ({
          division_id:     d.id,
          division_type:   d.division_type,
          participant_count: d.participant_count,
          my_pick_status:  d.pick_id == null ? 'not_picked'
                           : d.is_locked     ? 'locked'
                                             : 'picked',
          my_score: d.score ?? 0,
        })),
      });
    }

    res.json(result);
  } catch (e) {
    serverError(res, e, 'A-1');
  }
});

// ─── A-2. 대회 상세 (부문 + 본인 픽 + 결과) ─────────────────────
// GET /api/tournaments/:id/full
router.get('/tournaments/:id/full', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id }  = req.params;

    const { rows: ts } = await db.execute({
      sql:  'SELECT * FROM tournaments WHERE id = ?',
      args: [id],
    });
    if (!ts.length) return res.status(404).json({ error: '대회를 찾을 수 없습니다.' });
    const tournament = ts[0];

    const deadlineSec = tournament.pick_deadline
      ? Math.max(0, Math.floor((new Date(tournament.pick_deadline) - Date.now()) / 1000))
      : null;

    const { rows: divisions } = await db.execute({
      sql:  'SELECT * FROM tournament_divisions WHERE tournament_id = ?',
      args: [id],
    });

    const divisionDetails = [];
    for (const d of divisions) {
      const { rows: participants } = await db.execute({
        sql: `SELECT dp.id, dp.seed_number,
                     p.name  AS player_name,
                     pt.name AS team_name,
                     dt.name AS direct_team_name,
                     dt.region
              FROM division_participants dp
              LEFT JOIN players p  ON p.id  = dp.player_id
              LEFT JOIN teams   pt ON pt.id = p.team_id
              LEFT JOIN teams   dt ON dt.id = dp.team_id
              WHERE dp.division_id = ?
              ORDER BY dp.seed_number`,
        args: [d.id],
      });

      const { rows: [myPick] } = await db.execute({
        sql:  'SELECT * FROM tournament_picks WHERE division_id = ? AND user_id = ?',
        args: [d.id, userId],
      });

      const { rows: [result] } = await db.execute({
        sql:  'SELECT * FROM division_results WHERE division_id = ?',
        args: [d.id],
      });

      divisionDetails.push({
        id:                d.id,
        division_type:     d.division_type,
        participant_count: d.participant_count,
        participants:      participants.map((p) => ({
          id:          p.id,
          seed_number: p.seed_number,
          name:        p.player_name ?? p.direct_team_name,
          team_name:   p.team_name,
          region:      p.region,
        })),
        my_pick: myPick ? {
          pick_1st:   myPick.pick_1st,
          pick_2nd:   myPick.pick_2nd,
          pick_3rd_a: myPick.pick_3rd_a,
          pick_3rd_b: myPick.pick_3rd_b,
          is_locked:  myPick.is_locked,
          score:      myPick.score,
        } : null,
        result: result ? {
          rank_1st:     result.rank_1st,
          rank_2nd:     result.rank_2nd,
          rank_3rd_a:   result.rank_3rd_a,
          rank_3rd_b:   result.rank_3rd_b,
          is_finalized: result.is_finalized,
        } : null,
      });
    }

    res.json({
      ...tournament,
      deadline_seconds_remaining: deadlineSec,
      divisions: divisionDetails,
    });
  } catch (e) {
    serverError(res, e, 'A-2');
  }
});

// ─── A-3. 부문별 참가자 명단 ─────────────────────────────────────
// GET /api/divisions/:id/participants
router.get('/divisions/:id/participants', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { rows: divRows } = await db.execute({
      sql:  'SELECT division_type FROM tournament_divisions WHERE id = ?',
      args: [id],
    });
    if (!divRows.length) return res.status(404).json({ error: '부문을 찾을 수 없습니다.' });

    const { division_type } = divRows[0];
    const isTeam = division_type.includes('team');

    const { rows } = await db.execute({
      sql: `SELECT dp.id, dp.seed_number,
                   p.name  AS player_name,
                   pt.name AS team_name,
                   dt.name AS direct_team_name,
                   dt.region
            FROM division_participants dp
            LEFT JOIN players p  ON p.id  = dp.player_id
            LEFT JOIN teams   pt ON pt.id = p.team_id
            LEFT JOIN teams   dt ON dt.id = dp.team_id
            WHERE dp.division_id = ?
            ORDER BY dp.seed_number`,
      args: [id],
    });

    const participants = isTeam
      ? rows.map((r) => ({ id: r.id, seed_number: r.seed_number, team_name: r.direct_team_name, region: r.region }))
      : rows.map((r) => ({ id: r.id, seed_number: r.seed_number, name: r.player_name, team_name: r.team_name }));

    res.json({ division_type, participants });
  } catch (e) {
    serverError(res, e, 'A-3');
  }
});

// ─── A-4. 픽 입력/수정 ──────────────────────────────────────────
// POST /api/divisions/:id/pick
router.post('/divisions/:id/pick', requireAuth, async (req, res) => {
  try {
    const userId     = req.user.userId;
    const divisionId = req.params.id;
    const { pick_1st, pick_2nd, pick_3rd_a, pick_3rd_b } = req.body;

    if ([pick_1st, pick_2nd, pick_3rd_a, pick_3rd_b].some((v) => v == null))
      return res.status(400).json({ error: '4명을 모두 선택해야 합니다.' });

    if (new Set([pick_1st, pick_2nd, pick_3rd_a, pick_3rd_b]).size !== 4)
      return res.status(400).json({ error: '중복된 선수를 선택할 수 없습니다.' });

    // division 존재 + 마감 확인
    const { rows: divRows } = await db.execute({
      sql: `SELECT td.id, t.pick_deadline
            FROM tournament_divisions td
            JOIN tournaments t ON t.id = td.tournament_id
            WHERE td.id = ?`,
      args: [divisionId],
    });
    if (!divRows.length) return res.status(404).json({ error: '부문을 찾을 수 없습니다.' });

    if (divRows[0].pick_deadline && new Date() > new Date(divRows[0].pick_deadline))
      return res.status(400).json({ error: '픽 마감 시간이 지났습니다.' });

    // lock 여부 확인
    const { rows: [existing] } = await db.execute({
      sql:  'SELECT id, is_locked FROM tournament_picks WHERE user_id = ? AND division_id = ?',
      args: [userId, divisionId],
    });
    if (existing?.is_locked)
      return res.status(400).json({ error: '이미 확정된 픽은 수정할 수 없습니다.' });

    // 4명 모두 이 division의 participants인지 확인
    const { rows: valid } = await db.execute({
      sql:  'SELECT id FROM division_participants WHERE division_id = ? AND id IN (?, ?, ?, ?)',
      args: [divisionId, pick_1st, pick_2nd, pick_3rd_a, pick_3rd_b],
    });
    if (valid.length !== 4)
      return res.status(400).json({ error: '선택한 참가자가 이 부문에 속하지 않습니다.' });

    if (existing) {
      await db.execute({
        sql:  `UPDATE tournament_picks
               SET pick_1st = ?, pick_2nd = ?, pick_3rd_a = ?, pick_3rd_b = ?
               WHERE id = ?`,
        args: [pick_1st, pick_2nd, pick_3rd_a, pick_3rd_b, existing.id],
      });
      return res.json({ success: true, pick_id: existing.id });
    }

    const { lastInsertRowid } = await db.execute({
      sql:  `INSERT INTO tournament_picks (user_id, division_id, pick_1st, pick_2nd, pick_3rd_a, pick_3rd_b)
             VALUES (?, ?, ?, ?, ?, ?)`,
      args: [userId, divisionId, pick_1st, pick_2nd, pick_3rd_a, pick_3rd_b],
    });
    res.status(201).json({ success: true, pick_id: Number(lastInsertRowid) });
  } catch (e) {
    serverError(res, e, 'A-4');
  }
});

// ─── A-5. 픽 확정 (lock) ─────────────────────────────────────────
// POST /api/divisions/:id/pick/lock
router.post('/divisions/:id/pick/lock', requireAuth, async (req, res) => {
  try {
    const userId     = req.user.userId;
    const divisionId = req.params.id;

    const { rows: [pick] } = await db.execute({
      sql:  'SELECT * FROM tournament_picks WHERE user_id = ? AND division_id = ?',
      args: [userId, divisionId],
    });
    if (!pick)
      return res.status(404).json({ error: '픽이 없습니다. 먼저 선수를 선택해주세요.' });
    if (pick.is_locked)
      return res.status(400).json({ error: '이미 확정된 픽입니다.' });
    if ([pick.pick_1st, pick.pick_2nd, pick.pick_3rd_a, pick.pick_3rd_b].some((v) => v == null))
      return res.status(400).json({ error: '4명을 모두 선택한 후 확정할 수 있습니다.' });

    const deadline = await getDeadline(divisionId);
    if (deadline && new Date() > new Date(deadline))
      return res.status(400).json({ error: '픽 마감 시간이 지났습니다.' });

    const lockedAt = new Date().toISOString();
    await db.execute({
      sql:  'UPDATE tournament_picks SET is_locked = 1, locked_at = ? WHERE id = ?',
      args: [lockedAt, pick.id],
    });

    res.json({ success: true, locked_at: lockedAt });
  } catch (e) {
    serverError(res, e, 'A-5');
  }
});

// ─── A-6. 본인 픽 조회 ──────────────────────────────────────────
// GET /api/divisions/:id/my-pick
router.get('/divisions/:id/my-pick', requireAuth, async (req, res) => {
  try {
    const { rows: [pick] } = await db.execute({
      sql:  `SELECT pick_1st, pick_2nd, pick_3rd_a, pick_3rd_b,
                    is_locked, locked_at, score
             FROM tournament_picks
             WHERE user_id = ? AND division_id = ?`,
      args: [req.user.userId, req.params.id],
    });
    res.json(pick ?? null);
  } catch (e) {
    serverError(res, e, 'A-6');
  }
});

// ─── A-7. 픽 공개 (마감 후) ──────────────────────────────────────
// GET /api/divisions/:id/all-picks
router.get('/divisions/:id/all-picks', requireAuth, async (req, res) => {
  try {
    const divisionId = req.params.id;

    const { rows: divRows } = await db.execute({
      sql: `SELECT td.division_type, t.pick_deadline
            FROM tournament_divisions td
            JOIN tournaments t ON t.id = td.tournament_id
            WHERE td.id = ?`,
      args: [divisionId],
    });
    if (!divRows.length) return res.status(404).json({ error: '부문을 찾을 수 없습니다.' });

    const { pick_deadline, division_type } = divRows[0];
    if (!pick_deadline || new Date() <= new Date(pick_deadline))
      return res.status(403).json({ error: '마감 전에는 다른 사용자의 픽을 볼 수 없습니다.' });

    const { rows: picks } = await db.execute({
      sql:  'SELECT pick_1st, pick_2nd, pick_3rd_a, pick_3rd_b FROM tournament_picks WHERE division_id = ?',
      args: [divisionId],
    });

    const totalPicks = picks.length;
    const isTeam    = division_type.includes('team');

    async function aggregateSlot(slotKey) {
      const counts = {};
      for (const p of picks) {
        const v = p[slotKey];
        if (v != null) counts[v] = (counts[v] ?? 0) + 1;
      }
      const ids = Object.keys(counts).map(Number);
      if (!ids.length) return [];

      const placeholders = ids.map(() => '?').join(',');
      const { rows: parts } = await db.execute({
        sql: `SELECT dp.id,
                     p.name  AS player_name,
                     pt.name AS team_name,
                     dt.name AS direct_team_name
              FROM division_participants dp
              LEFT JOIN players p  ON p.id  = dp.player_id
              LEFT JOIN teams   pt ON pt.id = p.team_id
              LEFT JOIN teams   dt ON dt.id = dp.team_id
              WHERE dp.id IN (${placeholders})`,
        args: ids,
      });

      return parts.map((part) => ({
        participant_id: part.id,
        name:      isTeam ? (part.direct_team_name ?? part.team_name) : part.player_name,
        team_name: isTeam ? null : part.team_name,
        count:      counts[part.id] ?? 0,
        percentage: totalPicks ? Math.round(((counts[part.id] ?? 0) / totalPicks) * 100) : 0,
      })).sort((a, b) => b.count - a.count);
    }

    const [s1, s2, s3a, s3b] = await Promise.all([
      aggregateSlot('pick_1st'),
      aggregateSlot('pick_2nd'),
      aggregateSlot('pick_3rd_a'),
      aggregateSlot('pick_3rd_b'),
    ]);

    res.json({
      deadline_passed: true,
      total_picks: totalPicks,
      slots: { pick_1st: s1, pick_2nd: s2, pick_3rd_a: s3a, pick_3rd_b: s3b },
    });
  } catch (e) {
    serverError(res, e, 'A-7');
  }
});

// ─── A-8. 대회별 랭킹 ────────────────────────────────────────────
// GET /api/tournaments/:id/ranking?page=1&limit=50
router.get('/tournaments/:id/ranking', requireAuth, async (req, res) => {
  try {
    const userId       = req.user.userId;
    const tournamentId = req.params.id;
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const { rows: countRows } = await db.execute({
      sql: `SELECT COUNT(DISTINCT tp.user_id) AS total
            FROM tournament_picks tp
            JOIN tournament_divisions td ON td.id = tp.division_id
            WHERE td.tournament_id = ?`,
      args: [tournamentId],
    });
    const total = Number(countRows[0]?.total ?? 0);

    const { rows } = await db.execute({
      sql: `SELECT u.id AS user_id, u.nickname, u.home_dojo,
                   COUNT(tp.id)               AS divisions_picked,
                   COALESCE(SUM(tp.score), 0) AS total_score,
                   MIN(tp.locked_at)          AS first_locked_at
            FROM tournament_picks tp
            JOIN tournament_divisions td ON td.id = tp.division_id
            JOIN users u ON u.id = tp.user_id
            WHERE td.tournament_id = ?
            GROUP BY u.id
            ORDER BY total_score DESC, first_locked_at ASC
            LIMIT ? OFFSET ?`,
      args: [tournamentId, limit, offset],
    });

    const ranking = rows.map((r, i) => ({
      rank:             offset + i + 1,
      user_id:          r.user_id,
      nickname:         r.nickname,
      dojo:             r.home_dojo,
      divisions_picked: Number(r.divisions_picked),
      total_score:      Number(r.total_score),
    }));

    // 본인 점수 + 순위
    const { rows: [myRow] } = await db.execute({
      sql: `SELECT COALESCE(SUM(tp.score), 0) AS s, COUNT(tp.id) AS picks
            FROM tournament_picks tp
            JOIN tournament_divisions td ON td.id = tp.division_id
            WHERE td.tournament_id = ? AND tp.user_id = ?`,
      args: [tournamentId, userId],
    });
    const participated = Number(myRow?.picks ?? 0) > 0;
    const myScore      = participated ? Number(myRow?.s ?? 0) : null;

    let myRank = null;
    if (participated) {
      const { rows: above } = await db.execute({
        sql: `SELECT COUNT(*) AS cnt FROM (
                SELECT tp.user_id
                FROM tournament_picks tp
                JOIN tournament_divisions td ON td.id = tp.division_id
                WHERE td.tournament_id = ?
                GROUP BY tp.user_id
                HAVING SUM(tp.score) > ?
              )`,
        args: [tournamentId, myScore],
      });
      myRank = Number(above[0]?.cnt ?? 0) + 1;
    }

    res.json({ total, page, limit, ranking, my_rank: myRank, my_score: myScore });
  } catch (e) {
    serverError(res, e, 'A-8');
  }
});

export default router;
