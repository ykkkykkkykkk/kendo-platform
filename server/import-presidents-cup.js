// 대통령기 제48회 전국검도선수권대회 → 대회·픽 부문·참가자 등록.
//
// import-brackets.js는 '명단' 시트를 읽지만 이 대진표엔 명단 시트가 없다. 대진표 본문에서
// 직접 읽는다. 시트는 좌우 두 블록이 거울처럼 붙어 있고 열 위치가 고정이다.
//   개인전: 좌 C(시도) D(팀) E(이름) F(번호)  /  우 S(번호) T(이름) U(팀) V(시도)
//   단체전: 좌 C(시도) D(팀)        F(번호)  /  우 Q(번호) R(팀)  T(시도)
//
// 로마자 슬러그·팀명 정규화·검증 게이트는 import-brackets.js와 같은 규칙을 쓴다.
// 미해결·모호·시드 이상이 하나라도 있으면 --apply여도 아무것도 쓰지 않고 중단한다.
//
// 사용: node import-presidents-cup.js          → 미리보기 + 검증 리포트
//       node import-presidents-cup.js --apply  → 실제 등록
import { createClient } from '@libsql/client';
import XLSX from 'xlsx';
import 'dotenv/config';

const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const APPLY = process.argv.includes('--apply');

const XLS_DIR = 'C:/Users/82104/Desktop/선수';
const F_IND   = `${XLS_DIR}/대통령기 제48회 전국검도선수권대회_대진표_남녀개인전.xls`;
const F_TEAM  = `${XLS_DIR}/대통령기 제48회 전국검도선수권대회_대진표_남녀단체전.xls`;

const TOURNAMENT = {
  name:              '대통령기 제48회 전국검도선수권대회',
  slug:              'president-48',
  start_date:        '2026-09-05',
  end_date:          '2026-09-09',
  venue:             '경주실내체육관 (경북)',
  host_organization: '대한검도회',
  tournament_type:   '혼합',
  status:            '예정',
  pick_deadline:     null,   // 관리자가 어드민에서 직접 마감한다
};

const SOURCES = [
  { file: F_IND,  sheet: '남자일반부', kind: 'individual', type: 'male_individual',   label: '남자일반부개인전', order: 1, expect: 51 },
  { file: F_IND,  sheet: '여자일반부', kind: 'individual', type: 'female_individual', label: '여자일반부개인전', order: 2, expect: 44 },
  { file: F_TEAM, sheet: '남자일반부', kind: 'team',       type: 'male_team',         label: '남자일반부단체전', order: 3, expect: 17 },
];

/* ── 한글 로마자 슬러그 (import-brackets.js와 동일) ──── */
const CHO  = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
const JUNG = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
const JONG = ['','k','k','ks','n','nj','nh','t','l','lk','lm','lb','ls','lt','lp','lh','m','p','ps','t','t','ng','t','t','k','t','p','h'];
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

/* ── 팀명 정규화 (import-brackets.js와 동일) ─────────── */
function teamCore(t) {
  if (!t) return '';
  let s = t;
  const map = [['충청남도','충남'],['충청북도','충북'],['경상남도','경남'],['경상북도','경북'],['전라남도','전남'],['전라북도','전북'],['강원도','강원']];
  for (const [f, a] of map) s = s.replace(f, a);
  return s.replace(/광역시|특례시|특별시|자치시|자치도/g, '').replace(/체육회|스포츠단/g, '')
          .replace(/시청|군청|구청|도청/g, '').replace(/[시군구도청]$/g, '').trim();
}
const TEAM_ALIASES = { '세종특별자치시검도회': '세종시검도회' };

// 대진표에만 있고 DB엔 없는 팀 — 필요 시 생성한다.
const NEW_TEAMS = { '(주)서영': { slug: 'seoyoung', region: '전남' } };

const norm = (s) => String(s ?? '').replace(/\s+/g, '').trim();
const at = (ws, c, r) => { const v = ws[`${c}${r}`]; return v == null ? '' : String(v.v).trim(); };

