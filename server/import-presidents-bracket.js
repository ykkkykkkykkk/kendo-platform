// 대통령기 대진표 엑셀 → bracket_matches (실제 대진 구도).
//
// ── 기존 parse-bracket.js를 못 쓰는 이유 ────────────────────────────
// 저 파서는 '경기번호 셀'을 노드로 삼는데, 이 대진표엔 경기번호가 아예 없다.
// 대신 연결선이 **셀 병합**으로 그려져 있다. 병합 하나가 경기 하나다.
//   예) G10:G11 → 위 항목(9~10행, 시드2)과 아래 항목(11~12행, 시드3)을 잇는 1회전
// 병합의 세로 중심이 두 자식의 중심의 평균이라는 성질을 그대로 쓴다.
//
// ── 시트 레이아웃 ───────────────────────────────────────────────────
// 좌우 두 트리가 가운데 결승을 향해 마주본다. 왼쪽은 열이 커질수록, 오른쪽은
// 작아질수록 깊어진다. 가운데 결승만 여러 열에 걸친 병합이라 그것으로 좌/우를 가른다.
//   개인전: 좌 시드 F(5) / 우 시드 S(18) / 결승 L:M(11~12)
//   단체전: 좌 시드 F(5) / 우 시드 Q(16) / 결승 K:L(10~11)
//
// ── 빠진 연결선 ─────────────────────────────────────────────────────
// 단체전 왼쪽은 2회전 연결선이 병합이 아니라 테두리로만 그려져 있어 병합이 없다.
// 그래서 "이 열까지 왔는데 남은 노드 수가 더 깊은 열의 병합 수로 감당이 안 되면
// 그 열에서 인접끼리 짝지어 노드를 만든다"는 규칙을 둔다. 트리가 성립하는 배치가
// 하나뿐이라 이걸로 정확히 복원된다(아래 검증이 틀린 복원을 잡는다).
//
// 검증: 리프 = 참가자 수, 내부노드 = 리프-1, 모든 노드 자식 정확히 2개,
//       부모 중심 = 자식 두 중심의 평균, 최종적으로 루트 1개.
//       하나라도 어긋나면 --apply여도 아무것도 쓰지 않는다.
//
// 사용: node import-presidents-bracket.js          → 복원 + 검증 + 트리 출력
//       node import-presidents-bracket.js --apply  → bracket_matches 적재
import { createClient } from '@libsql/client';
import XLSX from 'xlsx';
import 'dotenv/config';

const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const APPLY = process.argv.includes('--apply');
const DUMP  = process.argv.includes('--dump');

const XLS_DIR = 'C:/Users/82104/Desktop/선수';
const F_IND   = `${XLS_DIR}/대통령기 제48회 전국검도선수권대회_대진표_남녀개인전.xls`;
const F_TEAM  = `${XLS_DIR}/대통령기 제48회 전국검도선수권대회_대진표_남녀단체전.xls`;
const TOURNAMENT_SLUG = 'president-48';

const SOURCES = [
  // groups: [왼쪽 트리 이름, 오른쪽 트리 이름]. 종이 대진표의 조 표기를 그대로 쓴다.
  // 남자개인전은 종이에 A~D 네 조가 있지만 A·B가 왼쪽, C·D가 오른쪽 트리로 합쳐진다.
  { file: F_IND,  sheet: '남자일반부', label: '남자일반부개인전', leftSeed: 5, rightSeed: 18, groups: ['A·B', 'C·D'] },
  { file: F_IND,  sheet: '여자일반부', label: '여자일반부개인전', leftSeed: 5, rightSeed: 18, groups: ['A', 'B'] },
  { file: F_TEAM, sheet: '남자일반부', label: '남자일반부단체전', leftSeed: 5, rightSeed: 16, groups: ['A', 'B'] },
];

const mid = (m) => (m.s.r + m.e.r) / 2;

