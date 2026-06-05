import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { serverError } from '../utils/apiError.js';

const router = Router();

const CATEGORIES = ['버그신고', '기능제안', '계정문의', '도장문의', '기타'];

// POST /api/inquiries — 문의 제출 (비로그인 가능)
router.post('/inquiries', async (req, res) => {
  try {
    const { nickname, category, content } = req.body;
    if (!nickname?.trim()) return res.status(400).json({ error: '닉네임을 입력해주세요.' });
    if (!content?.trim() || content.trim().length < 5)
      return res.status(400).json({ error: '내용을 5자 이상 입력해주세요.' });
    if (category && !CATEGORIES.includes(category))
      return res.status(400).json({ error: '올바른 카테고리를 선택해주세요.' });

    // JWT에서 userId 파싱 시도 (선택적 인증)
    let userId = null;
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      try {
        const payload = JSON.parse(Buffer.from(auth.split('.')[1], 'base64').toString());
        userId = payload.userId ?? null;
      } catch {}
    }

    const { lastInsertRowid } = await db.execute({
      sql:  `INSERT INTO inquiries (user_id, nickname, category, content)
             VALUES (?, ?, ?, ?)`,
      args: [userId, nickname.trim(), category || '기타', content.trim()],
    });

    res.status(201).json({ success: true, id: Number(lastInsertRowid) });
  } catch (e) { serverError(res, e); }
});

// GET /api/inquiries/my — 내 문의 목록 (닉네임+userId 기준)
router.get('/inquiries/my', async (req, res) => {
  try {
    let userId = null;
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      try {
        const payload = JSON.parse(Buffer.from(auth.split('.')[1], 'base64').toString());
        userId = payload.userId ?? null;
      } catch {}
    }
    if (!userId) return res.json([]);

    const { rows } = await db.execute({
      sql:  `SELECT id, category, content, status, admin_reply, replied_at, created_at
             FROM inquiries WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
      args: [userId],
    });
    res.json(rows);
  } catch (e) { serverError(res, e); }
});

// ── 관리자 API ───────────────────────────────────────────────────

// GET /api/admin/inquiries
router.get('/admin/inquiries', requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const args = [];
    let where = '';
    if (status) { where = 'WHERE i.status = ?'; args.push(status); }

    const { rows } = await db.execute({
      sql: `SELECT i.id, i.nickname, i.category, i.content,
                   i.status, i.admin_reply, i.replied_at, i.created_at,
                   u.id AS user_id
            FROM inquiries i
            LEFT JOIN users u ON u.id = i.user_id
            ${where}
            ORDER BY
              CASE i.status WHEN 'pending' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
              i.created_at DESC`,
      args,
    });
    res.json(rows);
  } catch (e) { serverError(res, e); }
});

// PATCH /api/admin/inquiries/:id — 상태 변경 + 답변
router.patch('/admin/inquiries/:id', requireAdmin, async (req, res) => {
  try {
    const { status, admin_reply } = req.body;
    const now = new Date().toISOString();

    await db.execute({
      sql: `UPDATE inquiries
            SET status      = COALESCE(?, status),
                admin_reply = COALESCE(?, admin_reply),
                replied_at  = CASE WHEN ? IS NOT NULL THEN ? ELSE replied_at END
            WHERE id = ?`,
      args: [status ?? null, admin_reply ?? null, admin_reply ?? null, now, req.params.id],
    });

    const { rows: [updated] } = await db.execute({
      sql: 'SELECT * FROM inquiries WHERE id = ?', args: [req.params.id],
    });
    res.json(updated);
  } catch (e) { serverError(res, e); }
});

export default router;
