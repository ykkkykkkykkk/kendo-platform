import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/',            label: 'HOME', icon: HomeIcon,   end: true  },
  { to: '/feed',        label: 'FEED', icon: FeedIcon,   end: false },
  /* 대진표를 보면서 그 자리에서 픽을 하므로 DRAW와 PICK을 한 칸으로 합쳤다.
     기존 픽 화면(/predictions)은 순위·점수를 보는 용도로 남아 있다. */
  { to: '/draw',        label: 'PICK', icon: TargetIcon, end: false },
  { to: '/ranking',     label: 'RANK', icon: TrophyIcon, end: false },
  { to: '/teams',       label: 'TEAM', icon: ShieldIcon, end: false },
  // { to: '/shop', label: 'SHOP', icon: BagIcon, end: false },
];

export default function BottomTabBar() {
  return (
    /* 바는 화면 전체 폭으로 깔고 탭만 가운데 480px에 모은다.
       예전처럼 480px 바가 가운데 떠 있으면, 대진표처럼 넓은 화면에서
       브라켓 한복판을 흰 섬이 가려 내용이 잘린 것처럼 보인다. */
    <nav
      /* 모달·바텀시트(z-50 이상)가 항상 탭바 위에 오도록 한 단 아래에 둔다.
         같은 z-50이면 탭바가 시트 하단 버튼을 가려 잘린 것처럼 보였다. */
      className="fixed bottom-0 left-0 right-0 z-40 bg-paper"
      style={{ borderTop: '1.5px solid #111111' }}
    >
      <div className="mx-auto w-full max-w-mobile flex" style={{ height: 60 }}>
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold tracking-[0.2em] transition-colors
               ${isActive ? 'text-ink' : 'text-ink-400'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon active={isActive} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function ic(active) {
  return active ? '#111111' : '#999999';
}

function HomeIcon({ active }) {
  const c = ic(active);
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1v-9.5z"
        stroke={c} strokeWidth="1.8" fill="none" strokeLinejoin="round" />
      <path d="M9 21V12h6v9" stroke={c} strokeWidth="1.8" />
    </svg>
  );
}
/* 소식 피드 — 카드 쌓인 모양 */
function FeedIcon({ active }) {
  const c = ic(active);
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="11" rx="2" stroke={c} strokeWidth="1.8" />
      <path d="M7 19h10" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 8.5h7M7 11.5h4" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* 토너먼트 대진 괄호 모양 */
function DrawIcon({ active }) {
  const c = ic(active);
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 5h4a2 2 0 012 2v10a2 2 0 002 2h4"
        stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 19h4a2 2 0 002-2"
        stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 12h6" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="19" cy="19" r="1.6" fill={c} />
    </svg>
  );
}
function TargetIcon({ active }) {
  const c = ic(active);
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9"   stroke={c} strokeWidth="1.8" />
      <circle cx="12" cy="12" r="5"   stroke={c} strokeWidth="1.8" />
      <circle cx="12" cy="12" r="1.8" fill={c} />
    </svg>
  );
}
function TrophyIcon({ active }) {
  const c = ic(active);
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M6 2h12v7a6 6 0 01-12 0V2z"
        stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill="none" />
      <path d="M6 5H3.5A1.5 1.5 0 002 6.5C2 8.43 3.57 10 5.5 10H6"
        stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18 5h2.5A1.5 1.5 0 0122 6.5C22 8.43 20.43 10 18.5 10H18"
        stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 14v4M8 21h8"
        stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 14h6" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function ShieldIcon({ active }) {
  const c = ic(active);
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L4 5v6c0 5.25 3.5 9.74 8 11 4.5-1.26 8-5.75 8-11V5L12 2z"
        stroke={c} strokeWidth="1.8" fill="none" strokeLinejoin="round" />
    </svg>
  );
}
function BagIcon({ active }) {
  const c = ic(active);
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="8" width="18" height="13" rx="2"
        stroke={c} strokeWidth="1.8" fill="none" />
      <path d="M9 8V6a3 3 0 016 0v2"
        stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
