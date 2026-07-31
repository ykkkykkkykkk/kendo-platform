// 회원 관리 + 픽 조회 (관리자 전용).
//
// 기존에 /admin/player-accounts가 있지만 그건 '선수 계정'(role=player, players와 연결)만 다룬다.
// 여기는 가입한 일반 회원 전체를 본다.
import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { serverError } from '../utils/apiError.js';

const router = Router();
router.use(requireAdmin);

/* ══════════════ 회원 ══════════════ */

// 팔로워 수를 채우려고 만든 시드 계정(가라팬). 실제 가입자가 아니라 기본으로 숨긴다.
const SEED_PHONE_PREFIX = '검도팬_';
const IS_SEED = `(u.phone LIKE '${SEED_PHONE_PREFIX}%')`;

// GET /api/admin/users?q=검색어&include_seed=1
router.get('/users', async (req, res) => {
  try {
    const q = (req.query.q ?? '').trim();
    const includeSeed = req.query.include_seed === '1';
    const like = `%${q}%`;

    const where = [];
    if (!includeSeed) where.push(`NOT ${IS_SEED}`);
    if (q) where.push('(u.nickname LIKE ? OR u.phone LIKE ? OR u.home_dojo LIKE ?)');

    const { rows: users } = await db.execute({
      sql: `SELECT u.id, u.nickname, u.phone, u.role, u.dan_grade, u.home_dojo,
                   u.created_at, u.last_seen_at, u.player_id,
                   ${IS_SEED} AS is_seed,
                   t.name  AS favorite_team,
                   d.name  AS dojo_name,
                   p.name  AS player_name,
                   (SELECT COUNT(*) FROM follows f          WHERE f.user_id = u.id) AS follow_count,
                   (SELECT COUNT(*) FROM tournament_picks k WHERE k.user_id = u.id) AS pick_count
            FROM users u
            LEFT JOIN teams  t ON t.id = u.favorite_team_id
            LEFT JOIN dojos  d ON d.id = u.dojo_id
            LEFT JOIN players p ON p.id = u.player_id
            ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
            ORDER BY u.created_at DESC`,
      args: q ? [like, like, like] : [],
    });

    const { rows: [{ n: seedCount }] } = await db.execute(
      `SELECT COUNT(*) AS n FROM users u WHERE ${IS_SEED}`
    );

    res.json({ users, seed_count: seedCount });
  } catch (e) { serverError(res, e, 'admin-users'); }
});

// GET /api/admin/users/:id — 상세 (팔로우·픽 포함)
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: [user] } = await db.execute({
      sql: `SELECT u.*, t.name AS favorite_team, d.name AS dojo_name, p.name AS player_name
            FROM users u
            LEFT JOIN teams t   ON t.id = u.favorite_team_id
            LEFT JOIN dojos d   ON d.id = u.dojo_id
            LEFT JOIN players p ON p.id = u.player_id
            WHERE u.id = ?`,
      args: [id],
    });
    if (!user) return res.status(404).json({ error: '회원을 찾을 수 없습니다.' });
    delete user.password_hash;

    const { rows: follows } = await db.execute({
      sql: `SELECT p.id, p.name, p.slug, t.name AS team, f.created_at
            FROM follows f
            JOIN players p ON p.id = f.player_id
            LEFT JOIN teams t ON t.id = p.team_id
            WHERE f.user_id = ? ORDER BY f.created_at DESC`,
      args: [id],
    });

    const { rows: picks } = await db.execute({
      sql: `SELECT tp.id, td.label AS division_label, tp.score, tp.is_locked, tp.created_at
            FROM tournament_picks tp
            JOIN tournament_divisions td ON td.id = tp.division_id
            WHERE tp.user_id = ? ORDER BY td.sort_order`,
      args: [id],
    });

    res.json({ ...user, follows, picks });
  } catch (e) { serverError(res, e, 'admin-user-detail'); }
});

