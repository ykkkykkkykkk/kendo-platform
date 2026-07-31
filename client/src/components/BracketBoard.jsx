import { useMemo, useState } from 'react';

/**
 * 가로 토너먼트 브라켓 (에디토리얼 화이트 톤).
 *
 * 이 대회 대진은 2의 거듭제곱이 아니다 (한 조 29명 → 1회전 13경기 + 부전승 3명).
 * 그래서 고정 좌표표 대신 트리를 재귀로 훑으면서 세로 위치를 계산한다:
 *   · 선수로 들어오는 칸(부전승 포함)은 자기 줄을 하나 차지한다
 *   · 경기에서 올라오는 칸은 그 경기의 세로 중심을 그대로 쓴다
 *   · 경기의 세로 중심 = 두 칸의 중간
 * 이러면 부전승이 있어도 선이 어긋나지 않는다.
 */

const ROW   = 34;    // 선수 한 칸 높이
const GAP_Y = 14;    // 경기 사이 여백
const BOX_W = 186;   // 경기 박스 너비
const GAP_X = 44;    // 라운드 사이 여백
const PAD   = 16;

/** 라운드 이름: 남은 경기 수로 정한다 (8강/4강/결승 + 영문 병기) */
function roundLabel(matchCount, isGroupFinal, depth) {
  if (isGroupFinal)     return { ko: '조 결승', en: 'GROUP FINAL' };
  if (matchCount === 1) return { ko: '결승',    en: 'FINAL' };
  if (matchCount === 2) return { ko: '4강',     en: 'SEMI' };
  if (matchCount === 4) return { ko: '8강',     en: 'QUARTER' };
  if (matchCount === 8) return { ko: '16강',    en: 'ROUND OF 16' };
  return { ko: `${depth}회전`, en: `ROUND ${depth}` };
}

/** 트리 세로 배치 */
function useLayout(matches) {
  return useMemo(() => {
    const byNumber = new Map(matches.map((m) => [m.number, m]));
    const centers  = new Map();   // number → y(중심)
    let slot = 0;

    const place = (m) => {
      if (centers.has(m.number)) return centers.get(m.number);
      const ys = [
        [m.a, m.a_from_number],
        [m.b, m.b_from_number],
      ].map(([, fromNum]) => {
        const child = fromNum != null ? byNumber.get(fromNum) : null;
        return child ? place(child) : (slot++) * (ROW + GAP_Y) + ROW / 2;
      });
      const y = (ys[0] + ys[1]) / 2;
      centers.set(m.number, y);
      return y;
    };

    const root = matches.find((m) => m.is_group_final) ?? matches[matches.length - 1];
    if (root) place(root);

    const depths = [...new Set(matches.map((m) => m.round_depth))].sort((a, b) => a - b);
    const colOf  = new Map(depths.map((d, i) => [d, i]));

    const boxes = matches.map((m) => ({
      m,
      x: PAD + colOf.get(m.round_depth) * (BOX_W + GAP_X),
      y: (centers.get(m.number) ?? 0) - ROW,      // 박스 top (두 칸이므로 중심 -ROW)
    }));

    const height = PAD * 2 + slot * (ROW + GAP_Y) + ROW;
    const width  = PAD * 2 + depths.length * BOX_W + (depths.length - 1) * GAP_X;

    return { boxes, byNumber, depths, colOf, centers, width, height };
  }, [matches]);
}