/* ══════════════ 1. 엑셀 파싱 ══════════════ */
function parseSheet(src) {
  const ws = XLSX.readFile(src.file).Sheets[src.sheet];
  if (!ws) { console.error(`❌ ${src.file}: '${src.sheet}' 시트 없음`); process.exit(1); }
  const { e } = XLSX.utils.decode_range(ws['!ref']);
  const out = [];
  for (let r = 1; r <= e.r + 1; r++) {
    const blocks = src.kind === 'individual'
      ? [{ seed: at(ws,'F',r), name: at(ws,'E',r), team: at(ws,'D',r) },
         { seed: at(ws,'S',r), name: at(ws,'T',r), team: at(ws,'U',r) }]
      : [{ seed: at(ws,'F',r), name: '',           team: at(ws,'D',r) },
         { seed: at(ws,'Q',r), name: '',           team: at(ws,'R',r) }];
    for (const b of blocks) {
      if (!/^\d+$/.test(b.seed) || !b.team) continue;
      if (src.kind === 'individual' && !b.name) continue;
      out.push({ seed: Number(b.seed), name: b.name, team: b.team });
    }
  }
  return out.sort((a, b) => a.seed - b.seed);
}

const divisions = SOURCES.map((s) => ({ ...s, entries: parseSheet(s) }));

console.log(`\n엑셀 파싱: ${divisions.length}개 부문`);
for (const d of divisions)
  console.log(`  ${d.label.padEnd(14)} ${String(d.entries.length).padStart(3)}${d.kind === 'team' ? '팀' : '명'} (기대 ${d.expect})`);

/* ══════════════ 2. 팀 해석 ══════════════ */
const problems = [];
const { rows: teamRows } = await db.execute('SELECT id, name, slug FROM teams');
const teams = teamRows.map((r) => ({ id: r.id, name: r.name, slug: r.slug }));

const xlsTeams = [...new Set(divisions.flatMap((d) => d.entries.map((e) => e.team)))].sort();
const teamMap = new Map();
const teamsToCreate = [];