/* ══════════ 1. 시트 → 좌/우 트리 ══════════ */
function parseSheet(src) {
  const ws = XLSX.readFile(src.file).Sheets[src.sheet];
  if (!ws) throw new Error(`'${src.sheet}' 시트 없음`);
  const merges = ws['!merges'] ?? [];
  const val = (m) => ws[XLSX.utils.encode_cell(m.s)]?.v;

  // 리프 — 시드 열의 병합 중 값이 정수인 것
  const leafOf = (seedCol) => merges
    .filter((m) => m.s.c === seedCol && m.e.c === seedCol && /^\d+$/.test(String(val(m) ?? '').trim()))
    .map((m) => ({ kind: 'leaf', seed: Number(val(m)), y: mid(m), col: seedCol }))
    .sort((a, b) => a.y - b.y);

  // 트리 영역 = 좌우 시드 열 사이. 그 안에서 여러 열에 걸친 병합이 가운데 결승이다.
  const inner = merges.filter((m) => m.s.c > src.leftSeed && m.e.c < src.rightSeed);
  const finals = inner.filter((m) => m.e.c > m.s.c);
  if (finals.length !== 1) throw new Error(`가운데 결승 병합이 ${finals.length}개 (1개여야 함)`);
  const fin = finals[0];

  const nodesIn = (lo, hi) => inner
    .filter((m) => m.e.c === m.s.c && m.s.c >= lo && m.s.c <= hi)
    .map((m) => ({ kind: 'node', y: mid(m), col: m.s.c }));

  return {
    left:  { leaves: leafOf(src.leftSeed),  marks: nodesIn(src.leftSeed + 1, fin.s.c - 1), order: 'asc'  },
    right: { leaves: leafOf(src.rightSeed), marks: nodesIn(fin.e.c + 1, src.rightSeed - 1), order: 'desc' },
    finalY: mid(fin),
  };
}

/* ══════════ 2. 트리 복원 ══════════ */
function buildTree(side, problems, tag) {
  const cols = [...new Set(side.marks.map((n) => n.col))]
    .sort((a, b) => (side.order === 'asc' ? a - b : b - a));

  let open = side.leaves.map((l) => ({ ...l, children: null }));
  const built = [];

  const consume = (mk) => {
    const above = open.filter((o) => o.y < mk.y).sort((a, b) => b.y - a.y)[0];
    const below = open.filter((o) => o.y > mk.y).sort((a, b) => a.y - b.y)[0];
    if (!above || !below) { problems.push(`${tag}: 열 ${mk.col} y=${mk.y} 자식을 못 찾음`); return; }
    if (Math.abs((above.y + below.y) / 2 - mk.y) > 0.6)
      problems.push(`${tag}: 열 ${mk.col} y=${mk.y} 중심 불일치 (자식 ${above.y}, ${below.y})`);
    const node = { kind: 'node', y: mk.y, col: mk.col, children: [above, below], synth: !!mk.synth };
    open = open.filter((o) => o !== above && o !== below);
    open.push(node);
    built.push(node);
  };

  for (let i = 0; i < cols.length; i++) {
    for (const mk of side.marks.filter((n) => n.col === cols[i]).sort((a, b) => a.y - b.y)) consume(mk);

    // 이 열까지 처리했는데 남은 노드를 더 깊은 열의 경기 수로 감당할 수 없다면,
    // 그 사이에 병합으로 안 그려진 연결선이 있다는 뜻이다. 인접끼리 짝지어 메운다.
    const deeper = side.marks.filter((n) => (side.order === 'asc' ? n.col > cols[i] : n.col < cols[i])).length;
    const need = open.length - 1 - deeper;
    if (need > 0) {
      const sorted = [...open].sort((a, b) => a.y - b.y);
      const made = [];
      for (let k = 0; k + 1 < sorted.length && made.length < need; k += 2)
        made.push({ kind: 'node', y: (sorted[k].y + sorted[k + 1].y) / 2, col: cols[i], synth: true });
      for (const mk of made) consume(mk);
    }
  }

  if (open.length !== 1) problems.push(`${tag}: 트리 루트가 ${open.length}개 (1개여야 함)`);
  if (built.length !== side.leaves.length - 1)
    problems.push(`${tag}: 경기 ${built.length}개 (참가 ${side.leaves.length} → ${side.leaves.length - 1}개여야 함)`);
  return { root: open[0] ?? null, matches: built };
}

