// 엑셀 단 데이터로 선수 dan_grade를 이름 매칭 업데이트.
// 사용: node update-dans.js dan-data-men.txt          → 미리보기(미적용)
//       node update-dans.js dan-data-men.txt --apply  → 실제 반영
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_AUTH_TOKEN });

const file  = process.argv[2] || 'dan-data-men.txt';
const APPLY = process.argv.includes('--apply');
const raw   = readFileSync(join(__dirname, file), 'utf8');

// "(단)단부  (팀)  (이름)" 전역 추출 — 번호/지역은 무시, 줄바꿈 깨져도 동작
const re = /(\d)단부\s+([가-힣]+)\s+([가-힣]+)/g;
const records = [];
let m;
while ((m = re.exec(raw)) !== null) {
  records.push({ dan: Number(m[1]), team: m[2], name: m[3] });
}

const changes = [], ok = [], notFound = [], ambiguous = [];
for (const rec of records) {
  const { rows } = await db.execute({
    sql: `SELECT p.id, p.name, p.dan_grade, t.name AS team
          FROM players p JOIN teams t ON t.id = p.team_id
          WHERE p.name = ?`,
    args: [rec.name],
  });
  if (rows.length === 0) { notFound.push(rec); continue; }
  let p = rows[0];
  if (rows.length > 1) {
    // 동명이인 → 팀 앞 2글자(도시명)로 구분
    const city = rec.team.slice(0, 2);
    const matched = rows.filter((r) => r.team.startsWith(city));
    if (matched.length === 1) p = matched[0];
    else { ambiguous.push({ rec, rows }); continue; }
  }
  if (Number(p.dan_grade) === rec.dan) ok.push(rec);
  else changes.push({ id: p.id, name: rec.name, dbTeam: p.team, from: p.dan_grade, to: rec.dan });
}

console.log(`\n파싱 ${records.length}건`);
console.log(`\n■ 변경 대상 ${changes.length}건 ─────────────`);
for (const c of changes) console.log(`  ${c.name} (${c.dbTeam}): ${c.from ?? '없음'}단 → ${c.to}단`);
console.log(`\n■ 이미 정확 ${ok.length}건`);
console.log(`\n■ DB에 없음 ${notFound.length}건 ─────────────`);
for (const n of notFound) console.log(`  ${n.name} (${n.team}, ${n.dan}단)`);
if (ambiguous.length) {
  console.log(`\n■ 동명이인(수동확인) ${ambiguous.length}건 ─────────────`);
  for (const a of ambiguous)
    console.log(`  ${a.rec.name} → ${a.rec.dan}단 목표 / DB후보: ` + a.rows.map(r => `${r.team}(${r.dan_grade}단)`).join(', '));
}

if (APPLY) {
  for (const c of changes)
    await db.execute({ sql: 'UPDATE players SET dan_grade = ? WHERE id = ?', args: [c.to, c.id] });
  console.log(`\n✅ ${changes.length}건 실제 반영 완료`);
} else {
  console.log(`\n(미리보기 — 반영 안 됨. 적용하려면 끝에 --apply)`);
}
process.exit(0);
