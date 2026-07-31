// 대진표(bracket_matches) 경기 결과 입력 · 취소 + 승자 자동 진출.
//
// adminRoutes.js에도 결과 입력이 있지만 그건 matches 테이블용이다(현재 0행, 예측/홈이 쓰는 테이블).
// 실제 대진표는 bracket_matches라서 같은 자동 진출 개념을 이 테이블에 맞춰 옮겼다.
//
// 진출 방향: bracket_matches는 "이 칸은 어느 경기 승자냐"를 a_from_match_id / b_from_match_id로
// 들고 있다. 즉 X의 승자가 갈 곳은 a_from_match_id = X 인 경기의 A칸(또는 b_from_match_id = X 면 B칸).
// next_match_id/next_slot 같은 전방 포인터를 따로 두면 같은 사실이 두 곳에 저장돼 어긋날 수 있으므로
// 조회로 파생한다.
import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { serverError } from '../utils/apiError.js';

const router = Router();
router.use(requireAdmin);

// GET /api/admin/bracket/auth — 토큰이 실제로 유효한지 확인용.
// 공개 대진표 페이지가 '관리자 편집 UI를 보여줄지'를 정할 때 쓴다.
// localStorage에 값이 있다는 것만으로 판단하면, 그 기기에서 예전에 관리자로 들어간 적이
// 있을 때 일반 계정에도 편집 UI가 보인다.
router.get('/bracket/auth', (_req, res) => res.json({ ok: true }));

const getMatch = async (id) => {
  const { rows } = await db.execute({ sql: 'SELECT * FROM bracket_matches WHERE id = ?', args: [id] });
  return rows[0] ?? null;
};

/** 이 경기의 승자가 올라갈 곳 → { id, slot: 'a'|'b' } | null */
async function nextSlotOf(matchId) {
  const { rows } = await db.execute({
    sql: `SELECT id, CASE WHEN a_from_match_id = ? THEN 'a' ELSE 'b' END AS slot
          FROM bracket_matches
          WHERE a_from_match_id = ? OR b_from_match_id = ?`,
    args: [matchId, matchId, matchId],
  });
  return rows[0] ?? null;
}

/** 결과 취소 — 하류로 연쇄한다 (올라간 선수와, 그 선수로 인해 난 결과까지 되돌림) */
async function clearResult(matchId, touched = []) {
  const match = await getMatch(matchId);
  if (!match || match.winner_participant_id == null) return touched;

  const next = await nextSlotOf(matchId);
  if (next) {
    // 다음 경기에 이미 결과가 있으면 그것부터 되돌린다 (재귀)
    await clearResult(next.id, touched);
    await db.execute({
      sql:  `UPDATE bracket_matches SET ${next.slot}_participant_id = NULL WHERE id = ?`,
      args: [next.id],
    });
    if (!touched.includes(next.id)) touched.push(next.id);
  }

  await db.execute({
    sql: `UPDATE bracket_matches
          SET winner_participant_id = NULL, score_a = NULL, score_b = NULL, status = '예정'
          WHERE id = ?`,
    args: [matchId],
  });
  if (!touched.includes(matchId)) touched.push(matchId);
  return touched;
}

// POST /api/admin/bracket/matches/:id/result — 승자 저장 + 다음 라운드 자동 배치
router.post('/bracket/matches/:id/result', async (req, res) => {
  try {
    const matchId = Number(req.params.id);
    const { winner_participant_id, score_a, score_b } = req.body;

    const match = await getMatch(matchId);
    if (!match) return res.status(404).json({ error: '경기를 찾을 수 없습니다.' });

    // 양쪽이 모두 정해진 뒤에만 승자를 기록할 수 있다.
    // (한쪽이 '앞 경기 승자'로 비어 있는데 다른 쪽을 눌러 승리 처리되는 오클릭을 막는다)
    if (match.a_participant_id == null || match.b_participant_id == null)
      return res.status(400).json({
        error: '아직 상대가 정해지지 않았습니다. 앞 경기 결과를 먼저 입력해 주세요.',
      });

    // 승자는 반드시 이 경기에 배정된 두 선수 중 하나여야 한다.
    const winner = Number(winner_participant_id);
    if (![match.a_participant_id, match.b_participant_id].includes(winner))
      return res.status(400).json({
        error: '이 경기의 참가자가 아닙니다.',
        a: match.a_participant_id, b: match.b_participant_id,
      });

    // 이미 다른 승자가 기록돼 있으면 하류를 먼저 정리해야 잘못된 진출이 남지 않는다.
    if (match.winner_participant_id != null && match.winner_participant_id !== winner)
      await clearResult(matchId);

    await db.execute({
      sql: `UPDATE bracket_matches
            SET winner_participant_id = ?, score_a = ?, score_b = ?, status = '종료'
            WHERE id = ?`,
      args: [winner, score_a ?? null, score_b ?? null, matchId],
    });

    // 자동 진출
    let advanced = null;
    const next = await nextSlotOf(matchId);
    if (next) {
      await db.execute({
        sql:  `UPDATE bracket_matches SET ${next.slot}_participant_id = ? WHERE id = ?`,
        args: [winner, next.id],
      });
      advanced = { match_id: next.id, slot: next.slot, participant_id: winner };
    }

    res.json({ match: await getMatch(matchId), advanced, is_champion: !next });
  } catch (e) { serverError(res, e, 'bracket-result'); }
});

// DELETE /api/admin/bracket/matches/:id/result — 결과 취소 (하류 연쇄)
router.delete('/bracket/matches/:id/result', async (req, res) => {
  try {
    const matchId = Number(req.params.id);
    const match = await getMatch(matchId);
    if (!match) return res.status(404).json({ error: '경기를 찾을 수 없습니다.' });

    const touched = await clearResult(matchId);
    res.json({ match: await getMatch(matchId), cleared_match_ids: touched });
  } catch (e) { serverError(res, e, 'bracket-result-delete'); }
});

export default router;
