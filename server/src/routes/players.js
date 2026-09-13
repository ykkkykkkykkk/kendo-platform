import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { serverError } from '../utils/apiError.js';

const router = Router();

// GET /api/players?team=<team_id>
router.get('/', async (req, res) => {
  try {
    const { team, sort } = req.query;

    /* sort=active — 선수 계정으로 최근에 접속한 순.
       가입할 때 팔로우할 선수를 고르는 화면이 쓴다. 팬 많은 순으로 깔면 이미 팬이
       많은 선수만 계속 쌓이고, 정작 앱을 쓰는 선수는 아래 묻힌다. 팔로우는 그 선수가
       실제로 글을 올려야 의미가 있으므로 활동하는 선수를 앞에 둔다.
       last_seen_at 자체는 응답에 넣지 않는다 — 이 API는 공개라 선수의 접속 시각이
       누구에게나 보이게 된다. 정렬만 서버에서 하고 값은 내보내지 않는다. */
    const sql = sort === 'active' && !team
      ? `SELECT p.*, t.name AS team_name, t.slug AS team_slug, t.color_primary,
                ps.wins, ps.losses, ps.total_matches,
                (SELECT COUNT(*) FROM follows f WHERE f.player_id = p.id) AS fan_count,
                (SELECT COUNT(*) FROM player_gear g WHERE g.player_id = p.id) AS gear_count
         FROM players p
         JOIN teams t ON t.id = p.team_id
         LEFT JOIN player_stats ps ON ps.player_id = p.id
         LEFT JOIN users u ON u.player_id = p.id AND u.role = 'player'
         ORDER BY (u.last_seen_at IS NULL), u.last_seen_at DESC, fan_count DESC, p.name`
      : team
      ? `SELECT p.*, t.name AS team_name, t.slug AS team_slug, t.color_primary,
                ps.wins, ps.losses, ps.total_matches,
                (SELECT COUNT(*) FROM follows f WHERE f.player_id = p.id) AS fan_count,
                (SELECT COUNT(*) FROM player_gear g WHERE g.player_id = p.id) AS gear_count
         FROM players p
         JOIN teams t ON t.id = p.team_id
         LEFT JOIN player_stats ps ON ps.player_id = p.id
         WHERE p.team_id = ?
         ORDER BY p.name`
      : `SELECT p.*, t.name AS team_name, t.slug AS team_slug, t.color_primary,
                ps.wins, ps.losses, ps.total_matches,
                (SELECT COUNT(*) FROM follows f WHERE f.player_id = p.id) AS fan_count,
                (SELECT COUNT(*) FROM player_gear g WHERE g.player_id = p.id) AS gear_count
         FROM players p
         JOIN teams t ON t.id = p.team_id
         LEFT JOIN player_stats ps ON ps.player_id = p.id
         ORDER BY t.name, p.name`;

    const { rows } = await db.execute({ sql, args: team ? [team] : [] });
    res.json(rows);
  } catch (e) {
    serverError(res, e);
  }
});

// GET /api/players/:slug
router.get('/:slug', async (req, res) => {
  try {
    const { rows: [player] } = await db.execute({
      sql: `SELECT p.*, t.name AS team_name, t.slug AS team_slug, t.color_primary,
                   (SELECT COUNT(*) FROM follows f WHERE f.player_id = p.id) AS fan_count,
                   (SELECT COUNT(*) FROM clinics c WHERE c.player_id = p.id) AS clinic_count
            FROM players p
            JOIN teams t ON t.id = p.team_id
            WHERE p.slug = ?`,
      args: [req.params.slug],
    });
    if (!player) return res.status(404).json({ error: '선수를 찾을 수 없습니다.' });

    const [{ rows: [stats] }, { rows: gear }, { rows: videos }] = await Promise.all([
      db.execute({ sql: 'SELECT * FROM player_stats WHERE player_id = ?', args: [player.id] }),
      db.execute({
        sql:  'SELECT * FROM player_gear WHERE player_id = ? ORDER BY display_order',
        args: [player.id],
      }),
      db.execute({
        sql: `SELECT id, url, title, video_id FROM player_videos
              WHERE player_id = ? ORDER BY display_order, id`,
        args: [player.id],
      }),
    ]);

    res.json({ ...player, stats: stats ?? null, gear, videos });
  } catch (e) {
    serverError(res, e);
  }
});

