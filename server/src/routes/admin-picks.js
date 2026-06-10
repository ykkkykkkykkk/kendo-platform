import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { serverError } from '../utils/apiError.js';
import { updateDivisionScores } from '../services/pickService.js';

const router = Router();
router.use(requireAdmin);

const VALID_DIVISION_TYPES = ['male_individual', 'male_team', 'female_individual', 'female_team'];

// ─── B-0. 대회 부문 목록 + 참가자 + 현재 결과 조회 ──────────────
// GET /api/admin/tournaments/:id/divisions
router.get('/tournaments/:id/divisions', async (req, res) => {
  try {
    const { id } = req.params;

    const { rows: divisions } = await db.execute({
      sql: `SELECT td.id, td.division_type, td.participant_count,
                   dr.rank_1st, dr.rank_2nd, dr.rank_3rd_a, dr.rank_3rd_b,
                   dr.is_finalized, dr.finalized_at
            FROM tournament_divisions td
            LEFT JOIN division_results dr ON dr.division_id = td.id
            WHERE td.tournament_id = ?
            ORDER BY td.id`,
      args: [id],
    });

    for (const div of divisions) {
      const { rows: participants } = await db.execute({
        sql: `SELECT dp.id, dp.seed_number,
                     p.name  AS player_name,
                     t.name  AS team_name
              FROM division_participants dp
              LEFT JOIN players p ON p.id = dp.player_id
              LEFT JOIN teams   t ON t.id = dp.team_id
              WHERE dp.division_id = ?
              ORDER BY dp.seed_number`,
        args: [div.id],
      });
      div.participants = participants;
    }

    res.json(divisions);
  } catch (e) { serverError(res, e, 'B-0'); }
});

// ─── B-1. 대회에 부문 추가 ───────────────────────────────────────
// POST /api/admin/tournaments/:id/divisions
router.post('/tournaments/:id/divisions', async (req, res) => {
  try {
    const { id } = req.params;
    const { division_type, participant_count } = req.body;

    if (!VALID_DIVISION_TYPES.includes(division_type))
      return res.status(400).json({ error: '유효하지 않은 부문 타입입니다.', valid: VALID_DIVISION_TYPES });

    const { rows: ts } = await db.execute({
      sql:  'SELECT id FROM tournaments WHERE id = ?',
      args: [id],
    });
    if (!ts.length) return res.status(404).json({ error: '대회를 찾을 수 없습니다.' });

    const { lastInsertRowid } = await db.execute({
      sql:  'INSERT INTO tournament_divisions (tournament_id, division_type, participant_count) VALUES (?, ?, ?)',
      args: [id, division_type, participant_count ?? null],
    });

    const { rows: [division] } = await db.execute({
      sql:  'SELECT * FROM tournament_divisions WHERE id = ?',
      args: [Number(lastInsertRowid)],
    });

    res.status(201).json(division);
  } catch (e) {
    if (e.message?.includes('UNIQUE'))
      return res.status(409).json({ error: '이미 존재하는 부문입니다.' });
    serverError(res, e, 'B-1');
  }
});

// ─── B-2. 부문 참가자 일괄 등록 ──────────────────────────────────
// POST /api/admin/divisions/:id/participants
router.post('/divisions/:id/participants', async (req, res) => {
  try {
    const divisionId = req.params.id;
    const { participants } = req.body;

    if (!Array.isArray(participants) || !participants.length)
      return res.status(400).json({ error: 'participants 배열이 필요합니다.' });

    const { rows: divRows } = await db.execute({
      sql:  'SELECT division_type FROM tournament_divisions WHERE id = ?',
      args: [divisionId],
    });
    if (!divRows.length) return res.status(404).json({ error: '부문을 찾을 수 없습니다.' });

    const isTeam = divRows[0].division_type.includes('team');
    let added = 0;

    for (const p of participants) {
      const playerId = isTeam ? null : (p.player_id ?? null);
      const teamId   = isTeam ? (p.team_id ?? null) : null;
      if ((isTeam && !teamId) || (!isTeam && !playerId)) continue;

      await db.execute({
        sql:  `INSERT OR IGNORE INTO division_participants
               (division_id, player_id, team_id, seed_number)
               VALUES (?, ?, ?, ?)`,
        args: [divisionId, playerId, teamId, p.seed_number ?? null],
      });
      added++;
    }

    res.status(201).json({ added });
  } catch (e) {
    serverError(res, e, 'B-2');
  }
});

