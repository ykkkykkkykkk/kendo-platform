import { db } from '../db.js';

// 픽 하나의 점수 계산
export function calculatePickScore(pick, result) {
  let score = 0;
  if (pick.pick_1st != null && pick.pick_1st === result.rank_1st) score += 50;
  if (pick.pick_2nd != null && pick.pick_2nd === result.rank_2nd) score += 30;
  const thirds = new Set(
    [result.rank_3rd_a, result.rank_3rd_b].filter((x) => x != null)
  );
  if (pick.pick_3rd_a != null && thirds.has(pick.pick_3rd_a)) score += 10;
  if (pick.pick_3rd_b != null && thirds.has(pick.pick_3rd_b)) score += 10;
  return score;
}

// 부문의 모든 픽 점수를 결과에 맞춰 재계산
export async function updateDivisionScores(divisionId) {
  const { rows: picks } = await db.execute({
    sql:  'SELECT id, pick_1st, pick_2nd, pick_3rd_a, pick_3rd_b FROM tournament_picks WHERE division_id = ?',
    args: [divisionId],
  });

  const { rows: results } = await db.execute({
    sql:  'SELECT rank_1st, rank_2nd, rank_3rd_a, rank_3rd_b FROM division_results WHERE division_id = ?',
    args: [divisionId],
  });

  if (!results.length) return 0;
  const result = results[0];

  for (const pick of picks) {
    const score = calculatePickScore(pick, result);
    await db.execute({
      sql:  'UPDATE tournament_picks SET score = ? WHERE id = ?',
      args: [score, pick.id],
    });
  }
  return picks.length;
}