/* PATCH /api/players/my/photo — 선수 본인이 자기 사진을 올린다.
 *
 * 선수가 202명이라 호구 착용샷을 관리자가 다 찍으러 다닐 수 없다. 프로필이 사진
 * 중심이 된 이상 사진이 실제로 채워지는 길은 선수 본인뿐이라 세 종류 다 열어 둔다.
 *   hero    — 호구를 쓴 세로 사진 (프로필 맨 위에 크게 깔린다)
 *   face    — 호구를 벗은 얼굴
 *   profile — 목록·명단에 쓰이는 동그란 썸네일
 * 관리자는 어드민에서 언제든 덮어쓸 수 있다.
 *
 * 예전에는 body가 { profile_image_url } 하나뿐이었다. 그 호출도 그대로 받는다.
 */
const MY_PHOTO_FIELDS = ['profile_image_url', 'hero_image_url', 'face_image_url'];

// GET /api/players/my/photo — 마이페이지에서 지금 올라가 있는 내 사진을 보여주려고 쓴다
router.get('/my/photo', requireAuth, async (req, res) => {
  try {
    const { rows: [user] } = await db.execute({
      sql: 'SELECT role, player_id FROM users WHERE id = ?', args: [req.user.userId],
    });
    if (!user || user.role !== 'player' || !user.player_id)
      return res.status(403).json({ error: '선수 계정만 사용할 수 있습니다.' });

    const { rows: [player] } = await db.execute({
      sql: `SELECT ${MY_PHOTO_FIELDS.join(', ')} FROM players WHERE id = ?`,
      args: [user.player_id],
    });
    res.json(player ?? {});
  } catch (e) { serverError(res, e); }
});

router.patch('/my/photo', requireAuth, async (req, res) => {
  try {
    const updates = {};
    for (const f of MY_PHOTO_FIELDS) {
      const v = req.body?.[f];
      if (typeof v !== 'string') continue;
      const url = v.trim();
      // 빈 문자열은 '지우기'다. 값이 있으면 남의 서버로 링크가 새지 않게 https만 받는다.
      if (url && !/^https:\/\//i.test(url))
        return res.status(400).json({ error: '이미지 주소가 올바르지 않습니다.' });
      updates[f] = url || null;
    }
    if (!Object.keys(updates).length)
      return res.status(400).json({ error: '이미지 URL이 필요합니다.' });

    // 선수 계정인지 확인
    const { rows: [user] } = await db.execute({
      sql: "SELECT role, player_id FROM users WHERE id = ?",
      args: [req.user.userId],
    });
    if (!user || user.role !== 'player' || !user.player_id)
      return res.status(403).json({ error: '선수 계정만 사용할 수 있습니다.' });

    /* 얼굴 사진은 목록에 쓰는 썸네일로도 그대로 쓸 만하다. 썸네일이 아직 비어 있으면
       같이 채운다 — 얼굴을 올렸는데 명단에는 기본 그림이 남아 있으면 안 올라간 줄 안다. */
    if (updates.face_image_url && !('profile_image_url' in updates)) {
      const { rows: [cur] } = await db.execute({
        sql: 'SELECT profile_image_url FROM players WHERE id = ?', args: [user.player_id],
      });
      if (!cur?.profile_image_url) updates.profile_image_url = updates.face_image_url;
    }

    const cols = Object.keys(updates);
    await db.execute({
      sql:  `UPDATE players SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
      args: [...cols.map((c) => updates[c]), user.player_id],
    });

    const { rows: [player] } = await db.execute({
      sql: 'SELECT profile_image_url, hero_image_url, face_image_url FROM players WHERE id = ?',
      args: [user.player_id],
    });

    res.json({ success: true, ...player });
  } catch (e) { serverError(res, e); }
});

export default router;
