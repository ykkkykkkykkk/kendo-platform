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
      <div className="absolute inset-0 bg-black/40" />

      <motion.div
        className="relative w-full max-w-mobile bg-paper rounded-t-2xl px-6 pt-5 pb-10"
        style={{ borderTop: '1.5px solid #111111' }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
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
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-1">PLAYER LOGIN</p>
          <h2 className="text-ink font-bold text-lg tracking-tight">선수 로그인</h2>
          <p className="text-ink-400 text-sm mt-1">관리자로부터 받은 아이디/비밀번호로 로그인하세요</p>
        </div>

        {/* 입력 필드 */}
        <div className="space-y-3 mb-5">
          <div className="group">
            <label className="text-xs font-medium mb-1 block text-ink-400
                              group-focus-within:text-ink transition-colors">
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
              className="w-full border border-ink-200 bg-paper px-4 py-3 text-sm text-ink
                         placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors"
            />
          </div>
          <div className="group">
            <label className="text-xs font-medium mb-1 block text-ink-400
                              group-focus-within:text-ink transition-colors">
              비밀번호
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="비밀번호 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full border border-ink-200 bg-paper px-4 py-3 text-sm text-ink
                           placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-ink text-xs text-center mb-3 font-semibold">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="pressable w-full bg-lime hover:bg-lime-dark text-ink font-medium py-3.5 rounded-full
                     text-sm disabled:opacity-60 mb-4"
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>

        {/* 팬 로그인으로 전환 */}
        <p className="text-center text-ink-400 text-xs">
          선수가 아니신가요?{' '}
          <button
            onClick={onSwitchToFan}
            className="text-ink font-semibold underline underline-offset-2"
          >
            팬 가입하기
          </button>
        </p>
      </motion.div>
    </motion.div>
  );
}
