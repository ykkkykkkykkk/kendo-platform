import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/tournaments
router.get('/', async (_req, res) => {
  try {
    const { rows } = await db.execute(
      `SELECT * FROM tournaments ORDER BY start_date DESC`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/tournaments/:slug
router.get('/:slug', async (req, res) => {
  try {
    const { rows: [tournament] } = await db.execute({
      sql: 'SELECT * FROM tournaments WHERE slug = ?',
      args: [req.params.slug],
    });
    if (!tournament) return res.status(404).json({ error: '대회를 찾을 수 없습니다.' });

    // 전체 대진표 (선수 정보 JOIN)
    const { rows: matches } = await db.execute({
      sql: `SELECT
              m.*,
              pa.name AS player_a_name, pa.slug AS player_a_slug,
              ta.name AS team_a_name,   ta.color_primary AS team_a_color,
              pb.name AS player_b_name, pb.slug AS player_b_slug,
              tb.name AS team_b_name,   tb.color_primary AS team_b_color,
              wp.name AS winner_name,   wt.name AS winner_team_name
            FROM matches m
            LEFT JOIN players pa ON pa.id = m.player_a_id
            LEFT JOIN players pb ON pb.id = m.player_b_id
            LEFT JOIN teams   ta ON ta.id = m.team_a_id
            LEFT JOIN teams   tb ON tb.id = m.team_b_id
            LEFT JOIN players wp ON wp.id = m.winner_player_id
            LEFT JOIN teams   wt ON wt.id = m.winner_team_id
            WHERE m.tournament_id = ?
            ORDER BY CASE m.round
              WHEN '16강' THEN 1 WHEN '8강' THEN 2
              WHEN '4강'  THEN 3 WHEN '결승' THEN 4
              WHEN '예선' THEN 0 END,
              m.bracket_position`,
      args: [tournament.id],
    });

    // 라운드별 그룹핑
    const bracket = matches.reduce((acc, m) => {
      (acc[m.round] = acc[m.round] ?? []).push(m);
      return acc;
    }, {});

    res.json({ ...tournament, bracket });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
