// 선수 본인 신청 심사 (관리자 전용).
//
// 승인하면 그 회원이 선수 계정으로 바뀐다 — role='player' + player_id 연결.
// 팬으로 쓰던 사람이면 팔로우·픽이 그대로 남은 채로 전환된다.
import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { serverError } from '../utils/apiError.js';

const router = Router();
router.use(requireAdmin);

// GET /api/admin/player-claims?status=pending
router.get('/player-claims', async (req, res) => {
  try {
    const status = req.query.status ?? 'pending';
    const { rows } = await db.execute({
      sql: `SELECT c.id, c.user_id, c.player_id, c.note, c.status,
                   c.created_at, c.reviewed_at, c.review_note,
                   u.nickname, u.username, u.role, u.kakao_id, u.last_ip,
                   u.created_at AS user_created_at,
                   p.name AS player_name, p.dan_grade, p.slug AS player_slug,
                   t.name AS team_name,
                   -- 본인이 자기 프로필에 팬 등록을 눌렀다면 그것도 단서가 된다
                   (SELECT COUNT(*) FROM follows f
                     WHERE f.user_id = c.user_id AND f.player_id = c.player_id) AS follows_target,
                   (SELECT COUNT(*) FROM follows f WHERE f.user_id = c.user_id) AS follow_count,
                   (SELECT COUNT(*) FROM tournament_picks k WHERE k.user_id = c.user_id) AS pick_count,
                   (SELECT COUNT(*) FROM users o WHERE o.player_id = c.player_id) AS player_taken
            FROM player_claims c
            JOIN users u   ON u.id = c.user_id
            JOIN players p ON p.id = c.player_id
            LEFT JOIN teams t ON t.id = p.team_id
            ${status === 'all' ? '' : 'WHERE c.status = ?'}
            ORDER BY c.created_at DESC`,
      args: status === 'all' ? [] : [status],
    });

    const { rows: [{ n: pending }] } = await db.execute(
      "SELECT COUNT(*) AS n FROM player_claims WHERE status = 'pending'"
    );
    res.json({ claims: rows, pending_count: pending });
  } catch (e) { serverError(res, e, 'admin-claims'); }
});

// POST /api/admin/player-claims/:id/approve — 승인 → 선수 계정으로 전환
router.post('/player-claims/:id/approve', async (req, res) => {
  try {
    const { rows: [claim] } = await db.execute({
      sql: 'SELECT * FROM player_claims WHERE id = ?', args: [req.params.id],
    });
    if (!claim) return res.status(404).json({ error: '신청을 찾을 수 없습니다.' });
    if (claim.status !== 'pending')
      return res.status(409).json({ error: '이미 처리된 신청입니다.' });

    // 그 사이 다른 계정이 이 선수를 가져갔을 수 있다
    const { rows: [taken] } = await db.execute({
      sql: 'SELECT id, nickname FROM users WHERE player_id = ? AND id != ?',
      args: [claim.player_id, claim.user_id],
    });
    if (taken)
      return res.status(409).json({ error: `이미 '${taken.nickname}'에게 연결된 선수입니다.` });

    // 닉네임이 아직 카카오 이름이거나 아이디 그대로면 선수 이름으로 맞춰준다
    const { rows: [player] } = await db.execute({
      sql: 'SELECT name FROM players WHERE id = ?', args: [claim.player_id],
    });
    await db.execute({
      sql: `UPDATE users SET role = 'player', player_id = ?, nickname = ? WHERE id = ?`,
      args: [claim.player_id, player.name, claim.user_id],
    });
    await db.execute({
      sql: `UPDATE player_claims SET status = 'approved', reviewed_at = datetime('now'),
                                     review_note = ? WHERE id = ?`,
      args: [(req.body?.note ?? '').trim() || null, req.params.id],
    });
    // 같은 선수를 노리던 다른 신청은 자동으로 정리한다
    await db.execute({
      sql: `UPDATE player_claims SET status = 'rejected', reviewed_at = datetime('now'),
                                     review_note = '다른 분이 먼저 확인되었습니다.'
            WHERE player_id = ? AND id != ? AND status = 'pending'`,
      args: [claim.player_id, req.params.id],
    });

    const { rows: [user] } = await db.execute({
      sql: `SELECT u.id, u.nickname, u.role, u.player_id, p.name AS player_name, t.name AS team_name
            FROM users u
            LEFT JOIN players p ON p.id = u.player_id
            LEFT JOIN teams t   ON t.id = p.team_id
            WHERE u.id = ?`,
      args: [claim.user_id],
    });
    res.json({ approved: true, user });
  } catch (e) { serverError(res, e, 'admin-claim-approve'); }
});

// POST /api/admin/player-claims/:id/reject
router.post('/player-claims/:id/reject', async (req, res) => {
  try {
    const { rows: [claim] } = await db.execute({
      sql: 'SELECT status FROM player_claims WHERE id = ?', args: [req.params.id],
    });
    if (!claim) return res.status(404).json({ error: '신청을 찾을 수 없습니다.' });
    if (claim.status !== 'pending')
      return res.status(409).json({ error: '이미 처리된 신청입니다.' });

    await db.execute({
      sql: `UPDATE player_claims SET status = 'rejected', reviewed_at = datetime('now'),
                                     review_note = ? WHERE id = ?`,
      args: [(req.body?.note ?? '').trim() || null, req.params.id],
    });
    res.json({ rejected: true });
  } catch (e) { serverError(res, e, 'admin-claim-reject'); }
});

export default router;
