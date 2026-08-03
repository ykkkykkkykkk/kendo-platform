import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * 카카오 로그인.
 *
 * 닉네임+휴대폰 끝 4자리 방식은 본인 확인이 안 돼 같은 사람이 계정을 몇 개든 만들 수 있었다.
 * 카카오는 회원 고유번호를 주므로 한 사람당 계정 하나로 묶인다.
 *
 * 화면 흐름
 *   start  카카오로 시작하기
 *   choice 처음 보는 카카오 계정 → 새로 시작할지, 쓰던 계정에 붙일지 고른다
 *   link   쓰던 닉네임 + 끝 4자리를 넣어 예전 계정을 넘겨받는다
 */
export const KAKAO_REDIRECT_URI = `${window.location.origin}/oauth/kakao`;
export const RETURN_KEY = 'kakao_return_to';

export default function KakaoLoginModal({ onClose, resumeCode = null }) {
  const { login } = useAuth();
  const [step,    setStep]    = useState('start');
  const [token,   setToken]   = useState(null);   // 서버가 준 표(ticket). 다음 단계에서 신원 증명에 쓴다
  const [kakaoNick, setKNick] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone,   setPhone]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => { if (step === 'choice') setNickname(kakaoNick); }, [step, kakaoNick]);

  const post = async (path, body) => {
    const res  = await fetch(`/api/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? '요청에 실패했습니다.');
    return data;
  };

  const done = (data) => { login(data.token); onClose(); };

  /* SDK v2에는 팝업 로그인(Auth.login)이 없다. authorize()로 카카오에 다녀오면
     redirectUri에 ?code=... 를 달고 돌아오고, 그 코드를 서버가 토큰으로 바꾼다. */
  const startKakao = () => {
    if (!window.Kakao?.isInitialized?.()) {
      setError('카카오 로그인이 아직 준비되지 않았습니다.\n잠시 후 다시 시도해주세요.');
      return;
    }
    setLoading(true); setError(null);
    // 로그인 마치고 보던 화면으로 돌려보내려고 남겨둔다
    sessionStorage.setItem(RETURN_KEY, window.location.pathname + window.location.search);
    window.Kakao.Auth.authorize({ redirectUri: KAKAO_REDIRECT_URI, scope: 'profile_nickname' });
  };

  /* 카카오에서 돌아왔을 때(=code를 들고 열렸을 때) 이어서 처리한다.
     KakaoCallback이 코드를 넘겨주면 그때부터 '선택' 단계로 들어간다. */
  useEffect(() => {
    if (!resumeCode) return;
    setLoading(true);
    (async () => {
      try {
        const data = await post('kakao/code', { code: resumeCode, redirectUri: KAKAO_REDIRECT_URI });
        if (data.needs_choice) {           // 처음 오신 분 — 새로 만들지 물어본다
          setKNick(data.kakao_nickname ?? '');
          setToken(data.ticket);           // 다음 단계에서 신원을 증명할 표
          setStep('choice');
        } else {
          done(data);                       // 이미 연결된 계정 — 바로 입장
        }
      } catch (e) { setError(e.message); } finally { setLoading(false); }
    })();
  }, [resumeCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const signup = async () => {
    if (!nickname.trim()) { setError('닉네임을 입력해주세요.'); return; }
    setLoading(true); setError(null);
    try { done(await post('kakao/signup', { ticket: token, nickname: nickname.trim() })); }
    catch (e) { setError(e.message); setLoading(false); }
  };

  const linkOld = async () => {
    if (!/^\d{4}$/.test(phone)) { setError('휴대폰 끝 4자리를 숫자로 입력해주세요.'); return; }
    setLoading(true); setError(null);
    try { done(await post('kakao/link', { ticket: token, nickname: nickname.trim(), phone })); }
    catch (e) { setError(e.message); setLoading(false); }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/40 z-[90] flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-mobile bg-paper rounded-t-2xl px-6 pt-5 pb-10"
        style={{ borderTop: '1.5px solid #111111' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="카카오 로그인"
      >
        <div className="flex justify-end">
          <button onClick={onClose} aria-label="닫기" className="text-ink-400 pressable"><X size={18} /></button>
        </div>

        <div className="text-center mb-5 -mt-2">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 overflow-hidden">
            <img src="/logo.svg" alt="마이너스타" className="w-full h-full" />
          </div>
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-1">MINOR—STAR®</p>
          <h2 className="text-ink font-bold text-lg tracking-tight">
            {step === 'link' ? '쓰던 계정 가져오기' : '마이너스타 시작하기'}
          </h2>
          <p className="text-ink-400 text-sm mt-1">
            {step === 'start'  && '카카오로 3초면 시작해요'}
            {step === 'choice' && '처음이신가요?'}
            {step === 'link'   && '전에 쓰시던 닉네임과 번호를 넣어주세요'}
          </p>
        </div>

        {error && <p className="text-red-600 text-xs text-center mb-3 whitespace-pre-line">{error}</p>}

        {step === 'start' && (
          <button
            onClick={startKakao}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 bg-[#FEE500] text-[#3C1E1E]
                       font-bold py-3.5 rounded-xl text-sm pressable disabled:opacity-60"
          >
            {loading ? '연결 중…' : <><KakaoIcon /> 카카오로 시작하기</>}
          </button>
        )}

        {step === 'choice' && (
          <>
            <label className="text-xs font-medium text-ink-600 mb-1 block">닉네임</label>
            <input
              type="text" maxLength={10} value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full border border-ink-200 px-4 py-3 rounded-xl text-sm text-ink
                         outline-none focus:border-ink mb-3"
            />
            <button
              onClick={signup}
              disabled={loading}
              className="w-full bg-lime hover:bg-lime-dark text-ink font-bold py-3.5 rounded-full
                         text-sm pressable disabled:opacity-50"
            >
              {loading ? '만드는 중…' : '새로 시작하기'}
            </button>
            <button
              onClick={() => { setError(null); setPhone(''); setStep('link'); }}
              className="w-full mt-2.5 text-ink-600 text-sm py-2 underline"
            >
              전에 쓰던 계정이 있어요
            </button>
          </>
        )}

        {step === 'link' && (
          <>
            <label className="text-xs font-medium text-ink-600 mb-1 block">쓰시던 닉네임</label>
            <input
              type="text" maxLength={10} value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="예전에 쓰던 닉네임"
              className="w-full border border-ink-200 px-4 py-3 rounded-xl text-sm text-ink
                         outline-none focus:border-ink mb-3 placeholder:text-ink-400/60"
            />
            <label className="text-xs font-medium text-ink-600 mb-1 block">휴대폰 끝 4자리</label>
            <input
              type="tel" inputMode="numeric" maxLength={4} value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter') linkOld(); }}
              placeholder="0000"
              className="w-full border border-ink-200 px-4 py-3 rounded-xl text-sm text-ink
                         outline-none focus:border-ink mb-3 placeholder:text-ink-400/60"
            />
            <button
              onClick={linkOld}
              disabled={loading}
              className="w-full bg-lime hover:bg-lime-dark text-ink font-bold py-3.5 rounded-full
                         text-sm pressable disabled:opacity-50"
            >
              {loading ? '연결 중…' : '내 계정 가져오기'}
            </button>
            <p className="text-ink-400 text-[11px] text-center mt-2.5 leading-[1.5]">
              연결하면 예전 픽·팔로우가 그대로 따라옵니다.<br />
              다음부터는 카카오로만 들어오시면 됩니다.
            </p>
            <button
              onClick={() => { setError(null); setStep('choice'); }}
              className="w-full mt-2 text-ink-400 text-xs py-2"
            >
              뒤로
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd"
        d="M9 1C4.58 1 1 3.91 1 7.5c0 2.3 1.48 4.32 3.72 5.5L3.9 16.1a.3.3 0 00.45.32L8.1 14.1c.29.03.59.04.9.04 4.42 0 8-2.91 8-6.5S13.42 1 9 1z"
        fill="#3C1E1E"/>
    </svg>
  );
}
