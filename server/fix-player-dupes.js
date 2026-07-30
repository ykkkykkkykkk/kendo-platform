// 대진표 임포트 전 기존 선수/팀 데이터 정리 3건.
//   1. 팀명 오타  '탐솔라' → '탑솔라'
//   2. '홍성훈'(수원특례시청) 중복 2행 병합 — 팔로우 이관 후 중복행 삭제
//   3. 단(段) 불일치 3명 → 5단으로 수정 (5단부 출전자인데 DB엔 4단)
//
// 사용: node fix-player-dupes.js            → 미리보기
//       node fix-player-dupes.js --apply    → 실제 적용
import { createClient } from '@libsql/client';
import 'dotenv/config';

const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const APPLY = process.argv.includes('--apply');

/* ── 1. 팀명 오타 ────────────────────────────────────────── */
const TEAM_RENAME = { from: '탐솔라', to: '탑솔라' };

/* ── 2. 중복 선수 병합 (keep ← drop) ─────────────────────── */
// keep=166: instagram 'fly_hong2' + player_gear 브랜드 채워짐 (2026-06-05 생성)
// drop=217: 2026-07-28 중복 생성. 실사용자 팔로우 10건이 붙어 있어 이관 필요.
const MERGE = { keep: 166, drop: 217, name: '홍성훈', team: '수원특례시청' };

/* ── 3. 단 불일치 (이름+팀으로 찾아 dan_grade 교정) ──────── */
const DAN_FIXES = [
  { name: '최다원', team: '광주북구청',       dan: 5 },
  { name: '손재협', team: '구미시청',         dan: 5 },
  { name: '양상훈', team: '부산광역시체육회', dan: 5 },
];

const log = (...a) => console.log(...a);
const problems = [];

/* ══════════════ 1. 팀명 오타 ══════════════ */
log(`\n■ 1. 팀명 오타 '${TEAM_RENAME.from}' → '${TEAM_RENAME.to}'`);
const { rows: renameRows } = await db.execute({
  sql:  'SELECT id, name, slug FROM teams WHERE name = ?',
  args: [TEAM_RENAME.from],
});
const { rows: alreadyRows } = await db.execute({
  sql:  'SELECT id, name FROM teams WHERE name = ?',
  args: [TEAM_RENAME.to],
});

if (alreadyRows.length) {
  log(`  이미 '${TEAM_RENAME.to}' 존재 (id=${alreadyRows[0].id}) — 건너뜀`);
} else if (!renameRows.length) {
  log(`  '${TEAM_RENAME.from}' 팀 없음 — 건너뜀`);
} else {
  const t = renameRows[0];
  const { rows: members } = await db.execute({
    sql:  'SELECT name, dan_grade FROM players WHERE team_id = ? ORDER BY name',
    args: [t.id],
  });
  log(`  id=${t.id} slug=${t.slug} (slug는 유지) · 소속 ${members.length}명`);
  log(`    ${members.map((m) => `${m.name}(${m.dan_grade ?? '단없음'})`).join(', ')}`);
}

/* ══════════════ 2. 중복 선수 병합 ══════════════ */
log(`\n■ 2. '${MERGE.name}'(${MERGE.team}) 중복 병합  id ${MERGE.drop} → ${MERGE.keep}`);
const { rows: mergeRows } = await db.execute({
  sql:  'SELECT id, name, slug, team_id, dan_grade, height_cm, instagram_url, created_at FROM players WHERE id IN (?, ?)',
  args: [MERGE.keep, MERGE.drop],
});
const keepRow = mergeRows.find((r) => r.id === MERGE.keep);
const dropRow = mergeRows.find((r) => r.id === MERGE.drop);

