// 선수 소개글(bio)에서 단체전 오더(선봉·이봉·중견·부장·대장) 표현을 정리한다.
// 화면에서 포지션 배지는 뗐는데 소개 본문에는 그대로 남아 있었다.
// 이호진은 실제 5단인데 '8단 고수'라고 적혀 있어 그 부분도 뺀다.
//
// 정규식으로 뭉개지 않고 선수별로 원문/수정문을 명시한다. 원문이 예상과 다르면 건너뛴다.
//
// 사용: node fix-bio-positions.js            → 미리보기(원문·수정문 대조)
//       node fix-bio-positions.js --apply    → 실제 반영
import { createClient } from '@libsql/client';
import 'dotenv/config';

const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const APPLY = process.argv.includes('--apply');

// [선수id, 이름, 원문(확인용), 수정문]
const FIXES = [
  [3,  '백다솜',
   '경주시청 중견. 안정적인 경기 운영이 강점.',
   '안정적인 경기 운영이 강점.'],

  [5,  '김미진',
   '베테랑 선봉. 첫판을 지배하는 압도적인 기세.',
   '경험 많은 베테랑. 압도적인 기세가 강점.'],

  [7,  '박시은',
   '충남체육회 대장. 풍부한 실전 경험과 냉철한 판단력.',
   '풍부한 실전 경험과 냉철한 판단력.'],

  [44, '이호진',
   '광명시청 대장. 8단 고수. 대한민국 최정상급 기량을 보유한 레전드.',
   '대한민국 최정상급 기량을 보유한 레전드.'],

  [48, '정종현',
   '전국 최고 수준의 선봉. 첫판을 무조건 가져간다는 평판.',
   '전국 최고 수준의 실력자로 꼽히는 선수.'],

  [53, '주연우',
   '달서구청 대장. 국가대표 출신. 연간 10개 이상 타이틀을 보유한 전설.',
   '국가대표 출신. 연간 10개 이상 타이틀을 보유한 전설.'],
];

const POS = /선봉|이봉|중견|부장|대장/;

let planned = 0;
const skipped = [];

console.log(`대상 ${FIXES.length}명\n`);
for (const [id, name, expected, next] of FIXES) {
  const { rows: [p] } = await db.execute({
    sql: 'SELECT id, name, dan_grade, bio FROM players WHERE id = ?', args: [id],
  });
  if (!p)                 { skipped.push(`#${id} ${name}: 선수 없음`); continue; }
  if (p.name !== name)    { skipped.push(`#${id} 이름 불일치 (DB '${p.name}' ≠ '${name}')`); continue; }
  if (p.bio === next)     { console.log(`  = #${id} ${name} — 이미 정리됨`); continue; }
  if (p.bio !== expected) { skipped.push(`#${id} ${name}: 원문이 예상과 다름\n       DB   「${p.bio}」\n       예상 「${expected}」`); continue; }

  console.log(`  · #${id} ${p.name} (${p.dan_grade}단)`);
  console.log(`      전 「${p.bio}」`);
  console.log(`      후 「${next}」`);
  planned++;
}

if (skipped.length) {
  console.log(`\n건너뜀 ${skipped.length}건`);
  for (const s of skipped) console.log('   ! ' + s);
}

if (!APPLY) {
  console.log(`\n(미리보기 — ${planned}명 수정 예정. 실제 반영은 --apply)`);
  process.exit(0);
}

for (const [id, name, expected, next] of FIXES) {
  const { rows: [p] } = await db.execute({ sql: 'SELECT name, bio FROM players WHERE id = ?', args: [id] });
  if (!p || p.name !== name || p.bio !== expected) continue;
  await db.execute({ sql: 'UPDATE players SET bio = ? WHERE id = ?', args: [next, id] });
  console.log(`✅ #${id} ${name}`);
}

// 반영 확인 — 남은 포지션 표현이 있는지 훑는다
const { rows: all } = await db.execute("SELECT id, name, bio FROM players WHERE bio IS NOT NULL AND bio <> ''");
const left = all.filter((r) => POS.test(r.bio));
console.log(`\n소개글 ${all.length}건 중 포지션 표현 남은 것: ${left.length}건`);
for (const r of left) console.log(`   #${r.id} ${r.name}: ${r.bio}`);
process.exit(0);
