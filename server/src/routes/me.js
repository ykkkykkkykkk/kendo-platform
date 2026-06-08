import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { serverError } from '../utils/apiError.js';

const router = Router();
router.use(requireAuth);

// ── GET /api/me ──────────────────────────────────────────────
// 내 정보 + 통계
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;

    const { rows: [user] } = await db.execute({
      sql: `SELECT u.id, u.nickname, u.phone, u.home_dojo,
                   u.dojo_id, u.dojo_change_requested_at,
                   d.name AS dojo_name
            FROM users u
            LEFT JOIN dojos d ON d.id = u.dojo_id
            WHERE u.id = ?`,
      args: [userId],
    });
    if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });

    // 활성 시즌 점수
    const { rows: [season] } = await db.execute(
      "SELECT id, name, start_date, end_date FROM seasons WHERE is_active = 1 LIMIT 1"
    );

    const { rows: [scoreRow] } = await db.execute({
      sql: `SELECT COALESCE(SUM(tp.score), 0) AS season_score,
                   COUNT(DISTINCT tp.id) AS pick_count
            FROM tournament_picks tp
            JOIN tournament_divisions td ON td.id = tp.division_id
            WHERE tp.user_id = ?`,
      args: [userId],
    });

    // 적중률 계산 (1점이라도 받은 픽 / 결과 확정된 픽)
    const { rows: [hitRow] } = await db.execute({
      sql: `SELECT COUNT(*) AS total_scored,
                   SUM(CASE WHEN tp.score > 0 THEN 1 ELSE 0 END) AS hits
            FROM tournament_picks tp
            JOIN division_results dr ON dr.division_id = tp.division_id
            WHERE tp.user_id = ? AND dr.is_finalized = 1`,
      args: [userId],
    });

    const hitRate = hitRow.total_scored > 0
      ? Math.round((hitRow.hits / hitRow.total_scored) * 100)
      : null;

    // 팬 등록 선수 수
    const { rows: [followRow] } = await db.execute({
      sql: 'SELECT COUNT(*) AS cnt FROM follows WHERE user_id = ?',
      args: [userId],
    });

    res.json({
      id:           user.id,
      nickname:     user.nickname,
      phone_tail:   user.phone ? user.phone.split('_')[1] ?? '****' : '****',
      home_dojo:    user.home_dojo,
      dojo_id:      user.dojo_id,
      dojo_name:    user.dojo_name,
      dojo_change_requested: !!user.dojo_change_requested_at,
      season:       season ? { id: season.id, name: season.name, end_date: season.end_date } : null,
      season_score: Number(scoreRow.season_score),
      pick_count:   Number(scoreRow.pick_count),
      hit_rate:     hitRate,
      follow_count: Number(followRow.cnt),
    });
  } catch (e) { serverError(res, e); }
});

// ── PUT /api/me ───────────────────────────────────────────────
// 닉네임 변경
router.put('/', async (req, res) => {
  try {
    const { nickname } = req.body;
    if (!nickname?.trim()) return res.status(400).json({ error: '닉네임을 입력해주세요.' });
    if (nickname.trim().length > 10) return res.status(400).json({ error: '닉네임은 10자 이하여야 합니다.' });

    await db.execute({
      sql:  'UPDATE users SET nickname = ? WHERE id = ?',
      args: [nickname.trim(), req.user.userId],
    });
    res.json({ success: true, nickname: nickname.trim() });
  } catch (e) { serverError(res, e); }
});

// ── GET /api/me/follows ───────────────────────────────────────
// 응원 중인 선수 (최근 팔로우 순)
router.get('/follows', async (req, res) => {
  try {
    const { rows } = await db.execute({
      sql: `SELECT p.id, p.name, p.slug, p.dan_grade, p.profile_image_url,
                   t.name AS team_name, t.color_primary,
                   f.created_at AS followed_at
            FROM follows f
            JOIN players p ON p.id = f.player_id
            LEFT JOIN teams t ON t.id = p.team_id
            WHERE f.user_id = ?
            ORDER BY f.created_at DESC`,
      args: [req.user.userId],
    });
    res.json(rows);
  } catch (e) { serverError(res, e); }
});

