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
      <div className="absolute inset-0 bg-black/40" />
      <motion.div className="relative w-full max-w-mobile bg-paper rounded-t-2xl p-6 pb-10"
        style={{ borderTop: '1.5px solid #111111' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}>
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-1">NICKNAME</p>
        <h3 className="text-ink font-bold text-lg mb-5 tracking-tight">닉네임 변경</h3>
        <input
          type="text" maxLength={10} value={value}
          onChange={e => setValue(e.target.value)}
          className="w-full bg-paper border border-ink-200 px-4 py-3 text-ink text-sm focus:outline-none focus:border-ink mb-4"
        />
        <button onClick={save} disabled={loading || !value.trim()}
          className="w-full bg-lime hover:bg-lime-dark text-ink font-medium py-3.5 rounded-full text-sm disabled:opacity-50 pressable">
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
      <div className="absolute inset-0 bg-black/40" />
      <motion.div className="relative w-full max-w-sm bg-paper border border-ink p-6"
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}>
        <h3 className="text-ink font-bold text-lg mb-2 tracking-tight">로그아웃</h3>
        <p className="text-ink-400 text-sm mb-6">정말 로그아웃할까요?</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-ink-200 rounded-full text-ink-600 text-sm font-medium pressable">취소</button>
          <button onClick={onConfirm} className="flex-1 py-3 bg-lime hover:bg-lime-dark rounded-full text-ink text-sm font-medium pressable">로그아웃</button>
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
      <div className="absolute inset-0 bg-black/40" />
      <motion.div className="relative w-full max-w-sm bg-paper border border-ink p-6"
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}>
        <h3 className="text-ink font-bold text-lg mb-1 tracking-tight">회원 탈퇴</h3>
        <p className="text-ink-400 text-sm mb-1">탈퇴 시 모든 기록(픽, 응원, 점수)이 삭제됩니다.</p>
        <p className="text-ink-400 text-sm mb-4">
          확인을 위해 닉네임 <span className="text-ink font-semibold bg-lime px-1">{nickname}</span>을 입력해주세요.
        </p>
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          placeholder="닉네임 입력"
          className="w-full bg-paper border border-ink-200 px-4 py-3 text-ink text-sm focus:outline-none focus:border-ink mb-4" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-ink-200 rounded-full text-ink-600 text-sm font-medium pressable">취소</button>
          <button onClick={confirm} disabled={!match || loading}
            className="flex-1 py-3 bg-ink rounded-full text-white text-sm font-medium disabled:opacity-40 pressable">
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
      className={`flex items-center justify-between py-4 w-full text-left transition-colors
        ${disabled ? 'cursor-default' : 'pressable cursor-pointer'}`}
      onClick={onClick}
      disabled={disabled}
    >
      <div>
        <p className={`text-sm ${danger ? 'text-ink font-semibold' : 'text-ink'}`}>{label}</p>
        {sub && <p className="text-xs text-ink-400 mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-sm text-ink-400">{value}</span>}
        {!disabled && <ChevronRight size={15} className="text-ink-400" />}
      </div>
    </button>
  );
}

function Section({ label, children, delay = 0 }) {
  return (
    <ScrollReveal delay={delay}>
      <div className="mb-8 px-5">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-2">{label}</p>
        <div className="divide-y divide-ink-200" style={{ borderTop: '1.5px solid #111111', borderBottom: '1px solid #E5E5E5' }}>
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
      <main className="page-body bg-paper min-h-screen">
        <LoginGuard onClose={() => navigate(-1)} />
      </main>
    );
  }

  if (loading) return (
    <main className="page-body bg-paper min-h-screen">
      <header className="px-5 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-ink"><ChevronLeft size={22} /></button>
        <h1 className="text-ink font-bold text-lg tracking-tight">마이페이지</h1>
      </header>
      <div className="flex justify-center pt-20">
        <div className="w-8 h-8 border-2 border-ink border-t-transparent rounded-full animate-spin" />
      </div>
    </main>
  );

  const followList = Array.isArray(follows) ? follows : [];

  return (
    <main className="page-body bg-paper min-h-screen">

      {/* 헤더 */}
      <header className="px-5 pt-12 pb-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-ink-200 pressable"
        >
          <ChevronLeft size={18} className="text-ink" />
        </button>
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">MY PAGE</p>
        <div className="w-9" />
      </header>

      {/* ── 프로필 헤드라인 ── */}
      <ScrollReveal>
        <div className="px-5 pt-2 pb-6">
          <h2 className="text-4xl font-bold text-ink tracking-[-0.04em] leading-[0.95] truncate">
            {displayNickname}
          </h2>
          <p className="text-ink-400 text-xs mt-2">
            {data?.dojo_name ?? data?.home_dojo ?? '소속 도장 없음'} · 회원
            {data?.pick_count != null && ` · 픽 ${data.pick_count}회`}
            {data?.hit_rate != null ? ` · 적중률 ${data.hit_rate}%` : ''}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <p className="text-ink text-sm font-bold tabular-nums">
              <span className="bg-lime px-1">{(data?.season_score ?? 0).toLocaleString()}점</span> / 시즌 누적
            </p>
            <span className="flex-1 border-t border-ink" />
          </div>
        </div>
      </ScrollReveal>

      {/* ── MY PLAYERS ── */}
      <ScrollReveal delay={0.05}>
        <div className="mb-8 px-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">
              MY PLAYERS — {followList.length}
            </p>
            {followList.length > 0 && (
              <Link to="/me/follows" className="text-ink text-xs font-semibold">전체 →</Link>
            )}
          </div>

          <div style={{ borderTop: '1.5px solid #111111' }}>
            {followList.length === 0 ? (
              <div className="py-10 text-center border-b border-ink-200">
                <p className="text-ink-600 text-sm">아직 응원 중인 선수가 없어요</p>
                <p className="text-ink-400 text-xs mt-1 mb-5">팬 등록하고 선수를 응원해보세요</p>
                <Link to="/teams"
                  className="inline-block px-5 py-2.5 bg-lime hover:bg-lime-dark text-ink text-xs font-medium rounded-full pressable">
                  선수 찾기 →
                </Link>
              </div>
            ) : followList.slice(0, 5).map((p, i) => (
              <Link key={p.id} to={`/players/${p.slug}`}
                className={`flex items-center gap-3 py-3.5 pressable ${i > 0 ? 'border-t border-ink-200' : ''}`}>
                <PlayerAvatar slug={p.slug} name={p.name} color={p.color_primary}
                  size={36} profileImageUrl={p.profile_image_url} />
                <div className="flex-1 min-w-0">
                  <p className="text-ink text-sm font-bold truncate">{p.name}</p>
                  <p className="text-ink-400 text-xs mt-0.5">{p.team_name}{p.dan_grade ? ` · ${p.dan_grade}단` : ''}</p>
                </div>
                <ChevronRight size={15} className="text-ink-400 flex-none" />
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
        <Row label="나의 픽 기록" value={`${data?.pick_count ?? 0}회`} disabled sub="상세 기록은 곧 공개" />
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
          className="flex items-center gap-1.5 text-ink-600 text-sm hover:text-ink transition-colors">
          <LogOut size={14} /> 로그아웃
        </button>
        <button onClick={() => setModal('withdraw')}
          className="flex items-center gap-1.5 text-ink-400 text-xs hover:text-ink transition-colors">
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
