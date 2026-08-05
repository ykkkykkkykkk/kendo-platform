// 선수 포스팅 · 팔로워 피드 · 응원 · 댓글 · 선수 하트/답글 · 알림.
//
// 선수 인증은 기존 방식 그대로다 — JWT의 role='player'와 playerId를 쓴다
// (questions.js의 선수 답변과 같은 패턴).
import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { normalizeVideoUrl } from '../utils/videoUrl.js';
import { notify, userIdOfPlayer } from '../utils/notify.js';
import { serverError } from '../utils/apiError.js';

const router = Router();

const MAX_CONTENT = 1000;

/** 선수 계정인지 확인하고 playerId를 돌려준다. 아니면 403 응답 후 null. */
function playerOf(req, res) {
  const pid = req.user?.playerId;
  if (req.user?.role !== 'player' || !pid) {
    res.status(403).json({ error: '선수 계정만 사용할 수 있습니다.' });
    return null;
  }
  return pid;
}

const playerName = async (playerId) => {
  const { rows: [p] } = await db.execute({
    sql: 'SELECT name, slug FROM players WHERE id = ?', args: [playerId],
  });
  return p ?? { name: '선수', slug: '' };
};

/* ════════════ 1. 선수 포스팅 ════════════ */

// POST /api/player/posts — 선수가 글 올리기
router.post('/player/posts', requireAuth, async (req, res) => {
  try {
    const playerId = playerOf(req, res); if (!playerId) return;
    const { type, content, video_url, image_url } = req.body ?? {};

    if (!['text', 'video', 'image'].includes(type))
      return res.status(400).json({ error: '올릴 종류를 확인해주세요.' });

    const text = String(content ?? '').trim().slice(0, MAX_CONTENT);
    let videoUrl = null, videoId = null, imageUrl = null;

    if (type === 'video') {
      const norm = normalizeVideoUrl(video_url);
      if (!norm.ok) return res.status(400).json({ error: norm.error });
      videoUrl = norm.url; videoId = norm.videoId;
    } else if (type === 'image') {
      imageUrl = String(image_url ?? '').trim();
      if (!/^https?:\/\//.test(imageUrl)) return res.status(400).json({ error: '사진을 올려주세요.' });
    } else if (!text) {
      return res.status(400).json({ error: '내용을 입력해주세요.' });
    }

    const { lastInsertRowid } = await db.execute({
      sql: `INSERT INTO posts (player_id, type, content, video_url, video_id, image_url)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [playerId, type, text || null, videoUrl, videoId, imageUrl],
    });
    const postId = Number(lastInsertRowid);

    // 이 선수를 팔로우한 사람에게 알림
    const { rows: fans } = await db.execute({
      sql: 'SELECT user_id FROM follows WHERE player_id = ?', args: [playerId],
    });
    const p = await playerName(playerId);
    await notify(fans.map((f) => f.user_id), {
      type: 'new_post',
      message: `${p.name} 선수가 새 소식을 올렸어요`,
      link: '/feed',
    });

    const { rows: [post] } = await db.execute({ sql: 'SELECT * FROM posts WHERE id = ?', args: [postId] });
    res.status(201).json({ post, notified: fans.length });
  } catch (e) { serverError(res, e, 'post-create'); }
});

// DELETE /api/player/posts/:id — 본인 글만
router.delete('/player/posts/:id', requireAuth, async (req, res) => {
  try {
    const playerId = playerOf(req, res); if (!playerId) return;
    const { rows: [post] } = await db.execute({
      sql: 'SELECT id FROM posts WHERE id = ? AND player_id = ?', args: [req.params.id, playerId],
    });
    if (!post) return res.status(404).json({ error: '글을 찾을 수 없습니다.' });

    await db.execute({ sql: 'DELETE FROM post_likes WHERE post_id = ?',    args: [post.id] });
    await db.execute({ sql: 'DELETE FROM post_comments WHERE post_id = ?', args: [post.id] });
    await db.execute({ sql: 'DELETE FROM posts WHERE id = ?',              args: [post.id] });
    res.json({ deleted: post.id });
  } catch (e) { serverError(res, e, 'post-delete'); }
});

// GET /api/player/posts — 선수 본인 글 목록
router.get('/player/posts', requireAuth, async (req, res) => {
  try {
    const playerId = playerOf(req, res); if (!playerId) return;
    const { rows } = await db.execute({
      sql: 'SELECT * FROM posts WHERE player_id = ? ORDER BY created_at DESC, id DESC',
      args: [playerId],
    });
    res.json(rows);
  } catch (e) { serverError(res, e, 'my-posts'); }
});

/* ════════════ 2. 피드 ════════════ */

const POST_SELECT = `
  SELECT p.id, p.type, p.content, p.video_url, p.video_id, p.image_url,
         p.like_count, p.comment_count, p.created_at,
         pl.id AS player_id, pl.name AS player_name, pl.slug AS player_slug,
         pl.profile_image_url, t.name AS team_name,
         EXISTS(SELECT 1 FROM post_likes lk WHERE lk.post_id = p.id AND lk.user_id = ?) AS liked
  FROM posts p
  JOIN players pl ON pl.id = p.player_id
  LEFT JOIN teams t ON t.id = pl.team_id`;

// GET /api/feed?limit=20&before=<id> — 내가 팔로우한 선수들의 글
router.get('/feed', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit  = Math.min(Number(req.query.limit) || 20, 50);
    const before = req.query.before ? Number(req.query.before) : null;

    // 선수는 자기 자신을 팔로우하지 않으므로, 선수 계정이면 본인 글도 함께 보여준다.
    // (글을 올리고 피드에 아무것도 안 뜨면 실패한 줄 안다)
    const myPlayerId = req.user.role === 'player' ? req.user.playerId : null;

    const { rows } = await db.execute({
      sql: `${POST_SELECT}
            WHERE (p.player_id IN (SELECT player_id FROM follows WHERE user_id = ?)
                   ${myPlayerId ? 'OR p.player_id = ?' : ''})
              ${before ? 'AND p.id < ?' : ''}
            ORDER BY p.id DESC
            LIMIT ?`,
      args: [
        userId, userId,
        ...(myPlayerId ? [myPlayerId] : []),
        ...(before ? [before] : []),
        limit + 1,
      ],
    });

    const hasMore = rows.length > limit;
    const posts   = hasMore ? rows.slice(0, limit) : rows;

    const { rows: [{ n: followCount }] } = await db.execute({
      sql: 'SELECT COUNT(*) AS n FROM follows WHERE user_id = ?', args: [userId],
    });

    res.json({ posts, has_more: hasMore, next_before: posts.at(-1)?.id ?? null, follow_count: followCount });
  } catch (e) { serverError(res, e, 'feed'); }
});

// GET /api/players/:slug/posts — 선수 페이지에 보이는 글 (공개)
router.get('/players/:slug/posts', async (req, res) => {
  try {
    const { rows: [pl] } = await db.execute({
      sql: 'SELECT id FROM players WHERE slug = ?', args: [req.params.slug],
    });
    if (!pl) return res.status(404).json({ error: '선수를 찾을 수 없습니다.' });
    const { rows } = await db.execute({
      sql: `${POST_SELECT} WHERE p.player_id = ? ORDER BY p.id DESC LIMIT 20`,
      args: [0, pl.id],   // 비로그인이면 liked는 항상 0
    });
    res.json(rows);
  } catch (e) { serverError(res, e, 'player-posts'); }
});

/* ════════════ 3. 응원(좋아요) · 댓글 ════════════ */

// POST /api/posts/:id/like — 토글
router.post('/posts/:id/like', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const postId = Number(req.params.id);
    const { rows: [post] } = await db.execute({ sql: 'SELECT id FROM posts WHERE id = ?', args: [postId] });
    if (!post) return res.status(404).json({ error: '글을 찾을 수 없습니다.' });

    const { rows: had } = await db.execute({
      sql: 'SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?', args: [postId, userId],
    });

    if (had.length) {
      await db.execute({ sql: 'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', args: [postId, userId] });
    } else {
      await db.execute({ sql: 'INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', args: [postId, userId] });
    }
    // 집계 컬럼을 실제 값으로 다시 센다(드리프트 방지)
    await db.execute({
      sql: 'UPDATE posts SET like_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = ?) WHERE id = ?',
      args: [postId, postId],
    });
    const { rows: [p] } = await db.execute({ sql: 'SELECT like_count FROM posts WHERE id = ?', args: [postId] });
    res.json({ liked: !had.length, like_count: p.like_count });
  } catch (e) { serverError(res, e, 'post-like'); }
});

// GET /api/posts/:id/comments
router.get('/posts/:id/comments', async (req, res) => {
  try {
    const { rows } = await db.execute({
      sql: `SELECT c.id, c.parent_id, c.content, c.is_player, c.liked_by_player, c.created_at,
                   u.nickname, u.id AS user_id,
                   pl.name AS player_name
            FROM post_comments c
            JOIN users u ON u.id = c.user_id
            LEFT JOIN players pl ON pl.id = u.player_id
            WHERE c.post_id = ?
            ORDER BY c.created_at, c.id`,
      args: [req.params.id],
    });
    res.json(rows);
  } catch (e) { serverError(res, e, 'comments'); }
});

// POST /api/posts/:id/comment — 팬 응원 댓글
router.post('/posts/:id/comment', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const postId = Number(req.params.id);
    const content = String(req.body?.content ?? '').trim().slice(0, 500);
    if (!content) return res.status(400).json({ error: '응원 내용을 입력해주세요.' });

    const { rows: [post] } = await db.execute({
      sql: 'SELECT id, player_id FROM posts WHERE id = ?', args: [postId],
    });
    if (!post) return res.status(404).json({ error: '글을 찾을 수 없습니다.' });

    await db.execute({
      sql: 'INSERT INTO post_comments (post_id, user_id, content, is_player) VALUES (?, ?, ?, 0)',
      args: [postId, userId, content],
    });
    await db.execute({
      sql: 'UPDATE posts SET comment_count = (SELECT COUNT(*) FROM post_comments WHERE post_id = ?) WHERE id = ?',
      args: [postId, postId],
    });

    // 글쓴 선수에게 알린다. 본인이 단 댓글이면 보내지 않는다.
    const ownerId = await userIdOfPlayer(post.player_id);
    if (ownerId && ownerId !== userId) {
      const { rows: [me] } = await db.execute({
        sql: 'SELECT nickname FROM users WHERE id = ?', args: [userId],
      });
      await notify([ownerId], {
        type: 'post_comment',
        message: `${me?.nickname ?? '팬'}님이 응원을 남겼어요 — "${content.slice(0, 30)}${content.length > 30 ? '…' : ''}"`,
        link: '/feed',
      });
    }

    res.status(201).json({ ok: true });
  } catch (e) { serverError(res, e, 'comment-create'); }
});

/* ════════════ 4. 선수 하트 · 답글 ════════════ */

/** 이 댓글이 '내(선수) 글'에 달린 것인지 확인하고 댓글+글을 돌려준다. */
async function ownComment(commentId, playerId) {
  const { rows: [c] } = await db.execute({
    sql: `SELECT c.id, c.user_id, c.post_id, p.player_id
          FROM post_comments c JOIN posts p ON p.id = c.post_id
          WHERE c.id = ?`,
    args: [commentId],
  });
  if (!c || c.player_id !== playerId) return null;
  return c;
}

// POST /api/player/comments/:id/like — 선수 하트(토글)
router.post('/player/comments/:id/like', requireAuth, async (req, res) => {
  try {
    const playerId = playerOf(req, res); if (!playerId) return;
    const c = await ownComment(Number(req.params.id), playerId);
    if (!c) return res.status(404).json({ error: '내 글의 댓글이 아닙니다.' });

    const { rows: [cur] } = await db.execute({
      sql: 'SELECT liked_by_player FROM post_comments WHERE id = ?', args: [c.id],
    });
    const next = cur.liked_by_player ? 0 : 1;
    await db.execute({
      sql: `UPDATE post_comments SET liked_by_player = ?, player_liked_at = ? WHERE id = ?`,
      args: [next, next ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null, c.id],
    });

    if (next) {
      const p = await playerName(playerId);
      await notify([c.user_id], {
        type: 'comment_like',
        message: `${p.name} 선수가 회원님 응원에 ❤️를 눌렀어요`,
        link: '/feed',
      });
    }
    res.json({ liked_by_player: !!next });
  } catch (e) { serverError(res, e, 'player-heart'); }
});

// POST /api/player/comments/:id/reply — 선수 답글
router.post('/player/comments/:id/reply', requireAuth, async (req, res) => {
  try {
    const playerId = playerOf(req, res); if (!playerId) return;
    const c = await ownComment(Number(req.params.id), playerId);
    if (!c) return res.status(404).json({ error: '내 글의 댓글이 아닙니다.' });

    const content = String(req.body?.content ?? '').trim().slice(0, 500);
    if (!content) return res.status(400).json({ error: '답글 내용을 입력해주세요.' });

    await db.execute({
      sql: `INSERT INTO post_comments (post_id, user_id, parent_id, content, is_player)
            VALUES (?, ?, ?, ?, 1)`,
      args: [c.post_id, req.user.userId, c.id, content],
    });
    await db.execute({
      sql: 'UPDATE posts SET comment_count = (SELECT COUNT(*) FROM post_comments WHERE post_id = ?) WHERE id = ?',
      args: [c.post_id, c.post_id],
    });

    const p = await playerName(playerId);
    await notify([c.user_id], {
      type: 'comment_reply',
      message: `${p.name} 선수가 회원님 댓글에 답했어요`,
      link: '/feed',
    });
    res.status(201).json({ ok: true });
  } catch (e) { serverError(res, e, 'player-reply'); }
});

/* ════════════ 선수 통합함 ════════════ */

// GET /api/player/inbox — 선수가 답할 것들을 한 곳에서 본다
// (질문은 프로필에서, 댓글은 피드에서 따로 찾아다녀야 했다)
router.get('/player/inbox', requireAuth, async (req, res) => {
  try {
    const playerId = playerOf(req, res); if (!playerId) return;

    const { rows: [player] } = await db.execute({
      sql: `SELECT p.id, p.name, p.slug, t.name AS team_name
            FROM players p LEFT JOIN teams t ON t.id = p.team_id WHERE p.id = ?`,
      args: [playerId],
    });

    // 팬 질문 — 미답변 먼저
    const { rows: questions } = await db.execute({
      sql: `SELECT q.id, q.question, q.answer, q.answered_at, q.created_at, u.nickname
            FROM player_questions q JOIN users u ON u.id = q.user_id
            WHERE q.player_id = ?
            ORDER BY (q.answer IS NOT NULL), q.created_at DESC`,
      args: [playerId],
    });

    // 내 글에 달린 팬 댓글 — 내가 아직 답하지 않은 것 먼저
    const { rows: comments } = await db.execute({
      sql: `SELECT c.id, c.post_id, c.content, c.created_at, c.liked_by_player,
                   u.nickname,
                   p.content AS post_content, p.type AS post_type,
                   EXISTS(SELECT 1 FROM post_comments r
                          WHERE r.parent_id = c.id AND r.is_player = 1) AS replied
            FROM post_comments c
            JOIN posts p ON p.id = c.post_id
            JOIN users u ON u.id = c.user_id
            WHERE p.player_id = ? AND c.is_player = 0
            ORDER BY replied, c.created_at DESC
            LIMIT 100`,
      args: [playerId],
    });

    res.json({
      player,
      questions,
      comments,
      counts: {
        unanswered:  questions.filter((q) => !q.answer).length,
        unreplied:   comments.filter((c) => !c.replied).length,
      },
    });
  } catch (e) { serverError(res, e, 'player-inbox'); }
});

/* ════════════ 5. 알림함 ════════════ */

// GET /api/notifications
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { rows } = await db.execute({
      sql: `SELECT id, type, message, link, is_read, created_at
            FROM notifications WHERE user_id = ?
            ORDER BY id DESC LIMIT 50`,
      args: [userId],
    });
    const { rows: [{ n }] } = await db.execute({
      sql: 'SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0', args: [userId],
    });
    res.json({ notifications: rows, unread: n });
  } catch (e) { serverError(res, e, 'notifications'); }
});

// PUT /api/notifications/read — 전체 또는 특정 건 읽음 처리
router.put('/notifications/read', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const id = req.body?.id;
    await db.execute({
      sql: `UPDATE notifications SET is_read = 1 WHERE user_id = ?${id ? ' AND id = ?' : ''}`,
      args: id ? [userId, id] : [userId],
    });
    res.json({ ok: true });
  } catch (e) { serverError(res, e, 'notifications-read'); }
});

export default router;
