import { useMemo } from 'react';

/**
 * 종이 대진표 모양의 토너먼트 도면.
 *
 * 두 조를 **위아래로 쌓는다**. 종이 대진표처럼 좌우로 마주보게 그리면 폭이 두 배가 되어
 * 폰에서는 가로로 밀어야만 읽힌다. 위아래로 쌓으면 폭이 절반이라 한 화면에 들어오고,
 * 폰에서 자연스러운 세로 스크롤로 읽힌다. 각 조는 이름이 왼쪽, 회전이 오른쪽으로 진행하고
 * 두 조 우승자가 오른쪽 끝에서 만나 결승이 된다.
 *
 * 크기: 자연 크기(px)를 min-width로 두고 부모가 가로 스크롤한다.
 * 픽 배지는 SVG 좌표에 고정으로 그리므로 칸 크기가 변하지 않는다(레이아웃이 밀리지 않음).
 */

// 위아래로 쌓으면서 확보한 폭을 실제로 써먹으려면 칸도 같이 줄여야 한다.
// 이 값이면 5회전짜리 개인전이 400px — 폰 한 화면에 거의 들어온다(좌우 배치일 땐 1046px).
const ROW_H   = 24;   // 참가자 한 줄 높이
const COL_W   = 48;   // 라운드 한 칸 폭
const NAME_W  = 100;  // 이름 칸 폭
const FINAL_W = 44;   // 오른쪽 끝 결승 칸
const LABEL_H = 18;   // 조 이름 줄
const GAP     = 14;   // 두 조 사이 간격
const PAD     = 8;

/* 순위별 표시. 칸 안에 들어가는 크기라 브래킷이 밀리지 않는다. */
export const RANKS = [
  { key: 'pick_1st',   short: '1', label: '1등', score: 50, fill: '#111111', text: '#D8FF3E' },
  { key: 'pick_2nd',   short: '2', label: '2등', score: 30, fill: '#8A8A8A', text: '#FFFFFF' },
  { key: 'pick_3rd_a', short: '3', label: '3등', score: 10, fill: '#D8FF3E', text: '#111111' },
  { key: 'pick_3rd_b', short: '3', label: '3등', score: 10, fill: '#D8FF3E', text: '#111111' },
];
const rankOf = (key) => RANKS.find((r) => r.key === key);

/** 경기 트리를 훑어 각 참가자에게 행을, 각 경기에 y를 준다. */
function layoutGroup(matches) {
  const byNumber = new Map(matches.map((m) => [m.number, m]));
  const root = matches.find((m) => m.is_group_final) ?? matches[matches.length - 1];
  if (!root) return { rows: 0, nodes: [], leaves: [], maxDepth: 0, rootY: 0, rootDepth: 1 };

  const leaves = [];
  const nodes  = [];
  let row = 0;

  /* 부전승은 라운드를 건너뛰므로(1회전 승자가 3회전으로, 배정팀이 2회전부터)
     선을 그리려면 '부모 경기가 있는 칸'까지 이어야 한다. */
  function walk(m, parentDepth) {
    const ys = [];
    for (const key of ['a', 'b']) {
      const side = m[key];
      if (side?.kind === 'from' && byNumber.has(side.number)) {
        ys.push(walk(byNumber.get(side.number), m.round_depth));
      } else {
        const y = row++ * ROW_H + ROW_H / 2;
        leaves.push({ y, side, depth: m.round_depth });
        ys.push(y);
      }
    }
    const y = (ys[0] + ys[1]) / 2;
    nodes.push({ m, y, yA: ys[0], yB: ys[1], depth: m.round_depth, parentDepth });
    return y;
  }
  walk(root, null);

  const maxDepth = Math.max(...nodes.map((n) => n.depth), 1);
  const last = nodes[nodes.length - 1];
  return { rows: row, nodes, leaves, maxDepth, rootY: last?.y ?? 0, rootDepth: last?.depth ?? 1 };
}

const nameOf = (side) => (side?.kind === 'player' ? (side.name ?? '') : '');

