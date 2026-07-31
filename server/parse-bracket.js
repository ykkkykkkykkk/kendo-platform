// 대진표 엑셀(.xls)의 조별 시트에서 실제 대진 구도(토너먼트 트리)를 복원한다.
//
// ── 엑셀 레이아웃 ───────────────────────────────────────────────
// 조 시트('1경기장 A조')는 선수를 좌우 양쪽에 세로로 늘어놓고, 트리가 가운데로 수렴한다.
//   좌측 선수: [팀][이름][시드]  · 우측 선수: [시드][이름][팀]
//   좌측 라운드는 열이 커지는 방향, 우측은 작아지는 방향으로 깊어진다.
//   경기번호 셀은 자기가 잇는 두 항목의 세로 중간에 놓인다.
//
// ── 복원 규칙 ───────────────────────────────────────────────────
// 얕은 라운드부터 처리하면서, 각 경기번호 셀의 자식을 "아직 소비되지 않은 항목 중
// 바로 위/바로 아래에서 가장 가까운 것" 둘로 정한다. 이미 다른 경기의 자식이 된 항목은
// 후보에서 빠지므로 부전승(선수 vs N경기 승자)도 자연히 표현된다.
// 조 결승은 좌우 트리 사이 열에 놓여 같은 행에 자식이 없다 → 좌/우 최종 경기를 잇는다.
//
// 검증: 조 참가자 n명이면 경기는 정확히 n-1개, 모든 선수는 잎으로 딱 한 번 등장,
//       모든 경기는 자식이 정확히 2개. 하나라도 어긋나면 오류로 던진다.
//
// 사용: node parse-bracket.js            → 4개 파일 8개 조 전부 복원 검증
//       node parse-bracket.js --dump     → 복원된 대진을 경기순서로 출력
import XLSX from 'xlsx';
import { pathToFileURL } from 'url';

export const XLS_DIR = 'C:/Users/82104/Desktop/선수';

export const BRACKET_FILES = [
  { file: '개인전 남자 3단부 (2).xls', label: '남자개인3단부' },
  { file: '개인전 남자 4단부.xls',     label: '남자개인4단부' },
  { file: '개인전 남자 5단부.xls',     label: '남자개인5단부' },
  { file: '여자 개인전.xls',           label: '여자개인' },
];

const isInt    = (v) => /^\d+$/.test(String(v).trim());
const isKorean = (v) => /[가-힣]/.test(String(v));
const norm     = (v) => String(v ?? '').replace(/\s+/g, '').trim();

/** 시트를 { [r]: { [c]: 값 } } 형태로 읽는다 (빈 셀 제외) */
function readCells(ws) {
  const range = XLSX.utils.decode_range(ws['!ref']);
  const cells = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (!cell) continue;
      const v = String(cell.v).trim();
      if (v) cells.push({ r, c, v });
    }
  }
  return cells;
}

/**
 * 시트의 셀을 선수 / 경기번호로 분류한다.
 * 선수 셀 = 정수인데 좌우로 [이름][팀]이 붙어 있는 셀. 그 외 정수는 경기번호.
 * ('전체' 시트도 같은 구조라 결승 경기번호를 찾을 때 재사용한다)
 */
export function classifyCells(ws, sheetName) {
  const cells = readCells(ws);
  const at = (r, c) => cells.find((x) => x.r === r && x.c === c);

  const players = [];
  for (const cell of cells) {
    if (!isInt(cell.v)) continue;
    const L1 = at(cell.r, cell.c - 1), L2 = at(cell.r, cell.c - 2);
    const R1 = at(cell.r, cell.c + 1), R2 = at(cell.r, cell.c + 2);
    if (L1 && L2 && isKorean(L1.v) && isKorean(L2.v)) {
      players.push({ seed: Number(cell.v), name: L1.v, team: L2.v, r: cell.r, c: cell.c, side: 'left' });
    } else if (R1 && R2 && isKorean(R1.v) && isKorean(R2.v)) {
      players.push({ seed: Number(cell.v), name: R1.v, team: R2.v, r: cell.r, c: cell.c, side: 'right' });
    }
  }
  if (!players.length) throw new Error(`${sheetName}: 선수 셀을 찾지 못했습니다`);

  const leftSeedCol  = players.find((p) => p.side === 'left')?.c;
  const rightSeedCol = players.find((p) => p.side === 'right')?.c;
  if (leftSeedCol == null || rightSeedCol == null)
    throw new Error(`${sheetName}: 좌/우 선수 열을 찾지 못했습니다 (left=${leftSeedCol} right=${rightSeedCol})`);

  const playerCellKeys = new Set(players.map((p) => `${p.r},${p.c}`));
  const matchCells = cells.filter((x) =>
    isInt(x.v) && !playerCellKeys.has(`${x.r},${x.c}`) &&
    x.c > leftSeedCol && x.c < rightSeedCol
  );

  return { cells, players, matchCells, leftSeedCol, rightSeedCol };
}