// DELETE /api/admin/users/:id — 회원 삭제 (본인이 남긴 데이터도 함께 정리)
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: [user] } = await db.execute({
      sql: 'SELECT id, nickname, dojo_id FROM users WHERE id = ?', args: [id],
    });
    if (!user) return res.status(404).json({ error: '회원을 찾을 수 없습니다.' });

    // 이 회원에게 딸린 행들. 남겨두면 FK 때문에 삭제가 막힌다.
    const owned = [
      'follows', 'tournament_picks', 'predictions',
      'clinic_bookings', 'player_comments', 'player_questions', 'inquiries',
    ];
    const removed = {};
    for (const t of owned) {
      try {
        const { rows: [{ n }] } = await db.execute({
          sql: `SELECT COUNT(*) AS n FROM ${t} WHERE user_id = ?`, args: [id],
        });
        if (n > 0) {
          await db.execute({ sql: `DELETE FROM ${t} WHERE user_id = ?`, args: [id] });
          removed[t] = n;
        }
      } catch { /* 테이블/컬럼이 없으면 무시 */ }
    }

    await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [id] });

    // dojos.member_count는 비정규화 컬럼이라 회원이 빠져도 자동으로 줄지 않는다.
    // 실제 소속 인원으로 다시 센다.
    if (user.dojo_id) {
      await db.execute({
        sql: `UPDATE dojos SET member_count =
                (SELECT COUNT(*) FROM users u WHERE u.dojo_id = dojos.id)
              WHERE id = ?`,
        args: [user.dojo_id],
      });
    }

    res.json({ deleted: user, removed });
  } catch (e) { serverError(res, e, 'admin-user-delete'); }
});

/* ══════════════ 픽 조회 ══════════════ */

// GET /api/admin/picks?tournament_id=2
// 회원들이 입력한 픽을 부문별로 본다. 사용자용 all-picks는 마감 뒤에만 열리고 집계만 주므로 따로 둔다.
router.get('/picks', async (req, res) => {
  try {
    const tid = req.query.tournament_id;

    const nameJoin = (alias, col) => `
      LEFT JOIN division_participants ${alias} ON ${alias}.id = tp.${col}
      LEFT JOIN players p_${alias} ON p_${alias}.id = ${alias}.player_id
      LEFT JOIN teams   t_${alias} ON t_${alias}.id = p_${alias}.team_id`;

    const { rows: picks } = await db.execute({
      sql: `SELECT tp.id, tp.user_id, u.nickname, u.home_dojo,
                   tp.division_id, td.label AS division_label, td.sort_order,
                   tp.score, tp.is_locked, tp.created_at,
                   p_d1.name AS pick1, t_d1.name AS pick1_team,
                   p_d2.name AS pick2, t_d2.name AS pick2_team,
                   p_d3.name AS pick3a, t_d3.name AS pick3a_team,
                   p_d4.name AS pick3b, t_d4.name AS pick3b_team
            FROM tournament_picks tp
            JOIN users u ON u.id = tp.user_id
            JOIN tournament_divisions td ON td.id = tp.division_id
            ${nameJoin('d1', 'pick_1st')}
            ${nameJoin('d2', 'pick_2nd')}
            ${nameJoin('d3', 'pick_3rd_a')}
            ${nameJoin('d4', 'pick_3rd_b')}
            ${tid ? 'WHERE td.tournament_id = ?' : ''}
            ORDER BY td.sort_order, u.nickname`,
      args: tid ? [tid] : [],
    });

    // 부문별 1위 픽 집계 — 누가 우승 후보로 많이 뽑혔는지
    const { rows: top } = await db.execute({
      sql: `SELECT td.id AS division_id, td.label AS division_label,
                   p.name AS player_name, t.name AS team_name, COUNT(*) AS n
            FROM tournament_picks tp
            JOIN tournament_divisions td ON td.id = tp.division_id
            JOIN division_participants dp ON dp.id = tp.pick_1st
            JOIN players p ON p.id = dp.player_id
            LEFT JOIN teams t ON t.id = p.team_id
            ${tid ? 'WHERE td.tournament_id = ?' : ''}
            GROUP BY td.id, p.id
            ORDER BY td.sort_order, n DESC`,
      args: tid ? [tid] : [],
    });

    res.json({ picks, top_picks: top });
  } catch (e) { serverError(res, e, 'admin-picks-list'); }
});

export default router;
