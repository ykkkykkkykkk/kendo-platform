import { useMemo } from 'react';

/**
 * 종이 대진표 모양의 토너먼트 도면.
 *
 * 검도 대회 대진표는 왼쪽 조와 오른쪽 조가 가운데 결승을 향해 마주보는 형태이고,
 * 선수들이 그 배치에 눈이 익어 있다. 조별 목록으로 풀어 보여주면 같은 정보라도 낯설다.
 *
 * 크기: 자연 크기(px)를 min-width로 두고 부모가 가로 스크롤한다.
 *   - 폰: 줄여서 뭉개지 않고 자연 크기로 두어 밀어서 본다
 *   - PC: 폭이 남으므로 100%로 늘어나 한 번에 다 보인다
 * 픽 배지는 SVG 좌표에 고정으로 그리므로 칸 크기가 변하지 않는다(레이아웃이 밀리지 않음).
 */

const ROW_H  = 24;   // 참가자 한 줄 높이
const COL_W  = 62;   // 라운드 한 칸 폭
const NAME_W = 116;  // 이름 칸 폭
const CENTER = 54;   // 가운데 결승 칸
const PAD    = 8;

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
  if (!root) return { rows: 0, nodes: [], leaves: [], maxDepth: 0, rootY: 0 };

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
  return { rows: row, nodes, leaves, maxDepth, rootY: nodes[nodes.length - 1]?.y ?? 0 };
}

const nameOf = (side) => (side?.kind === 'player' ? (side.name ?? '') : '');

export default function BracketDiagram({
  division,
  picks = {},            // { [participant_id]: 'pick_1st' | ... }
  onTapTeam,             // (side, event) => void — 없으면 보기 전용
  fontScale = 1,
}) {
  const left  = division?.groups?.[0];
  const right = division?.groups?.[1];

  const L = useMemo(() => layoutGroup(left?.matches ?? []),  [left]);
  const R = useMemo(() => layoutGroup(right?.matches ?? []), [right]);

  if (!L.rows && !R.rows) return null;

  const cols   = Math.max(L.maxDepth, R.maxDepth);
  const halfW  = NAME_W + cols * COL_W;
  const width  = halfW * 2 + CENTER + PAD * 2;
  const height = Math.max(L.rows, R.rows) * ROW_H + PAD * 2;

  const xLeftName  = PAD;
  const xLeftCol   = (d) => PAD + NAME_W + (d - 1) * COL_W;
  const xRightName = width - PAD - NAME_W;
  const xRightCol  = (d) => width - PAD - NAME_W - (d - 1) * COL_W;

  const fs   = 10.5 * fontScale;
  const fsNo = 8    * fontScale;

  const Half = ({ data, side }) => {
    const isLeft = side === 'left';
    const xName  = isLeft ? xLeftName : xRightName;
    const xCol   = isLeft ? xLeftCol  : xRightCol;
    const dir    = isLeft ? 1 : -1;

    return (
      <g>
        {data.leaves.map((lf, i) => {
          const xEnd   = xCol(lf.depth);
          const xStart = isLeft ? xName + NAME_W : xName;
          const pid    = lf.side?.participant_id;
          const rank   = pid != null ? rankOf(picks[pid]) : null;
          const tappable = !!onTapTeam && lf.side?.kind === 'player';

          // 이름 칸 배경 — 순위를 고른 팀만 칠한다. 칸 크기는 항상 같다.
          const boxX = isLeft ? xName : xName;
          return (
            <g
              key={`n${i}`}
              onClick={tappable ? (e) => onTapTeam(lf.side, e) : undefined}
              style={tappable ? { cursor: 'pointer' } : undefined}
            >
              {rank && (
                <rect
                  x={boxX} y={lf.y - ROW_H / 2 + 2}
                  width={NAME_W} height={ROW_H - 4}
                  fill={rank.fill} rx="3"
                />
              )}
              {/* 탭 영역 — 배경이 없어도 누를 수 있게 투명 사각형을 깐다 */}
              {tappable && !rank && (
                <rect x={boxX} y={lf.y - ROW_H / 2 + 2} width={NAME_W} height={ROW_H - 4} fill="transparent" />
              )}

              <text
                x={isLeft ? xStart - 20 : xStart + 20}
                y={lf.y + fs * 0.35}
                textAnchor={isLeft ? 'end' : 'start'}
                fontSize={fs}
                fontWeight={rank ? 'bold' : 'normal'}
                fill={rank ? rank.text : '#111'}
              >
                {nameOf(lf.side)}
              </text>

              {/* 순위 배지 — 칸 안쪽 끝에 붙인다 */}
              {rank && (
                <text
                  x={isLeft ? xStart - 5 : xStart + 5}
                  y={lf.y + fsNo * 0.36}
                  textAnchor={isLeft ? 'end' : 'start'}
                  fontSize={fsNo + 1} fontWeight="bold" fill={rank.text}
                >
                  {rank.short}
                </text>
              )}

              <line x1={xStart} y1={lf.y} x2={xEnd} y2={lf.y} stroke="#111" strokeWidth="1" />
            </g>
          );
        })}

        {data.nodes.map((n) => {
          const x  = xCol(n.depth);
          const x2 = n.parentDepth ? xCol(n.parentDepth) : x + dir * COL_W;
          return (
            <g key={`m${n.m.number}`}>
              <line x1={x} y1={n.yA} x2={x} y2={n.yB} stroke="#111" strokeWidth="1" />
              <line x1={x} y1={n.y} x2={x2} y2={n.y} stroke="#111" strokeWidth="1" />
              <rect
                x={isLeft ? x + 2 : x - 16} y={n.y - 6}
                width="14" height="12" fill="#fff" stroke="#111" strokeWidth="0.6"
              />
              <text
                x={isLeft ? x + 9 : x - 9} y={n.y + fsNo * 0.36}
                textAnchor="middle" fontSize={fsNo} fill="#111"
              >
                {n.m.number}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  const centerY = height / 2;
  const ly = L.rootY || centerY;
  const ry = R.rootY || centerY;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      style={{ display: 'block', background: '#fff', minWidth: width, height: 'auto' }}
      role="img"
      aria-label={`${division.label} 대진표`}
    >
      {left  && <Half data={L} side="left" />}
      {right && <Half data={R} side="right" />}

      {division.final && (
        <g>
          <line x1={xLeftCol(L.maxDepth) + COL_W}  y1={ly} x2={width / 2} y2={ly} stroke="#111" strokeWidth="1" />
          <line x1={xRightCol(R.maxDepth) - COL_W} y1={ry} x2={width / 2} y2={ry} stroke="#111" strokeWidth="1" />
          <line x1={width / 2} y1={ly} x2={width / 2} y2={ry} stroke="#111" strokeWidth="1" />
          <circle cx={width / 2} cy={(ly + ry) / 2} r={8} fill="#111" />
          <text
            x={width / 2} y={(ly + ry) / 2 + fsNo * 0.36}
            textAnchor="middle" fontSize={fsNo} fill="#D8FF3E" fontWeight="bold"
          >
            결
          </text>
        </g>
      )}
    </svg>
  );
}
