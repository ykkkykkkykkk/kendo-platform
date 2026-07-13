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

// 팀명 정규화 (약칭·광역시/특례시/체육회 등 제거해 핵심 지역명만)
function teamCore(t) {
  if (!t) return '';
  let s = t;
  // 도 약칭을 먼저 통일 (충청남도→충남 …) — 접미사 제거보다 앞서야 함
  const map = [['충청남도','충남'],['충청북도','충북'],['경상남도','경남'],
               ['경상북도','경북'],['전라남도','전남'],['전라북도','전북'],['강원도','강원']];
  for (const [full, ab] of map) s = s.replace(full, ab);
  s = s
    .replace(/광역시|특례시|특별시|자치시|자치도/g, '')
    .replace(/체육회|스포츠단/g, '')
    .replace(/시청|군청|구청|도청/g, '')
    .replace(/[시군구도청]$/g, '');
  return s.trim();
}

const changes = [], ok = [], notFound = [], ambiguous = [];
for (const rec of records) {
  const { rows } = await db.execute({
    sql: `SELECT p.id, p.name, p.dan_grade, t.name AS team
          FROM players p JOIN teams t ON t.id = p.team_id
          WHERE p.name = ?`,
    args: [rec.name],
  });
  if (rows.length === 0) { notFound.push({ ...rec, reason: 'DB에 이름 없음' }); continue; }
  // 이름 + 팀(정규화) 모두 일치하는 것만
  const matched = rows.filter((r) => teamCore(r.team) === teamCore(rec.team));
  if (matched.length === 0) {
    notFound.push({ ...rec, reason: `팀 불일치 (DB: ${rows.map((r) => r.team).join('/')})` });
    continue;
  }
  if (matched.length > 1) { ambiguous.push({ rec, rows: matched }); continue; }
  const p = matched[0];
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