export default function BracketDiagram({
  division,
  picks = {},            // { [participant_id]: 'pick_1st' | ... }
  onTapTeam,             // (side, event) => void — 없으면 보기 전용
  fontScale = 1,
}) {
  const top    = division?.groups?.[0];
  const bottom = division?.groups?.[1];

  const T = useMemo(() => layoutGroup(top?.matches ?? []),    [top]);
  const B = useMemo(() => layoutGroup(bottom?.matches ?? []), [bottom]);

  if (!T.rows && !B.rows) return null;

  const cols   = Math.max(T.maxDepth, B.maxDepth);
  const xName  = PAD;
  const xCol   = (d) => PAD + NAME_W + (d - 1) * COL_W;
  const xTree  = PAD + NAME_W + cols * COL_W;   // 트리 오른쪽 끝
  const xJoin  = xTree + FINAL_W / 2;           // 두 조 우승자가 만나는 세로선
  const width  = xTree + FINAL_W + PAD;

  const yTop    = PAD + LABEL_H;
  const yBottom = yTop + T.rows * ROW_H + GAP + LABEL_H;
  const height  = yBottom + B.rows * ROW_H + PAD;

  const fs   = 10.5 * fontScale;
  const fsNo = 8    * fontScale;

  const Group = ({ data, offsetY }) => (
    <g>
      {data.leaves.map((lf, i) => {
        const y      = lf.y + offsetY;
        const xEnd   = xCol(lf.depth);
        const xStart = xName + NAME_W;
        const pid    = lf.side?.participant_id;
        const rank   = pid != null ? rankOf(picks[pid]) : null;
        const tappable = !!onTapTeam && lf.side?.kind === 'player';

        return (
          <g
            key={`n${i}`}
            onClick={tappable ? (e) => onTapTeam(lf.side, e) : undefined}
            style={tappable ? { cursor: 'pointer' } : undefined}
          >
            {/* 이름 칸 배경 — 순위를 고른 팀만 칠한다. 칸 크기는 항상 같다. */}
            {rank && (
              <rect
                x={xName} y={y - ROW_H / 2 + 2}
                width={NAME_W} height={ROW_H - 4}
                fill={rank.fill} rx="3"
              />
            )}
            {/* 탭 영역 — 배경이 없어도 누를 수 있게 투명 사각형을 깐다 */}
            {tappable && !rank && (
              <rect x={xName} y={y - ROW_H / 2 + 2} width={NAME_W} height={ROW_H - 4} fill="transparent" />
            )}

            <text
              x={xStart - 20} y={y + fs * 0.35}
              textAnchor="end" fontSize={fs}
              fontWeight={rank ? 'bold' : 'normal'}
              fill={rank ? rank.text : '#111'}
            >
              {nameOf(lf.side)}
            </text>

            {/* 순위 배지 — 칸 안쪽 끝에 붙인다 */}
            {rank && (
              <text
                x={xStart - 5} y={y + fsNo * 0.36}
                textAnchor="end" fontSize={fsNo + 1} fontWeight="bold" fill={rank.text}
              >
                {rank.short}
              </text>
            )}

            <line x1={xStart} y1={y} x2={xEnd} y2={y} stroke="#111" strokeWidth="1" />
          </g>
        );
      })}

      {data.nodes.map((n) => {
        const x  = xCol(n.depth);
        const x2 = n.parentDepth ? xCol(n.parentDepth) : x + COL_W;
        const y  = n.y + offsetY;
        return (
          <g key={`m${n.m.number}`}>
            <line x1={x} y1={n.yA + offsetY} x2={x} y2={n.yB + offsetY} stroke="#111" strokeWidth="1" />
            <line x1={x} y1={y} x2={x2} y2={y} stroke="#111" strokeWidth="1" />
            <rect x={x + 2} y={y - 6} width="14" height="12" fill="#fff" stroke="#111" strokeWidth="0.6" />
            <text x={x + 9} y={y + fsNo * 0.36} textAnchor="middle" fontSize={fsNo} fill="#111">
              {n.m.number}
            </text>
          </g>
        );
      })}
    </g>
  );

  const tRootY = yTop    + T.rootY;
  const bRootY = yBottom + B.rootY;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      style={{ display: 'block', background: '#fff', minWidth: width, height: 'auto' }}
      role="img"
      aria-label={`${division.label} 대진표`}
    >
      {/* 조 이름 — 위아래로 쌓으면 어느 덩어리가 어느 조인지가 안 보인다 */}
      {top && (
        <text x={xName} y={yTop - 6} fontSize={fsNo + 1} fontWeight="bold" fill="#8A8A8A">
          {top.group}조
        </text>
      )}
      {bottom && (
        <text x={xName} y={yBottom - 6} fontSize={fsNo + 1} fontWeight="bold" fill="#8A8A8A">
          {bottom.group}조
        </text>
      )}

      {top    && <Group data={T} offsetY={yTop} />}
      {bottom && <Group data={B} offsetY={yBottom} />}

      {division.final && (
        <g>
          <line x1={xCol(T.rootDepth) + COL_W} y1={tRootY} x2={xJoin} y2={tRootY} stroke="#111" strokeWidth="1" />
          <line x1={xCol(B.rootDepth) + COL_W} y1={bRootY} x2={xJoin} y2={bRootY} stroke="#111" strokeWidth="1" />
          <line x1={xJoin} y1={tRootY} x2={xJoin} y2={bRootY} stroke="#111" strokeWidth="1" />
          <circle cx={xJoin} cy={(tRootY + bRootY) / 2} r={8} fill="#111" />
          <text
            x={xJoin} y={(tRootY + bRootY) / 2 + fsNo * 0.36}
            textAnchor="middle" fontSize={fsNo} fill="#D8FF3E" fontWeight="bold"
          >
            결
          </text>
        </g>
      )}
    </svg>
  );
}