/**
 * 조 시트 하나를 파싱한다.
 * @returns {{ players: Array, matches: Array }}
 *   players: { seed, name, team, r, side }
 *   matches: { number, r, c, side, depth, children: [{kind:'player'|'match', ...}] }
 */
export function parseGroupSheet(ws, sheetName) {
  const { players, matchCells, leftSeedCol, rightSeedCol } = classifyCells(ws, sheetName);

  const leftCols  = [...new Set(matchCells.filter((m) => m.c <= (leftSeedCol + rightSeedCol) / 2).map((m) => m.c))].sort((a, b) => a - b);
  const rightCols = [...new Set(matchCells.filter((m) => m.c >  (leftSeedCol + rightSeedCol) / 2).map((m) => m.c))].sort((a, b) => b - a);

  /* ── 3. 한쪽 트리 복원 ── */
  const matches = [];
  function buildSide(side, cols, seedCol) {
    // 아직 소비되지 않은 항목 (행 순서 유지)
    let pool = players
      .filter((p) => p.side === side)
      .map((p) => ({ kind: 'player', r: p.r, seed: p.seed, name: p.name, team: p.team }));

    cols.forEach((col, depthIdx) => {
      const inCol = matchCells.filter((m) => m.c === col).sort((a, b) => a.r - b.r);
      const produced = [];
      for (const mc of inCol) {
        const above = pool.filter((e) => e.r < mc.r).sort((a, b) => b.r - a.r)[0];
        const below = pool.filter((e) => e.r > mc.r).sort((a, b) => a.r - b.r)[0];
        if (!above || !below) {
          // 좌우 트리를 잇는 조 결승 — 나중에 처리
          produced.push({ kind: 'final-candidate', number: Number(mc.v), r: mc.r, c: mc.c });
          continue;
        }
        const m = {
          number: Number(mc.v), r: mc.r, c: mc.c, side,
          depth: depthIdx + 1,
          children: [above, below],
        };
        matches.push(m);
        pool = pool.filter((e) => e !== above && e !== below);
        produced.push({ kind: 'match', r: mc.r, number: m.number });
      }
      pool = pool.concat(produced.filter((p) => p.kind === 'match'));
      pool.sort((a, b) => a.r - b.r);
    });
    return pool;   // 남은 것 = 이 쪽 최종 경기(또는 결승 후보)
  }

  const leftRest  = buildSide('left',  leftCols,  leftSeedCol);
  const rightRest = buildSide('right', rightCols, rightSeedCol);

  /* ── 4. 조 결승 (좌우 트리 결합) ── */
  const finalCells = matchCells.filter((mc) =>
    !matches.some((m) => m.number === Number(mc.v) && m.c === mc.c)
  );
  if (finalCells.length !== 1)
    throw new Error(`${sheetName}: 조 결승 셀이 ${finalCells.length}개 (1개여야 함): ${finalCells.map((f) => f.v).join(',')}`);

  const leftTop  = leftRest.filter((e) => e.kind === 'match' || e.kind === 'player');
  const rightTop = rightRest.filter((e) => e.kind === 'match' || e.kind === 'player');
  if (leftTop.length !== 1 || rightTop.length !== 1)
    throw new Error(`${sheetName}: 좌우 최종이 1개씩이 아님 (left=${leftTop.length} right=${rightTop.length})`);

  const fc = finalCells[0];
  matches.push({
    number: Number(fc.v), r: fc.r, c: fc.c, side: 'center',
    depth: Math.max(...matches.map((m) => m.depth)) + 1,
    children: [leftTop[0], rightTop[0]],
    isGroupFinal: true,
  });

  /* ── 5. 검증 ── */
  const n = players.length;
  if (matches.length !== n - 1)
    throw new Error(`${sheetName}: 경기 ${matches.length}개 (참가 ${n}명이면 ${n - 1}개여야 함)`);

  const leafSeeds = matches.flatMap((m) => m.children.filter((c) => c.kind === 'player').map((c) => c.seed));
  const dupLeaf = leafSeeds.filter((s, i) => leafSeeds.indexOf(s) !== i);
  if (dupLeaf.length) throw new Error(`${sheetName}: 선수가 중복 등장 (시드 ${[...new Set(dupLeaf)].join(',')})`);
  const missLeaf = players.map((p) => p.seed).filter((s) => !leafSeeds.includes(s));
  if (missLeaf.length) throw new Error(`${sheetName}: 대진에 안 나오는 선수 (시드 ${missLeaf.join(',')})`);

  for (const m of matches)
    if (m.children.length !== 2) throw new Error(`${sheetName}: ${m.number}경기 자식이 ${m.children.length}개`);

  const nums = matches.map((m) => m.number);
  const dupNum = nums.filter((x, i) => nums.indexOf(x) !== i);
  if (dupNum.length) throw new Error(`${sheetName}: 경기번호 중복 ${[...new Set(dupNum)].join(',')}`);

  matches.sort((a, b) => a.number - b.number);
  return { players: players.sort((a, b) => a.seed - b.seed), matches };
}

