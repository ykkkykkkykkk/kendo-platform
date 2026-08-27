/* ── 에러 추적(Sentry) + 사용량 분석(GA4) ──
   둘 다 env 키가 있을 때만 켜진다. 키가 없으면 스크립트조차 로드하지 않으므로
   로컬 개발이나 키 미설정 상태에서 아무 부담이 없다.
   프로덕션 빌드에서만 동작한다(개발 중 노이즈로 무료 할당량을 태우지 않기 위함). */
import * as Sentry from '@sentry/react';

const DSN     = import.meta.env.VITE_SENTRY_DSN;
const GA_ID   = import.meta.env.VITE_GA_ID;
const ENABLED = import.meta.env.PROD;

export function initMonitoring() {
  if (ENABLED && DSN) {
    Sentry.init({
      dsn: DSN,
      environment: 'production',
      // 닉네임·질문 내용 같은 사용자 입력이 이벤트에 딸려 나가지 않게 한다
      sendDefaultPii: false,
      /* 잡아봐야 고칠 게 없는 노이즈. 지하철·엘리베이터에서 앱을 쓰면
         네트워크 오류가 대량으로 올라와 진짜 버그가 묻힌다. */
      ignoreErrors: [
        'ResizeObserver loop',
        'Failed to fetch',
        'NetworkError',
        'Load failed',
        'AbortError',
      ],
    });
  }

  if (ENABLED && GA_ID) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    // SPA라 첫 진입 외의 페이지뷰는 trackPageView가 따로 보낸다
    window.gtag('config', GA_ID, { anonymize_ip: true, send_page_view: false });
    trackPageView(window.location.pathname + window.location.search);
  }
}

/* 라우터 이동은 새로고침이 아니라서 GA가 스스로 잡지 못한다. RouteTracker가 호출한다. */
export function trackPageView(path) {
  if (!window.gtag || !GA_ID) return;
  window.gtag('event', 'page_view', { page_path: path, page_location: window.location.href });
}

/* 원인을 알고 싶은 지점에서 직접 호출한다. 예: catch 블록. */
export function reportError(err, context) {
  if (!ENABLED || !DSN) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}
