// 대진표 엑셀(.xls) → 픽 시스템 부문(tournament_divisions) + 참가자(division_participants) 등록.
//
// 각 엑셀의 '명단' 시트(단체명 | 이름 | 번호)를 정본으로 읽는다. 이름을 사람이 옮겨 적지 않으므로
// 오타가 생길 여지가 없고, DB players와는 [이름 + 팀]으로만 매칭한다(동명이인 안전 분리).
// 미해결·모호·인원 불일치가 하나라도 있으면 --apply여도 아무것도 쓰지 않고 중단한다.
//
// 사용: node import-brackets.js            → 미리보기 + 검증 리포트
//       node import-brackets.js --apply    → 실제 등록
import { createClient } from '@libsql/client';
import XLSX from 'xlsx';
import 'dotenv/config';

const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const APPLY = process.argv.includes('--apply');

const XLS_DIR      = 'C:/Users/82104/Desktop/선수';
const TOURNAMENT_SLUG = '2026';   // 2026년 하계 전국실업검도대회

/* ── 부문 정의 (파일 → 부문) ─────────────────────────────── */
const SOURCES = [
  { file: '개인전 남자 3단부 (2).xls', type: 'male_individual',   label: '남자개인3단부', dan: 3,    order: 1, expect: 42 },
  { file: '개인전 남자 4단부.xls',     type: 'male_individual',   label: '남자개인4단부', dan: 4,    order: 2, expect: 37 },
  { file: '개인전 남자 5단부.xls',     type: 'male_individual',   label: '남자개인5단부', dan: 5,    order: 3, expect: 58 },
  { file: '여자 개인전.xls',           type: 'female_individual', label: '여자개인',      dan: null, order: 4, expect: 42 },
];

/* ── 한글 로마자 슬러그 (add-missing-players.js와 동일) ──── */
const CHO  = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
const JUNG = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
const JONG = ['','k','k','ks','n','nj','nh','t','l','lk','lm','lb','ls','lt','lp','lh','m','p','ps','t','t','ng','t','t','k','t','p','h'];
// 성씨는 통용 표기를 쓴다 (박은 기계 변환이면 bak이지만 실제로는 park)
const SURNAME = { '김':'kim', '이':'lee', '박':'park', '최':'choi', '신':'shin', '윤':'yoon' };
function romanize(kor) {
  let out = '';
  for (const ch of kor) {
    const code = ch.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) continue;
    out += CHO[Math.floor(code / 588)] + JUNG[Math.floor((code % 588) / 28)] + JONG[code % 28];
  }
  return out;
}
function slugify(name) {
  const sur = name[0], given = name.slice(1);
  return ((SURNAME[sur] ?? romanize(sur)) + '-' + romanize(given)).toLowerCase().replace(/[^a-z0-9-]/g, '');
}

/* ── 팀명 정규화 (add-missing-players.js와 동일) ─────────── */
function teamCore(t) {
  if (!t) return '';
  let s = t;
  const map = [['충청남도','충남'],['충청북도','충북'],['경상남도','경남'],['경상북도','경북'],['전라남도','전남'],['전라북도','전북'],['강원도','강원']];
  for (const [f, a] of map) s = s.replace(f, a);
  return s.replace(/광역시|특례시|특별시|자치시|자치도/g, '').replace(/체육회|스포츠단/g, '')
          .replace(/시청|군청|구청|도청/g, '').replace(/[시군구도청]$/g, '').trim();
}

// teamCore()로 안 붙는 표기 차이는 명시 별칭으로 처리.
// ('특별자치시'에서 '자치시'만 떨어져 '세종특별검도회'가 되는 케이스)
const TEAM_ALIASES = { '세종특별자치시검도회': '세종시검도회' };

// 대진표에만 있고 DB엔 없는 팀 — 필요 시 생성한다.
const NEW_TEAMS = { '제주시검도회': { slug: 'jeju', region: '제주' } };

const norm = (s) => String(s ?? '').replace(/\s+/g, '').trim();   // '양 욱', '송 건' 대응

