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

// 관리자 API: 1분에 60회 (운영 편의성 우선)
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 방문 기록: 1분에 60회 (한 클라가 페이지 이동마다 핑 — 넉넉하게)
export const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { ok: false },
  standardHeaders: true,
  legacyHeaders: false,
});
