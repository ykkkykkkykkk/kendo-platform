import { useState } from 'react';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import BracketDiagram from '../components/BracketDiagram.jsx';
import BracketZoomModal from '../components/BracketZoomModal.jsx';

/* 대회 슬러그 — 지금은 대회가 하나뿐이라 고정. 여러 개가 되면 목록에서 고르게 바꾼다. */
const SLUG = '2026';

/* 이 페이지는 보기 전용이다. 결과 입력은 관리자 페이지에서만 한다
   (/admin → 대회 관리 → 대진표). */

/* ── 페이지 ────────────────────────────────────────────────── */
export default function DrawPage() {
  const { data, loading, error } = useFetch(() => api.draw(SLUG), [SLUG]);
  const [divIdx, setDivIdx] = useState(0);
  const [zoom, setZoom] = useState(false);     // 대진도 확대 보기

  const divisions = data?.divisions ?? [];
  const division  = divisions[divIdx] ?? null;

  if (loading) {
    return (
      <main className="page-body bg-paper min-h-screen px-5 pt-12">
        <div className="h-3 w-16 bg-ink-200 animate-pulse" />
        <div className="h-10 w-40 bg-ink-200 animate-pulse mt-3" />
        <div className="flex gap-2 mt-6">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-8 w-24 rounded-full bg-ink-200 animate-pulse" />)}
        </div>
        <div className="mt-8 space-y-4">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 bg-ink-200 animate-pulse" />)}
        </div>
      </main>
    );
  }

  if (error || !data || data.error || !divisions.length) {
    return (
      <main className="page-body bg-paper min-h-screen px-5 pt-12">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">DRAW</p>
        <h1 className="text-4xl font-bold text-ink tracking-[-0.04em] leading-[0.95] mt-1">대진표</h1>
        <p className="text-ink-400 text-sm mt-8">아직 등록된 대진표가 없습니다.</p>
      </main>
    );
  }

  return (
    <main className="page-body bg-paper min-h-screen">
      {/* 헤더 */}
      <header className="px-5 pt-12">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">DRAW</p>
        <h1 className="text-4xl font-bold text-ink tracking-[-0.04em] leading-[0.95] mt-1">대진표</h1>
        <p className="text-ink-400 text-sm mt-2">
          {data.name}
          {data.venue && <> · {data.venue}</>}
        </p>
      </header>

      {/* 부문 탭 */}
      <div className="flex flex-wrap gap-2 px-5 mt-5">
        {divisions.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setDivIdx(i)}
            className={`flex-none px-3.5 py-2 rounded-full text-[13px] font-medium transition-all pressable border ${
              i === divIdx ? 'bg-ink text-white border-ink' : 'bg-paper text-ink-600 border-ink-200'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {division && (
        <>
          <p className="px-5 mt-3 text-[11px] text-ink-400">
            {division.participant_count}명 참가 · {division.groups.length}개 조 ·{' '}
            {division.groups.reduce((n, g) => n + g.matches.length, 0) + (division.final ? 1 : 0)}경기
          </p>

          {/* 종이 대진표와 같은 모양 하나로만 보여준다.
              조별 경기 목록을 아래에 또 두면 같은 내용이 두 번 나와 헷갈린다. */}
          {division.groups.some((g) => g.matches.length > 0) ? (
            <div className="px-5 mt-4">
              <button
                onClick={() => setZoom(true)}
                className="w-full border border-ink-200 rounded-xl p-2 pressable bg-white"
                aria-label="대진표 크게 보기"
              >
                <BracketDiagram division={division} />
              </button>
              <p className="text-center text-[11px] text-ink-400 mt-1.5">
                대진표를 누르면 크게 볼 수 있어요
              </p>
            </div>
          ) : (
            <p className="px-5 mt-8 text-ink-400 text-sm">이 부문은 아직 대진이 등록되지 않았습니다.</p>
          )}
        </>
      )}

      {zoom && division && (
        <BracketZoomModal division={division} onClose={() => setZoom(false)} />
      )}
    </main>
  );
}
