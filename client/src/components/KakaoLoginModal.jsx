import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function KakaoLoginModal({ onClose }) {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const handleKakaoLogin = () => {
    if (!window.Kakao?.isInitialized()) {
      setError('카카오 SDK가 초기화되지 않았습니다.\n.env에 VITE_KAKAO_APP_KEY를 확인해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    window.Kakao.Auth.login({
      success: async ({ access_token }) => {
        try {
          const res = await fetch('/api/auth/kakao', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ accessToken: access_token }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          login(data.user);
          onClose();
        } catch (e) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      },
      fail: (err) => {
        setError('카카오 로그인에 실패했습니다.');
        setLoading(false);
        console.error(err);
      },
    });
  };

  return (
    /* 딤 배경 */
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      {/* 바텀 시트 */}
      <div
        className="w-full max-w-mobile bg-paper rounded-t-2xl px-6 pt-6 pb-10"
        style={{ borderTop: '1.5px solid #111111' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-ink-200 rounded-full mx-auto mb-6" />

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 overflow-hidden">
            <img src="/logo.svg" alt="마이너스타" className="w-full h-full" />
          </div>
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-1">MINOR—STAR®</p>
          <h2 className="text-ink font-bold text-lg tracking-tight">마이너스타 시작하기</h2>
          <p className="text-ink-400 text-sm mt-1">로그인하고 경기 예측에 참여하세요</p>
        </div>

        {error && (
          <p className="text-red-600 text-xs text-center mb-3 whitespace-pre-line">{error}</p>
        )}

        <button
          onClick={handleKakaoLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-[#FEE500] text-[#3C1E1E]
                     font-bold py-3.5 rounded-xl text-sm active:opacity-80 disabled:opacity-60"
        >
          {loading ? (
            <span>로그인 중...</span>
          ) : (
            <>
              <KakaoIcon />
              카카오로 시작하기
            </>
          )}
        </button>

        <button
          onClick={onClose}
          className="w-full mt-3 text-ink-400 text-sm py-2"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path fillRule="evenodd" clipRule="evenodd"
        d="M9 1C4.58 1 1 3.91 1 7.5c0 2.3 1.48 4.32 3.72 5.5L3.9 16.1a.3.3 0 00.45.32L8.1 14.1c.29.03.59.04.9.04 4.42 0 8-2.91 8-6.5S13.42 1 9 1z"
        fill="#3C1E1E"/>
    </svg>
  );
}