/** 시트명 '1경기장 A조' → { court:'1경기장', group:'A' } */
export function parseSheetName(name) {
  const m = name.match(/^(\d경기장)\s*([A-Z])조$/);
  return m ? { court: m[1], group: m[2] } : null;
}

/** 파일 하나를 파싱 → 조별 대진 + 전체 결승 */
export function parseBracketFile(file) {
  const wb = XLSX.readFile(`${XLS_DIR}/${file}`);
  const groups = [];
  for (const sn of wb.SheetNames) {
    const meta = parseSheetName(sn);
    if (!meta) continue;
    groups.push({ ...meta, sheet: sn, ...parseGroupSheet(wb.Sheets[sn], `${file} / ${sn}`) });
  }
  if (groups.length !== 2) throw new Error(`${file}: 조 시트가 ${groups.length}개 (2개여야 함)`);

  // '전체' 시트는 A조(좌)·B조(우)를 마주보게 놓고 가운데에 결승을 둔다.
  // 선수 시드 셀을 걸러낸 뒤 남은 경기번호의 최대값이 결승 번호다.
  const wsAll = wb.Sheets['전체'];
  let finalNumber = null;
  if (wsAll) {
    const { matchCells } = classifyCells(wsAll, `${file} / 전체`);
    if (matchCells.length) finalNumber = Math.max(...matchCells.map((x) => Number(x.v)));
  }

  return { file, groups, finalNumber };
}

/* ── CLI ─────────────────────────────────────────────────────── */
// 한글 경로는 import.meta.url에서 URL 인코딩되므로 pathToFileURL로 비교해야 한다.
// (모듈로 import될 때는 argv[1]이 없을 수 있으므로 먼저 확인한다)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const DUMP = process.argv.includes('--dump');
  let fail = 0;

  for (const src of BRACKET_FILES) {
    try {
      const parsed = parseBracketFile(src.file);
      console.log(`\n■ ${src.label}  (${src.file})`);
      for (const g of parsed.groups) {
        const gf = g.matches.find((m) => m.isGroupFinal);
        console.log(`  OK  ${g.group}조 · ${g.court}  참가 ${g.players.length}명 · 경기 ${g.matches.length}개 · ` +
                    `최대깊이 ${Math.max(...g.matches.map((m) => m.depth))}라운드 · 조결승 ${gf.number}경기`);
      }
      console.log(`      결승(A조 우승 vs B조 우승): ${parsed.finalNumber ?? '없음'}경기`);

      if (DUMP) {
        for (const g of parsed.groups) {
          console.log(`\n  ── ${g.group}조 (${g.court}) 경기순서 ──`);
          const byNum = new Map(g.matches.map((m) => [m.number, m]));
          const side = (ch) => ch.kind === 'player'
            ? `${ch.name} (${ch.team})`
            : `${ch.number}경기 승자`;
          for (const m of g.matches) {
            const tag = m.isGroupFinal ? '  ★조결승' : '';
            console.log(`   ${String(m.number).padStart(2)}경기${tag}  ${side(m.children[0])}  vs  ${side(m.children[1])}`);
          }
          void byNum;
        }
      }
    } catch (e) {
      fail++;
      console.error(`\n❌ ${src.label}: ${e.message}`);
    }
  }

  console.log(fail ? `\n실패 ${fail}건` : '\n전부 복원 성공 ✔');
  process.exit(fail ? 1 : 0);
}
