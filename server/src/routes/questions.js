import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { serverError } from '../utils/apiError.js';

const router = Router();

const SELECT_Q = `
  SELECT q.id, q.question, q.answer, q.answered_at, q.created_at,
         u.nickname AS asker
  FROM player_questions q
  JOIN users u ON u.id = q.user_id
`;

// GET /api/players/:slug/questions — 공개: 질문/답변 목록 (답변된 것 우선, 최신순)
router.get('/players/:slug/questions', async (req, res) => {
  try {
    const { rows: [player] } = await db.execute({
      sql: 'SELECT id FROM players WHERE slug = ?', args: [req.params.slug],
    });
    if (!player) return res.status(404).json({ error: '선수를 찾을 수 없습니다.' });

    const { rows } = await db.execute({
      sql: `${SELECT_Q} WHERE q.player_id = ?
            ORDER BY (q.answer IS NOT NULL) DESC, q.created_at DESC`,
      args: [player.id],
    });
    res.json(rows);
  } catch (e) { serverError(res, e); }
});

// GET /api/players/:slug/questions/quota — 로그인 유저의 오늘 질문 가능 여부 (계정당 하루 1회)
router.get('/players/:slug/questions/quota', requireAuth, async (req, res) => {
  try {
    const { rows: [c] } = await db.execute({
      sql: `SELECT COUNT(*) AS cnt FROM player_questions
            WHERE user_id = ? AND date(created_at, '+9 hours') = date('now', '+9 hours')`,
      args: [req.user.userId],
    });
    res.json({ canAsk: c.cnt === 0, usedToday: c.cnt });
  } catch (e) { serverError(res, e); }
});

// POST /api/players/:slug/questions — 질문 등록 (로그인 필요, 계정당 하루 1회)
router.post('/players/:slug/questions', requireAuth, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question?.trim()) return res.status(400).json({ error: '질문을 입력해주세요.' });
    if (question.trim().length > 200) return res.status(400).json({ error: '200자 이내로 입력해주세요.' });

    const { rows: [player] } = await db.execute({
      sql: 'SELECT id FROM players WHERE slug = ?', args: [req.params.slug],
    });
    if (!player) return res.status(404).json({ error: '선수를 찾을 수 없습니다.' });

    // 본인에게 질문 방지
    if (req.user.role === 'player' && req.user.playerId === player.id)
      return res.status(400).json({ error: '본인에게는 질문할 수 없습니다.' });

    // 계정당 하루 1회 제한 (KST 기준)
    const { rows: [c] } = await db.execute({
      sql: `SELECT COUNT(*) AS cnt FROM player_questions
            WHERE user_id = ? AND date(created_at, '+9 hours') = date('now', '+9 hours')`,
      args: [req.user.userId],
    });
    if (c.cnt > 0)
      return res.status(429).json({ error: '질문은 하루에 한 번만 가능해요. 내일 다시 물어봐 주세요!' });

    const { lastInsertRowid } = await db.execute({
      sql: 'INSERT INTO player_questions (player_id, user_id, question) VALUES (?, ?, ?)',
      args: [player.id, req.user.userId, question.trim()],
    });

    const { rows: [q] } = await db.execute({
      sql: `${SELECT_Q} WHERE q.id = ?`, args: [Number(lastInsertRowid)],
    });
    res.status(201).json(q);
  } catch (e) { serverError(res, e); }
});

// POST /api/questions/:id/answer — 선수 본인이 답변
router.post('/questions/:id/answer', requireAuth, async (req, res) => {
  try {
    const { answer } = req.body;
    if (!answer?.trim()) return res.status(400).json({ error: '답변을 입력해주세요.' });
    if (answer.trim().length > 300) return res.status(400).json({ error: '300자 이내로 입력해주세요.' });

    const { rows: [q] } = await db.execute({
      sql: 'SELECT player_id FROM player_questions WHERE id = ?', args: [req.params.id],
    });
    if (!q) return res.status(404).json({ error: '질문을 찾을 수 없습니다.' });
    if (!(req.user.role === 'player' && req.user.playerId === q.player_id))
      return res.status(403).json({ error: '해당 선수 본인만 답변할 수 있습니다.' });

    await db.execute({
      sql: "UPDATE player_questions SET answer = ?, answered_at = datetime('now') WHERE id = ?",
      args: [answer.trim(), req.params.id],
    });

    const { rows: [updated] } = await db.execute({
      sql: `${SELECT_Q} WHERE q.id = ?`, args: [req.params.id],
    });
    res.json(updated);
  } catch (e) { serverError(res, e); }
});

// DELETE /api/questions/:id — 질문자 본인 삭제
router.delete('/questions/:id', requireAuth, async (req, res) => {
  try {
    const { rows: [q] } = await db.execute({
      sql: 'SELECT user_id FROM player_questions WHERE id = ?', args: [req.params.id],
    });
    if (!q) return res.status(404).json({ error: '질문을 찾을 수 없습니다.' });
    if (q.user_id !== req.user.userId)
      return res.status(403).json({ error: '본인 질문만 삭제할 수 있습니다.' });

    await db.execute({ sql: 'DELETE FROM player_questions WHERE id = ?', args: [req.params.id] });
    res.json({ success: true });
  } catch (e) { serverError(res, e); }
});

export default router;
