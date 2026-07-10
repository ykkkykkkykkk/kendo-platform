import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Shield, Trophy, Dumbbell, Star, MessageCircle, LogOut,
} from 'lucide-react';

const NAV = [
  { to: '/admin',              label: '대시보드',   icon: LayoutDashboard, end: true },
  { to: '/admin/players',      label: '선수 관리',  icon: Users },
  { to: '/admin/teams',        label: '팀 관리',    icon: Shield },
  { to: '/admin/tournaments',  label: '대회 관리',  icon: Trophy },
  { to: '/admin/clinics',      label: '클리닉',     icon: Dumbbell },
  { to: '/admin/sponsorships', label: '스폰서',     icon: Star },
  { to: '/admin/questions',    label: 'Q&A',        icon: MessageCircle },
];

export default function AdminLayout({ children, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('kendo_admin_token');
    onLogout();
    navigate('/admin');
  };

  return (
    <div className="flex min-h-screen bg-paper">
      {/* 사이드바 — 잉크 블록 */}
      <aside className="w-56 bg-block flex flex-col flex-shrink-0">
        {/* 로고 */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="마이너스타" className="w-8 h-8 rounded-lg" />
            <div>
              <p className="text-white font-bold text-sm leading-tight tracking-tight">
                MINOR—STAR<span className="align-super text-[8px] font-medium">®</span>
              </p>
              <p className="text-white/40 text-[10px] tracking-[0.2em] mt-0.5">ADMIN</p>
            </div>
          </div>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-lime text-ink'
                    : 'text-white/50 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* 로그아웃 */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-full
                       text-white/50 hover:bg-white/5 hover:text-white text-sm transition-colors"
          >
            <LogOut size={16} />
            로그아웃
          </button>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