// ─── B-3. 부문 참가자 일괄 교체 ──────────────────────────────────
// PUT /api/admin/divisions/:id/participants
router.put('/divisions/:id/participants', async (req, res) => {
  try {
    const divisionId = req.params.id;
    const { participants } = req.body;

    if (!Array.isArray(participants))
      return res.status(400).json({ error: 'participants 배열이 필요합니다.' });

    const { rows: divRows } = await db.execute({
      sql:  'SELECT division_type FROM tournament_divisions WHERE id = ?',
      args: [divisionId],
    });
    if (!divRows.length) return res.status(404).json({ error: '부문을 찾을 수 없습니다.' });

    const isTeam = divRows[0].division_type.includes('team');

    await db.execute({
      sql:  'DELETE FROM division_participants WHERE division_id = ?',
      args: [divisionId],
    });

    let added = 0;
    for (const p of participants) {
      const playerId = isTeam ? null : (p.player_id ?? null);
      const teamId   = isTeam ? (p.team_id ?? null) : null;
      if ((isTeam && !teamId) || (!isTeam && !playerId)) continue;

      await db.execute({
        sql:  `INSERT INTO division_participants
               (division_id, player_id, team_id, seed_number)
               VALUES (?, ?, ?, ?)`,
        args: [divisionId, playerId, teamId, p.seed_number ?? null],
      });
      added++;
    }

    res.json({ replaced: added });
  } catch (e) {
    if (e.message?.includes('FOREIGN KEY'))
      return res.status(409).json({ error: '픽이 존재하여 참가자를 삭제할 수 없습니다. 픽을 먼저 삭제하세요.' });
    serverError(res, e, 'B-3');
  }
});

// ─── B-4. 부문 결과 입력 + 점수 자동 계산 ────────────────────────
// POST /api/admin/divisions/:id/result
router.post('/divisions/:id/result', async (req, res) => {
  try {
    const divisionId = req.params.id;
    const { rank_1st, rank_2nd, rank_3rd_a, rank_3rd_b } = req.body;

    if ([rank_1st, rank_2nd, rank_3rd_a, rank_3rd_b].some((v) => v == null))
      return res.status(400).json({ error: '4개 순위를 모두 입력해야 합니다.' });

    if (new Set([rank_1st, rank_2nd, rank_3rd_a, rank_3rd_b]).size !== 4)
      return res.status(400).json({ error: '순위 입력값이 중복됩니다.' });

    // 해당 division participants인지 검증
    const { rows: valid } = await db.execute({
      sql:  'SELECT id FROM division_participants WHERE division_id = ? AND id IN (?, ?, ?, ?)',
      args: [divisionId, rank_1st, rank_2nd, rank_3rd_a, rank_3rd_b],
    });
    if (valid.length !== 4)
      return res.status(400).json({ error: '결과 참가자가 이 부문에 속하지 않습니다.' });

    // 이미 확정된 결과인지 확인
    const { rows: [existing] } = await db.execute({
      sql:  'SELECT id, is_finalized FROM division_results WHERE division_id = ?',
      args: [divisionId],
    });
    if (existing?.is_finalized)
      return res.status(400).json({ error: '이미 확정된 결과는 수정할 수 없습니다.' });

    if (existing) {
      await db.execute({
        sql:  `UPDATE division_results
               SET rank_1st = ?, rank_2nd = ?, rank_3rd_a = ?, rank_3rd_b = ?
               WHERE division_id = ?`,
        args: [rank_1st, rank_2nd, rank_3rd_a, rank_3rd_b, divisionId],
      });
    } else {
      await db.execute({
        sql:  `INSERT INTO division_results (division_id, rank_1st, rank_2nd, rank_3rd_a, rank_3rd_b)
               VALUES (?, ?, ?, ?, ?)`,
        args: [divisionId, rank_1st, rank_2nd, rank_3rd_a, rank_3rd_b],
      });
    }

    const picksUpdated = await updateDivisionScores(divisionId);

    res.json({ success: true, picks_updated: picksUpdated });
  } catch (e) {
    serverError(res, e, 'B-4');
  }
});

