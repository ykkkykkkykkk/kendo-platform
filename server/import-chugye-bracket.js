// 제23회 추계 전국실업검도대회의 대진 구도를 bracket_matches에 적재한다 (공개 대진표 /draw용).
//
// 트리 복원은 parse-bracket.js를 그대로 쓴다(엑셀 배치 규칙이 하계와 같다).
// 선수 식별은 시드 번호로 한다 — 대진표 시트와 '명단' 시트가 같은 번호를 쓰고,
// 명단은 import-chugye.js가 division_participants.seed_number로 이미 넣어뒀다.
// 붙인 뒤 이름이 DB와 일치하는지 교차 검증하므로 엉뚱한 선수가 붙을 수 없다.
//
// import-bracket-tree.js(하계)와 다른 점:
//   - 대상 대회와 파일 목록
//   - '이미 결과가 입력된 경기' 검사를 이 대회의 부문으로만 한정한다.
//     (전체를 보면 지난 대회에 결과가 들어간 순간 이 대회 적재가 막힌다)
//
// 사용: node import-chugye-bracket.js          → 미리보기 + 검증
//       node import-chugye-bracket.js --apply  → 실제 적재
import { createClient } from '@libsql/client';
import 'dotenv/config';
import { parseBracketFile } from './parse-bracket.js';

const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const APPLY = process.argv.includes('--apply');
const TOURNAMENT_SLUG = 'chugye-23';

const BRACKET_FILES = [
  { file: '추계 3단부 개인전.xls',    label: '남자개인3단부' },
  { file: '추계 4단부 개인전.xls',    label: '남자개인4단부' },
  { file: '추계 5단부 개인전.xls',    label: '남자개인5단부' },
  { file: '추계 여자부 개인전-1.xls', label: '여자개인' },
];

const norm = (s) => String(s ?? '').replace(/\s+/g, '').trim();
const problems = [];

/* ── 대회 · 부문 ── */
const { rows: tRows } = await db.execute({
  sql: 'SELECT id, name, slug FROM tournaments WHERE slug = ?', args: [TOURNAMENT_SLUG],
});
if (!tRows.length) { console.error(`❌ 대회 slug='${TOURNAMENT_SLUG}' 없음 — 먼저 node import-chugye.js --apply`); process.exit(1); }
const tournament = tRows[0];
console.log(`대상 대회: [${tournament.id}] ${tournament.name}`);

const { rows: divRows } = await db.execute({
  sql: 'SELECT id, label, participant_count FROM tournament_divisions WHERE tournament_id = ? ORDER BY sort_order',
  args: [tournament.id],
});
const divIds = divRows.map((d) => d.id);

const { rows: tblRows } = await db.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='bracket_matches'"
);
if (!tblRows.length) problems.push('bracket_matches 테이블이 없음 — 먼저 node apply-migration.js 016_bracket_matches.sql');

/* ── 부문별 처리 ── */
const plan = [];
for (const src of BRACKET_FILES) {
  const div = divRows.find((d) => d.label === src.label);
  if (!div) { problems.push(`부문 '${src.label}'을 DB에서 찾을 수 없음`); continue; }

  let parsed;
  try {
    parsed = parseBracketFile(src.file);
  } catch (e) {
    problems.push(`${src.label} 대진 복원 실패: ${e.message}`);
    continue;
  }

  const { rows: parts } = await db.execute({
    sql: `SELECT dp.id, dp.seed_number, p.name, t.name AS team
          FROM division_participants dp
          JOIN players p ON p.id = dp.player_id
          LEFT JOIN teams t ON t.id = p.team_id
          WHERE dp.division_id = ?`,
    args: [div.id],
  });
  const bySeed = new Map(parts.map((r) => [r.seed_number, r]));

  for (const g of parsed.groups) {
    // 트리 자체 검증: n명이면 경기 n-1개, 모든 경기의 자식 2개
    if (g.matches.length !== g.players.length - 1)
      problems.push(`${src.label} ${g.group}조: 참가 ${g.players.length}명인데 경기 ${g.matches.length}개 (n-1이어야 함)`);
    for (const m of g.matches)
      if (m.children.length !== 2)
        problems.push(`${src.label} ${g.group}조 ${m.number}경기: 자식 ${m.children.length}개`);

    for (const pl of g.players) {
      const part = bySeed.get(pl.seed);
      if (!part) { problems.push(`${src.label} ${g.group}조 시드 ${pl.seed}(${pl.name}) 참가자 없음`); continue; }
      if (norm(part.name) !== norm(pl.name))
        problems.push(`${src.label} 시드 ${pl.seed} 이름 불일치: 대진표 '${pl.name}' vs DB '${part.name}'`);
    }
  }

  const totalMatches = parsed.groups.reduce((n, g) => n + g.matches.length, 0) + (parsed.finalNumber ? 1 : 0);
  plan.push({ src, div, parsed, bySeed, totalMatches });

  console.log(`\n■ ${src.label} (division id=${div.id}, 참가 ${div.participant_count}명)`);
  for (const g of parsed.groups) {
    const gf = g.matches.find((m) => m.isGroupFinal);
    console.log(`   ${g.group}조 · ${g.court}  ${g.players.length}명 · ${g.matches.length}경기 · ` +
                `${Math.max(...g.matches.map((m) => m.depth))}라운드 · 조결승 ${gf ? gf.number : '?'}경기`);
  }
  console.log(`   결승 ${parsed.finalNumber ?? '없음'}경기  →  총 ${totalMatches}경기 적재 예정`);

  const seedSum = parsed.groups.reduce((n, g) => n + g.players.length, 0);
  if (seedSum !== div.participant_count)
    problems.push(`${src.label}: 대진표 인원 ${seedSum}명 ≠ 등록 참가자 ${div.participant_count}명`);
}

