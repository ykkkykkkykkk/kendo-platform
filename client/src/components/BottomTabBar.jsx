import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/',        label: '홈',  icon: HomeIcon },
  { to: '/players', label: '선수', icon: PersonIcon },
  { to: '/teams',   label: '팀',  icon: ShieldIcon },
  { to: '/shop',    label: '샵',  icon: BagIcon },
];

export default function BottomTabBar() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile
                    bg-white border-t border-gray-100 flex z-50"
         style={{ height: 60 }}>
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors
             ${isActive ? 'text-navy' : 'text-sub'}`
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
    </nav>
  );
}

function HomeIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1v-9.5z"
        stroke={active ? '#0A1F44' : '#5A6478'} strokeWidth="1.8"
        fill={active ? '#0A1F44' : 'none'} strokeLinejoin="round" />
      <path d="M9 21V12h6v9" stroke={active ? 'white' : '#5A6478'} strokeWidth="1.8" />
    </svg>
  );
}
function PersonIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4"
        stroke={active ? '#0A1F44' : '#5A6478'} strokeWidth="1.8"
        fill={active ? '#0A1F44' : 'none'} />
      <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6"
        stroke={active ? '#0A1F44' : '#5A6478'} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function ShieldIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L4 5v6c0 5.25 3.5 9.74 8 11 4.5-1.26 8-5.75 8-11V5L12 2z"
        stroke={active ? '#0A1F44' : '#5A6478'} strokeWidth="1.8"
        fill={active ? '#0A1F44' : 'none'} strokeLinejoin="round" />
    </svg>
  );
}
function BagIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="8" width="18" height="13" rx="2"
        stroke={active ? '#0A1F44' : '#5A6478'} strokeWidth="1.8"
        fill={active ? '#0A1F44' : 'none'} />
      <path d="M9 8V6a3 3 0 016 0v2"
        stroke={active ? '#0A1F44' : '#5A6478'} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
