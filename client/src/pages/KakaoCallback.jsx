import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import KakaoLoginModal, { RETURN_KEY } from '../components/KakaoLoginModal.jsx';

/**
 * 카카오에서 돌아오는 자리(/oauth/kakao).
 *
 * SDK v2는 팝업 로그인이 없어 authorize()로 페이지를 통째로 넘겼다 받는다.
 * 여기서 ?code=... 를 받아 모달에 넘기면, 모달이 서버에 보내 로그인을 마친다.
 * 로그인이 끝나면 떠나기 전에 보던 화면으로 돌려보낸다.
 */
export default function KakaoCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const code  = params.get('code');
  const error = params.get('error');
  const [closed, setClosed] = useState(false);

  const goBack = () => {
    const to = sessionStorage.getItem(RETURN_KEY) || '/';
    sessionStorage.removeItem(RETURN_KEY);
    navigate(to, { replace: true });
  };

  // 사용자가 카카오 동의 화면에서 취소했거나 코드가 없으면 되돌린다
  useEffect(() => { if (!code) goBack(); }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!code) return null;

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-6">
      <p className="text-ink-400 text-sm">
        {error ? '로그인이 취소되었습니다.' : '로그인 중이에요…'}
      </p>
      {!closed && (
        <KakaoLoginModal
          resumeCode={code}
          onClose={() => { setClosed(true); goBack(); }}
        />
      )}
    </main>
  );
}
