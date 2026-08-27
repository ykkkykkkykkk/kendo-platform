import rateLimit from 'express-rate-limit';

// 테스트에서만 끈다. 운영에서는 절대 켜지 않는다.
const SKIP = process.env.RATE_LIMIT_OFF === '1';

/* 가입/로그인: 15분에 30회.
 *
 * 원래 10회였는데 두 가지 이유로 올렸다.
 *  - 카카오 로그인은 한 번 들어오는 데 요청을 2~3개 쓴다(코드 교환 + 가입/연결).
 *  - trust proxy를 고친 뒤로 IP가 사람 단위로 잡히는데, 한국 통신사는 모바일에서
 *    여러 명이 같은 IP를 쓴다. 10회면 같은 통신사 사용자끼리 서로 막을 수 있다.
 * 무차별 대입을 막는 데는 30회로도 충분히 느리다(하루 2,880회).
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: '너무 많은 시도입니다. 15분 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => SKIP,
});

// 예측 등록: 1분에 30회
export const predictionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: '예측이 너무 빠릅니다. 잠시 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/* 관리자 API: 1분에 120회.
 * 사이드바가 화면을 옮길 때마다 배지 숫자용으로 4개 엔드포인트를 조회한다.
 * 60회였을 때는 1분에 15번만 클릭해도 한도에 닿아 화면이 비어 보였다.
 * 이 라우터는 이미 ADMIN_TOKEN으로 막혀 있으므로 한도는 폭주 방지용이면 충분하다. */
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
  // 다른 리미터와 달리 이 탈출구가 없어서 테스트 때 RATE_LIMIT_OFF가 먹지 않았다
  skip: () => SKIP,
});

// 방문 기록: 1분에 60회 (한 클라가 페이지 이동마다 핑 — 넉넉하게)
export const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { ok: false },
  standardHeaders: true,
  legacyHeaders: false,
});

// 응원 하트: 1분에 20회.
// 하루 1회는 DB의 UNIQUE가 이미 막는다. 이건 여러 선수를 연타로 도는 걸 막는 용도다.
export const cheerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: '응원이 너무 빠릅니다. 잠시 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => SKIP,
});
