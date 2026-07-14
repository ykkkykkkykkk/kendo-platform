import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import teamsRouter       from './routes/teams.js';
import playersRouter     from './routes/players.js';
import tournamentsRouter from './routes/tournaments.js';
import authRouter        from './routes/auth.js';
import predictionsRouter from './routes/predictions.js';
import followsRouter     from './routes/follows.js';
import clinicsRouter     from './routes/clinics.js';
import shopRouter        from './routes/shop.js';
import debugRouter       from './routes/debug.js';
import adminRouter       from './routes/adminRoutes.js';
import picksRouter       from './routes/picks.js';
import adminPicksRouter  from './routes/admin-picks.js';
import dojosRouter       from './routes/dojos.js';
import meRouter          from './routes/me.js';
import adminDojosRouter  from './routes/adminDojos.js';
import inquiriesRouter   from './routes/inquiries.js';
import questionsRouter    from './routes/questions.js';

import { authLimiter, predictionLimiter, adminLimiter } from './middleware/rateLimits.js';

/* ── 필수 환경변수 검증 (없으면 서버 시작 거부) ── */
for (const key of ['JWT_SECRET', 'ADMIN_TOKEN']) {
  if (!process.env[key]) {
    console.error(`❌ 필수 환경변수 누락: ${key} — .env 파일을 확인하세요.`);
    process.exit(1);
  }
}

const app  = express();
const PORT = process.env.PORT || 4000;

/* ── CORS ──
   허용 출처: ALLOWED_ORIGINS(env) + 마이너스타 도메인 + 모든 *.vercel.app(프로덕션/프리뷰).
   커스텀 도메인(minorstar.kr)을 코드에 넣어, Render env 수정 없이도 항상 허용된다. */
const staticAllowed = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',').map((o) => o.trim()).filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;                        // 서버-투-서버 / curl (Origin 없음)
  if (staticAllowed.includes(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    if (hostname === 'minorstar.kr' || hostname === 'www.minorstar.kr') return true;
    if (hostname.endsWith('.vercel.app')) return true;
  } catch { /* invalid origin */ }
  return false;
}

const corsOptions = process.env.NODE_ENV === 'production'
  ? { origin: (origin, cb) => cb(null, isAllowedOrigin(origin)) }
  : { origin: true };

app.use(cors(corsOptions));
app.use(express.json());

/* ── 라우트 (rate limit은 보호 필요한 라우트에만) ── */
app.use('/api/teams',       teamsRouter);
app.use('/api/players',     playersRouter);
app.use('/api/tournaments', tournamentsRouter);
app.use('/api/auth',        authLimiter,       authRouter);
app.use('/api/predictions', predictionLimiter, predictionsRouter);
app.use('/api/follows',     followsRouter);
app.use('/api/clinics',     clinicsRouter);
app.use('/api/shop',        shopRouter);
app.use('/api/debug',       debugRouter);
app.use('/api/admin',       adminLimiter,      adminRouter);
app.use('/api/admin',       adminLimiter,      adminPicksRouter);
app.use('/api/admin',       adminLimiter,      adminDojosRouter);
app.use('/api',             dojosRouter);
app.use('/api/me',          meRouter);
app.use('/api',             inquiriesRouter);
app.use('/api',             questionsRouter);
app.use('/api',             picksRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

/* ── 글로벌 에러 핸들러 ── */
app.use((err, _req, res, _next) => {
  const isProd = process.env.NODE_ENV === 'production';
  const status = err.status ?? err.statusCode ?? 500;
  console.error('[Unhandled Error]', err.message);
  res.status(status).json({
    error: isProd && status >= 500 ? 'Internal Server Error' : err.message,
  });
});

app.listen(PORT, () => console.log(`server running on http://localhost:${PORT}`));

/* ── 콜드스타트 방지 self-ping ──
   Render 무료 플랜은 15분 유휴 시 슬립한다. GitHub Actions 스케줄은 지연이 심해
   (실측 ~2시간 간격) 신뢰할 수 없으므로, 서버가 13분마다 자기 자신을 호출해 깨어 있게 한다.
   RENDER_EXTERNAL_URL 은 Render가 자동 주입하는 서비스 공개 URL. */
const SELF_URL = process.env.RENDER_EXTERNAL_URL;
if (process.env.NODE_ENV === 'production' && SELF_URL) {
  const PING_MS = 13 * 60 * 1000;
  setInterval(async () => {
    try {
      const r = await fetch(`${SELF_URL}/health`);
      console.log(`[keep-alive] self-ping ${r.status}`);
    } catch (e) {
      console.warn('[keep-alive] self-ping 실패:', e.message);
    }
  }, PING_MS).unref();
}