/* ── 기존 데이터 확인 (이 대회의 부문으로만 한정) ── */
if (tblRows.length && divIds.length) {
  const ph = divIds.map(() => '?').join(',');
  const { rows: [{ n }] } = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM bracket_matches WHERE division_id IN (${ph})`, args: divIds,
  });
  if (n > 0) console.log(`\n이 대회 기존 bracket_matches ${n}행 — 부문별로 삭제 후 재적재합니다.`);

  const { rows: [{ n: doneN }] } = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM bracket_matches
          WHERE division_id IN (${ph}) AND (status <> '예정' OR winner_participant_id IS NOT NULL)`,
    args: divIds,
  });
  if (doneN > 0)
    problems.push(`이미 결과가 입력된 경기 ${doneN}건 — 덮어쓰면 결과가 사라짐. 수동 확인 필요`);
}

/* ── 게이트 ── */
if (problems.length) {
  console.error(`\n❌ 문제 ${problems.length}건 — 아무것도 적재하지 않습니다.`);
  for (const p of problems) console.error(`   · ${p}`);
  process.exit(1);
}
const grandTotal = plan.reduce((n, p) => n + p.totalMatches, 0);
console.log(`\n✔ 검증 통과 — 부문 ${plan.length}개 · 경기 ${grandTotal}개`);

if (!APPLY) {
  console.log('\n(미리보기 — 아무것도 적재되지 않았습니다. 실제 적재는 --apply)');
  process.exit(0);
}

/* ── 적재 ── */
for (const { src, div, parsed, bySeed } of plan) {
  await db.execute({ sql: 'DELETE FROM bracket_matches WHERE division_id = ?', args: [div.id] });

  const groupFinalIds = {};   // 'A' → bracket_matches.id

  for (const g of parsed.groups) {
    const idByNumber = new Map();   // 경기번호 → bracket_matches.id

    // 얕은 라운드부터 넣어야 a_from_match_id가 이미 존재한다
    const ordered = [...g.matches].sort((a, b) => a.depth - b.depth || a.number - b.number);
    for (const m of ordered) {
      const sideArgs = (ch) => ch.kind === 'player'
        ? { participant: bySeed.get(ch.seed).id, from: null }
        : { participant: null, from: idByNumber.get(ch.number) ?? null };
      const A = sideArgs(m.children[0]);
      const B = sideArgs(m.children[1]);

      const { lastInsertRowid } = await db.execute({
        sql: `INSERT INTO bracket_matches
                (division_id, group_label, court_label, match_number, round_depth,
                 is_group_final, a_participant_id, b_participant_id, a_from_match_id, b_from_match_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [div.id, g.group, g.court, m.number, m.depth,
               m.isGroupFinal ? 1 : 0, A.participant, B.participant, A.from, B.from],
      });
      const id = Number(lastInsertRowid);
      idByNumber.set(m.number, id);
      if (m.isGroupFinal) groupFinalIds[g.group] = id;
    }
    console.log(`✅ ${src.label} ${g.group}조  ${g.matches.length}경기`);
  }

  // 부문 결승 (A조 우승 vs B조 우승)
  if (parsed.finalNumber) {
    const depth = Math.max(...parsed.groups.flatMap((g) => g.matches.map((m) => m.depth))) + 1;
    await db.execute({
      sql: `INSERT INTO bracket_matches
              (division_id, group_label, court_label, match_number, round_depth,
               is_group_final, is_final, a_from_match_id, b_from_match_id)
            VALUES (?, NULL, NULL, ?, ?, 0, 1, ?, ?)`,
      args: [div.id, parsed.finalNumber, depth, groupFinalIds.A ?? null, groupFinalIds.B ?? null],
    });
    console.log(`✅ ${src.label} 결승  ${parsed.finalNumber}경기`);
  }
}

const ph = divIds.map(() => '?').join(',');
const { rows: [{ n: finalN }] } = await db.execute({
  sql: `SELECT COUNT(*) AS n FROM bracket_matches WHERE division_id IN (${ph})`, args: divIds,
});
console.log(`\n완료: 이 대회 bracket_matches ${finalN}행`);
process.exit(0);
