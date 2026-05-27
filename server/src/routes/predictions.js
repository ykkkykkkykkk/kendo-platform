import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { serverError } from '../utils/apiError.js';

const router = Router();

// GET /api/predictions?matchId=X — 내 예측 확인 (인증 필요)
router.get('/', requireAuth, async (req, res) => {
  const { matchId } = req.query;
  const userId = req.user.userId;

  if (!matchId)
    return res.status(400).json({ error: 'matchId 파라미터가 필요합니다.' });

  const { rows: [prediction] } = await db.execute({
    sql:  'SELECT * FROM predictions WHERE match_id = ? AND user_id = ?',
    args: [matchId, userId],
  });
  res.json(prediction ?? null);
});

// POST /api/predictions — 사용 중단 (픽 시스템으로 대체)
router.post('/', (_req, res) => {
  return res.status(410).json({
    error: 'Deprecated. Use POST /api/divisions/:id/pick instead.',
    code:  'GONE',
  });
});

// POST /api/predictions (구버전 — 도달 불가)
router.post('/_legacy', requireAuth, async (req, res) => {
  const { matchId, predictedWinnerPlayerId } = req.body;
  const userId = req.user.userId;

  if (!matchId || !predictedWinnerPlayerId)
    return res.status(400).json({ error: '필수 항목이 누락됐습니다.' });

  const { rows: [match] } = await db.execute({
    sql:  'SELECT status FROM matches WHERE id = ?',
    args: [matchId],
  });
  if (!match) return res.status(404).json({ error: '경기를 찾을 수 없습니다.' });
  if (match.status !== '예정')
    return res.status(400).json({ error: '이미 시작된 경기는 예측할 수 없습니다.' });

  try {
    await db.execute({
      sql:  `INSERT INTO predictions (user_id, match_id, predicted_winner_player_id)
             VALUES (?, ?, ?)`,
      args: [userId, matchId, predictedWinnerPlayerId],
    });
  } catch (e) {
    if (e.message?.includes('UNIQUE'))
      return res.status(409).json({ error: '이미 예측하셨습니다.' });
    return serverError(res, e);
  }

  const { rows: [prediction] } = await db.execute({
    sql:  'SELECT * FROM predictions WHERE user_id = ? AND match_id = ?',
    args: [userId, matchId],
  });
  res.status(201).json(prediction);
});

// GET /api/predictions/me?tournament_id=X (인증 필요)
router.get('/me', requireAuth, async (req, res) => {
  const { tournament_id } = req.query;
  const userId = req.user.userId;

  if (!tournament_id)
    return res.status(400).json({ error: 'tournament_id 파라미터가 필요합니다.' });

  const { rows } = await db.execute({
    sql: `SELECT p.*
          FROM predictions p
          JOIN matches m ON m.id = p.match_id
          WHERE m.tournament_id = ? AND p.user_id = ?`,
    args: [tournament_id, userId],
  });
  res.json(rows);
});

export default router;
