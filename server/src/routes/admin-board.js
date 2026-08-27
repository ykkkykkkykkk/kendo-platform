// 관리자용 자유게시판 관리 — 신고 목록, 전체 글·댓글 조회, 블라인드 해제.
//
// 삭제는 board.js의 DELETE 라우트가 x-admin-token을 함께 받으므로 여기서 중복 구현하지 않는다.
import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { serverError } from '../utils/apiError.js';

const router = Router();
router.use(requireAdmin);

/* ── GET /api/admin/board/reports ──────────────────────────────
   신고된 대상만 모아 보여준다. 신고자 수 많은 순 → 최근 순.
   가려진 것과 아직 안 가려진 것을 함께 준다(2회 신고에서 멈춘 것도 봐야 하므로). */
router.get('/reports', async (_req, res) => {
  try {
    const { rows } = await db.execute(`
      SELECT r.target_type,
             r.target_id,
             COUNT(DISTINCT r.user_id) AS report_count,
             MAX(r.created_at)         AS last_reported_at,
             GROUP_CONCAT(DISTINCT r.reason) AS reasons,
             CASE r.target_type
               WHEN 'post'    THEN (SELECT p.title   FROM board_posts    p WHERE p.id = r.target_id)
               ELSE                (SELECT c.content FROM board_comments c WHERE c.id = r.target_id)
             END AS preview,
             CASE r.target_type
               WHEN 'post'    THEN (SELECT p.is_blinded FROM board_posts    p WHERE p.id = r.target_id)
               ELSE                (SELECT c.is_blinded FROM board_comments c WHERE c.id = r.target_id)
             END AS is_blinded,
             CASE r.target_type
               WHEN 'post'    THEN (SELECT u.nickname FROM board_posts    p JOIN users u ON u.id = p.user_id WHERE p.id = r.target_id)
               ELSE                (SELECT u.nickname FROM board_comments c JOIN users u ON u.id = c.user_id WHERE c.id = r.target_id)
             END AS author,
             CASE r.target_type
               WHEN 'post'    THEN r.target_id
               ELSE                (SELECT c.post_id FROM board_comments c WHERE c.id = r.target_id)
             END AS post_id
      FROM board_reports r
      GROUP BY r.target_type, r.target_id
      ORDER BY report_count DESC, last_reported_at DESC
      LIMIT 200
    `);

    // 이미 지워진 대상의 신고가 남아 있으면 preview가 null이다 — 그건 보여줄 게 없으므로 뺀다
    res.json(rows.filter((r) => r.preview !== null));
  } catch (e) { serverError(res, e, 'admin-board-reports'); }
});

/* ── GET /api/admin/board/posts?page=1 ─────────────────────────
   전체 글 목록. 공개 목록과 달리 가려진 글의 내용도 그대로 보여준다. */
router.get('/posts', async (req, res) => {
  try {
    const page   = Math.max(1, Number(req.query.page) || 1);
    const limit  = 30;
    const offset = (page - 1) * limit;

    const { rows: [c] } = await db.execute('SELECT COUNT(*) AS n FROM board_posts');

    const { rows } = await db.execute({
      sql: `SELECT b.id, b.title, b.content, b.image_url, b.video_id,
                   b.like_count, b.comment_count, b.is_blinded, b.created_at,
                   u.nickname, d.name AS dojo_name,
                   (SELECT COUNT(DISTINCT user_id) FROM board_reports
                     WHERE target_type = 'post' AND target_id = b.id) AS report_count
            FROM board_posts b
            JOIN users u ON u.id = b.user_id
            LEFT JOIN dojos d ON d.id = u.dojo_id
            ORDER BY b.created_at DESC, b.id DESC
            LIMIT ? OFFSET ?`,
      args: [limit, offset],
    });

    res.json({ page, total: Number(c?.n ?? 0), posts: rows });
  } catch (e) { serverError(res, e, 'admin-board-posts'); }
});

/* ── GET /api/admin/board/posts/:id/comments ─────────────────── */
router.get('/posts/:id/comments', async (req, res) => {
  try {
    const { rows } = await db.execute({
      sql: `SELECT c.id, c.parent_id, c.content, c.is_blinded, c.is_deleted, c.created_at,
                   u.nickname, d.name AS dojo_name,
                   (SELECT COUNT(DISTINCT user_id) FROM board_reports
                     WHERE target_type = 'comment' AND target_id = c.id) AS report_count
            FROM board_comments c
            JOIN users u ON u.id = c.user_id
            LEFT JOIN dojos d ON d.id = u.dojo_id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC, c.id ASC`,
      args: [req.params.id],
    });
    res.json(rows);
  } catch (e) { serverError(res, e, 'admin-board-comments'); }
});

/* ── PUT /api/admin/board/blind ────────────────────────────────
   { target_type, target_id, blinded: true|false }
   신고가 부당했을 때 되살리고, 신고 3회가 안 됐어도 먼저 가릴 수 있게 양방향으로 둔다. */
router.put('/blind', async (req, res) => {
  try {
    const { target_type, target_id, blinded } = req.body ?? {};
    if (!['post', 'comment'].includes(target_type))
      return res.status(400).json({ error: '대상이 올바르지 않습니다.' });

    const table = target_type === 'post' ? 'board_posts' : 'board_comments';
    const value = blinded ? 1 : 0;

    await db.execute({
      sql: `UPDATE ${table} SET is_blinded = ? WHERE id = ?`, args: [value, target_id],
    });

    /* 해제할 때는 쌓인 신고도 지운다. 남겨두면 다음 한 명만 더 신고해도
       곧바로 다시 가려져서, 관리자가 해제한 판단이 무의미해진다. */
    if (!blinded) {
      await db.execute({
        sql: 'DELETE FROM board_reports WHERE target_type = ? AND target_id = ?',
        args: [target_type, target_id],
      });
    }

    res.json({ ok: true, is_blinded: value });
  } catch (e) { serverError(res, e, 'admin-board-blind'); }
});

export default router;