/** 루트에서 훑어 round_depth·경기번호를 매긴다 (1회전 = 1, 위에서 아래로 번호). */
function numberTree(root) {
  const all = [];
  (function depth(n) {
    if (!n || n.kind !== 'node') return 0;
    const d = Math.max(depth(n.children[0]), depth(n.children[1])) + 1;
    n.round_depth = d;
    all.push(n);
    return d;
  })(root);
  all.sort((a, b) => a.round_depth - b.round_depth || a.y - b.y);
  all.forEach((n, i) => { n.number = i + 1; });
  return all;
}

/* ══════════ 3. 복원 실행 ══════════ */
const problems = [];
const parsed = [];

for (const src of SOURCES) {
  let sheet;
  try { sheet = parseSheet(src); }
  catch (e) { problems.push(`${src.label}: ${e.message}`); continue; }

  const L = buildTree(sheet.left,  problems, `${src.label} ${src.groups[0]}조`);
  const R = buildTree(sheet.right, problems, `${src.label} ${src.groups[1]}조`);
  const lm = numberTree(L.root), rm = numberTree(R.root);

  const seeds = [...sheet.left.leaves, ...sheet.right.leaves].map((l) => l.seed).sort((a, b) => a - b);
  const missing = seeds.length ? Array.from({ length: seeds.at(-1) }, (_, i) => i + 1).filter((s) => !seeds.includes(s)) : [];
  if (missing.length) problems.push(`${src.label}: 시드 누락 ${missing.join(',')}`);

  const synth = [...lm, ...rm].filter((n) => n.synth).length;
  console.log(`${src.label.padEnd(14)} 좌 ${String(sheet.left.leaves.length).padStart(2)}명/${String(lm.length).padStart(2)}경기 · ` +
              `우 ${String(sheet.right.leaves.length).padStart(2)}명/${String(rm.length).padStart(2)}경기 · 결승 1` +
              (synth ? `  (병합 없는 연결선 ${synth}개 복원)` : ''));

  parsed.push({ src, L: { ...L, matches: lm }, R: { ...R, matches: rm }, finalY: sheet.finalY });
}

/* ══════════ 4. DB 대조 ══════════ */
const { rows: tRows } = await db.execute({ sql: 'SELECT id, name FROM tournaments WHERE slug = ?', args: [TOURNAMENT_SLUG] });
if (!tRows.length) problems.push(`대회 slug='${TOURNAMENT_SLUG}' 없음`);
const tournament = tRows[0];

const { rows: divRows } = tournament
  ? await db.execute({ sql: 'SELECT id, label, participant_count FROM tournament_divisions WHERE tournament_id = ? ORDER BY sort_order', args: [tournament.id] })
  : { rows: [] };

for (const p of parsed) {
  const div = divRows.find((d) => d.label === p.src.label);
  if (!div) { problems.push(`부문 '${p.src.label}' DB에 없음`); continue; }
  p.div = div;

  const { rows: parts } = await db.execute({
    sql: `SELECT dp.id, dp.seed_number, COALESCE(p.name, t.name) AS nm
          FROM division_participants dp
          LEFT JOIN players p ON p.id = dp.player_id
          LEFT JOIN teams   t ON t.id = dp.team_id
          WHERE dp.division_id = ?`,
    args: [div.id],
  });
  p.bySeed = new Map(parts.map((r) => [r.seed_number, r]));

  const leaves = [...p.L.root ? collectLeaves(p.L.root) : [], ...p.R.root ? collectLeaves(p.R.root) : []];
  if (leaves.length !== parts.length)
    problems.push(`${p.src.label}: 대진 리프 ${leaves.length} ≠ 참가자 ${parts.length}`);
  for (const lf of leaves)
    if (!p.bySeed.has(lf.seed)) problems.push(`${p.src.label}: 시드 ${lf.seed} 참가자 없음`);
}

