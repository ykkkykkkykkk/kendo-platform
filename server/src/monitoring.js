/* ── 서버 에러 추적(Sentry) ──
   SENTRY_DSN 이 없으면 아무것도 하지 않는다. 키 없이도 서버는 정상 기동한다.

   주의: Sentry v8+ 의 자동 계측(OpenTelemetry)을 100% 쓰려면 프로세스 시작 시
   `node --import ./src/instrument.js src/index.js` 로 띄워야 한다. 여기서는
   기동 실패 위험을 피하려고 일반 import 방식을 썼다. 예외 수집과 Express
   에러 핸들러는 이 방식으로도 정상 동작하며, 빠지는 것은 일부 성능 추적뿐이다. */
import * as Sentry from '@sentry/node';

const DSN = process.env.SENTRY_DSN;

export function initSentry() {
  if (!DSN) {
    console.log('[sentry] SENTRY_DSN 없음 — 에러 추적 비활성');
    return false;
  }
  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV ?? 'development',
    // 닉네임·토큰 등이 이벤트에 실려 나가지 않게 한다
    sendDefaultPii: false,
  });
  console.log('[sentry] 에러 추적 활성');
  return true;
}

export { Sentry };