/* ══════════════ 1. 엑셀 파싱 ══════════════ */
const divisions = [];
for (const src of SOURCES) {
  const wb = XLSX.readFile(`${XLS_DIR}/${src.file}`);
  const ws = wb.Sheets['명단'];
  if (!ws) { console.error(`❌ ${src.file}: '명단' 시트 없음`); process.exit(1); }

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
  const entries = [];
  for (const r of rows) {
    const team = String(r[1] ?? '').trim();
    const name = String(r[2] ?? '').trim();
    const seed = String(r[3] ?? '').trim();
    if (!team || !name || team === '단체명' || !/^\d+$/.test(seed)) continue;
    entries.push({ team, name, seed: Number(seed) });
  }
  entries.sort((a, b) => a.seed - b.seed);
  divisions.push({ ...src, entries });
}

const total = divisions.reduce((n, d) => n + d.entries.length, 0);
console.log(`\n엑셀 파싱: ${divisions.length}개 부문 · 총 ${total}명`);
for (const d of divisions) console.log(`  ${d.label.padEnd(12)} ${String(d.entries.length).padStart(3)}명 (기대 ${d.expect})`);

/* ══════════════ 2. 팀 해석 ══════════════ */
const problems = [];

const { rows: teamRows } = await db.execute('SELECT id, name, slug FROM teams');
const teams = teamRows.map((r) => ({ id: r.id, name: r.name, slug: r.slug }));

const xlsTeams = [...new Set(divisions.flatMap((d) => d.entries.map((e) => e.team)))].sort();
const teamMap  = new Map();   // 엑셀 팀명 → { id | null, name, isNew }
const teamsToCreate = [];

console.log(`\n■ 팀 해석 (엑셀 ${xlsTeams.length}종 / DB ${teams.length}종)`);
for (const xt of xlsTeams) {
  const target = TEAM_ALIASES[xt] ?? xt;
  const hits   = teams.filter((t) => teamCore(t.name) === teamCore(target));

  if (hits.length === 1) {
    teamMap.set(xt, { id: hits[0].id, name: hits[0].name, isNew: false });
    const note = hits[0].name === xt ? '' : `  (DB: ${hits[0].name})`;
    console.log(`  OK    ${xt}${note}`);
  } else if (hits.length > 1) {
    problems.push(`팀 모호: '${xt}' → ${hits.map((h) => h.name).join(' / ')}`);
    console.log(`  모호  ${xt} → ${hits.map((h) => h.name).join(' / ')}`);
  } else if (NEW_TEAMS[xt]) {
    const spec = NEW_TEAMS[xt];
    let slug = spec.slug, n = 2;
    while (teams.some((t) => t.slug === slug)) slug = `${spec.slug}-${n++}`;
    const rec = { name: xt, slug, region: spec.region };
    teamsToCreate.push(rec);
    teamMap.set(xt, { id: null, name: xt, isNew: true, rec });
    console.log(`  신규  ${xt}  slug=${slug} region=${spec.region}`);
  } else {
    problems.push(`팀 못 찾음: '${xt}' (teamCore='${teamCore(target)}')`);
    console.log(`  못찾음 ${xt}`);
  }
}

/* ══════════════ 3. 선수 매칭 ══════════════ */
const { rows: playerRows } = await db.execute(
  `SELECT p.id, p.name, p.dan_grade, p.team_id, t.name AS team
   FROM players p LEFT JOIN teams t ON t.id = p.team_id`
);
const players = playerRows.map((r) => ({
  id: r.id, name: r.name, dan: r.dan_grade, team_id: r.team_id, team: r.team ?? '',
}));

const usedSlugs = new Set((await db.execute('SELECT slug FROM players')).rows.map((r) => r.slug));
const playersToCreate = [];
let matchedCount = 0;

