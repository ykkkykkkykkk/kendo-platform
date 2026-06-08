import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, LogOut, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFetch } from '../hooks/useFetch.js';
import { api, authPost } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { ScrollReveal } from '../components/ScrollReveal.jsx';
import PlayerAvatar from '../components/PlayerAvatar.jsx';
import DojoChangeModal from '../components/DojoChangeModal.jsx';
import NickLoginModal from '../components/NickLoginModal.jsx';
import PlayerLoginModal from '../components/PlayerLoginModal.jsx';

/* ── 닉네임 변경 모달 ── */
function NicknameModal({ current, onClose, onSaved }) {
  const { showToast } = useToast();
  const [value,   setValue]   = useState(current ?? '');
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!value.trim() || value.trim() === current) { onClose(); return; }
    setLoading(true);
    try {
      const res  = await fetch('/api/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('kendo_token')}` },
        body: JSON.stringify({ nickname: value.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('닉네임이 변경됐습니다', 'success');
      onSaved(data.nickname);
      onClose();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/75" />
      <motion.div className="relative w-full max-w-mobile bg-[#111] rounded-t-2xl border-t border-white/10 p-6 pb-10"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}>
        <p className="text-orange-500 text-[10px] font-semibold tracking-widest uppercase mb-1">NICKNAME</p>
        <h3 className="text-white font-bold text-lg mb-5">닉네임 변경</h3>
        <input
          type="text" maxLength={10} value={value}
          onChange={e => setValue(e.target.value)}
          className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 mb-4"
        />
        <button onClick={save} disabled={loading || !value.trim()}
          className="w-full bg-orange-500 text-black font-bold py-3.5 rounded-xl text-sm disabled:opacity-50">
          {loading ? '저장 중...' : '변경하기'}
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ── 로그아웃 확인 모달 ── */
function LogoutModal({ onClose, onConfirm }) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/75" />
      <motion.div className="relative w-full max-w-sm bg-[#111] rounded-2xl border border-white/10 p-6"
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-bold text-lg mb-2">로그아웃</h3>
        <p className="text-white/50 text-sm mb-6">정말 로그아웃할까요?</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-white/10 rounded-xl text-white text-sm font-semibold">취소</button>
          <button onClick={onConfirm} className="flex-1 py-3 bg-orange-500 rounded-xl text-black text-sm font-bold">로그아웃</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── 회원 탈퇴 확인 모달 ── */
function WithdrawModal({ nickname, onClose, onConfirm }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const match = input.trim() === nickname;

  const confirm = async () => {
    if (!match) return;
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/75" />
      <motion.div className="relative w-full max-w-sm bg-[#111] rounded-2xl border border-white/10 p-6"
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-bold text-lg mb-1">회원 탈퇴</h3>
        <p className="text-white/50 text-sm mb-1">탈퇴 시 모든 기록(픽, 응원, 점수)이 삭제됩니다.</p>
        <p className="text-white/50 text-sm mb-4">
          확인을 위해 닉네임 <span className="text-orange-400 font-semibold">{nickname}</span>을 입력해주세요.
        </p>
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          placeholder="닉네임 입력"
          className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500 mb-4" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-white/10 rounded-xl text-white text-sm font-semibold">취소</button>
          <button onClick={confirm} disabled={!match || loading}
            className="flex-1 py-3 bg-red-500 rounded-xl text-white text-sm font-bold disabled:opacity-40">
            {loading ? '처리 중...' : '탈퇴'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── 목록 아이템 ── */
function Row({ label, value, onClick, danger, disabled, sub }) {
  return (
    <button
      className={`flex items-center justify-between px-5 py-4 w-full text-left transition-colors
        ${disabled ? 'cursor-default' : 'active:bg-white/5 cursor-pointer'}
        ${danger ? 'text-red-400' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <div>
        <p className={`text-sm ${danger ? 'text-red-400' : 'text-white/80'}`}>{label}</p>
        {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-sm text-white/40">{value}</span>}
        {!disabled && <ChevronRight size={15} className="text-white/20" />}
      </div>
    </button>
  );
}

function Section({ label, children, delay = 0 }) {
  return (
    <ScrollReveal delay={delay}>
      <div className="mb-8">
        <p className="text-[10px] font-semibold tracking-widest text-orange-500 uppercase px-5 mb-1">{label}</p>
        <div className="border-t border-b border-black-700 divide-y divide-black-700">
          {children}
        </div>
      </div>
    </ScrollReveal>
  );
}

/* ── 비로그인 가드 ── */
function LoginGuard({ onClose }) {
  const [mode, setMode] = useState('fan');
  return (
    <AnimatePresence>
      {mode === 'fan' ? (
        <NickLoginModal
          key="fan"
          onClose={onClose}
          onSwitchToPlayer={() => setMode('player')}
        />
      ) : (
        <PlayerLoginModal
          key="player"
          onClose={onClose}
          onSwitchToFan={() => setMode('fan')}
        />
      )}
    </AnimatePresence>
  );
}

/* ── 메인 ── */
export default function MyPage() {
  const navigate       = useNavigate();
  const { user, logout } = useAuth();
  const { showToast }  = useToast();
  const { data, loading, refetch } = useFetch(api.me);
  const { data: follows } = useFetch(api.myFollows);

  const [modal, setModal]       = useState(null); // 'nickname'|'logout'|'withdraw'|'dojo'
  const [nickname, setNickname] = useState(null);

  const displayNickname = nickname ?? data?.nickname ?? user?.nickname ?? '';

  const handleLogout  = () => { logout(); navigate('/'); };
  const handleWithdraw = async () => {
    try {
      const res = await authPost('/me/withdraw', {});
      if (!res.ok) throw new Error();
      logout();
      navigate('/');
      showToast('탈퇴가 완료됐습니다.', 'success');
    } catch { showToast('탈퇴 처리 중 오류가 발생했습니다.', 'error'); }
  };

  /* 비로그인 → 로그인 모달 */
  if (!user) {
    return (
      <main className="page-body bg-[#050505] min-h-screen">
        <LoginGuard onClose={() => navigate(-1)} />
      </main>
    );
  }

  if (loading) return (
    <main className="page-body bg-[#050505] min-h-screen">
      <header className="px-5 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white/60"><ChevronLeft size={22} /></button>
        <h1 className="text-white font-bold text-lg">마이페이지</h1>
      </header>
      <div className="flex justify-center pt-20">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </main>
  );

  const followList = Array.isArray(follows) ? follows : [];

  return (
    <main className="page-body bg-[#050505] min-h-screen">

      {/* 헤더 */}
      <header className="px-5 pt-12 pb-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-white/60 active:text-white">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-white font-bold text-base">마이페이지</h1>
        <div className="w-6" />
      </header>

      {/* ── 프로필 카드 ── */}
      <ScrollReveal>
        <div className="px-5 py-6 flex items-center gap-4 border-b border-black-700">
          {/* 이니셜 아바타 */}
          <div className="w-[60px] h-[60px] rounded-full bg-black-900 border-2 border-orange-500/40
                          flex items-center justify-center flex-none">
            <span className="text-orange-500 font-black text-2xl leading-none">
              {displayNickname[0] ?? '?'}
            </span>
          </div>

          {/* 정보 */}
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-black text-xl truncate leading-tight">{displayNickname}</h2>
            <p className="text-white/40 text-xs mt-1">
              {data?.dojo_name ?? data?.home_dojo ?? '소속 도장 없음'} · 회원
            </p>
            <p className="text-white/50 text-xs mt-1">
              픽 {data?.pick_count ?? 0}회
              {data?.hit_rate != null ? ` · 적중률 ${data.hit_rate}%` : ''}
            </p>
            <p className="text-orange-500 text-sm font-bold mt-1">
              {(data?.season_score ?? 0).toLocaleString()}점 / 시즌 누적
            </p>
          </div>
        </div>
      </ScrollReveal>

      {/* ── MY PLAYERS ── */}
      <ScrollReveal delay={0.05}>
        <div className="mb-8 mt-6">
          <div className="flex items-center justify-between px-5 mb-1">
            <p className="text-[10px] font-semibold tracking-widest text-orange-500 uppercase">MY PLAYERS</p>
            {followList.length > 0 && (
              <Link to="/me/follows" className="text-white/30 text-xs">전체 보기 ›</Link>
            )}
          </div>
          <p className="text-white/25 text-xs px-5 mb-2">응원 중 {followList.length}명</p>

          <div className="border-t border-b border-black-700 divide-y divide-black-700">
            {followList.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-white/40 text-sm">아직 응원 중인 선수가 없어요</p>
                <p className="text-white/25 text-xs mt-1 mb-5">팬 등록하고 선수를 응원해보세요</p>
                <Link to="/teams"
                  className="inline-block px-5 py-2.5 bg-orange-500 text-black text-xs font-bold rounded-full">
                  선수 찾기 →
                </Link>
              </div>
            ) : followList.slice(0, 5).map((p) => (
              <Link key={p.id} to={`/players/${p.slug}`}
                className="flex items-center gap-3 px-5 py-3.5 active:bg-white/5">
                <PlayerAvatar slug={p.slug} name={p.name} color={p.color_primary}
                  size={36} profileImageUrl={p.profile_image_url} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{p.name}</p>
                  <p className="text-white/35 text-xs">{p.team_name}{p.dan_grade ? ` · ${p.dan_grade}단` : ''}</p>
                </div>
                <ChevronRight size={15} className="text-white/20 flex-none" />
              </Link>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* ── NICKNAME ── */}
      <Section label="NICKNAME" delay={0.08}>
        <Row label="닉네임" value={displayNickname} onClick={() => setModal('nickname')} />
        <Row label="휴대폰 끝 4자리" value="****" disabled />
      </Section>

      {/* ── DOJO ── */}
      <Section label="DOJO" delay={0.1}>
        {data?.dojo_name ? (
          <>
            <Row label="소속 도장" value={data.dojo_name} onClick={() => navigate('/ranking?tab=dojo')} />
            <Row label="도장 변경 요청" onClick={() => setModal('dojo')}
              sub={data.dojo_change_requested ? '검토 중' : undefined} />
          </>
        ) : (
          <Row label="소속 도장 없음" value="가입하기" onClick={() => setModal('dojo')} />
        )}
      </Section>

      {/* ── ACTIVITY ── */}
      <Section label="ACTIVITY" delay={0.12}>
        <Row label="나의 픽 기록" value={`${data?.pick_count ?? 0}회`} onClick={() => navigate('/me/picks')} />
        <Row label="시즌 점수" value={`${(data?.season_score ?? 0).toLocaleString()}점`}
          sub={data?.season?.name} onClick={() => navigate('/ranking')} />
      </Section>

      {/* ── SETTINGS ── */}
      <Section label="SETTINGS" delay={0.14}>
        <Row label="알림 설정" value="곧 공개" disabled />
        <Row label="이용 약관" onClick={() => {}} />
        <Row label="오픈소스 라이선스" onClick={() => {}} />
      </Section>

      {/* 로그아웃 / 탈퇴 */}
      <div className="px-5 pb-14 flex flex-col items-center gap-4">
        <button onClick={() => setModal('logout')}
          className="flex items-center gap-1.5 text-white/40 text-sm active:text-white/70 transition-colors">
          <LogOut size={14} /> 로그아웃
        </button>
        <button onClick={() => setModal('withdraw')}
          className="flex items-center gap-1.5 text-white/20 text-xs active:text-red-400 transition-colors">
          <Trash2 size={12} /> 회원 탈퇴
        </button>
      </div>

      {/* ── 모달들 ── */}
      <AnimatePresence>
        {modal === 'nickname' && (
          <NicknameModal key="nick" current={displayNickname}
            onClose={() => setModal(null)}
            onSaved={(n) => { setNickname(n); refetch(); }} />
        )}
        {modal === 'logout' && (
          <LogoutModal key="logout"
            onClose={() => setModal(null)}
            onConfirm={handleLogout} />
        )}
        {modal === 'withdraw' && (
          <WithdrawModal key="withdraw" nickname={displayNickname}
            onClose={() => setModal(null)}
            onConfirm={handleWithdraw} />
        )}
        {modal === 'dojo' && (
          <DojoChangeModal key="dojo" currentDojo={data?.dojo_name}
            onClose={() => setModal(null)}
            onSuccess={refetch} />
        )}
      </AnimatePresence>
    </main>
  );
}
