// 충남에 잘못 들어간 시드 placeholder 삭제 (안수현·진소형·지은비, 단 없음).
// 삼중 가드: 이름 + 충청남도체육회 + dan_grade IS NULL → 부산 진짜는 절대 안 건드림.
// 사용: node delete-fake-players.js          → 미리보기
//       node delete-fake-players.js --apply  → 실제 삭제
import { createClient } from '@libsql/client';
import 'dotenv/config';

const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const APPLY = process.argv.includes('--apply');

const { rows: targets } = await db.execute(`
  SELECT p.id, p.name, t.name AS team, p.dan_grade
  FROM players p JOIN teams t ON t.id = p.team_id
  WHERE p.name IN ('안수현','진소형','지은비')
    AND t.name = '충청남도체육회'
    AND p.dan_grade IS NULL
`);

console.log(`\n삭제 대상 ${targets.length}명:`);
for (const p of targets) console.log(`  id=${p.id}  ${p.name} (${p.team}) 단=${p.dan_grade ?? '없음'}`);

if (!APPLY) { console.log('\n(미리보기 — 삭제 안 됨. 실행: --apply)'); process.exit(0); }

for (const { id } of targets) {
  const { rows: clinics } = await db.execute({ sql: 'SELECT id FROM clinics WHERE player_id = ?', args: [id] });
  for (const c of clinics) await db.execute({ sql: 'DELETE FROM clinic_bookings WHERE clinic_id = ?', args: [c.id] });
  await db.execute({ sql: 'DELETE FROM clinics          WHERE player_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM follows          WHERE player_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM player_questions WHERE player_id = ?', args: [id] });
  await db.execute({ sql: 'UPDATE predictions SET predicted_winner_player_id = NULL WHERE predicted_winner_player_id = ?', args: [id] });
  await db.execute({ sql: 'UPDATE matches SET player_a_id     = NULL WHERE player_a_id = ?',     args: [id] });
  await db.execute({ sql: 'UPDATE matches SET player_b_id     = NULL WHERE player_b_id = ?',     args: [id] });
  await db.execute({ sql: 'UPDATE matches SET winner_player_id = NULL WHERE winner_player_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM player_gear  WHERE player_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM player_stats WHERE player_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM players      WHERE id = ?',        args: [id] });
}
console.log(`\n✅ ${targets.length}명 삭제 완료`);
process.exit(0);
