/**
 * 배포 후 사용자가 옛 화면을 계속 보는 문제를 막는다.
 *
 * vite-plugin-pwa가 만드는 registerSW.js는 서비스워커를 등록만 하고, 새 워커가
 * 제어권을 넘겨받았을 때 페이지를 새로고침하지 않는다. sw.js에 skipWaiting과
 * clientsClaim이 있어 새 워커는 즉시 활성화되지만 이미 로드된 문서는 옛 번들을
 * 그대로 쓰므로, 두 번 열어야 새 버전이 보였다. 홈화면에 설치해 쓰는 경우엔
 * 앱을 백그라운드에서 되살리기만 해서 훨씬 오래 옛 버전에 머문다.
 *
 * 그래서 두 가지를 한다:
 *   1) 제어권이 새 워커로 넘어가면 한 번만 새로고침한다.
 *   2) 앱이 다시 보이거나 포커스를 얻을 때 업데이트를 확인한다
 *      (설치형 PWA는 페이지 load 이벤트가 다시 안 일어난다).
 */
export function keepServiceWorkerFresh() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  // 최초 방문(아직 제어하는 워커가 없음)에는 방금 네트워크에서 받은 최신 문서이므로
  // 새로고침이 필요 없다. controller가 이미 있을 때만 교체를 감지한다.
  if (navigator.serviceWorker.controller) {
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  }

  // 모바일에선 visibilitychange와 focus가 자주 겹쳐 일어나므로 스로틀을 둔다.
  let lastCheck = 0;
  const checkForUpdate = () => {
    const now = Date.now();
    if (now - lastCheck < 30_000) return;
    lastCheck = now;
    navigator.serviceWorker.getRegistration()
      .then((reg) => reg?.update())
      .catch(() => { /* 오프라인 등 — 무시 */ });
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });
  window.addEventListener('focus', checkForUpdate);
}
