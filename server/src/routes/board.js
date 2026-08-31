// 유저 자유게시판 — 목록·작성·상세·댓글·좋아요·신고·삭제.
//
// 선수 소식(posts.js)과 달리 회원 누구나 쓴다. 그래서 안전장치가 붙는다:
// 서로 다른 3명이 신고하면 자동으로 가려지고, 본인과 관리자만 지울 수 있다.
import jwt from 'jsonwebtoken';
import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { normalizeVideoUrl } from '../utils/videoUrl.js';
import { serverError } from '../utils/apiError.js';
import { notify } from '../utils/notify.js';

const router = Router();

const MAX_TITLE   = 100;
const MAX_CONTENT = 5000;
const MAX_COMMENT = 1000;
const PAGE_SIZE   = 20;
/** 이 인원이 신고하면 가린다. 같은 사람의 반복 신고는 UNIQUE 제약이 막는다. */
const BLIND_AT    = 3;

/** 목록·상세·댓글이 모두 쓰는 글쓴이 표기. 도장이 없으면 dojo_name이 null이다. */
const authorJoin = (alias) =>
  `JOIN users u ON u.id = ${alias}.user_id LEFT JOIN dojos d ON d.id = u.dojo_id`;

/** 가려진 글·댓글은 내용을 내보내지 않는다. 화면에서 안 그리는 것만으로는 부족하다. */
function maskIfBlinded(row, fields) {
  if (!row.is_blinded) return row;
  const out = { ...row };
  for (const f of fields) out[f] = null;
  return out;
}

/** Bearer 토큰이 있으면 userId를, 없거나 틀리면 null. 비로그인도 목록을 볼 수 있어야 한다. */
function optionalUserId(req) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(h.slice(7), process.env.JWT_SECRET)?.userId ?? null;
  } catch { return null; }
}

const isAdmin = (req) =>
  !!process.env.ADMIN_TOKEN && req.headers['x-admin-token'] === process.env.ADMIN_TOKEN;

/* ════════════ 목록 ════════════ */

// GET /api/board?page=1 — 최신순 20개씩
router.get('/', async (req, res) => {
  try {
    const page   = Math.max(1, Number(req.query.page) || 1);
    const offset = (page - 1) * PAGE_SIZE;

    const { rows: [c] } = await db.execute('SELECT COUNT(*) AS n FROM board_posts');
    const total = Number(c?.n ?? 0);

    const { rows } = await db.execute({
      sql: `SELECT b.id, b.title, b.content, b.image_url, b.video_id,
                   b.like_count, b.comment_count, b.is_blinded, b.created_at,
                   u.nickname, d.name AS dojo_name
            FROM board_posts b ${authorJoin('b')}
            ORDER BY b.created_at DESC, b.id DESC
            LIMIT ? OFFSET ?`,
      args: [PAGE_SIZE, offset],
    });

    res.json({
      page,
      total,
      has_more: offset + rows.length < total,
      posts: rows.map((r) => {
        const m = maskIfBlinded(r, ['title', 'content', 'image_url', 'video_id']);
        // 목록엔 본문을 통째로 보내지 않는다. 미리보기 두 줄이면 충분하다.
        return { ...m, content: m.content ? String(m.content).slice(0, 120) : null };
      }),
    });
  } catch (e) { serverError(res, e, 'board-list'); }
});

/* ════════════ 작성 ════════════ */

