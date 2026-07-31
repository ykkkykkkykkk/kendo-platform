import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { haptic } from '../utils/haptic.js';
import { api } from '../api.js';

export default function NickLoginModal({ onClose, onSwitchToPlayer }) {
  const { login }     = useAuth();
  const { showToast } = useToast();
  const [nickname,    setNickname]    = useState('');
  const [phone,       setPhone]       = useState('');
  const [dojo,        setDojo]        = useState('');
  const [dojoId,      setDojoId]      = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [confirmNew,  setConfirmNew]  = useState(null);   // 새 계정 생성 확인 단계
  const debounce = useRef(null);

  useEffect(() => {
    if (dojo.trim().length < 1) { setSuggestions([]); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      const res = await api.dojoSearch(dojo.trim());
      setSuggestions(Array.isArray(res) ? res.slice(0, 5) : []);
    }, 300);
    return () => clearTimeout(debounce.current);
  }, [dojo]);

  const handleSubmit = async (confirmNew = false) => {
    if (!nickname.trim()) { setError('닉네임을 입력해주세요.'); return; }
    if (!/^\d{4}$/.test(phone)) { setError('휴대폰 끝 4자리를 숫자로 입력해주세요.'); return; }

    haptic();
    setLoading(true);
    setError(null);
    try {
      // 1. 회원가입/로그인
      const res  = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          nickname: nickname.trim(), phone, home_dojo: dojo.trim() || null,
          confirm_new: confirmNew || undefined,
        }),
      });
      const data = await res.json();

      // 기존 계정이 없어 새로 만들어야 하는 경우 — 바로 만들지 않고 한 번 확인한다.
      // (닉네임·번호를 한 글자만 잘못 넣어도 기존 계정 대신 새 계정이 생겨버렸다)
      if (res.status === 409 && data.new_account) {
        setConfirmNew({ nickname: data.nickname, suggestions: data.suggestions ?? [] });
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(data.error);

      login(data.token);

      // 2. 도장 가입 (입력한 경우)
      if (dojo.trim()) {
        try {
          await fetch('/api/dojos/join', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.token}` },
            body:    JSON.stringify({ name: dojo.trim() }),
          });
        } catch {}
      }

      showToast(`환영합니다, ${nickname.trim()}님!`, 'success');
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (e) =>
    setPhone(e.target.value.replace(/\D/g, '').slice(0, 4));

  const selectDojo = (name) => {
    setDojo(name);
    setSuggestions([]);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />

      <motion.div
        className="relative w-full max-w-mobile bg-paper rounded-t-2xl px-6 pt-5 pb-10"
        style={{ borderTop: '1.5px solid #111111' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 핸들 + X */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="w-10 h-1 bg-ink-200 rounded-full" />
          <button
            onClick={onClose}
            className="absolute right-0 w-8 h-8 rounded-full border border-ink-200 flex items-center
                       justify-center text-ink-400 pressable"
          >
            <X size={15} />
          </button>
        </div>

        {/* 로고 + 타이틀 */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 overflow-hidden">
            <img src="/logo.svg" alt="마이너스타" className="w-full h-full" />
          </div>
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-1">MINOR—STAR®</p>
          <h2 className="text-ink font-bold text-lg tracking-tight">마이너스타 시작하기</h2>
          <p className="text-ink-400 text-sm mt-1">닉네임과 휴대폰 끝 4자리로 시작하세요</p>
        </div>

        {/* 입력 필드 */}
        <div className="space-y-3 mb-5">
          <div className="group">
            <label className="text-xs font-medium mb-1 block text-ink-400 group-focus-within:text-ink transition-colors">
              닉네임
            </label>
            <input
              type="text" maxLength={10} placeholder="최대 10자"
              value={nickname} onChange={(e) => setNickname(e.target.value)}
              className="w-full border border-ink-200 bg-paper px-4 py-3 text-sm text-ink
                         placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors"
            />
          </div>
          <div className="group">
            <label className="text-xs font-medium mb-1 block text-ink-400 group-focus-within:text-ink transition-colors">
              휴대폰 끝 4자리
            </label>
            <input
              type="tel" inputMode="numeric" maxLength={4} placeholder="0000"
              value={phone} onChange={handlePhoneChange}
              className="w-full border border-ink-200 bg-paper px-4 py-3 text-sm text-ink
                         placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors tracking-widest"
            />
          </div>

          {/* 도장 자동완성 */}
          <div className="group relative">
            <label className="text-xs font-medium mb-1 block text-ink-400 group-focus-within:text-ink transition-colors">
              소속 도장 <span className="text-ink-400/60">(선택)</span>
            </label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text" maxLength={30} placeholder="도장 검색 또는 직접 입력"
                value={dojo}
                onChange={(e) => { setDojo(e.target.value); setDojoId(null); }}
                className="w-full border border-ink-200 bg-paper pl-9 pr-4 py-3 text-sm text-ink
                           placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors"
              />
            </div>
            <AnimatePresence>
              {suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute z-10 top-full left-0 right-0 mt-1 bg-paper border border-ink overflow-hidden shadow-lg"
                >
                  {suggestions.map((d) => (
                    <button
                      key={d.id}
                      onMouseDown={() => selectDojo(d.name)}
                      className="w-full px-4 py-2.5 text-left text-sm text-ink hover:bg-ink-200/30 flex items-center justify-between"
                    >
                      <span>{d.name}</span>
                      <span className="text-ink-400 text-xs">{d.member_count}명</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {error && <p className="text-ink text-xs text-center mb-3 font-semibold">{error}</p>}

        {/* 새 계정 확인 — 오타로 계정이 하나 더 생기는 걸 막는다 */}
        {confirmNew ? (
          <div className="mb-4 border border-ink p-4">
            <p className="text-ink text-sm font-semibold">
              ‘{confirmNew.nickname}’으로 <span className="bg-lime px-1">새 계정</span>을 만들까요?
            </p>
            <p className="text-ink-400 text-xs mt-1.5 leading-relaxed">
              이미 쓰던 계정이 있다면 닉네임과 끝 4자리를 다시 확인해주세요.
              한 글자만 달라도 다른 계정이 되어 픽·팔로우가 따라오지 않습니다.
            </p>

            {confirmNew.suggestions.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] text-ink-400 mb-1.5">혹시 이 계정인가요?</p>
                <div className="flex flex-wrap gap-1.5">
                  {confirmNew.suggestions.map((s) => (
                    <button
                      key={s.nickname}
                      onClick={() => { setNickname(s.nickname); setConfirmNew(null); setError(null); }}
                      className="text-[12px] border border-ink-200 hover:border-ink px-2.5 py-1 transition-colors"
                    >
                      {s.nickname}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setConfirmNew(null); setError(null); }}
                className="pressable flex-1 border border-ink-200 text-ink-600 py-2.5 rounded-full text-sm"
              >
                다시 입력
              </button>
              <button
                onClick={() => { setConfirmNew(null); handleSubmit(true); }}
                disabled={loading}
                className="pressable flex-1 bg-lime hover:bg-lime-dark text-ink font-medium py-2.5 rounded-full text-sm disabled:opacity-60"
              >
                새로 시작
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => handleSubmit(false)} disabled={loading}
            className="pressable w-full bg-lime hover:bg-lime-dark text-ink font-medium py-3.5 rounded-full text-sm disabled:opacity-60 mb-4"
          >
            {loading ? '처리 중...' : '시작하기'}
          </button>
        )}

        <p className="text-center text-ink-400 text-xs">
          선수이신가요?{' '}
          <button onClick={onSwitchToPlayer} className="text-ink font-semibold underline underline-offset-2">
            선수 로그인
          </button>
        </p>
      </motion.div>
    </motion.div>
  );
}
