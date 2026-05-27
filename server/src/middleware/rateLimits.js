import rateLimit from 'express-rate-limit';

// 가입/로그인: 15분에 10회
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: '너무 많은 시도입니다. 15분 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
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
