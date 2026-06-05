import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { serverError } from '../utils/apiError.js';

const router = Router();

// GET /api/players/:slug/comments
router.get('/players/:slug/comments', async (req, res) => {
  try {
    const { rows: [player] } = await db.execute({
      sql: 'SELECT id FROM players WHERE slug = ?', args: [req.params.slug],
    });
    if (!player) return res.status(404).json({ error: '선수를 찾을 수 없습니다.' });

    const { rows } = await db.execute({
      sql: `SELECT c.id, c.parent_id, c.content, c.created_at,
                   u.id AS user_id, u.nickname,
                   u.role, u.player_id AS user_player_id
            FROM player_comments c
            JOIN users u ON u.id = c.user_id
            WHERE c.player_id = ?
            ORDER BY c.created_at ASC`,
      args: [player.id],
    });

    // 댓글/답글 트리 구성
    const top = [], map = {};
    for (const r of rows) {
      const item = {
        id: r.id, parent_id: r.parent_id,
        content: r.content, created_at: r.created_at,
        user: { id: r.user_id, nickname: r.nickname, role: r.role, player_id: r.user_player_id },
        replies: [],
      };
      map[r.id] = item;
      if (r.parent_id) map[r.parent_id]?.replies.push(item);
      else top.push(item);
    }

    res.json(top);
  } catch (e) { serverError(res, e); }
});

// POST /api/players/:slug/comments
router.post('/players/:slug/comments', requireAuth, async (req, res) => {
  try {
    const { content, parent_id } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: '내용을 입력해주세요.' });
    if (content.trim().length > 300) return res.status(400).json({ error: '300자 이내로 입력해주세요.' });

    const { rows: [player] } = await db.execute({
      sql: 'SELECT id FROM players WHERE slug = ?', args: [req.params.slug],
    });
    if (!player) return res.status(404).json({ error: '선수를 찾을 수 없습니다.' });

    if (parent_id) {
      const { rows: [parent] } = await db.execute({
        sql: 'SELECT id FROM player_comments WHERE id = ? AND player_id = ?',
        args: [parent_id, player.id],
      });
      if (!parent) return res.status(400).json({ error: '원본 댓글을 찾을 수 없습니다.' });
    }

    const { lastInsertRowid } = await db.execute({
      sql: 'INSERT INTO player_comments (player_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
      args: [player.id, req.user.userId, parent_id ?? null, content.trim()],
    });

    const { rows: [comment] } = await db.execute({
      sql: `SELECT c.id, c.parent_id, c.content, c.created_at,
                   u.id AS user_id, u.nickname, u.role, u.player_id AS user_player_id
            FROM player_comments c JOIN users u ON u.id = c.user_id
            WHERE c.id = ?`,
      args: [Number(lastInsertRowid)],
    });

    res.status(201).json({
      id: comment.id, parent_id: comment.parent_id,
      content: comment.content, created_at: comment.created_at,
      user: { id: comment.user_id, nickname: comment.nickname, role: comment.role, player_id: comment.user_player_id },
      replies: [],
    });
  } catch (e) { serverError(res, e); }
});

// DELETE /api/comments/:id
router.delete('/comments/:id', requireAuth, async (req, res) => {
  try {
    const { rows: [comment] } = await db.execute({
      sql: 'SELECT user_id FROM player_comments WHERE id = ?', args: [req.params.id],
    });
    if (!comment) return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
    if (comment.user_id !== req.user.userId)
      return res.status(403).json({ error: '본인 댓글만 삭제할 수 있습니다.' });

    await db.execute({ sql: 'DELETE FROM player_comments WHERE id = ?', args: [req.params.id] });
    res.json({ success: true });
  } catch (e) { serverError(res, e); }
});

export default router;
