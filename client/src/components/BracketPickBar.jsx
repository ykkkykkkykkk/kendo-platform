import { RANKS } from './BracketDiagram.jsx';

/**
 * 대진표 위에 붙는 픽 요약 바.
 *
 * 브래킷이 넓어 고른 팀이 화면 여기저기 흩어지므로, 지금 무엇을 골랐는지
 * 항상 위에 붙여 보여준다. 마감 카운트다운과 확정 버튼도 여기 둔다.
 */
export function PickSummaryBar({ picks, nameOf, remainMs, locked, closed, onSubmit, saving, complete }) {
  return (
    <div
      className="sticky top-0 z-30 bg-paper px-5 py-2.5"
      style={{ borderBottom: '1.5px solid #111111' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium flex-1">MY PICK</p>
        {closed ? (
          <span className="text-[11px] font-bold text-ink-400">픽 마감</span>
        ) : locked ? (
          <span className="text-[11px] font-bold text-ink">확정됨</span>
        ) : (
          <Countdown ms={remainMs} />
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {RANKS.map((r) => {
          const name = nameOf(picks[r.key]);
          return (
            <span
              key={r.key}
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border ${
                name ? 'border-ink text-ink' : 'border-ink-200 text-ink-400'
              }`}
            >
              <span
                className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold"
                style={{ background: r.fill, color: r.text }}
              >
                {r.short}
              </span>
              <span className={name ? 'font-semibold' : ''}>{name ?? '선택 안 함'}</span>
            </span>
          );
        })}
      </div>

      {!closed && !locked && (
        <button
          onClick={onSubmit}
          disabled={!complete || saving}
          className="w-full mt-2.5 bg-lime hover:bg-lime-dark text-ink font-bold text-[13px]
                     py-2.5 rounded-full pressable disabled:opacity-40"
        >
          {saving ? '저장 중…'
            : !complete ? `${RANKS.filter((r) => !picks[r.key]).length}자리 더 골라주세요`
            : '픽 확정하기'}
        </button>
      )}
      {locked && (
        <p className="text-ink-400 text-[11px] text-center mt-2">확정된 픽은 수정할 수 없습니다.</p>
      )}
    </div>
  );
}

function Countdown({ ms }) {
  if (ms == null) return <span className="text-[11px] text-ink-400">마감 미정</span>;
  if (ms <= 0)    return <span className="text-[11px] font-bold text-ink-400">픽 마감</span>;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const hh = String(Math.floor((s % 86400) / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return (
    <span className="text-[11px] font-bold text-ink tabular-nums">
      마감 {d > 0 ? `${d}일 ` : ''}{hh}:{mm}:{ss}
    </span>
  );
}

/**
 * 팀을 눌렀을 때 뜨는 순위 선택 팝오버.
 * 손가락 위치 근처에 띄우되 화면 밖으로 나가지 않게 좌우를 잡아준다.
 */
export function RankPopover({ at, team, picks, onPick, onClear, onClose }) {
  if (!at) return null;
  const W = 232;
  const left = Math.min(Math.max(8, at.x - W / 2), window.innerWidth - W - 8);
  const top  = Math.min(Math.max(70, at.y + 14), window.innerHeight - 150);
  const current = RANKS.find((r) => picks[r.key] === team.participant_id);

  return (
    <>
      <div className="fixed inset-0 z-[88]" onClick={onClose} />
      <div
        className="fixed z-[89] bg-paper border border-ink rounded-xl shadow-lg px-3 py-2.5"
        style={{ left, top, width: W }}
      >
        <p className="text-ink font-bold text-[13px] truncate mb-2">{team.name}</p>
        <div className="flex gap-1.5">
          {RANKS.map((r, i) => {
            const on = current?.key === r.key;
            return (
              <button
                key={r.key}
                onClick={() => onPick(r.key)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg border text-[11px]
                            font-bold pressable ${on ? 'border-ink' : 'border-ink-200'}`}
                style={on ? { background: r.fill, color: r.text } : undefined}
              >
                <span>{r.label}</span>
                <span className="text-[9px] font-normal opacity-70">
                  {i === 3 ? '공동' : `+${r.score}`}
                </span>
              </button>
            );
          })}
        </div>
        {current && (
          <button
            onClick={onClear}
            className="w-full mt-2 text-ink-400 text-[11px] py-1.5 border border-ink-200 rounded-full pressable"
          >
            해제
          </button>
        )}
      </div>
    </>
  );
}
