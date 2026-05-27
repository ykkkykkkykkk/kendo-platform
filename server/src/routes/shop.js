import { Router } from 'express';
import { db } from '../db.js';
import { serverError } from '../utils/apiError.js';

const router = Router();

// GET /api/shop/gear?category=X — 전체 장비 카탈로그 (공개)
router.get('/gear', async (req, res) => {
  try {
    const { category } = req.query;
    const { rows } = await db.execute({
      sql: category
        ? `SELECT g.*, p.name AS player_name, p.slug AS player_slug,
                  t.color_primary AS team_color, t.name AS team_name
           FROM player_gear g
           JOIN players p ON p.id = g.player_id
           JOIN teams   t ON t.id = p.team_id
           WHERE g.category = ?
           ORDER BY g.category, g.display_order`
        : `SELECT g.*, p.name AS player_name, p.slug AS player_slug,
                  t.color_primary AS team_color, t.name AS team_name
           FROM player_gear g
           JOIN players p ON p.id = g.player_id
           JOIN teams   t ON t.id = p.team_id
           ORDER BY g.category, g.display_order`,
      args: category ? [category] : [],
    });
    res.json(rows);
  } catch (e) {
    serverError(res, e);
  }
});

export default router;