function collectLeaves(n) {
  if (n.kind === 'leaf') return [n];
  return [...collectLeaves(n.children[0]), ...collectLeaves(n.children[1])];
}

/* ══════════ 5. 게이트 ══════════ */
if (problems.length) {
  console.error(`\n❌ 문제 ${problems.length}건 — 아무것도 쓰지 않습니다.`);
  for (const s of problems) console.error(`   · ${s}`);
  await db.close();
  process.exit(1);
}
console.log('\n✔ 검증 통과: 루트 1개 · 자식 2개 · 중심 일치 · 시드 연속 · 참가자 대조 완료');

if (DUMP) {
  for (const p of parsed) {
    console.log(`\n── ${p.src.label} ──`);
    for (const [gi, side] of [[0, p.L], [1, p.R]]) {
      console.log(` [${p.src.groups[gi]}조]`);
      for (const m of side.matches) {
        const nm = (c) => c.kind === 'leaf' ? `${c.seed}.${p.bySeed.get(c.seed)?.nm ?? '?'}` : `${c.number}경기 승자`;
        console.log(`   ${String(m.number).padStart(2)}경기 (${m.round_depth}회전)  ${nm(m.children[0])}  vs  ${nm(m.children[1])}`);
      }
    }
  }
}

if (!APPLY) {
  console.log('\n(미리보기 — 아무것도 쓰지 않았습니다. 적재는 --apply, 대진 전체 보기는 --dump)');
  await db.close();
  process.exit(0);
}

/* ══════════ 6. 적재 ══════════ */
for (const p of parsed) {
  const { rows: [{ n: existing }] } = await db.execute({
    sql: 'SELECT COUNT(*) AS n FROM bracket_matches WHERE division_id = ?', args: [p.div.id],
  });
  if (existing > 0) {
    await db.execute({ sql: 'DELETE FROM bracket_matches WHERE division_id = ?', args: [p.div.id] });
    console.log(`↻ ${p.src.label}: 기존 ${existing}경기 삭제 후 재적재`);
  }

  const idOf = new Map();   // 트리 노드 → bracket_matches.id

  // 깊은 쪽부터 넣어야 a_from_match_id가 이미 존재한다.
  const insertSide = async (side, group, isRootGroupFinal) => {
    for (const m of side.matches) {
      const sideRef = (c) => c.kind === 'leaf'
        ? { participant: p.bySeed.get(c.seed).id, from: null }
        : { participant: null, from: idOf.get(c) };
      const a = sideRef(m.children[0]), b = sideRef(m.children[1]);
      const { lastInsertRowid } = await db.execute({
        sql: `INSERT INTO bracket_matches
                (division_id, group_label, match_number, round_depth, is_group_final, is_final,
                 a_participant_id, b_participant_id, a_from_match_id, b_from_match_id)
              VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
        args: [p.div.id, group, m.number, m.round_depth,
               isRootGroupFinal && m === side.matches.at(-1) ? 1 : 0,
               a.participant, b.participant, a.from, b.from],
      });
      idOf.set(m, Number(lastInsertRowid));
    }
  };

  await insertSide(p.L, p.src.groups[0], true);
  await insertSide(p.R, p.src.groups[1], true);

  const maxDepth = Math.max(p.L.root.round_depth, p.R.root.round_depth);
  await db.execute({
    sql: `INSERT INTO bracket_matches
            (division_id, group_label, match_number, round_depth, is_group_final, is_final,
             a_from_match_id, b_from_match_id)
          VALUES (?, NULL, 1, ?, 0, 1, ?, ?)`,
    args: [p.div.id, maxDepth + 1, idOf.get(p.L.root), idOf.get(p.R.root)],
  });

  console.log(`✅ ${p.src.label}: ${p.L.matches.length + p.R.matches.length + 1}경기 적재 ` +
              `(${p.src.groups[0]}조 ${p.L.matches.length} · ${p.src.groups[1]}조 ${p.R.matches.length} · 결승 1)`);
}

console.log('\n완료.');
await db.close();
