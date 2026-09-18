/* 헤더 물방울 배지.
 *
 * 알림을 따로 보내지 않고 이걸로 '오늘 받을 게 남았다'를 알린다. 푸시는 끄는 사람이
 * 많고 매일 보내면 성가시지만, 화면 위 숫자는 눌러야만 반응하므로 덜 밀어붙인다.
 *
 * 오늘 받을 물이 없으면 사라진다 — 항상 떠 있으면 아무도 안 본다.
 * 선수 계정에는 아예 뜨지 않는다(useBamboo가 null을 준다).
 */
import { useNavigate } from 'react-router-dom';
import { useBamboo } from '../context/BambooContext.jsx';

const LIME = '#D8FF3E';

/** 물방울 한 방울 + 남은 개수. 헤더 안에 들어가는 기본형. */
export default function WaterBadge({ floating = false }) {
  const navigate = useNavigate();
  const { data, enabled } = useBamboo();

  const remaining = data?.today?.remaining ?? 0;
  if (!enabled || !data || remaining <= 0) return null;

  /* 헤더 안에서는 알림 종과 똑같은 36px 원이어야 한다. 알약 모양으로 넓히면
     버튼 줄이 길어져 옆에 있는 제목이 두 줄로 깨진다(430px 폰에서 실제로 깨졌다). */
  return (
    <button
      onClick={() => navigate('/bamboo')}
      className={`relative w-9 h-9 flex items-center justify-center rounded-full
                  border border-ink-200 text-ink pressable flex-none ${
        floating ? 'fixed z-40 shadow-lg bg-paper' : ''
      }`}
      style={floating
        ? { right: 16, bottom: 'calc(60px + env(safe-area-inset-bottom, 0px) + 14px)' }
        : undefined}
      aria-label={`오늘 받을 물 ${remaining}개`}
      title={`오늘 받을 물 ${remaining}개`}
    >
      {/* 물방울 — lucide의 Droplets는 두 방울이라 한 방울짜리를 직접 그린다 */}
      <svg width="14" height="16" viewBox="0 0 12 14" aria-hidden="true">
        <path d="M6 0.6 C6 0.6 11 6.2 11 9 A5 5 0 0 1 1 9 C1 6.2 6 0.6 6 0.6 Z"
              fill="#5AA7E0" />
        <ellipse cx="4.3" cy="8.6" rx="1.1" ry="1.7" fill="#fff" opacity=".5" />
      </svg>
      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full
                       border border-ink text-ink text-[9px] font-bold
                       flex items-center justify-center tabular-nums"
            style={{ background: LIME }}>
        {remaining > 99 ? '99+' : remaining}
      </span>
    </button>
  );
}
