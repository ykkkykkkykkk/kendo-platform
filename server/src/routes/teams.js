import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/teams
router.get('/', async (_req, res) => {
  try {
    const { rows } = await db.execute(
      'SELECT * FROM teams ORDER BY championships DESC'
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/teams/:slug
router.get('/:slug', async (req, res) => {
  try {
    const { rows: [team] } = await db.execute({
      sql: 'SELECT * FROM teams WHERE slug = ?',
      args: [req.params.slug],
    });
    if (!team) return res.status(404).json({ error: '팀을 찾을 수 없습니다.' });

    const { rows: players } = await db.execute({
      sql: `SELECT p.*, ps.wins, ps.losses, ps.total_matches, ps.championships_won
            FROM players p
            LEFT JOIN player_stats ps ON ps.player_id = p.id
            WHERE p.team_id = ?
            ORDER BY CASE p.position
              WHEN '대장' THEN 1 WHEN '부장' THEN 2 WHEN '중견' THEN 3
              WHEN '이봉' THEN 4 WHEN '선봉' THEN 5 ELSE 6 END`,
      args: [team.id],
    });

    res.json({ ...team, players });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
