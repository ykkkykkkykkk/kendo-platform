// 선수 영상 링크 관리.
//
// 두 경로로 들어온다:
//   · 관리자   : /api/admin/players/:playerId/videos   (x-admin-token)
//   · 선수 본인: /api/me/videos                        (Bearer, role=player)
// 저장 로직은 같고 '누가 이 선수를 수정할 수 있나'만 다르므로 핸들러를 공유한다.
import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { requireAuth } from '../middleware/auth.js';
import { normalizeVideoUrl } from '../utils/videoUrl.js';
import { serverError } from '../utils/apiError.js';

const MAX_PER_PLAYER = 20;

export async function listVideos(playerId) {
  const { rows } = await db.execute({
    sql: `SELECT id, url, title, video_id, display_order, created_at
          FROM player_videos WHERE player_id = ?
          ORDER BY display_order, id`,
    args: [playerId],
  });
  return rows;
}

async function addVideo(res, playerId, body, addedByUserId) {
  const norm = normalizeVideoUrl(body?.url);
  if (!norm.ok) return res.status(400).json({ error: norm.error });

  const { rows: [{ n }] } = await db.execute({
    sql: 'SELECT COUNT(*) AS n FROM player_videos WHERE player_id = ?', args: [playerId],
  });
  if (n >= MAX_PER_PLAYER)
    return res.status(400).json({ error: `영상은 최대 ${MAX_PER_PLAYER}개까지 등록할 수 있습니다.` });

  const { rows: dup } = await db.execute({
    sql: 'SELECT id FROM player_videos WHERE player_id = ? AND url = ?', args: [playerId, norm.url],
  });
  if (dup.length) return res.status(409).json({ error: '이미 등록된 영상입니다.' });

  const title = String(body?.title ?? '').trim().slice(0, 120) || null;
  await db.execute({
    sql: `INSERT INTO player_videos (player_id, url, title, video_id, display_order, added_by_user_id)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [playerId, norm.url, title, norm.videoId, n, addedByUserId ?? null],
  });
  res.status(201).json({ videos: await listVideos(playerId) });
}

async function removeVideo(res, playerId, videoId) {
  const { rows: [v] } = await db.execute({
    sql: 'SELECT id FROM player_videos WHERE id = ? AND player_id = ?', args: [videoId, playerId],
  });
  if (!v) return res.status(404).json({ error: '영상을 찾을 수 없습니다.' });
  await db.execute({ sql: 'DELETE FROM player_videos WHERE id = ?', args: [videoId] });
  res.json({ videos: await listVideos(playerId) });
}

/* ══════════════ 관리자 ══════════════ */
export const adminVideoRouter = Router();
adminVideoRouter.use(requireAdmin);

adminVideoRouter.get('/players/:playerId/videos', async (req, res) => {
  try { res.json(await listVideos(req.params.playerId)); }
  catch (e) { serverError(res, e, 'admin-videos'); }
});

adminVideoRouter.post('/players/:playerId/videos', async (req, res) => {
  try {
    const { rows: [p] } = await db.execute({
      sql: 'SELECT id FROM players WHERE id = ?', args: [req.params.playerId],
    });
    if (!p) return res.status(404).json({ error: '선수를 찾을 수 없습니다.' });
    await addVideo(res, p.id, req.body, null);
  } catch (e) { serverError(res, e, 'admin-video-add'); }
});

adminVideoRouter.delete('/players/:playerId/videos/:id', async (req, res) => {
  try { await removeVideo(res, req.params.playerId, req.params.id); }
  catch (e) { serverError(res, e, 'admin-video-del'); }
});

/* ══════════════ 선수 본인 ══════════════ */
export const myVideoRouter = Router();
myVideoRouter.use(requireAuth);

// 선수 계정이 아니면 본인 영상 자체가 없다
function myPlayerId(req, res) {
  const pid = req.user?.playerId;
  if (req.user?.role !== 'player' || !pid) {
    res.status(403).json({ error: '선수 계정만 사용할 수 있습니다.' });
    return null;
  }
  return pid;
}

myVideoRouter.get('/videos', async (req, res) => {
  try {
    const pid = myPlayerId(req, res); if (!pid) return;
    res.json(await listVideos(pid));
  } catch (e) { serverError(res, e, 'my-videos'); }
});

myVideoRouter.post('/videos', async (req, res) => {
  try {
    const pid = myPlayerId(req, res); if (!pid) return;
    await addVideo(res, pid, req.body, req.user.userId);
  } catch (e) { serverError(res, e, 'my-video-add'); }
});

// 본인 선수의 영상만 지워진다 (removeVideo가 player_id로 한 번 더 확인)
myVideoRouter.delete('/videos/:id', async (req, res) => {
  try {
    const pid = myPlayerId(req, res); if (!pid) return;
    await removeVideo(res, pid, req.params.id);
  } catch (e) { serverError(res, e, 'my-video-del'); }
});