// ── GET /api/me/picks ─────────────────────────────────────────
// 나의 픽 기록
router.get('/picks', async (req, res) => {
  try {
    const { rows } = await db.execute({
      sql: `SELECT tp.id, tp.score, tp.is_locked, tp.locked_at, tp.created_at,
                   td.division_type,
                   t.name AS tournament_name, t.status AS tournament_status,
                   dr.is_finalized,
                   dp1.id AS p1_id, dp2.id AS p2_id,
                   dp3a.id AS p3a_id, dp3b.id AS p3b_id,
                   tp.pick_1st, tp.pick_2nd, tp.pick_3rd_a, tp.pick_3rd_b
            FROM tournament_picks tp
            JOIN tournament_divisions td ON td.id = tp.division_id
            JOIN tournaments t ON t.id = td.tournament_id
            LEFT JOIN division_results dr ON dr.division_id = tp.division_id
            LEFT JOIN division_participants dp1  ON dp1.id  = tp.pick_1st
            LEFT JOIN division_participants dp2  ON dp2.id  = tp.pick_2nd
            LEFT JOIN division_participants dp3a ON dp3a.id = tp.pick_3rd_a
            LEFT JOIN division_participants dp3b ON dp3b.id = tp.pick_3rd_b
            WHERE tp.user_id = ?
            ORDER BY tp.created_at DESC`,
      args: [req.user.userId],
    });

    // 각 픽의 참가자 이름 조회
    const result = await Promise.all(rows.map(async (r) => {
      const ids = [r.pick_1st, r.pick_2nd, r.pick_3rd_a, r.pick_3rd_b].filter(Boolean);
      if (!ids.length) return { ...r, picks_detail: [] };

      const { rows: parts } = await db.execute({
        sql: `SELECT dp.id,
                     p.name  AS player_name,
                     pt.name AS player_team,
                     dt.name AS direct_team_name
              FROM division_participants dp
              LEFT JOIN players p  ON p.id  = dp.player_id
              LEFT JOIN teams   pt ON pt.id = p.team_id
              LEFT JOIN teams   dt ON dt.id = dp.team_id
              WHERE dp.id IN (${ids.map(() => '?').join(',')})`,
        args: ids,
      });

      const nameMap = Object.fromEntries(
        parts.map((p) => [p.id, p.player_name ?? p.direct_team_name ?? '?'])
      );

      return {
        id:              r.id,
        tournament_name: r.tournament_name,
        tournament_status: r.tournament_status,
        division_type:   r.division_type,
        score:           r.score,
        is_locked:       r.is_locked,
        is_finalized:    r.is_finalized,
        created_at:      r.created_at,
        picks: {
          first:  nameMap[r.pick_1st]  ?? null,
          second: nameMap[r.pick_2nd]  ?? null,
          third_a:nameMap[r.pick_3rd_a]?? null,
          third_b:nameMap[r.pick_3rd_b]?? null,
        },
      };
    }));

    res.json(result);
  } catch (e) { serverError(res, e); }
});

// ── DELETE /api/me/follows/:playerId ─────────────────────────
router.delete('/follows/:playerId', async (req, res) => {
  try {
    await db.execute({
      sql:  'DELETE FROM follows WHERE user_id = ? AND player_id = ?',
      args: [req.user.userId, req.params.playerId],
    });
    res.json({ success: true });
  } catch (e) { serverError(res, e); }
});

// ── POST /api/me/withdraw ─────────────────────────────────────
router.post('/withdraw', async (req, res) => {
  try {
    const userId = req.user.userId;
    // 관련 데이터 삭제
    await db.execute({ sql: 'DELETE FROM follows          WHERE user_id = ?', args: [userId] });
    await db.execute({ sql: 'DELETE FROM tournament_picks WHERE user_id = ?', args: [userId] });
    await db.execute({ sql: 'DELETE FROM predictions      WHERE user_id = ?', args: [userId] });
    await db.execute({ sql: 'DELETE FROM clinic_bookings  WHERE user_id = ?', args: [userId] });
    await db.execute({ sql: 'DELETE FROM inquiries        WHERE user_id = ?', args: [userId] });
    await db.execute({ sql: 'DELETE FROM users            WHERE id = ?',      args: [userId] });
    res.json({ success: true });
  } catch (e) { serverError(res, e); }
});

export default router;