// ─── B-5. 결과 확정 ──────────────────────────────────────────────
// POST /api/admin/divisions/:id/result/finalize
router.post('/divisions/:id/result/finalize', async (req, res) => {
  try {
    const divisionId = req.params.id;

    const { rows: [result] } = await db.execute({
      sql:  'SELECT id, is_finalized FROM division_results WHERE division_id = ?',
      args: [divisionId],
    });
    if (!result)
      return res.status(404).json({ error: '결과가 아직 입력되지 않았습니다.' });
    if (result.is_finalized)
      return res.status(400).json({ error: '이미 확정된 결과입니다.' });

    const finalizedAt = new Date().toISOString();
    await db.execute({
      sql:  'UPDATE division_results SET is_finalized = 1, finalized_at = ? WHERE division_id = ?',
      args: [finalizedAt, divisionId],
    });

    res.json({ success: true, finalized_at: finalizedAt });
  } catch (e) {
    serverError(res, e, 'B-5');
  }
});

// ─── B-6. 대회 종료 처리 + 우승자 산정 ───────────────────────────
// POST /api/admin/tournaments/:id/finalize
router.post('/tournaments/:id/finalize', async (req, res) => {
  try {
    const tournamentId = req.params.id;

    // 부문 존재 확인
    const { rows: divisions } = await db.execute({
      sql:  'SELECT id FROM tournament_divisions WHERE tournament_id = ?',
      args: [tournamentId],
    });
    if (!divisions.length)
      return res.status(400).json({ error: '등록된 부문이 없습니다.' });

    // 미확정 부문 확인
    const { rows: unfinalized } = await db.execute({
      sql: `SELECT td.id
            FROM tournament_divisions td
            LEFT JOIN division_results dr ON dr.division_id = td.id
            WHERE td.tournament_id = ?
              AND (dr.id IS NULL OR dr.is_finalized = 0)`,
      args: [tournamentId],
    });
    if (unfinalized.length)
      return res.status(400).json({
        error: `확정되지 않은 부문이 ${unfinalized.length}개 있습니다.`,
        unfinalized_division_ids: unfinalized.map((r) => r.id),
      });

    // 합산 점수 집계
    const { rows: scores } = await db.execute({
      sql: `SELECT tp.user_id, u.nickname, COALESCE(SUM(tp.score), 0) AS total_score
            FROM tournament_picks tp
            JOIN tournament_divisions td ON td.id = tp.division_id
            JOIN users u ON u.id = tp.user_id
            WHERE td.tournament_id = ?
            GROUP BY tp.user_id
            ORDER BY total_score DESC`,
      args: [tournamentId],
    });

    if (!scores.length)
      return res.json({ winners: [], message: '참여자가 없습니다.' });

    // 동점자 랜덤 추첨으로 1·2·3등 결정
    const prizes = ['호구', '도복', '죽도'];
    const winners = [];
    const pool    = scores.map((s) => ({ ...s, total_score: Number(s.total_score) }));

    for (let rank = 1; rank <= 3 && pool.length; rank++) {
      const topScore = pool[0].total_score;
      const tied     = [];
      while (pool.length && pool[0].total_score === topScore) tied.push(pool.shift());
      const winner = tied[Math.floor(Math.random() * tied.length)];
      winners.push({
        rank,
        user_id:     winner.user_id,
        nickname:    winner.nickname,
        total_score: winner.total_score,
        prize:       prizes[rank - 1],
      });
    }

    // 대회 상태 종료 처리
    await db.execute({
      sql:  "UPDATE tournaments SET status = '종료' WHERE id = ?",
      args: [tournamentId],
    });

    res.json({ winners });
  } catch (e) {
    serverError(res, e, 'B-6');
  }
});

export default router;
