import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import BracketBoard from './BracketBoard.jsx';

/**
 * 대진표 전체 보기 팝업.
 *
 * 좁은 화면에서 브라켓을 가로 스크롤로 훑으면 전체 구도가 안 보인다.
 * 여기서는 화면에 맞게 축소해 한 번에 펼쳐 보여주고, 필요하면 확대해서 이동한다.
 * 축소는 transform: scale로 하고, 바깥 div를 축소된 크기로 잡아 스크롤이 맞게 동작하게 한다.
 */
export default function BracketModal({ title, subtitle, matches, canEdit, onPick, championId, onClose }) {
  const boardRef = useRef(null);
  const viewRef  = useRef(null);
  const [natural, setNatural] = useState(null);   // 원래 크기 {w,h}
  const [scale, setScale]     = useState(null);   // null = 아직 계산 전
  const [fitScale, setFitScale] = useState(1);

  /* 원래 크기 측정 (scale 적용 전 값이어야 하므로 측정 시점엔 scale=1) */
  useLayoutEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const w = el.scrollWidth, h = el.scrollHeight;
    if (w && h) setNatural({ w, h });
  }, [matches]);

  const computeFit = useCallback(() => {
    if (!natural || !viewRef.current) return;
    const vw = viewRef.current.clientWidth  - 24;
    const vh = viewRef.current.clientHeight - 24;
    const f = Math.min(vw / natural.w, vh / natural.h, 1);
    setFitScale(f);
    setScale((s) => (s == null ? f : s));
  }, [natural]);

  useLayoutEffect(computeFit, [computeFit]);
  useEffect(() => {
    window.addEventListener('resize', computeFit);
    return () => window.removeEventListener('resize', computeFit);
  }, [computeFit]);

  /* ESC로 닫기 + 배경 스크롤 잠금 */
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const s = scale ?? 1;
  const zoom = (mult) => setScale((v) => Math.min(3, Math.max(fitScale * 0.5, (v ?? fitScale) * mult)));

  return createPortal(
    /* 하단 탭바가 z-50이라 그보다 위에 올린다 */
    <div className="fixed inset-0 z-[60] bg-paper flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-ink-200 shrink-0">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-ink truncate">{title}</p>
          {subtitle && <p className="text-[10px] text-ink-400 truncate">{subtitle}</p>}
        </div>
        <span className="flex-1" />

        <div className="flex items-center border border-ink-200 rounded-full overflow-hidden shrink-0">
          <button onClick={() => zoom(1 / 1.3)} className="px-3 py-1.5 text-[13px] text-ink-600 pressable" aria-label="축소">−</button>
          <button
            onClick={() => setScale(fitScale)}
            className={`px-2.5 py-1.5 text-[10px] font-semibold border-x border-ink-200 pressable ${
              Math.abs(s - fitScale) < 0.001 ? 'bg-ink text-white' : 'text-ink-600'
            }`}
          >
            맞춤
          </button>
          <button onClick={() => zoom(1.3)} className="px-3 py-1.5 text-[13px] text-ink-600 pressable" aria-label="확대">＋</button>
        </div>

        <button
          onClick={onClose}
          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full border border-ink-200 text-ink pressable"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>

      {canEdit && (
        <p className="px-4 py-1.5 text-[10px] font-bold tracking-[0.1em] bg-lime text-ink shrink-0">
          ADMIN · 이긴 선수를 누르면 바로 반영됩니다
        </p>
      )}

      {/* 브라켓 */}
      {/* m-auto: 축소돼 남는 공간이 있으면 가운데로, 확대돼 넘치면 스크롤되게 */}
      <div ref={viewRef} className="flex-1 overflow-auto p-3 flex">
        <div
          className="m-auto"
          style={natural ? { width: natural.w * s, height: natural.h * s } : undefined}
        >
          <div
            ref={boardRef}
            style={{
              transform: `scale(${s})`,
              transformOrigin: 'top left',
              width: natural ? natural.w : undefined,
            }}
          >
            <BracketBoard
              matches={matches}
              canEdit={canEdit}
              onPick={onPick}
              championId={championId}
              bare
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
