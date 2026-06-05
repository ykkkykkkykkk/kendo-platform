import { db } from '../db.js';

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

// 부문의 모든 픽 점수 재계산 + 도장 누적 점수 동기화
export async function updateDivisionScores(divisionId) {
  const { rows: picks } = await db.execute({
    sql:  'SELECT id, user_id, pick_1st, pick_2nd, pick_3rd_a, pick_3rd_b FROM tournament_picks WHERE division_id = ?',
    args: [divisionId],
  });

  const { rows: results } = await db.execute({
    sql:  'SELECT rank_1st, rank_2nd, rank_3rd_a, rank_3rd_b FROM division_results WHERE division_id = ?',
    args: [divisionId],
  });

  if (!results.length) return 0;
  const result = results[0];

  // 픽 점수 업데이트
  const affectedUserIds = new Set();
  for (const pick of picks) {
    const score = calculatePickScore(pick, result);
    await db.execute({
      sql:  'UPDATE tournament_picks SET score = ? WHERE id = ?',
      args: [score, pick.id],
    });
    affectedUserIds.add(pick.user_id);
  }

  // 도장 점수 재계산 (영향받은 유저의 dojo만)
  if (affectedUserIds.size > 0) {
    const placeholders = Array.from(affectedUserIds).map(() => '?').join(',');
    const { rows: dojoRows } = await db.execute({
      sql:  `SELECT DISTINCT dojo_id FROM users WHERE id IN (${placeholders}) AND dojo_id IS NOT NULL`,
      args: Array.from(affectedUserIds),
    });

    for (const { dojo_id } of dojoRows) {
      await recalcDojoScore(dojo_id);
    }
  }

  return picks.length;
}

// 도장의 total_score를 현재 활성 시즌 내 전체 픽 점수 합으로 재계산
export async function recalcDojoScore(dojoId) {
  const { rows: [season] } = await db.execute(
    "SELECT id, start_date, end_date FROM seasons WHERE is_active = 1 LIMIT 1"
  );
  if (!season) return;

  const { rows: [row] } = await db.execute({
    sql: `SELECT COALESCE(SUM(tp.score), 0) AS total,
                 COUNT(DISTINCT tp.user_id)  AS contributors
          FROM tournament_picks tp
          JOIN users u ON u.id = tp.user_id
          WHERE u.dojo_id = ?
            AND tp.created_at >= ?
            AND tp.created_at <= ?`,
    args: [dojoId, season.start_date, season.end_date + ' 23:59:59'],
  });

  const { rows: [memberRow] } = await db.execute({
    sql: 'SELECT COUNT(*) AS cnt FROM users WHERE dojo_id = ?',
    args: [dojoId],
  });

  await db.execute({
    sql:  'UPDATE dojos SET total_score = ?, member_count = ?, season_id = ? WHERE id = ?',
    args: [Number(row.total), Number(memberRow.cnt), season.id, dojoId],
  });
}
