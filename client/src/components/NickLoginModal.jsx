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

  const handleSubmit = async () => {
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
        body:    JSON.stringify({ nickname: nickname.trim(), phone, home_dojo: dojo.trim() || null }),
      });
      const data = await res.json();
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

      showToast(`환영합니다, ${nickname.trim()}님! 🎋`, 'success');
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
      <div className="absolute inset-0 bg-black/70" />

      <motion.div
        className="relative w-full max-w-mobile bg-black-800 rounded-t-2xl px-6 pt-5 pb-10 border-t border-black-700"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 핸들 + X */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="w-10 h-1 bg-black-700 rounded-full" />
          <button
            onClick={onClose}
            className="absolute right-0 w-8 h-8 rounded-full bg-black-700 flex items-center
                       justify-center text-white/50 active:bg-black-900"
          >
            <X size={15} />
          </button>
        </div>

        {/* 로고 + 타이틀 */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 overflow-hidden">
            <img src="/logo.svg" alt="마이너스타" className="w-full h-full" />
          </div>
          <h2 className="text-white font-black text-lg">마이너스타 시작하기</h2>
          <p className="text-white/40 text-sm mt-1">닉네임과 휴대폰 끝 4자리로 시작하세요</p>
        </div>

        {/* 입력 필드 */}
        <div className="space-y-3 mb-5">
          <div className="group">
            <label className="text-xs font-medium mb-1 block text-white/40 group-focus-within:text-orange-500 transition-colors">
              닉네임
            </label>
            <input
              type="text" maxLength={10} placeholder="최대 10자"
              value={nickname} onChange={(e) => setNickname(e.target.value)}
              className="w-full border border-black-700 bg-black-900 rounded-xl px-4 py-3 text-sm text-white
                         placeholder:text-white/20 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
          <div className="group">
            <label className="text-xs font-medium mb-1 block text-white/40 group-focus-within:text-orange-500 transition-colors">
              휴대폰 끝 4자리
            </label>
            <input
              type="tel" inputMode="numeric" maxLength={4} placeholder="0000"
              value={phone} onChange={handlePhoneChange}
              className="w-full border border-black-700 bg-black-900 rounded-xl px-4 py-3 text-sm text-white
                         placeholder:text-white/20 focus:outline-none focus:border-orange-500 transition-colors tracking-widest"
            />
          </div>

          {/* 도장 자동완성 */}
          <div className="group relative">
            <label className="text-xs font-medium mb-1 block text-white/40 group-focus-within:text-orange-500 transition-colors">
              소속 도장 <span className="text-white/25">(선택)</span>
            </label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
              <input
                type="text" maxLength={30} placeholder="도장 검색 또는 직접 입력"
                value={dojo}
                onChange={(e) => { setDojo(e.target.value); setDojoId(null); }}
                className="w-full border border-black-700 bg-black-900 rounded-xl pl-9 pr-4 py-3 text-sm text-white
                           placeholder:text-white/20 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <AnimatePresence>
              {suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute z-10 top-full left-0 right-0 mt-1 bg-black-700 border border-black-600 rounded-xl overflow-hidden shadow-xl"
                >
                  {suggestions.map((d) => (
                    <button
                      key={d.id}
                      onMouseDown={() => selectDojo(d.name)}
                      className="w-full px-4 py-2.5 text-left text-sm text-white/80 hover:bg-black-600 flex items-center justify-between"
                    >
                      <span>{d.name}</span>
                      <span className="text-white/30 text-xs">{d.member_count}명</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {error && <p className="text-red-400 text-xs text-center mb-3">{error}</p>}

        <button
          onClick={handleSubmit} disabled={loading}
          className="pressable w-full bg-orange-500 text-black font-bold py-3.5 rounded-xl text-sm disabled:opacity-60 mb-4"
        >
          {loading ? '처리 중...' : '시작하기'}
        </button>

        <p className="text-center text-white/30 text-xs">
          선수이신가요?{' '}
          <button onClick={onSwitchToPlayer} className="text-orange-500 font-semibold">
            선수 로그인
          </button>
        </p>
      </motion.div>
    </motion.div>
  );
}