// POST /api/board — { title, content, image_url?, video_url? }
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, content, image_url, video_url } = req.body ?? {};

    const t = String(title ?? '').trim().slice(0, MAX_TITLE);
    const c = String(content ?? '').trim().slice(0, MAX_CONTENT);
    if (!t) return res.status(400).json({ error: '제목을 입력해주세요.' });
    if (!c) return res.status(400).json({ error: '내용을 입력해주세요.' });

    let imageUrl = null;
    if (image_url) {
      imageUrl = String(image_url).trim();
      if (!/^https:\/\//.test(imageUrl))
        return res.status(400).json({ error: '이미지 주소가 올바르지 않습니다.' });
    }

    // 링크를 넣었을 때만 검사한다. 유튜브가 아니면 video_id가 null이라 임베드 없이 링크만 남는다.
    let videoUrl = null, videoId = null;
    if (video_url) {
      const norm = normalizeVideoUrl(video_url);
      if (!norm.ok) return res.status(400).json({ error: norm.error });
      videoUrl = norm.url; videoId = norm.videoId;
    }

    const { lastInsertRowid } = await db.execute({
      sql: `INSERT INTO board_posts (user_id, title, content, image_url, video_url, video_id)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [req.user.userId, t, c, imageUrl, videoUrl, videoId],
    });

    res.status(201).json({ id: Number(lastInsertRowid) });
  } catch (e) { serverError(res, e, 'board-create'); }
});

/* ════════════ 신고 ════════════ */
/* 라우트 순서 주의: '/report'가 '/:id'보다 먼저 와야 id로 잡히지 않는다. */

// POST /api/board/report — { target_type: 'post'|'comment', target_id, reason? }
router.post('/report', requireAuth, async (req, res) => {
  try {
    const { target_type, target_id, reason } = req.body ?? {};
    if (!['post', 'comment'].includes(target_type))
      return res.status(400).json({ error: '신고 대상이 올바르지 않습니다.' });

    const table = target_type === 'post' ? 'board_posts' : 'board_comments';
    const { rows: [t] } = await db.execute({
      sql: `SELECT id, user_id FROM ${table} WHERE id = ?`, args: [target_id],
    });
    if (!t) return res.status(404).json({ error: '대상을 찾을 수 없습니다.' });
    if (t.user_id === req.user.userId)
      return res.status(400).json({ error: '본인 글은 신고할 수 없습니다.' });

    try {
      await db.execute({
        sql: 'INSERT INTO board_reports (target_type, target_id, user_id, reason) VALUES (?, ?, ?, ?)',
        args: [target_type, target_id, req.user.userId, String(reason ?? '').trim().slice(0, 200) || null],
      });
    } catch (e) {
      if (e.message?.includes('UNIQUE')) return res.json({ ok: true, already: true });
      throw e;
    }

    // 서로 다른 신고자 수로 판단한다(같은 사람 반복은 UNIQUE가 이미 막았다)
    const { rows: [cnt] } = await db.execute({
      sql: 'SELECT COUNT(DISTINCT user_id) AS n FROM board_reports WHERE target_type = ? AND target_id = ?',
      args: [target_type, target_id],
    });
    const reports = Number(cnt?.n ?? 0);

    let blinded = false;
    if (reports >= BLIND_AT) {
      await db.execute({ sql: `UPDATE ${table} SET is_blinded = 1 WHERE id = ?`, args: [target_id] });
      blinded = true;
    }

    res.json({ ok: true, reports, blinded });
  } catch (e) { serverError(res, e, 'board-report'); }
});

/* ════════════ 댓글 삭제 ════════════ */
/* '/comment/:cid'도 '/:id'보다 먼저 둔다. */

// DELETE /api/board/comment/:cid — 본인 또는 관리자
router.delete('/comment/:cid', async (req, res) => {
  try {
    const cid   = Number(req.params.cid);
    const admin = isAdmin(req);
    const me    = admin ? null : optionalUserId(req);
    if (!admin && !me) return res.status(401).json({ error: '인증이 필요합니다.' });

    const { rows: [c] } = await db.execute({
      sql: 'SELECT id, user_id, post_id FROM board_comments WHERE id = ?', args: [cid],
    });
    if (!c) return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
    if (!admin && c.user_id !== me) return res.status(403).json({ error: '본인 댓글만 삭제할 수 있습니다.' });

    // 답글이 달려 있으면 자리만 남긴다(답글이 사라지면 안 되므로)
    const { rows: [kids] } = await db.execute({
      sql: 'SELECT COUNT(*) AS n FROM board_comments WHERE parent_id = ?', args: [cid],
    });

    if (Number(kids.n) > 0) {
      await db.execute({ sql: 'UPDATE board_comments SET is_deleted = 1 WHERE id = ?', args: [cid] });
    } else {
      await db.execute({ sql: 'DELETE FROM board_comments WHERE id = ?', args: [cid] });
      await db.execute({
        sql: 'DELETE FROM board_reports WHERE target_type = ? AND target_id = ?', args: ['comment', cid],
      });
      await db.execute({
        sql: 'UPDATE board_posts SET comment_count = MAX(0, comment_count - 1) WHERE id = ?',
        args: [c.post_id],
      });
    }
    res.json({ ok: true });
  } catch (e) { serverError(res, e, 'board-comment-delete'); }
});

/* ════════════ 상세 ════════════ */

// GET /api/board/:id — 글 + 댓글(대댓글 포함)
router.get('/:id', async (req, res) => {
  try {
    const me = optionalUserId(req);

    const { rows: [post] } = await db.execute({
      sql: `SELECT b.*, u.nickname, d.name AS dojo_name
            FROM board_posts b ${authorJoin('b')}
            WHERE b.id = ?`,
      args: [req.params.id],
    });
    if (!post) return res.status(404).json({ error: '글을 찾을 수 없습니다.' });

    const { rows: comments } = await db.execute({
      sql: `SELECT c.id, c.parent_id, c.content, c.is_blinded, c.is_deleted, c.created_at,
                   c.user_id, u.nickname, d.name AS dojo_name
            FROM board_comments c ${authorJoin('c')}
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC, c.id ASC`,
      args: [req.params.id],
    });

    let liked = false;
    if (me) {
      const { rows: [l] } = await db.execute({
        sql: 'SELECT 1 FROM board_likes WHERE post_id = ? AND user_id = ?',
        args: [req.params.id, me],
      });
      liked = !!l;
    }

    res.json({
      post: {
        ...maskIfBlinded(post, ['title', 'content', 'image_url', 'video_id', 'video_url']),
        is_mine: me != null && me === post.user_id,
        liked,
      },
      comments: comments.map((c) => ({
        ...c,
        // 지운 댓글과 가려진 댓글 모두 내용은 내보내지 않는다
        content: (c.is_deleted || c.is_blinded) ? null : c.content,
        is_mine: me != null && me === c.user_id,
      })),
    });
  } catch (e) { serverError(res, e, 'board-detail'); }
});

/* ════════════ 댓글 작성 ════════════ */

// POST /api/board/:id/comment — { content, parent_id? }
router.post('/:id/comment', requireAuth, async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const text   = String(req.body?.content ?? '').trim().slice(0, MAX_COMMENT);
    if (!text) return res.status(400).json({ error: '댓글을 입력해주세요.' });

    const { rows: [post] } = await db.execute({
      sql: 'SELECT id, user_id, title FROM board_posts WHERE id = ?', args: [postId],
    });
    if (!post) return res.status(404).json({ error: '글을 찾을 수 없습니다.' });

    /* 대댓글은 1단계까지다. 답글에 답글을 달려고 하면 그 부모(원 댓글)에 붙인다 —
       거절하는 것보다 자연스럽고, 깊이가 무한정 늘어나지 않는다. */
    let parentId = req.body?.parent_id ? Number(req.body.parent_id) : null;
    if (parentId) {
      const { rows: [p] } = await db.execute({
        sql: 'SELECT id, parent_id, post_id FROM board_comments WHERE id = ?', args: [parentId],
      });
      if (!p || p.post_id !== postId) return res.status(400).json({ error: '없는 댓글입니다.' });
      parentId = p.parent_id ?? p.id;
    }

    const { lastInsertRowid } = await db.execute({
      sql: 'INSERT INTO board_comments (post_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
      args: [postId, req.user.userId, parentId, text],
    });
    await db.execute({
      sql: 'UPDATE board_posts SET comment_count = comment_count + 1 WHERE id = ?', args: [postId],
    });

    /* 알림 — 글쓴이와, 대댓글이면 원 댓글 작성자에게.
       내 글에 내가 다는 건 알릴 이유가 없고, 글쓴이와 원 댓글 작성자가 같은 사람이면
       답글 쪽으로 한 번만 간다(같은 사건으로 두 번 울리지 않게). */
    const me = req.user.userId;
    const { rows: [writer] } = await db.execute({
      sql: 'SELECT nickname FROM users WHERE id = ?', args: [me],
    });
    const who     = writer?.nickname ?? '누군가';
    const snippet = text.length > 30 ? `${text.slice(0, 30)}…` : text;
    const title   = post.title.length > 20 ? `${post.title.slice(0, 20)}…` : post.title;
    const link    = `/board/${postId}`;
    const done    = new Set([me]);

    if (parentId) {
      const { rows: [parent] } = await db.execute({
        sql: 'SELECT user_id FROM board_comments WHERE id = ?', args: [parentId],
      });
      if (parent && !done.has(parent.user_id)) {
        done.add(parent.user_id);
        await notify([parent.user_id], {
          type: 'board_reply',
          message: `${who}님이 회원님 댓글에 답했어요 — "${snippet}"`,
          link,
        });
      }
    }
    if (!done.has(post.user_id)) {
      await notify([post.user_id], {
        type: 'board_comment',
        message: `${who}님이 "${title}"에 댓글을 남겼어요`,
        link,
      });
    }

    res.status(201).json({ id: Number(lastInsertRowid) });
  } catch (e) { serverError(res, e, 'board-comment'); }
});

/* ════════════ 좋아요 ════════════ */

// POST /api/board/:id/like — 토글
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const userId = req.user.userId;

    const { rows: [existing] } = await db.execute({
      sql: 'SELECT 1 FROM board_likes WHERE post_id = ? AND user_id = ?', args: [postId, userId],
    });

    if (existing) {
      await db.execute({
        sql: 'DELETE FROM board_likes WHERE post_id = ? AND user_id = ?', args: [postId, userId],
      });
      await db.execute({
        sql: 'UPDATE board_posts SET like_count = MAX(0, like_count - 1) WHERE id = ?', args: [postId],
      });
    } else {
      await db.execute({
        sql: 'INSERT INTO board_likes (post_id, user_id) VALUES (?, ?)', args: [postId, userId],
      });
      await db.execute({
        sql: 'UPDATE board_posts SET like_count = like_count + 1 WHERE id = ?', args: [postId],
      });
    }

    const { rows: [p] } = await db.execute({
      sql: 'SELECT like_count FROM board_posts WHERE id = ?', args: [postId],
    });
    res.json({ liked: !existing, like_count: Number(p?.like_count ?? 0) });
  } catch (e) { serverError(res, e, 'board-like'); }
});

/* ════════════ 글 삭제 ════════════ */

// DELETE /api/board/:id — 본인 또는 관리자
router.delete('/:id', async (req, res) => {
  try {
    const id    = Number(req.params.id);
    const admin = isAdmin(req);
    const me    = admin ? null : optionalUserId(req);
    if (!admin && !me) return res.status(401).json({ error: '인증이 필요합니다.' });

    const { rows: [post] } = await db.execute({
      sql: 'SELECT id, user_id FROM board_posts WHERE id = ?', args: [id],
    });
    if (!post) return res.status(404).json({ error: '글을 찾을 수 없습니다.' });
    if (!admin && post.user_id !== me) return res.status(403).json({ error: '본인 글만 삭제할 수 있습니다.' });

    // 글이 사라지면 딸린 것도 남길 이유가 없다
    await db.execute({
      sql: `DELETE FROM board_reports WHERE target_type = 'comment'
              AND target_id IN (SELECT id FROM board_comments WHERE post_id = ?)`,
      args: [id],
    });
    await db.execute({ sql: 'DELETE FROM board_comments WHERE post_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM board_likes WHERE post_id = ?', args: [id] });
    await db.execute({
      sql: "DELETE FROM board_reports WHERE target_type = 'post' AND target_id = ?", args: [id],
    });
    await db.execute({ sql: 'DELETE FROM board_posts WHERE id = ?', args: [id] });

    res.json({ ok: true });
  } catch (e) { serverError(res, e, 'board-delete'); }
});

export default router;
