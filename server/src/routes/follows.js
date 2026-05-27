import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { serverError } from '../utils/apiError.js';

const router = Router();

// GET /api/follows/check/:playerId — 특정 선수 팔로우 여부 (인증 필요)
router.get('/check/:playerId', requireAuth, async (req, res) => {
  const { rows: [row] } = await db.execute({
    sql:  'SELECT 1 FROM follows WHERE user_id = ? AND player_id = ?',
    args: [req.user.userId, req.params.playerId],
  });
  res.json({ followed: !!row });
});

// GET /api/follows/me — 내가 팔로우한 선수 ID 목록 (인증 필요)
router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await db.execute({
    sql:  'SELECT player_id FROM follows WHERE user_id = ?',
    args: [req.user.userId],
  });
  res.json(rows.map((r) => r.player_id));
});

// POST /api/follows — 팔로우 (인증 필요)
// body: { playerId }
router.post('/', requireAuth, async (req, res) => {
  const { playerId } = req.body;
  if (!playerId) return res.status(400).json({ error: 'playerId가 필요합니다.' });

  try {
    await db.execute({
      sql:  'INSERT INTO follows (user_id, player_id) VALUES (?, ?)',
      args: [req.user.userId, playerId],
    });
  } catch (e) {
    if (e.message?.includes('UNIQUE') || e.message?.includes('PRIMARY KEY'))
      return res.json({ followed: true });
    return serverError(res, e);
  }
  res.json({ followed: true });
});

// DELETE /api/follows/:playerId — 팔로우 취소 (인증 필요)
router.delete('/:playerId', requireAuth, async (req, res) => {
  await db.execute({
    sql:  'DELETE FROM follows WHERE user_id = ? AND player_id = ?',
    args: [req.user.userId, req.params.playerId],
  });
  res.json({ followed: false });
});

export default router;
