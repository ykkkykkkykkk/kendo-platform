import { useState } from 'react';

export default function AdminLogin({ onLogin }) {
  const [token,   setToken]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-admin-token': token.trim() },
      });
      if (res.ok) {
        onLogin(token.trim());
      } else {
        setError('토큰이 올바르지 않습니다.');
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
          <p className="text-ink-400 text-sm mt-1">ADMIN TOKEN을 입력하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3" style={{ borderTop: '1.5px solid #111111', paddingTop: 24 }}>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Admin Token"
            className="w-full border border-ink-200 px-4 py-3 text-sm text-ink
                       placeholder:text-ink-400/60 focus:outline-none focus:border-ink font-mono transition-colors"
            autoFocus
          />
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
