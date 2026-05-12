import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/predictions?matchId=X&userId=Y
router.get('/', async (req, res) => {
  const { matchId, userId } = req.query;
  if (!matchId || !userId)
    return res.status(400).json({ error: 'matchId, userId 파라미터가 필요합니다.' });

  const { rows: [prediction] } = await db.execute({
    sql:  'SELECT * FROM predictions WHERE match_id = ? AND user_id = ?',
    args: [matchId, userId],
  });
  res.json(prediction ?? null);
});

// POST /api/predictions
// body: { userId, matchId, predictedWinnerPlayerId? }
router.post('/', async (req, res) => {
  const { userId, matchId, predictedWinnerPlayerId } = req.body;

  if (!userId || !matchId || !predictedWinnerPlayerId)
    return res.status(400).json({ error: '필수 항목이 누락됐습니다.' });

  // 경기가 예정 상태인지 확인
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
    return res.status(500).json({ error: e.message });
  }

  const { rows: [prediction] } = await db.execute({
    sql:  'SELECT * FROM predictions WHERE user_id = ? AND match_id = ?',
    args: [userId, matchId],
  });
  res.status(201).json(prediction);
});

export default router;
