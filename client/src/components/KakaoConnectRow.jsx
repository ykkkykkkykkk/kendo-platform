import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import { initKakao, kakaoConfigured } from '../utils/kakaoSdk.js';
import { KAKAO_REDIRECT_URI, RETURN_KEY } from './KakaoLoginModal.jsx';

// 로그인 흐름이 아니라 '연결' 흐름으로 돌아왔다는 표시
export const CONNECT_FLAG = 'kakao_connect_mode';

/**
 * 마이페이지의 카카오 연결 줄.
 *
 * 기존 회원은 토큰이 1년짜리라 로그아웃하지 않는 한 로그인 화면을 볼 일이 없다.
 * 그러면 카카오를 연결할 기회가 없어서, 여기서 로그아웃 없이 붙일 수 있게 한다.
 */
export default function KakaoConnectRow() {
  const { showToast } = useToast();
  const [connected, setConnected] = useState(null);   // null = 확인 중
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api.kakaoStatus()
      .then((r) => { if (alive) setConnected(Boolean(r?.connected)); })
      .catch(() => { if (alive) setConnected(false); });
    return () => { alive = false; };
  }, []);

  const start = async () => {
    if (!kakaoConfigured()) { showToast('카카오 로그인이 준비되지 않았습니다.', 'error'); return; }
    setBusy(true);
    const ok = await initKakao();
    if (!ok) { showToast('카카오 SDK를 불러오지 못했습니다.', 'error'); setBusy(false); return; }
    // 돌아왔을 때 로그인이 아니라 연결이라는 걸 알아야 한다
    sessionStorage.setItem(CONNECT_FLAG, '1');
    sessionStorage.setItem(RETURN_KEY, '/me');
    window.Kakao.Auth.authorize({ redirectUri: KAKAO_REDIRECT_URI, scope: 'profile_nickname' });
  };

  if (connected === null) return null;

  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-ink-200">
      <span className="text-ink-400 text-sm flex-none">카카오 연결</span>
      <span className="flex-1" />
      {connected ? (
        <span className="flex items-center gap-1 text-ink text-sm font-medium">
          <Check size={14} /> 연결됨
        </span>
      ) : (
        <button
          onClick={start}
          disabled={busy}
          className="flex items-center gap-1.5 bg-[#FEE500] text-[#3C1E1E] text-xs font-bold
                     px-3 py-1.5 rounded-full pressable disabled:opacity-60"
        >
          {busy ? '연결 중…' : '카카오 연결하기'}
        </button>
      )}
    </div>
  );
}
