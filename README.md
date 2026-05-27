# 검도 팬덤 플랫폼

모바일 우선 검도 팬덤 앱. 실업팀·선수 정보, 대회 대진표, 팬 예측, 강습 예약.

## 스택

- **프론트**: React + Vite + Tailwind CSS + react-router-dom (`client/`)
- **백엔드**: Node.js + Express + @libsql/client (`server/`)
- **DB**: Turso (libSQL)
- **배포**: Vercel (client) + Render (server)

## 로컬 실행

```bash
# 루트에서
npm install
npm run dev        # client(5173) + server(4000) 동시 실행
```

## 배포

### 1. Render (백엔드)

1. [render.com](https://render.com) → New Web Service → GitHub 연결
2. Root Directory: `server`
3. Build Command: `npm install`
4. Start Command: `npm start`
5. 환경변수 설정 (Dashboard → Environment):

| 키 | 값 |
|---|---|
| `TURSO_URL` | Turso 콘솔에서 복사 |
| `TURSO_AUTH_TOKEN` | Turso 콘솔에서 복사 |
| `JWT_SECRET` | 랜덤 긴 문자열 (직접 생성) |
| `ALLOWED_ORIGINS` | Vercel 배포 후 URL 입력 (예: `https://kendo.vercel.app`) |
| `NODE_ENV` | `production` |
| `PORT` | `10000` |

6. 배포 완료 후 서비스 URL 복사 (예: `https://kendo-platform-api.onrender.com`)

### 2. Vercel (프론트엔드)

1. [vercel.com](https://vercel.com) → New Project → GitHub 연결
2. **Root Directory: `client`** 로 설정
3. Framework Preset: Vite (자동 감지)
4. `client/vercel.json`의 `YOUR_RENDER_URL` 부분을 Render URL로 교체:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://kendo-platform-api.onrender.com/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

5. 배포 완료 후 Vercel URL을 Render의 `ALLOWED_ORIGINS` 환경변수에 입력 → Render 재배포

### 3. DB 마이그레이션 (최초 1회)

```bash
cd server
node migrate.js
```

## 폴더 구조

```
kendo-platform/
├── client/           # Vite React 앱
│   └── vercel.json   # Vercel 배포 설정
├── server/           # Express API 서버
│   └── migrations/   # SQL 스키마 + 시드
├── render.yaml       # Render 배포 설정
└── package.json      # 워크스페이스 루트
```

## API 엔드포인트

| 메서드 | 경로 | 인증 | 설명 |
|---|---|---|---|
| POST | `/api/auth/register` | — | 닉네임+끝4자리로 가입/로그인, JWT 발급 |
| GET | `/api/teams` | — | 팀 목록 |
| GET | `/api/teams/:slug` | — | 팀 상세 + 선수 목록 |
| GET | `/api/players` | — | 선수 목록 |
| GET | `/api/players/:slug` | — | 선수 상세 + 전적 + 장비 |
| GET | `/api/tournaments` | — | 대회 목록 |
| GET | `/api/tournaments/:slug` | — | 대회 상세 + 브래킷 + 예측 집계 |
| GET | `/api/predictions` | 필수 | 내 예측 확인 |
| POST | `/api/predictions` | 필수 | 예측 등록 |
| GET | `/api/follows/check/:playerId` | 필수 | 팔로우 여부 |
| POST | `/api/follows` | 필수 | 팔로우 |
| DELETE | `/api/follows/:playerId` | 필수 | 팔로우 취소 |
| GET | `/api/clinics` | — | 강습 목록 |
| POST | `/api/clinics/:id/booking` | 필수 | 강습 예약 |
| DELETE | `/api/clinics/:id/booking` | 필수 | 예약 취소 |
| GET | `/api/shop/gear` | — | 장비 카탈로그 |
