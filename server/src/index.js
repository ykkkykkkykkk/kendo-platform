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
import adminDojosRouter  from './routes/adminDojos.js';

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

/* ── CORS ── */
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean)
  : true;

app.use(cors({ origin: allowedOrigins }));
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