console.log('\n■ 선수 매칭');
for (const d of divisions) {
  // 시드 연속성 검사
  const seeds = d.entries.map((e) => e.seed);
  const dupSeeds  = seeds.filter((s, i) => seeds.indexOf(s) !== i);
  const missSeeds = Array.from({ length: d.entries.length }, (_, i) => i + 1).filter((s) => !seeds.includes(s));
  if (dupSeeds.length)  problems.push(`${d.label}: 시드 중복 ${[...new Set(dupSeeds)].join(',')}`);
  if (missSeeds.length) problems.push(`${d.label}: 시드 누락 ${missSeeds.join(',')}`);
  if (d.entries.length !== d.expect) problems.push(`${d.label}: 인원 ${d.entries.length}명 (기대 ${d.expect}명)`);

  for (const e of d.entries) {
    const tm = teamMap.get(e.team);
    if (!tm) { e.resolved = null; continue; }   // 팀 단계에서 이미 problems에 기록됨

    if (tm.isNew) {
      // 신규 팀이면 DB에 선수가 있을 수 없다 → 무조건 신규 생성
      e.resolved = queueNewPlayer(e, d, tm);
      continue;
    }

    const hits = players.filter((p) => norm(p.name) === norm(e.name) && p.team_id === tm.id);
    if (hits.length === 1) { e.resolved = { playerId: hits[0].id }; matchedCount++; continue; }
    if (hits.length > 1) {
      problems.push(`선수 모호: ${d.label} #${e.seed} ${e.name}/${e.team} → id ${hits.map((h) => h.id).join(',')}`);
      e.resolved = null;
      continue;
    }
    e.resolved = queueNewPlayer(e, d, tm);
  }
}

function queueNewPlayer(e, d, tm) {
  // 같은 (이름, 팀) 조합이 이미 생성 대기 중이면 재사용
  const existing = playersToCreate.find((p) => norm(p.name) === norm(e.name) && p.teamKey === e.team);
  if (existing) return { newPlayer: existing };

  let base = slugify(norm(e.name)), slug = base, n = 2;
  while (usedSlugs.has(slug)) slug = `${base}-${n++}`;
  usedSlugs.add(slug);

  const rec = {
    name: e.name, teamKey: e.team, teamName: tm.name, slug,
    dan: d.dan, division: d.label, seed: e.seed, teamIsNew: tm.isNew,
  };
  playersToCreate.push(rec);
  return { newPlayer: rec };
}

console.log(`  기존 매칭 ${matchedCount}명 · 신규 생성 ${playersToCreate.length}명 / 총 ${total}명`);
if (playersToCreate.length) {
  console.log(`\n■ 신규 선수 ${playersToCreate.length}명`);
  for (const p of playersToCreate)
    console.log(`  ${p.division} #${String(p.seed).padStart(2)}  ${p.name} (${p.teamName})${p.dan ? ` ${p.dan}단` : ''}  slug=${p.slug}${p.teamIsNew ? '  [신규팀]' : ''}`);
}

/* ══════════════ 4. 대회 확인 ══════════════ */
const { rows: tRows } = await db.execute({
  sql:  'SELECT id, name, slug FROM tournaments WHERE slug = ?',
  args: [TOURNAMENT_SLUG],
});
if (!tRows.length) problems.push(`대회 slug='${TOURNAMENT_SLUG}'를 찾을 수 없음`);
const tournament = tRows[0];
if (tournament) console.log(`\n■ 대상 대회: [${tournament.id}] ${tournament.name} (slug=${tournament.slug})`);

// label 컬럼(마이그레이션 015) 적용 여부 확인
let hasLabel = false;
try {
  const { rows: cols } = await db.execute("SELECT sql FROM sqlite_master WHERE name='tournament_divisions'");
  hasLabel = /\blabel\b/.test(cols[0]?.sql ?? '');
} catch { /* ignore */ }
if (!hasLabel) problems.push("tournament_divisions에 label 컬럼이 없음 — 먼저 'node apply-migration.js 015_division_label.sql' 실행");

/* ══════════════ 5. 검증 게이트 ══════════════ */
if (problems.length) {
  console.error(`\n❌ 문제 ${problems.length}건 — 아무것도 등록하지 않습니다.`);
  for (const p of problems) console.error(`   · ${p}`);
  process.exit(1);
}
console.log('\n✔ 검증 통과: 미해결 0 · 모호 0 · 시드 정상 · 인원 일치');

if (!APPLY) {
  console.log('\n(미리보기 — 아무것도 등록되지 않았습니다. 실제 등록은 --apply)');
  process.exit(0);
}

