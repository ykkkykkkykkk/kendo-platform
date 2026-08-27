import FanGradeBadge from './FanGradeBadge.jsx';

/**
 * 선수 본인이 보는 응원 팬 목록.
 *
 * 닉네임과 등급, 누적 일수만 받는다. 서버 쿼리에 실명·연락처를 아예 넣지 않았으므로
 * 이 화면에서 개인정보가 새어나갈 경로가 없다.
 */
export default function PlayerFanList({ data }) {
  const fans = data?.fans ?? [];

  if (fans.length === 0) {
    return (
      <p className="py-12 text-center text-ink-400 text-sm" style={{ borderTop: '1.5px solid #111111' }}>
        <span className="block mt-8">아직 응원한 팬이 없어요.</span>
      </p>
    );
  }

  const today = fans.filter((f) => f.today);

  return (
    <div>
      {/* 오늘 요약 — 반전 블록으로 한 번 끊어준다 */}
      <div className="bg-block rounded-2xl p-5">
        <p className="text-[10px] tracking-[0.2em] font-medium" style={{ color: '#D8FF3E' }}>TODAY</p>
        <p className="text-white font-bold text-2xl mt-2 tracking-tight">
          {data.todayCount}명이 응원했어요
        </p>
        <p className="text-white/50 text-xs mt-1">전체 응원 팬 {data.totalCount}명</p>

        {today.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {today.slice(0, 12).map((f) => (
              <span key={f.nickname}
                    className="text-[11px] font-semibold text-ink bg-lime rounded-full px-2.5 py-1">
                {f.nickname}
              </span>
            ))}
            {today.length > 12 && (
              <span className="text-[11px] text-white/50 self-center">외 {today.length - 12}명</span>
            )}
          </div>
        )}
      </div>

      {/* 전체 명단 — 누적 많은 순 */}
      <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mt-8 mb-3">ALL FANS</p>
      <div style={{ borderTop: '1.5px solid #111111' }}>
        {fans.map((f, i) => (
          <div key={f.nickname}
               className={`flex items-center gap-3 py-3.5 ${i > 0 ? 'border-t border-ink-200' : ''}`}>
            <span className="text-[11px] text-ink-400 tabular-nums w-6 flex-none">{i + 1}</span>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-ink text-sm font-bold truncate">{f.nickname}</span>
              <FanGradeBadge grade={f.grade} size="sm" />
              {f.today && (
                <span className="text-[9px] font-bold bg-lime text-ink px-1.5 py-0.5 flex-none">오늘</span>
              )}
            </div>
            <span className="text-ink text-xs font-semibold tabular-nums flex-none">{f.days}일</span>
          </div>
        ))}
      </div>
    </div>
  );
}
