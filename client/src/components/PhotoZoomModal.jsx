import { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { fullSrc } from '../utils/cloudinary.js';

/**
 * 사진 크게 보기.
 *
 * 팀 단체사진은 열 명 넘게 서 있어서 폰 화면에 16:9로 깔아두면 얼굴이 알아볼 수 없다.
 * 눌렀을 때 자르지 않은 원본을 화면에 맞춰 보여주고, 더 키워서 밀어 볼 수 있게 한다.
 *
 * 배율은 대진표 확대와 같이 버튼으로 고정 단계를 쓴다 — 핀치 줌은 기기마다
 * 스크롤과 충돌이 잦다(BracketZoomModal과 같은 이유).
 */
const STEPS = [1, 1.8, 2.8, 4];

export default function PhotoZoomModal({ src, alt = '', caption, onClose }) {
  const [step, setStep] = useState(0);
  const scale = STEPS[step];

  // 뒤로가기·ESC로 닫는다. 확대한 채로 갇히지 않게.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[95] bg-black flex flex-col">
      {/* 상단 — 닫기와 배율 */}
      <div
        className="flex items-center gap-2 px-4 py-3 flex-none"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        <button
          onClick={onClose}
          aria-label="닫기"
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white pressable"
        >
          <X size={18} />
        </button>
        <span className="flex-1 min-w-0 text-white/60 text-[13px] truncate">{caption}</span>
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          aria-label="축소"
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center
                     text-white disabled:opacity-25 pressable"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
          disabled={step === STEPS.length - 1}
          aria-label="확대"
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center
                     text-white disabled:opacity-25 pressable"
        >
          <ZoomIn size={16} />
        </button>
      </div>

      {/* 사진 — 배율이 1이면 화면에 맞추고, 키우면 좌우·위아래로 밀어 본다 */}
      <div
        className="flex-1 overflow-auto flex items-center justify-center p-2"
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      >
        <img
          src={fullSrc(src)}
          alt={alt}
          className="max-w-full max-h-full object-contain select-none"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center',
            transition: 'transform 160ms ease',
          }}
        />
      </div>

      <p className="flex-none text-center text-white/35 text-[11px] pb-6">
        {scale === 1 ? '확대 버튼을 누르면 더 크게 볼 수 있어요' : '손가락으로 밀어서 볼 수 있어요'}
      </p>
    </div>
  );
}