console.log(`\n■ 팀 해석 (엑셀 ${xlsTeams.length}종 / DB ${teams.length}종)`);
for (const xt of xlsTeams) {
  const target = TEAM_ALIASES[xt] ?? xt;
  const hits = teams.filter((t) => teamCore(t.name) === teamCore(target));
  if (hits.length === 1) {
    teamMap.set(xt, { id: hits[0].id, name: hits[0].name, isNew: false });
    if (hits[0].name !== xt) console.log(`  OK    ${xt}  (DB: ${hits[0].name})`);
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
console.log(`  → 기존 ${xlsTeams.length - teamsToCreate.length}종 · 신규 ${teamsToCreate.length}종`);

/* ══════════════ 3. 참가자 매칭 ══════════════ */
const { rows: playerRows } = await db.execute(
  `SELECT p.id, p.name, p.team_id, t.name AS team FROM players p LEFT JOIN teams t ON t.id = p.team_id`);
const players = playerRows.map((r) => ({ id: r.id, name: r.name, team_id: r.team_id, team: r.team ?? '' }));
const usedSlugs = new Set((await db.execute('SELECT slug FROM players')).rows.map((r) => r.slug));
const playersToCreate = [];
let matched = 0;

console.log('\n■ 참가자 매칭');
for (const d of divisions) {
  const seeds = d.entries.map((e) => e.seed);
  const dup  = seeds.filter((s, i) => seeds.indexOf(s) !== i);
  const miss = Array.from({ length: d.entries.length }, (_, i) => i + 1).filter((s) => !seeds.includes(s));
  if (dup.length)  problems.push(`${d.label}: 시드 중복 ${[...new Set(dup)].join(',')}`);
  if (miss.length) problems.push(`${d.label}: 시드 누락 ${miss.join(',')}`);
  if (d.entries.length !== d.expect) problems.push(`${d.label}: 인원 ${d.entries.length} (기대 ${d.expect})`);

  for (const e of d.entries) {
    const tm = teamMap.get(e.team);
    if (!tm) { e.resolved = null; continue; }   // 팀 단계에서 이미 problems에 기록됨

    if (d.kind === 'team') { e.resolved = { team: tm }; matched++; continue; }

    if (tm.isNew) { e.resolved = queueNewPlayer(e, tm); continue; }
    const hits = players.filter((p) => norm(p.name) === norm(e.name) && p.team_id === tm.id);
    if (hits.length === 1) { e.resolved = { playerId: hits[0].id }; matched++; continue; }
    if (hits.length > 1) {
      problems.push(`선수 모호: ${d.label} #${e.seed} ${e.name}/${e.team} → id ${hits.map((h) => h.id).join(',')}`);
      e.resolved = null;
      continue;
    }
    e.resolved = queueNewPlayer(e, tm);
  }
}

function queueNewPlayer(e, tm) {
  const dup = playersToCreate.find((p) => norm(p.name) === norm(e.name) && p.teamKey === e.team);
  if (dup) return { newPlayer: dup };
  let base = slugify(norm(e.name)), slug = base, n = 2;
  while (usedSlugs.has(slug)) slug = `${base}-${n++}`;
  usedSlugs.add(slug);
  const rec = { name: e.name, teamKey: e.team, teamName: tm.name, slug, seed: e.seed, teamIsNew: tm.isNew };
  playersToCreate.push(rec);
  return { newPlayer: rec };
}

console.log(`  기존 매칭 ${matched} · 신규 선수 ${playersToCreate.length}`);
for (const p of playersToCreate)
  console.log(`  신규선수 #${String(p.seed).padStart(2)} ${p.name} (${p.teamName}) slug=${p.slug}${p.teamIsNew ? ' [신규팀]' : ''}`);

/* ══════════════ 4. 검증 게이트 ══════════════ */
if (problems.length) {
  console.error(`\n❌ 문제 ${problems.length}건 — 아무것도 등록하지 않습니다.`);
  for (const p of problems) console.error(`   · ${p}`);
  await db.close();
  process.exit(1);
}
console.log('\n✔ 검증 통과: 미해결 0 · 모호 0 · 시드 정상 · 인원 일치');

console.log('\n■ 등록될 대회');
console.log(`  ${TOURNAMENT.name}`);
console.log(`  slug=${TOURNAMENT.slug} · ${TOURNAMENT.start_date} ~ ${TOURNAMENT.end_date} · ${TOURNAMENT.venue}`);
console.log(`  주최 ${TOURNAMENT.host_organization} · 종목 ${TOURNAMENT.tournament_type} · 상태 ${TOURNAMENT.status} · 픽마감 ${TOURNAMENT.pick_deadline ?? '없음(직접 마감)'}`);

if (!APPLY) {
  console.log('\n(미리보기 — 아무것도 등록되지 않았습니다. 실제 등록은 --apply)');
  await db.close();
  process.exit(0);
}

/* ══════════════ 5. 적용 ══════════════ */
const { rows: tRows } = await db.execute({ sql: 'SELECT id, name FROM tournaments WHERE slug = ?', args: [TOURNAMENT.slug] });
let tournamentId;
if (tRows.length) {
  tournamentId = tRows[0].id;
  console.log(`\n↻ 기존 대회 사용 [${tournamentId}] ${tRows[0].name}`);
} else {
  const { lastInsertRowid } = await db.execute({
    sql: `INSERT INTO tournaments (name, slug, start_date, end_date, venue, host_organization,
            tournament_type, status, pick_deadline,
            has_male_individual, has_female_individual, has_male_team, has_female_team)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, 0)`,
    args: [TOURNAMENT.name, TOURNAMENT.slug, TOURNAMENT.start_date, TOURNAMENT.end_date, TOURNAMENT.venue,
           TOURNAMENT.host_organization, TOURNAMENT.tournament_type, TOURNAMENT.status, TOURNAMENT.pick_deadline],
  });
  tournamentId = Number(lastInsertRowid);
  console.log(`\n✅ 대회 생성 ${TOURNAMENT.name} (id=${tournamentId})`);
}

for (const t of teamsToCreate) {
  const { lastInsertRowid } = await db.execute({
    sql: 'INSERT INTO teams (name, slug, region) VALUES (?, ?, ?)', args: [t.name, t.slug, t.region],
  });
  const id = Number(lastInsertRowid);
  for (const [, v] of teamMap) if (v.isNew && v.rec === t) v.id = id;
  console.log(`✅ 팀 생성  ${t.name} (id=${id})`);
}

for (const p of playersToCreate) {
  const teamId = teamMap.get(p.teamKey).id;
  const { lastInsertRowid } = await db.execute({
    sql: 'INSERT INTO players (name, slug, team_id) VALUES (?, ?, ?)', args: [p.name, p.slug, teamId],
  });
  p.id = Number(lastInsertRowid);
  console.log(`✅ 선수 생성 ${p.name} (${p.teamName}) id=${p.id}`);
}

for (const d of divisions) {
  // 부문 식별은 (대회, 타입, sort_order)로 한다 — label로 찾으면 표시명을 바꿨을 때
  // 기존 부문을 못 찾고 중복 부문을 새로 만들어 버린다.
  const { rows: existing } = await db.execute({
    sql: 'SELECT id, label FROM tournament_divisions WHERE tournament_id = ? AND division_type = ? AND sort_order = ?',
    args: [tournamentId, d.type, d.order],
  });

  let divisionId;
  if (existing.length) {
    divisionId = existing[0].id;
    await db.execute({
      sql: 'UPDATE tournament_divisions SET label = ?, participant_count = ? WHERE id = ?',
      args: [d.label, d.entries.length, divisionId],
    });

    // 참가자 id는 픽·결과가 참조한다. 이미 픽이 들어왔으면 갈아끼우면 안 된다.
    const [{ n: pickN }] = (await db.execute({ sql: 'SELECT COUNT(*) AS n FROM tournament_picks WHERE division_id = ?', args: [divisionId] })).rows;
    const [{ n: resN }]  = (await db.execute({ sql: 'SELECT COUNT(*) AS n FROM division_results WHERE division_id = ?', args: [divisionId] })).rows;
    if (pickN > 0 || resN > 0) {
      console.log(`↻ 부문 갱신 ${d.label} (id=${divisionId})`);
      console.log(`   ⚠ 픽 ${pickN}건 · 결과 ${resN}건이 참조 중 → 참가자는 그대로 둡니다`);
      continue;
    }
    await db.execute({ sql: 'DELETE FROM division_participants WHERE division_id = ?', args: [divisionId] });
    console.log(`↻ 부문 갱신 ${d.label} (id=${divisionId}, 기존 참가자 삭제)`);
  } else {
    const { lastInsertRowid } = await db.execute({
      sql: `INSERT INTO tournament_divisions (tournament_id, division_type, label, sort_order, participant_count)
            VALUES (?, ?, ?, ?, ?)`,
      args: [tournamentId, d.type, d.label, d.order, d.entries.length],
    });
    divisionId = Number(lastInsertRowid);
    console.log(`✅ 부문 생성 ${d.label} (id=${divisionId})`);
  }

  for (const e of d.entries) {
    if (d.kind === 'team') {
      await db.execute({
        sql: 'INSERT INTO division_participants (division_id, team_id, seed_number) VALUES (?, ?, ?)',
        args: [divisionId, e.resolved.team.id, e.seed],
      });
    } else {
      await db.execute({
        sql: 'INSERT INTO division_participants (division_id, player_id, seed_number) VALUES (?, ?, ?)',
        args: [divisionId, e.resolved.playerId ?? e.resolved.newPlayer.id, e.seed],
      });
    }
  }
  console.log(`   참가자 ${d.entries.length}${d.kind === 'team' ? '팀' : '명'} 등록`);
}

console.log('\n완료.');
await db.close();
