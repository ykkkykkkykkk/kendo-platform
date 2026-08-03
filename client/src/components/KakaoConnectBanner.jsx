import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { initKakao, kakaoConfigured } from '../utils/kakaoSdk.js';
import { KAKAO_REDIRECT_URI, RETURN_KEY } from './KakaoLoginModal.jsx';
import { CONNECT_FLAG } from './KakaoConnectRow.jsx';

const SNOOZE_KEY = 'kakao_connect_snooze';
const SNOOZE_DAYS = 3;

/**
 * 아직 카카오를 연결하지 않은 로그인 회원에게 띄우는 안내 배너.
 *
 * 로그인 토큰이 1년짜리라 기존 회원은 로그인 화면을 볼 일이 없다. 그래서 가만히 두면
 * 아무도 연결하지 않는다. 홈에서 한 번 눌러 끝낼 수 있게 한다.
 *
 * 연결하면 사라진다. '나중에'를 누르면 사흘 뒤에 다시 뜬다 —
 * 매번 보이면 성가시고, 영영 안 보이면 전환이 안 끝난다.
 */
export default function KakaoConnectBanner() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !kakaoConfigured()) return;
    const until = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
    if (Date.now() < until) return;

    let alive = true;
    api.kakaoStatus()
      .then((r) => { if (alive && r && !r.connected) setShow(true); })
      .catch(() => { /* 확인 실패하면 굳이 띄우지 않는다 */ });
    return () => { alive = false; };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!show) return null;

  const snooze = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86400000));
    setShow(false);
  };

  const connect = async () => {
    setBusy(true);
    const ok = await initKakao();
    if (!ok) { showToast('카카오를 불러오지 못했습니다.', 'error'); setBusy(false); return; }
    sessionStorage.setItem(CONNECT_FLAG, '1');
    sessionStorage.setItem(RETURN_KEY, window.location.pathname);
    window.Kakao.Auth.authorize({ redirectUri: KAKAO_REDIRECT_URI, scope: 'profile_nickname' });
  };

  return (
    <section className="px-5 mt-4">
      <div className="border border-ink px-4 py-3.5 rounded-2xl">
        <div className="flex items-start gap-2">
          <p className="text-ink text-[13px] font-bold flex-1 leading-snug">
            카카오 연결하고 계정을 지켜주세요
          </p>
          <button onClick={snooze} aria-label="나중에" className="text-ink-400 pressable flex-none -mt-0.5">
            <X size={15} />
          </button>
        </div>
        <p className="text-ink-400 text-[11px] mt-1 leading-[1.55]">
          앞으로는 카카오로 로그인합니다. 지금 연결해두시면
          픽·팔로우가 그대로 유지되고, 기기를 바꿔도 그대로 들어올 수 있어요.
        </p>
        <button
          onClick={connect}
          disabled={busy}
          className="w-full mt-3 bg-[#FEE500] text-[#3C1E1E] font-bold text-[13px]
                     py-2.5 rounded-full pressable disabled:opacity-60"
        >
          {busy ? '연결 중…' : '카카오 연결하기'}
        </button>
      </div>
    </section>
  );
}