/* ── 선수 한 칸 ─────────────────────────────────────────────── */
function Cell({ side, isWinner, isLoser, canEdit, onPick, champion }) {
  const label = side.kind === 'player' ? side.name
              : side.kind === 'group_winner' ? `${side.group}조 우승`
              : side.kind === 'from' ? `${side.number}경기 승자`
              : '미정';
  const isPlayer = side.kind === 'player';

  const base = 'relative flex items-center gap-2 h-[34px] pl-3 pr-2 w-full text-left overflow-hidden';
  // 우승 칸은 라임 배경을 유지한다 — hover 틴트를 얹으면 라임이 묻힌다.
  const interactive = canEdit && isPlayer;
  const tone = champion
    ? 'bg-lime'
    : `bg-paper ${interactive ? 'hover:bg-ink-200/40' : ''}`;

  return (
    <button
      type="button"
      disabled={!canEdit || !isPlayer}
      onClick={() => onPick?.(side)}
      className={`${base} ${tone} ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {/* 승자 표시: 왼쪽 3px 검정 바 */}
      {isWinner && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-ink" aria-hidden="true" />}

      {/* 이름이 먼저 줄어들지 않도록 flex-1 min-w-0을 준다 */}
      <span
        className={`flex-1 min-w-0 text-[13px] truncate ${
          champion ? 'text-ink font-semibold'
          : isWinner ? 'text-ink font-semibold'
          : isLoser  ? 'text-[#aaa] font-normal'
          : isPlayer ? 'text-ink font-medium'
          : 'text-[#aaa] font-normal'
        }`}
      >
        {label}
      </span>

      {isPlayer && !champion && (
        <span className={`text-[10px] shrink-0 truncate max-w-[70px] ${
          isLoser ? 'text-[#c4c4c4]' : 'text-ink-400'
        }`}>
          {side.team}
        </span>
      )}
      {champion && (
        <span className="shrink-0 text-[8px] font-bold tracking-[0.14em] text-ink">CHAMPION</span>
      )}
    </button>
  );
}

/* ── 경기 박스 ─────────────────────────────────────────────── */
function MatchBox({ m, canEdit, onPick, championId }) {
  const w = m.winner_participant_id;
  const decided = w != null;
  const isW = (s) => s.kind === 'player' && s.participant_id === w;
  const isL = (s) => decided && s.kind === 'player' && s.participant_id !== w;

  // 양쪽이 다 정해지기 전에는 결과를 입력할 수 없다. 한쪽만 채워진 상태에서
  // 누르면 상대 없이 승리 처리돼 버린다(실제로 그렇게 잘못 입력된 적 있음).
  const ready    = m.a.kind === 'player' && m.b.kind === 'player';
  const editable = canEdit && ready;

  return (
    <div className="border border-ink-200 bg-paper" style={{ width: BOX_W }}>
      <div className="flex items-center gap-1.5 px-2 h-[18px] border-b border-ink-200">
        <span className="text-[9px] font-bold tabular-nums text-ink-600">{m.number}</span>
        <span className="text-[9px] text-ink-400">{decided ? '종료' : ready ? '예정' : '대기'}</span>
      </div>
      <Cell side={m.a} isWinner={isW(m.a)} isLoser={isL(m.a)}
            canEdit={editable} onPick={() => onPick(m, m.a)}
            champion={championId != null && isW(m.a) && m.a.participant_id === championId} />
      <div className="h-px bg-ink-200" />
      <Cell side={m.b} isWinner={isW(m.b)} isLoser={isL(m.b)}
            canEdit={editable} onPick={() => onPick(m, m.b)}
            champion={championId != null && isW(m.b) && m.b.participant_id === championId} />
    </div>
  );
}

/* ── 연결선 ─────────────────────────────────────────────────── */
function Connectors({ layout }) {
  const { boxes, byNumber, centers, colOf } = layout;
  const paths = [];
  for (const { m, x } of boxes) {
    for (const fromNum of [m.a_from_number, m.b_from_number]) {
      if (fromNum == null || !byNumber.has(fromNum)) continue;
      const child = byNumber.get(fromNum);
      if (colOf.get(child.round_depth) == null) continue;
      const cx = PAD + colOf.get(child.round_depth) * (BOX_W + GAP_X) + BOX_W;
      const cy = centers.get(child.number);
      const ty = centers.get(m.number);
      const midX = cx + GAP_X / 2;
      paths.push(`M ${cx} ${cy} H ${midX} V ${ty} H ${x}`);
    }
  }
  return (
    <svg className="absolute inset-0 pointer-events-none" width={layout.width} height={layout.height}>
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#E5E5E5" strokeWidth="1" />
      ))}
    </svg>
  );
}

/* ── 라운드 헤더 ────────────────────────────────────────────── */
function RoundHeaders({ headers, width }) {
  return (
    <div className="relative" style={{ width, height: 34 }}>
      {headers.map((h) => {
        const active = h.done > 0 && h.done < h.count;   // 진행 중인 라운드
        return (
          <div key={h.d} className="absolute top-0" style={{ left: h.x, width: BOX_W }}>
            <div className={`flex items-baseline gap-1.5 pb-1 ${active ? 'border-b-2 border-ink' : 'border-b border-ink-200'}`}>
              <span className="text-[11px] font-bold text-ink">{h.ko}</span>
              <span className="text-[8px] tracking-[0.14em] text-ink-400">{h.en}</span>
              <span className="flex-1" />
              <span className="text-[9px] tabular-nums text-ink-400">{h.done}/{h.count}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── 보드 ───────────────────────────────────────────────────── */
export default function BracketBoard({ matches, canEdit, onPick, championId = null, bare = false }) {
  const layout = useLayout(matches);
  const { boxes, depths, height, width } = layout;

  const headers = depths.map((d) => {
    const inRound = matches.filter((x) => x.round_depth === d);
    return {
      d,
      x: PAD + layout.colOf.get(d) * (BOX_W + GAP_X),
      ...roundLabel(inRound.length, inRound.some((x) => x.is_group_final), d),
      count: inRound.length,
      done:  inRound.filter((x) => x.winner_participant_id != null).length,
    };
  });

  // 팝업(전체 보기)에서는 바깥에서 확대·이동을 맡으므로 스크롤 래퍼와 안내를 뺀다.
  const inner = (
    <div style={{ width }}>
      {/* 라운드 헤더 */}
      <RoundHeaders headers={headers} width={width} />
      <div className="relative" style={{ width, height }}>
        <Connectors layout={layout} />
        {boxes.map(({ m, x, y }) => (
          <div key={m.id} className="absolute" style={{ left: x, top: y }}>
            <MatchBox m={m} canEdit={canEdit} onPick={onPick} championId={championId} />
          </div>
        ))}
      </div>
    </div>
  );

  if (bare) return inner;

  return (
    <div className="relative">
      {/* 좁은 화면에서는 브라켓이 화면보다 넓다. 오른쪽이 그냥 잘려 보이지 않도록
          페이드와 안내를 둔다(태블릿 이상에서는 다 들어가므로 숨김). */}
      <div className="md:hidden absolute right-0 top-0 bottom-0 w-10 z-10 pointer-events-none
                      bg-gradient-to-l from-paper to-transparent" />
      <p className="md:hidden text-[10px] text-ink-400 pb-1.5">← 좌우로 넘겨서 보기</p>

      <div className="overflow-x-auto">
        <div style={{ minWidth: width }}>
        {/* 라운드 헤더 */}
        <RoundHeaders headers={headers} width={width} />

        {/* 브라켓 */}
        <div className="relative" style={{ width, height }}>
          <Connectors layout={layout} />
          {boxes.map(({ m, x, y }) => (
            <div key={m.id} className="absolute" style={{ left: x, top: y }}>
              <MatchBox m={m} canEdit={canEdit} onPick={onPick} championId={championId} />
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}

export { ROW, BOX_W };
