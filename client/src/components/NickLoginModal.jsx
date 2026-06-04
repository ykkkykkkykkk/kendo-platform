import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { haptic } from '../utils/haptic.js';

export default function NickLoginModal({ onClose }) {
  const { login }     = useAuth();
  const { showToast } = useToast();
  const [nickname, setNickname] = useState('');
  const [phone,    setPhone]    = useState('');
  const [dojo,     setDojo]     = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const handleSubmit = async () => {
    if (!nickname.trim()) { setError('닉네임을 입력해주세요.'); return; }
    if (!/^\d{4}$/.test(phone)) { setError('휴대폰 끝 4자리를 숫자로 입력해주세요.'); return; }

    haptic();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nickname: nickname.trim(), phone, home_dojo: dojo.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      login(data.token);
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

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70" />

      <motion.div
        className="relative w-full max-w-mobile bg-black-800 rounded-t-2xl px-6 pt-5 pb-10 border-t border-black-700"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
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
          <div className="w-14 h-14 bg-black-700 border border-orange-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-orange-500 font-black text-2xl">검</span>
          </div>
          <h2 className="text-white font-black text-lg">검도 팬덤 시작하기</h2>
          <p className="text-white/40 text-sm mt-1">닉네임과 휴대폰 끝 4자리로 시작하세요</p>
        </div>

        {/* 입력 필드 */}
        <div className="space-y-3 mb-5">
          <div className="group">
            <label className="text-xs font-medium mb-1 block text-white/40
                              group-focus-within:text-orange-500 transition-colors">
              닉네임
            </label>
            <input
              type="text"
              maxLength={10}
              placeholder="최대 10자"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full border border-black-700 bg-black-900 rounded-xl px-4 py-3 text-sm text-white
                         placeholder:text-white/20 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
          <div className="group">
            <label className="text-xs font-medium mb-1 block text-white/40
                              group-focus-within:text-orange-500 transition-colors">
              휴대폰 끝 4자리
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={4}
              placeholder="0000"
              value={phone}
              onChange={handlePhoneChange}
              className="w-full border border-black-700 bg-black-900 rounded-xl px-4 py-3 text-sm text-white
                         placeholder:text-white/20 focus:outline-none focus:border-orange-500 transition-colors tracking-widest"
            />
          </div>
          <div className="group">
            <label className="text-xs font-medium mb-1 block text-white/40
                              group-focus-within:text-orange-500 transition-colors">
              소속 도장 <span className="text-white/25">(선택)</span>
            </label>
            <input
              type="text"
              maxLength={20}
              placeholder="예: 강남검도관"
              value={dojo}
              onChange={(e) => setDojo(e.target.value)}
              className="w-full border border-black-700 bg-black-900 rounded-xl px-4 py-3 text-sm text-white
                         placeholder:text-white/20 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-xs text-center mb-3">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="pressable w-full bg-orange-500 text-black font-bold py-3.5 rounded-xl
                     text-sm disabled:opacity-60"
        >
          {loading ? '처리 중...' : '시작하기'}
        </button>
      </motion.div>
    </motion.div>
  );
}
