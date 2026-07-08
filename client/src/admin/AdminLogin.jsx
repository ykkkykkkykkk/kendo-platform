import { useState } from 'react';

export default function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        onLogin(data.token);
      } else {
        setError(data.error ?? '아이디 또는 비밀번호가 올바르지 않습니다.');
      }
    } catch {
      setError('서버에 연결할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="마이너스타" className="w-14 h-14 rounded-2xl mx-auto mb-4" />
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">MINOR—STAR® ADMIN</p>
          <h1 className="text-2xl font-bold text-ink tracking-[-0.03em] mt-1">관리자 로그인</h1>
          <p className="text-ink-400 text-sm mt-1">아이디와 비밀번호를 입력하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3" style={{ borderTop: '1.5px solid #111111', paddingTop: 24 }}>
          <div>
            <label className="text-xs font-medium text-ink-600 mb-1 block">아이디</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디"
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full border border-ink-200 px-4 py-3 text-sm text-ink
                         placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 mb-1 block">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="w-full border border-ink-200 px-4 py-3 text-sm text-ink
                         placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors"
            />
          </div>
          {error && <p className="text-red-600 text-xs text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-white font-medium py-3 rounded-full text-sm
                       hover:bg-ink/90 disabled:opacity-50 transition-colors"
          >
            {loading ? '확인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
