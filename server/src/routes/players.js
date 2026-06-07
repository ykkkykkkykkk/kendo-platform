import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
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

// PATCH /api/players/my/photo — 선수 계정 본인 프로필 사진 변경
router.patch('/my/photo', requireAuth, async (req, res) => {
  try {
    const { profile_image_url } = req.body;
    if (!profile_image_url?.trim())
      return res.status(400).json({ error: '이미지 URL이 필요합니다.' });

    // 선수 계정인지 확인
    const { rows: [user] } = await db.execute({
      sql: "SELECT role, player_id FROM users WHERE id = ?",
      args: [req.user.userId],
    });
    if (!user || user.role !== 'player' || !user.player_id)
      return res.status(403).json({ error: '선수 계정만 사용할 수 있습니다.' });

    await db.execute({
      sql:  'UPDATE players SET profile_image_url = ? WHERE id = ?',
      args: [profile_image_url.trim(), user.player_id],
    });

    const { rows: [player] } = await db.execute({
      sql: 'SELECT profile_image_url FROM players WHERE id = ?',
      args: [user.player_id],
    });

    res.json({ success: true, profile_image_url: player.profile_image_url });
  } catch (e) { serverError(res, e); }
});

export default router;
