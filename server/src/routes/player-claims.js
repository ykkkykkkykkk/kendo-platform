// 선수 본인 신청 (사용자용).
//
// 선수 200명 중 계정이 있는 사람이 19명뿐이라, 설문받아 관리자가 계정을 만드는
// 방식으로는 감당이 안 된다. 본인이 명단에서 자기를 고르고 관리자가 승인한다.
// 승인은 관리자만 하므로 사칭이 통과되지 않는다.
import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { serverError } from '../utils/apiError.js';

const router = Router();

// GET /api/player-claims/me — 내 신청 상태 (신청 화면을 띄울지 판단하는 데 쓴다)
router.get('/player-claims/me', requireAuth, async (req, res) => {
  try {
    const { rows: [me] } = await db.execute({
      sql: 'SELECT role, player_id FROM users WHERE id = ?', args: [req.user.userId],
    });
    const { rows: [claim] } = await db.execute({
      sql: `SELECT c.id, c.player_id, c.status, c.note, c.created_at, c.review_note,
                   p.name AS player_name, t.name AS team_name
            FROM player_claims c
            JOIN players p ON p.id = c.player_id
            LEFT JOIN teams t ON t.id = p.team_id
            WHERE c.user_id = ?
            ORDER BY c.created_at DESC LIMIT 1`,
      args: [req.user.userId],
    });

    res.json({
      is_player: me?.role === 'player' && me?.player_id != null,
      claim: claim ?? null,
    });
  } catch (e) { serverError(res, e, 'claim-me'); }
});

// POST /api/player-claims — 본인이 선수 신청
// body: { player_id, note? }
router.post('/player-claims', requireAuth, async (req, res) => {
  try {
    const playerId = Number(req.body?.player_id);
    const note = (req.body?.note ?? '').trim().slice(0, 200);
    if (!playerId) return res.status(400).json({ error: '어느 선수인지 골라주세요.' });

    const { rows: [me] } = await db.execute({
      sql: 'SELECT role, player_id FROM users WHERE id = ?', args: [req.user.userId],
    });
    if (me?.role === 'player' && me?.player_id)
      return res.status(409).json({ error: '이미 선수 계정입니다.' });

    const { rows: [player] } = await db.execute({
      sql: 'SELECT id, name FROM players WHERE id = ?', args: [playerId],
    });
    if (!player) return res.status(404).json({ error: '그런 선수가 없습니다.' });

    // 이미 다른 사람이 쓰고 있는 선수는 신청받지 않는다 (헛수고를 미리 막는다)
    const { rows: [taken] } = await db.execute({
      sql: 'SELECT id FROM users WHERE player_id = ? AND id != ?',
      args: [playerId, req.user.userId],
    });
    if (taken)
      return res.status(409).json({ error: '이미 계정이 연결된 선수입니다. 본인이 맞다면 운영자에게 문의해주세요.' });

    // 심사 중인 신청이 있으면 새로 만들지 않는다
    const { rows: [pending] } = await db.execute({
      sql: "SELECT id, player_id FROM player_claims WHERE user_id = ? AND status = 'pending'",
      args: [req.user.userId],
    });
    if (pending)
      return res.status(409).json({ error: '이미 신청하셨습니다. 확인까지 조금만 기다려주세요.' });

    // 같은 선수로 거절당한 적이 있으면 그 행을 다시 살려 쓴다 (UNIQUE 때문에)
    await db.execute({
      sql: `INSERT INTO player_claims (user_id, player_id, note)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, player_id) DO UPDATE SET
              status = 'pending', note = excluded.note,
              created_at = datetime('now'), reviewed_at = NULL, review_note = NULL`,
      args: [req.user.userId, playerId, note || null],
    });

    res.json({ ok: true, player_name: player.name });
  } catch (e) { serverError(res, e, 'claim-create'); }
});

// DELETE /api/player-claims/me — 신청 취소
router.delete('/player-claims/me', requireAuth, async (req, res) => {
  try {
    await db.execute({
      sql: "DELETE FROM player_claims WHERE user_id = ? AND status = 'pending'",
      args: [req.user.userId],
    });
    res.json({ ok: true });
  } catch (e) { serverError(res, e, 'claim-cancel'); }
});

export default router;
