import { Router } from 'express';
import { db } from '../db.js';
import { serverError } from '../utils/apiError.js';

const router = Router();

// GET /api/teams
router.get('/', async (_req, res) => {
  try {
    const { rows } = await db.execute(
      `SELECT *,
              (SELECT COUNT(*) FROM players WHERE players.team_id = teams.id) AS player_count
       FROM teams ORDER BY championships DESC`
    );
    res.json(rows);
  } catch (e) {
    serverError(res, e);
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
            -- 별도 정렬 없이 등록된 순서 그대로 보여준다.
            -- (ORDER BY를 아예 빼면 순서가 보장되지 않으므로 id로 고정만 해둔다)
            ORDER BY p.id`,
      args: [team.id],
    });

    res.json({ ...team, players });
  } catch (e) {
    serverError(res, e);
  }
});

export default router;
