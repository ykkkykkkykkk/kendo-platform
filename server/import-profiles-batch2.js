// 선수 프로필 추가 입력 (2차분).
// 형식: 이름 / 키 / 소속팀 / 단 / 죽도 / 호구 / 인스타그램
//
// 정규식 추측 없이 선수별로 값을 명시하고, DB의 현재 값과 대조해 무엇이 바뀌는지 먼저 보여준다.
// 이름·팀이 예상과 다르면 그 선수는 건너뛴다(엉뚱한 선수를 덮어쓰지 않기 위함).
//
// 사용: node import-profiles-batch2.js            → 미리보기(전/후 대조)
//       node import-profiles-batch2.js --apply    → 실제 반영
import { createClient } from '@libsql/client';
import 'dotenv/config';

const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const APPLY = process.argv.includes('--apply');

// expectName: DB에서 찾을 때 쓰는 현재 이름 (이름이 바뀌는 경우가 있어 분리)
const ROWS = [
  {
    expectName: '지은비', name: '지은비', height: 170, team: '부산광역시체육회', dan: 4,
    죽도: '더케이', 호구: '더케이', insta: 'eunbi__012',
  },
  {
    // 확인 결과 DB의 '정송윤'이 오타. '정승윤'이 맞는 이름이며 단도 7단 → 6단으로 정정.
    expectName: '정송윤', name: '정승윤', height: 178, team: '달서구청', dan: 6,
    죽도: 'wy검도마트 해치', 호구: '미츠보시 텐', insta: 'victory_yoon._',
  },
  {
    // DB 5단 → 제공 자료의 6단으로 갱신
    expectName: '김제승', name: '김제승', height: 178, team: '달서구청', dan: 6,
    죽도: 'wy검도마트 해치', 호구: '대도상사', insta: 'jeseungg',
  },
  {
    expectName: '정조영', name: '정조영', height: 175, team: '달서구청', dan: 3,
    죽도: 'WY검도마트 해치', 호구: '세현상사 귀무자', insta: 'jeongjy___',
  },
];

/* 장비 문자열을 브랜드/모델로 나눈다. 기존 데이터가 '세현상사 귀무자'처럼
   '브랜드 모델' 꼴이라 첫 낱말을 브랜드로 본다. 낱말이 하나면 브랜드만. */
function splitGear(s) {
  const t = String(s ?? '').trim();
  if (!t) return null;
  const i = t.indexOf(' ');
  return i < 0 ? { brand: t, model: null } : { brand: t.slice(0, i), model: t.slice(i + 1).trim() };
}

const problems = [];
const plan = [];

for (const r of ROWS) {
  const { rows } = await db.execute({
    sql: `SELECT p.id, p.name, p.height_cm, p.dan_grade, p.instagram_url, p.team_id, t.name AS team
          FROM players p LEFT JOIN teams t ON t.id = p.team_id WHERE p.name = ?`,
    args: [r.expectName],
  });

  if (rows.length > 1) { problems.push(`${r.expectName}: 동명이인 ${rows.length}명 — 수동 확인 필요`); continue; }

  const { rows: [team] } = await db.execute({ sql: 'SELECT id, name FROM teams WHERE name = ?', args: [r.team] });
  if (!team) { problems.push(`${r.name}: 팀 '${r.team}'을 찾을 수 없음`); continue; }

  const cur = rows[0] ?? null;
  if (cur && cur.team !== r.team) {
    problems.push(`${r.expectName}: 팀 불일치 (DB '${cur.team}' ≠ '${r.team}') — 다른 선수일 수 있음`);
    continue;
  }

  const { rows: gear } = cur
    ? await db.execute({ sql: 'SELECT category, brand, model_name FROM player_gear WHERE player_id = ?', args: [cur.id] })
    : { rows: [] };

  plan.push({ r, cur, teamId: team.id, gear });
}

console.log(`대상 ${ROWS.length}명 · 처리 ${plan.length}명\n`);
for (const { r, cur, gear } of plan) {
  const g = (c) => gear.find((x) => x.category === c);
  const gs = (c) => { const x = g(c); return x ? [x.brand, x.model_name].filter(Boolean).join(' ') : '없음'; };
  if (!cur) {
    console.log(`  + 신규 ${r.name} (${r.team}) ${r.dan}단 ${r.height}cm`);
  } else {
    console.log(`  · ${cur.name}(id${cur.id})`);
    if (cur.name !== r.name)                  console.log(`      이름   ${cur.name} → ${r.name}`);
    if (cur.height_cm !== r.height)           console.log(`      키     ${cur.height_cm ?? '없음'} → ${r.height}`);
    if (cur.dan_grade !== r.dan)              console.log(`      단     ${cur.dan_grade ?? '없음'} → ${r.dan}`);
    if ((cur.instagram_url ?? '') !== r.insta) console.log(`      인스타 ${cur.instagram_url ?? '없음'} → ${r.insta}`);
    console.log(`      죽도   ${gs('죽도')} → ${r.죽도}`);
    console.log(`      호구   ${gs('호구')} → ${r.호구}`);
  }
}

if (problems.length) {
  console.error(`\n❌ 문제 ${problems.length}건 — 아무것도 반영하지 않습니다.`);
  for (const p of problems) console.error('   · ' + p);
  process.exit(1);
}

if (!APPLY) { console.log('\n(미리보기 — 반영 안 됨. 실행: --apply)'); process.exit(0); }

for (const { r, cur, teamId } of plan) {
  let playerId = cur?.id;

  if (!playerId) {
    const { lastInsertRowid } = await db.execute({
      sql: 'INSERT INTO players (name, slug, team_id, dan_grade, height_cm, instagram_url) VALUES (?, ?, ?, ?, ?, ?)',
      args: [r.name, r.slug ?? `${r.name}-${Date.now()}`, teamId, r.dan, r.height, r.insta],
    });
    playerId = Number(lastInsertRowid);
    console.log(`✅ 신규 ${r.name} (id${playerId})`);
  } else {
    await db.execute({
      sql: `UPDATE players SET name = ?, height_cm = ?, dan_grade = ?, instagram_url = ?, team_id = ? WHERE id = ?`,
      args: [r.name, r.height, r.dan, r.insta, teamId, playerId],
    });
    console.log(`✅ ${r.name} (id${playerId}) 갱신`);
  }

  // 장비는 죽도/호구만 다시 채운다 (다른 분류는 건드리지 않음)
  for (const cat of ['죽도', '호구']) {
    const parsed = splitGear(r[cat]);
    await db.execute({ sql: 'DELETE FROM player_gear WHERE player_id = ? AND category = ?', args: [playerId, cat] });
    if (parsed) {
      await db.execute({
        sql: 'INSERT INTO player_gear (player_id, category, brand, model_name, display_order) VALUES (?, ?, ?, ?, 0)',
        args: [playerId, cat, parsed.brand, parsed.model],
      });
    }
  }
}

console.log('\n완료.');
process.exit(0);
