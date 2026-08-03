/**
 * 카카오 SDK 준비 상태.
 *
 * index.html에서 defer로 받아오므로 앱이 먼저 뜰 수 있다. 그래서 로드를 기다렸다가
 * VITE_KAKAO_APP_KEY로 초기화한다.
 *
 * 키가 없으면(아직 카카오 앱을 안 만들었거나 배포 환경변수 누락) 초기화하지 않고
 * false를 돌려준다. 호출하는 쪽은 그때 기존 닉네임 로그인으로 넘긴다 —
 * 키가 빠졌다고 가입 자체가 막히면 안 된다.
 */
const APP_KEY = import.meta.env.VITE_KAKAO_APP_KEY;

let ready = null;

export function kakaoConfigured() {
  return Boolean(APP_KEY);
}

export function initKakao({ timeoutMs = 5000 } = {}) {
  if (!APP_KEY) return Promise.resolve(false);
  if (ready) return ready;

  ready = new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (window.Kakao) {
        try {
          if (!window.Kakao.isInitialized()) window.Kakao.init(APP_KEY);
          resolve(window.Kakao.isInitialized());
        } catch {
          resolve(false);            // 키가 잘못된 경우
        }
        return;
      }
      if (Date.now() - start > timeoutMs) { resolve(false); return; }  // SDK 차단/네트워크 실패
      setTimeout(tick, 100);
    };
    tick();
  });

  return ready;
}
