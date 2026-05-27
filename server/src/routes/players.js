import { Router } from 'express';
import { db } from '../db.js';
import { serverError } from '../utils/apiError.js';

const router = Router();

// GET /api/players?team=<team_id>
router.get('/', async (req, res) => {
  try {
    const { team } = req.query;
    const sql = team
      ? `SELECT p.*, t.name AS team_name, t.slug AS team_slug, t.color_primary,
                ps.wins, ps.losses, ps.total_matches,
                (SELECT COUNT(*) FROM follows f WHERE f.player_id = p.id) AS fan_count
         FROM players p
         JOIN teams t ON t.id = p.team_id
         LEFT JOIN player_stats ps ON ps.player_id = p.id
         WHERE p.team_id = ?
         ORDER BY p.name`
      : `SELECT p.*, t.name AS team_name, t.slug AS team_slug, t.color_primary,
                ps.wins, ps.losses, ps.total_matches,
                (SELECT COUNT(*) FROM follows f WHERE f.player_id = p.id) AS fan_count
         FROM players p
         JOIN teams t ON t.id = p.team_id
         LEFT JOIN player_stats ps ON ps.player_id = p.id
         ORDER BY t.name, p.name`;

    const { rows } = await db.execute({ sql, args: team ? [team] : [] });
    res.json(rows);
  } catch (e) {
    serverError(res, e);
  }
});

// GET /api/players/:slug
router.get('/:slug', async (req, res) => {
  try {
    const { rows: [player] } = await db.execute({
      sql: `SELECT p.*, t.name AS team_name, t.slug AS team_slug, t.color_primary,
                   (SELECT COUNT(*) FROM follows f WHERE f.player_id = p.id) AS fan_count,
                   (SELECT COUNT(*) FROM clinics c WHERE c.player_id = p.id) AS clinic_count
            FROM players p
            JOIN teams t ON t.id = p.team_id
            WHERE p.slug = ?`,
      args: [req.params.slug],
    });
    if (!player) return res.status(404).json({ error: '선수를 찾을 수 없습니다.' });

    const [{ rows: [stats] }, { rows: gear }] = await Promise.all([
      db.execute({ sql: 'SELECT * FROM player_stats WHERE player_id = ?', args: [player.id] }),
      db.execute({
        sql:  'SELECT * FROM player_gear WHERE player_id = ? ORDER BY display_order',
        args: [player.id],
      }),
    ]);

    res.json({ ...player, stats: stats ?? null, gear });
  } catch (e) {
    serverError(res, e);
  }
});

export default router;
