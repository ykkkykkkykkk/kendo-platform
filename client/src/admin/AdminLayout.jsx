import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCircle, Shield, Trophy, Dumbbell, Star, MessageCircle, LogOut, BadgeCheck, Home, Mail, MessagesSquare, Bell,
} from 'lucide-react';
import { adminGet } from './adminApi.js';

/* 어드민 API가 실패하면 화면에 알린다.
   예전에는 무슨 오류든 목록이 '데이터 없음'으로만 보여서, 토큰이 풀린 건지
   요청 한도에 걸린 건지 서버가 죽은 건지 화면만 봐서는 알 수 없었다. */
const ERROR_HINT = {
  0:   '서버에 연결하지 못했습니다. 인터넷 연결을 확인해주세요.',
  429: '요청이 너무 많습니다. 1분 뒤에 새로고침해주세요.',
  500: '서버 오류입니다. 잠시 후 다시 시도해주세요.',
  503: '서버가 깨어나는 중입니다. 20초쯤 뒤에 새로고침해주세요.',
};

function ApiErrorBanner() {
  const [err, setErr] = useState(null);
  useEffect(() => {
    const on = (e) => setErr(e.detail);
    window.addEventListener('admin-api-error', on);
    return () => window.removeEventListener('admin-api-error', on);
  }, []);
  if (!err) return null;
  return (
    <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-red-700">
          {err.write ? '요청을 처리하지 못했습니다' : '데이터를 불러오지 못했습니다'}
          {' '}(오류 {err.status || '연결 실패'})
        </p>
        <p className="text-xs text-red-600 mt-0.5">
          {ERROR_HINT[err.status] ?? err.message ?? '잠시 후 다시 시도해주세요.'}
          <span className="text-red-400"> · {err.path}</span>
        </p>
      </div>
      <button onClick={() => setErr(null)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
    </div>
  );
}

const NAV = [
  { to: '/admin',              label: '대시보드',   icon: LayoutDashboard, end: true },
  { to: '/admin/players',      label: '선수 관리',  icon: Users },
  { to: '/admin/users',        label: '회원 관리',  icon: UserCircle },
  { to: '/admin/player-claims',label: '선수 신청',  icon: BadgeCheck },
  { to: '/admin/dojo-requests',label: '도장 요청',  icon: Home },
  { to: '/admin/inquiries',   label: '문의',      icon: Mail },
  { to: '/admin/teams',        label: '팀 관리',    icon: Shield },
  { to: '/admin/tournaments',  label: '대회 관리',  icon: Trophy },
  { to: '/admin/clinics',      label: '클리닉',     icon: Dumbbell },
  { to: '/admin/sponsorships', label: '스폰서',     icon: Star },
  { to: '/admin/questions',    label: 'Q&A',        icon: MessageCircle },
  { to: '/admin/board',        label: '자유게시판', icon: MessagesSquare },
  { to: '/admin/push',         label: '푸시 발송',  icon: Bell },
];

export default function AdminLayout({ children, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  /* 선수 신청은 본인이 기다리고 있는 건이라 쌓여 있으면 바로 보여야 한다.
     화면을 옮길 때마다 다시 세어 승인 직후에도 숫자가 맞는다. */
  const [pendingClaims, setPendingClaims] = useState(0);
  const [pendingDojos,  setPendingDojos]  = useState(0);
  const [pendingInq,    setPendingInq]    = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
  useEffect(() => {
    adminGet('/player-claims?status=pending')
      .then((d) => setPendingClaims(d?.pending_count ?? 0))
      .catch(() => {});
    adminGet('/dojo-change-requests')
      .then((d) => setPendingDojos(Array.isArray(d) ? d.length : 0))
      .catch(() => {});
    // 문의는 답변 안 한 것만 센다
    adminGet('/inquiries?status=pending')
      .then((d) => setPendingInq(Array.isArray(d) ? d.length : 0))
      .catch(() => {});
    // 신고는 쌓이면 바로 봐야 한다. 이미 가려진 것도 해제 판단이 필요하므로 전부 센다.
    adminGet('/board/reports')
      .then((d) => setPendingReports(Array.isArray(d) ? d.length : 0))
      .catch(() => {});
  }, [location.pathname]);

  const badgeOf = (to) =>
    to === '/admin/player-claims' ? pendingClaims
    : to === '/admin/dojo-requests' ? pendingDojos
    : to === '/admin/inquiries' ? pendingInq
    : to === '/admin/board' ? pendingReports
    : 0;

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
              {({ isActive }) => (
                <>
                  <Icon size={16} />
                  {label}
                  {/* 선택된 메뉴는 배경이 라임이라 뱃지도 라임이면 묻힌다 */}
                  {badgeOf(to) > 0 && (
                    <span className={`ml-auto min-w-[20px] px-1.5 py-0.5 rounded-full
                                      text-[11px] font-bold text-center tabular-nums ${
                      isActive ? 'bg-ink text-lime' : 'bg-lime text-ink'
                    }`}>
                      {badgeOf(to)}
                    </span>
                  )}
                </>
              )}
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
        <ApiErrorBanner />
        {children}
      </main>
    </div>
  );
}
