import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { haptic } from '../utils/haptic.js';

export default function PlayerLoginModal({ onClose, onSwitchToFan }) {
  const { login }     = useAuth();
  const { showToast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const handleSubmit = async () => {
    if (!username.trim()) { setError('아이디를 입력해주세요.'); return; }
    if (!password)        { setError('비밀번호를 입력해주세요.'); return; }

    haptic();
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/auth/player-login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      login(data.token);
      showToast(`환영합니다, ${data.user.nickname} 선수님!`, 'success');
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

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
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 overflow-hidden">
            <img src="/logo.svg" alt="마이너스타" className="w-full h-full" />
          </div>
          <h2 className="text-white font-black text-lg">선수 로그인</h2>
          <p className="text-white/40 text-sm mt-1">관리자로부터 받은 아이디/비밀번호로 로그인하세요</p>
        </div>

        {/* 입력 필드 */}
        <div className="space-y-3 mb-5">
          <div className="group">
            <label className="text-xs font-medium mb-1 block text-white/40
                              group-focus-within:text-orange-500 transition-colors">
              아이디
            </label>
            <input
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="아이디 입력"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full border border-black-700 bg-black-900 rounded-xl px-4 py-3 text-sm text-white
                         placeholder:text-white/20 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
          <div className="group">
            <label className="text-xs font-medium mb-1 block text-white/40
                              group-focus-within:text-orange-500 transition-colors">
              비밀번호
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="비밀번호 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full border border-black-700 bg-black-900 rounded-xl px-4 py-3 text-sm text-white
                           placeholder:text-white/20 focus:outline-none focus:border-orange-500 transition-colors pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-xs text-center mb-3">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="pressable w-full bg-orange-500 text-black font-bold py-3.5 rounded-xl
                     text-sm disabled:opacity-60 mb-4"
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>

        {/* 팬 로그인으로 전환 */}
        <p className="text-center text-white/30 text-xs">
          선수가 아니신가요?{' '}
          <button
            onClick={onSwitchToFan}
            className="text-orange-500 font-semibold"
          >
            팬 가입하기
          </button>
        </p>
      </motion.div>
    </motion.div>
  );
}