/* ══════════════ 6. 적용 ══════════════ */
// 6-1. 신규 팀
for (const t of teamsToCreate) {
  const { lastInsertRowid } = await db.execute({
    sql:  'INSERT INTO teams (name, slug, region) VALUES (?, ?, ?)',
    args: [t.name, t.slug, t.region],
  });
  const id = Number(lastInsertRowid);
  for (const [, v] of teamMap) if (v.isNew && v.rec === t) v.id = id;
  console.log(`✅ 팀 생성  ${t.name} (id=${id})`);
}

// 6-2. 신규 선수
for (const p of playersToCreate) {
  const teamId = teamMap.get(p.teamKey).id;
  const { lastInsertRowid } = await db.execute({
    sql:  'INSERT INTO players (name, slug, team_id, dan_grade) VALUES (?, ?, ?, ?)',
    args: [p.name, p.slug, teamId, p.dan],
  });
  p.id = Number(lastInsertRowid);
  console.log(`✅ 선수 생성 ${p.name} (${p.teamName}) id=${p.id}`);
}

// 6-3. 부문 + 참가자
for (const d of divisions) {
  // 부문 식별은 (대회, 타입, sort_order)로 한다 — label로 찾으면 표시명을 바꿨을 때
  // 기존 부문을 못 찾고 중복 부문을 새로 만들어 버린다.
  const { rows: existing } = await db.execute({
    sql:  'SELECT id, label FROM tournament_divisions WHERE tournament_id = ? AND division_type = ? AND sort_order = ?',
    args: [tournament.id, d.type, d.order],
  });

  let divisionId;
  if (existing.length) {
    divisionId = existing[0].id;
    const renamed = existing[0].label !== d.label ? ` ('${existing[0].label}' → '${d.label}')` : '';
    await db.execute({
      sql:  'UPDATE tournament_divisions SET label = ?, participant_count = ? WHERE id = ?',
      args: [d.label, d.entries.length, divisionId],
    });

    // 참가자 id는 픽·결과가 참조한다. 이미 픽이 들어왔으면 갈아끼우면 안 된다.
    const [{ n: pickN }] = (await db.execute({
      sql: 'SELECT COUNT(*) AS n FROM tournament_picks WHERE division_id = ?', args: [divisionId],
    })).rows;
    const [{ n: resN }] = (await db.execute({
      sql: 'SELECT COUNT(*) AS n FROM division_results WHERE division_id = ?', args: [divisionId],
    })).rows;

    if (pickN > 0 || resN > 0) {
      console.log(`↻ 부문 갱신 ${d.label}${renamed} (id=${divisionId})`);
      console.log(`   ⚠ 픽 ${pickN}건 · 결과 ${resN}건이 참조 중 → 참가자는 그대로 둡니다 (표시명만 변경)`);
      continue;
    }
    await db.execute({ sql: 'DELETE FROM division_participants WHERE division_id = ?', args: [divisionId] });
    console.log(`↻ 부문 갱신 ${d.label}${renamed} (id=${divisionId}, 기존 참가자 삭제)`);
  } else {
    const { lastInsertRowid } = await db.execute({
      sql: `INSERT INTO tournament_divisions (tournament_id, division_type, label, sort_order, participant_count)
            VALUES (?, ?, ?, ?, ?)`,
      args: [tournament.id, d.type, d.label, d.order, d.entries.length],
    });
    divisionId = Number(lastInsertRowid);
    console.log(`✅ 부문 생성 ${d.label} (id=${divisionId})`);
  }

  for (const e of d.entries) {
    const playerId = e.resolved.playerId ?? e.resolved.newPlayer.id;
    await db.execute({
      sql:  'INSERT INTO division_participants (division_id, player_id, seed_number) VALUES (?, ?, ?)',
      args: [divisionId, playerId, e.seed],
    });
  }
  console.log(`   참가자 ${d.entries.length}명 등록`);
}

// 6-4. 대회 부문 플래그 (현재 코드에서 미사용이지만 정합성 유지)
const hasMale   = divisions.some((d) => d.type === 'male_individual')   ? 1 : 0;
const hasFemale = divisions.some((d) => d.type === 'female_individual') ? 1 : 0;
await db.execute({
  sql:  'UPDATE tournaments SET has_male_individual = ?, has_female_individual = ? WHERE id = ?',
  args: [hasMale, hasFemale, tournament.id],
});

console.log(`\n완료: 부문 ${divisions.length}개 · 참가자 ${total}명`);
process.exit(0);
