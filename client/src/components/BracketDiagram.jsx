import { useMemo } from 'react';

/**
 * 종이 대진표 모양의 토너먼트 도면.
 *
 * 검도 대회 대진표는 왼쪽 조와 오른쪽 조가 가운데 결승을 향해 마주보는 형태이고,
 * 선수들이 그 배치에 눈이 익어 있다. 조별 목록으로 풀어 보여주면 같은 정보라도 낯설다.
 * 그래서 A조는 왼쪽, B조는 좌우 반전해 오른쪽, 결승은 가운데에 둔다.
 *
 * 좌표는 SVG viewBox로만 잡고 화면 폭에 맞춰 축소한다(작게 보임).
 * 확대는 부모가 전체화면으로 다시 그려서 처리한다.
 */

const ROW_H  = 22;   // 참가자 한 줄 높이
const COL_W  = 62;   // 라운드 한 칸 폭
const NAME_W = 104;  // 이름 칸 폭
const CENTER = 54;   // 가운데 결승 칸
const PAD    = 8;

/** 경기 트리를 훑어 각 참가자에게 행을, 각 경기에 y를 준다. */
function layoutGroup(matches) {
  const byNumber = new Map(matches.map((m) => [m.number, m]));
  const root = matches.find((m) => m.is_group_final) ?? matches[matches.length - 1];
  if (!root) return { rows: 0, nodes: [], leaves: [], maxDepth: 0 };

  const leaves = [];
  const nodes  = [];
  let row = 0;

  /** 위에서 아래로 훑으며 잎(참가자)에 행 번호를 매긴다. */
  function walk(m) {
    const ys = [];
    for (const key of ['a', 'b']) {
      const side = m[key];
      if (side?.kind === 'from' && byNumber.has(side.number)) {
        ys.push(walk(byNumber.get(side.number)));
      } else {
        const y = row++ * ROW_H + ROW_H / 2;
        leaves.push({ y, side, matchNumber: m.number });
        ys.push(y);
      }
    }
    const y = (ys[0] + ys[1]) / 2;
    nodes.push({ m, y, yA: ys[0], yB: ys[1], depth: m.round_depth });
    return y;
  }
  walk(root);

  const maxDepth = Math.max(...nodes.map((n) => n.depth), 1);
  return { rows: row, nodes, leaves, maxDepth, rootY: nodes[nodes.length - 1]?.y ?? 0 };
}

const nameOf = (side) =>
  side?.kind === 'player' ? (side.name ?? '') : '';

export default function BracketDiagram({ division, fontScale = 1 }) {
  const left  = division?.groups?.[0];
  const right = division?.groups?.[1];

  const L = useMemo(() => layoutGroup(left?.matches ?? []),  [left]);
  const R = useMemo(() => layoutGroup(right?.matches ?? []), [right]);

  if (!L.rows && !R.rows) return null;

  const cols   = Math.max(L.maxDepth, R.maxDepth);
  const halfW  = NAME_W + cols * COL_W;
  const width  = halfW * 2 + CENTER + PAD * 2;
  const height = Math.max(L.rows, R.rows) * ROW_H + PAD * 2;

  // 왼쪽은 이름이 바깥(왼쪽 끝), 경기가 안쪽으로 자란다. 오른쪽은 그 반대.
  const xLeftName  = PAD;
  const xLeftCol   = (d) => PAD + NAME_W + (d - 1) * COL_W;
  const xRightName = width - PAD - NAME_W;
  const xRightCol  = (d) => width - PAD - NAME_W - (d - 1) * COL_W;

  const fs   = 10 * fontScale;
  const fsNo = 8  * fontScale;

  const Half = ({ data, side }) => {
    const isLeft = side === 'left';
    const xName  = isLeft ? xLeftName : xRightName;
    const xCol   = isLeft ? xLeftCol  : xRightCol;
    const dir    = isLeft ? 1 : -1;

    return (
      <g>
        {/* 참가자 이름 + 이름칸에서 1라운드까지 가로선 */}
        {data.leaves.map((lf, i) => {
          const xEnd = xCol(1);
          const xStart = isLeft ? xName + NAME_W : xName;
          return (
            <g key={`n${i}`}>
              <text
                x={isLeft ? xStart - 4 : xStart + 4}
                y={lf.y + fs * 0.35}
                textAnchor={isLeft ? 'end' : 'start'}
                fontSize={fs}
                fill="#111"
              >
                {nameOf(lf.side)}
              </text>
              <line x1={xStart} y1={lf.y} x2={xEnd} y2={lf.y} stroke="#111" strokeWidth="1" />
            </g>
          );
        })}

        {/* 경기: 두 갈래를 세로로 잇고, 다음 라운드로 가로선을 뺀다 */}
        {data.nodes.map((n) => {
          const x  = xCol(n.depth);
          const x2 = x + dir * COL_W;
          return (
            <g key={`m${n.m.number}`}>
              <line x1={x} y1={n.yA} x2={x} y2={n.yB} stroke="#111" strokeWidth="1" />
              <line x1={x} y1={n.y} x2={x2} y2={n.y} stroke="#111" strokeWidth="1" />
              {/* 경기번호 — 종이 대진표처럼 꺾이는 지점에 적는다 */}
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

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      style={{ display: 'block', background: '#fff' }}
      role="img"
      aria-label={`${division.label} 대진표`}
    >
      {left  && <Half data={L} side="left" />}
      {right && <Half data={R} side="right" />}

      {/* 가운데 결승 */}
      {division.final && (
        <g>
          <line
            x1={xLeftCol(L.maxDepth) + COL_W} y1={L.rootY || centerY}
            x2={width / 2}                    y2={L.rootY || centerY}
            stroke="#111" strokeWidth="1"
          />
          <line
            x1={xRightCol(R.maxDepth) - COL_W} y1={R.rootY || centerY}
            x2={width / 2}                     y2={R.rootY || centerY}
            stroke="#111" strokeWidth="1"
          />
          <line
            x1={width / 2} y1={L.rootY || centerY}
            x2={width / 2} y2={R.rootY || centerY}
            stroke="#111" strokeWidth="1"
          />
          <circle cx={width / 2} cy={((L.rootY || centerY) + (R.rootY || centerY)) / 2} r={7} fill="#111" />
          <text
            x={width / 2} y={((L.rootY || centerY) + (R.rootY || centerY)) / 2 + fsNo * 0.36}
            textAnchor="middle" fontSize={fsNo} fill="#D8FF3E" fontWeight="bold"
          >
            결
          </text>
        </g>
      )}
    </svg>
  );
}
