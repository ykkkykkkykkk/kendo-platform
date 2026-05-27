import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/',            label: 'HOME', icon: HomeIcon,   end: true  },
  { to: '/predictions', label: 'PICK', icon: TargetIcon, end: false },
  { to: '/ranking',     label: 'RANK', icon: TrophyIcon, end: false },
  { to: '/teams',       label: 'TEAM', icon: ShieldIcon, end: false },
  { to: '/shop',        label: 'SHOP', icon: BagIcon,    end: false },
];

export default function BottomTabBar() {
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile flex z-50
                 bg-black-800 border-t border-orange-500/15"
      style={{ height: 60 }}
    >
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold tracking-wider transition-colors
             ${isActive ? 'text-orange-500' : 'text-ink-400'}`
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

function ic(active) {
  return active ? '#FF8800' : '#666666';
}

function HomeIcon({ active }) {
  const c = ic(active);
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
         style={active ? { filter: 'drop-shadow(0 0 4px #FF880088)' } : undefined}>
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1v-9.5z"
        stroke={c} strokeWidth="1.8" fill="none" strokeLinejoin="round" />
      <path d="M9 21V12h6v9" stroke={c} strokeWidth="1.8" />
    </svg>
  );
}
function TargetIcon({ active }) {
  const c = ic(active);
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
         style={active ? { filter: 'drop-shadow(0 0 4px #FF880088)' } : undefined}>
      <circle cx="12" cy="12" r="9"   stroke={c} strokeWidth="1.8" />
      <circle cx="12" cy="12" r="5"   stroke={c} strokeWidth="1.8" />
      <circle cx="12" cy="12" r="1.8" fill={c} />
    </svg>
  );
}
function TrophyIcon({ active }) {
  const c = ic(active);
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
         style={active ? { filter: 'drop-shadow(0 0 4px #FF880088)' } : undefined}>
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
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
         style={active ? { filter: 'drop-shadow(0 0 4px #FF880088)' } : undefined}>
      <path d="M12 2L4 5v6c0 5.25 3.5 9.74 8 11 4.5-1.26 8-5.75 8-11V5L12 2z"
        stroke={c} strokeWidth="1.8" fill="none" strokeLinejoin="round" />
    </svg>
  );
}
function BagIcon({ active }) {
  const c = ic(active);
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
         style={active ? { filter: 'drop-shadow(0 0 4px #FF880088)' } : undefined}>
      <rect x="3" y="8" width="18" height="13" rx="2"
        stroke={c} strokeWidth="1.8" fill="none" />
      <path d="M9 8V6a3 3 0 016 0v2"
        stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