if (!dropRow) {
  log(`  id=${MERGE.drop} 없음 — 이미 정리됨, 건너뜀`);
} else if (!keepRow) {
  problems.push(`병합 대상 keep id=${MERGE.keep}가 없음 — 수동 확인 필요`);
} else if (keepRow.name !== MERGE.name || dropRow.name !== MERGE.name) {
  problems.push(`id ${MERGE.keep}/${MERGE.drop} 이름이 '${MERGE.name}'가 아님 (${keepRow.name}/${dropRow.name}) — 중단`);
} else if (keepRow.team_id !== dropRow.team_id) {
  problems.push(`id ${MERGE.keep}/${MERGE.drop} 팀이 다름 (${keepRow.team_id}/${dropRow.team_id}) — 중단`);
} else {
  for (const r of [keepRow, dropRow]) {
    const tag = r.id === MERGE.keep ? '유지' : '삭제';
    log(`  [${tag}] id=${r.id} slug=${r.slug} ${r.dan_grade}단 ${r.height_cm ?? '?'}cm insta=${r.instagram_url ?? '-'} (${r.created_at})`);
  }
  // 삭제 대상에 남은 참조 확인 — follows/player_gear 외에 뭔가 있으면 중단한다.
  const REFS = [
    ['player_stats',           'player_id'],
    ['player_comments',        'player_id'],
    ['player_questions',       'player_id'],
    ['division_participants',  'player_id'],
    ['matches',                'player_a_id'],
    ['matches',                'player_b_id'],
    ['matches',                'winner_player_id'],
    ['predictions',            'predicted_winner_player_id'],
    ['clinics',                'player_id'],
    ['users',                  'player_id'],
  ];
  for (const [tbl, col] of REFS) {
    try {
      const { rows } = await db.execute({
        sql:  `SELECT COUNT(*) AS n FROM ${tbl} WHERE ${col} = ?`,
        args: [MERGE.drop],
      });
      if (rows[0].n > 0) problems.push(`id=${MERGE.drop}에 ${tbl}.${col} 참조 ${rows[0].n}건 — 삭제 보류`);
    } catch { /* 컬럼/테이블 없으면 무시 */ }
  }

  const { rows: fDrop } = await db.execute({
    sql:  'SELECT user_id FROM follows WHERE player_id = ? ORDER BY user_id',
    args: [MERGE.drop],
  });
  const { rows: fKeep } = await db.execute({
    sql:  'SELECT user_id FROM follows WHERE player_id = ? ORDER BY user_id',
    args: [MERGE.keep],
  });
  const keepSet  = new Set(fKeep.map((r) => r.user_id));
  const moved    = fDrop.filter((r) => !keepSet.has(r.user_id)).map((r) => r.user_id);
  const overlap  = fDrop.filter((r) =>  keepSet.has(r.user_id)).map((r) => r.user_id);
  log(`  팔로우: 유지행 ${fKeep.length}건 · 삭제행 ${fDrop.length}건`);
  log(`    이관 ${moved.length}건 (user ${moved.join(',') || '-'})`);
  log(`    중복이라 무시 ${overlap.length}건 (user ${overlap.join(',') || '-'})`);

  const { rows: gDrop } = await db.execute({
    sql:  'SELECT category, brand, model_name FROM player_gear WHERE player_id = ?',
    args: [MERGE.drop],
  });
  log(`  장비 ${gDrop.length}건 삭제 (유지행에 동일 품목 존재): ${gDrop.map((g) => `${g.category}/${g.model_name}`).join(', ') || '-'}`);
}

/* ══════════════ 3. 단 불일치 ══════════════ */
log('\n■ 3. 단(段) 불일치 교정');
const danTargets = [];
for (const fix of DAN_FIXES) {
  const { rows } = await db.execute({
    sql: `SELECT p.id, p.name, p.dan_grade, t.name AS team
          FROM players p JOIN teams t ON t.id = p.team_id
          WHERE p.name = ? AND t.name = ?`,
    args: [fix.name, fix.team],
  });
  if (rows.length === 0) { problems.push(`단 교정 대상 없음: ${fix.name}/${fix.team}`); continue; }
  if (rows.length > 1)   { problems.push(`단 교정 대상 모호(${rows.length}건): ${fix.name}/${fix.team}`); continue; }
  const p = rows[0];
  if (p.dan_grade === fix.dan) {
    log(`  ${p.name} (${p.team}) 이미 ${fix.dan}단 — 건너뜀`);
  } else {
    log(`  ${p.name} (${p.team}) id=${p.id}  ${p.dan_grade ?? '단없음'} → ${fix.dan}단`);
    danTargets.push({ id: p.id, dan: fix.dan, name: p.name, team: p.team });
  }
}

/* ══════════════ 적용 ══════════════ */
if (problems.length) {
  console.error(`\n❌ 문제 ${problems.length}건 — 아무것도 적용하지 않습니다.`);
  for (const p of problems) console.error(`   · ${p}`);
  process.exit(1);
}

if (!APPLY) {
  log('\n(미리보기 — 아무것도 바뀌지 않았습니다. 실제 적용은 --apply)');
  process.exit(0);
}

// 1. 팀명
if (!alreadyRows.length && renameRows.length) {
  await db.execute({
    sql:  'UPDATE teams SET name = ? WHERE id = ?',
    args: [TEAM_RENAME.to, renameRows[0].id],
  });
  log(`✅ 팀명 '${TEAM_RENAME.from}' → '${TEAM_RENAME.to}'`);
}

// 2. 병합 (팔로우 이관 → 잔여 삭제 → 장비 삭제 → 선수행 삭제)
if (dropRow && keepRow) {
  await db.execute({
    sql: `INSERT OR IGNORE INTO follows (user_id, player_id, created_at)
          SELECT user_id, ?, created_at FROM follows WHERE player_id = ?`,
    args: [MERGE.keep, MERGE.drop],
  });
  await db.execute({ sql: 'DELETE FROM follows     WHERE player_id = ?', args: [MERGE.drop] });
  await db.execute({ sql: 'DELETE FROM player_gear WHERE player_id = ?', args: [MERGE.drop] });
  await db.execute({ sql: 'DELETE FROM players     WHERE id = ?',        args: [MERGE.drop] });
  log(`✅ '${MERGE.name}' 중복 병합 (id ${MERGE.drop} 삭제)`);
}

// 3. 단
for (const t of danTargets) {
  await db.execute({ sql: 'UPDATE players SET dan_grade = ? WHERE id = ?', args: [t.dan, t.id] });
  log(`✅ ${t.name} (${t.team}) → ${t.dan}단`);
}

log('\n완료.');
process.exit(0);
