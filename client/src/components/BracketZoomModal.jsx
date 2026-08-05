import { useState } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import BracketDiagram from './BracketDiagram.jsx';

/**
 * 대진표 확대 보기.
 *
 * 종이 대진표는 한 장에 다 들어가지만 폰 화면에서는 글씨가 너무 작아진다.
 * 목록에서는 전체 모양만 보여주고, 누르면 여기서 키워 좌우로 밀어 본다.
 * 배율은 버튼으로 고정 단계를 쓴다 — 핀치 줌은 기기마다 스크롤과 충돌이 잦다.
 */
const STEPS = [1, 1.6, 2.4, 3.4];

export default function BracketZoomModal({ division, onClose }) {
  const [step, setStep] = useState(1);
  const scale = STEPS[step];

  return (
    <div className="fixed inset-0 z-[95] bg-paper flex flex-col">
      {/* 헤더 */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-none bg-paper"
        style={{ borderBottom: '1.5px solid #111111', paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">DRAW</p>
          <h2 className="text-ink font-bold text-lg tracking-tight truncate">{division.label}</h2>
        </div>
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          aria-label="축소"
          className="w-9 h-9 rounded-full border border-ink-200 flex items-center justify-center
                     text-ink disabled:opacity-30 pressable"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
          disabled={step === STEPS.length - 1}
          aria-label="확대"
          className="w-9 h-9 rounded-full border border-ink-200 flex items-center justify-center
                     text-ink disabled:opacity-30 pressable"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={onClose}
          aria-label="닫기"
          className="w-9 h-9 rounded-full bg-ink text-white flex items-center justify-center pressable"
        >
          <X size={16} />
        </button>
      </div>

      {/* 도면 — 확대하면 가로·세로로 밀어서 본다 */}
      <div className="flex-1 overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div style={{ width: `${scale * 100}%`, minWidth: '100%', padding: 12 }}>
          <BracketDiagram division={division} fontScale={scale >= 2.4 ? 0.85 : 1} />
        </div>
      </div>

      <p
        className="flex-none text-center text-[11px] text-ink-400 py-2 bg-paper"
        style={{ borderTop: '1px solid #E5E5E5', paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
      >
        {step === 0 ? '＋ 를 눌러 키우고 손가락으로 밀어서 보세요' : `${Math.round(scale * 100)}% · 밀어서 이동`}
      </p>
    </div>
  );
}
