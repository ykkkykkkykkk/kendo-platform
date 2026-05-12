# 검도 팬덤 플랫폼

모바일 우선 검도 팬덤 앱. 실업팀·선수 정보, 대회 대진표, 팬 예측, 강습 예약.

## 스택

- **프론트**: React + Vite + Tailwind CSS + react-router-dom (`client/`)
- **백엔드**: Node.js + Express + @libsql/client (`server/`)
- **DB**: Turso (libSQL)
- **배포**: Vercel (client) + Render (server)

## 로컬 실행

```bash
npm install
npm run dev        # client + server 동시 실행
```

## 폴더 구조

```
kendo-platform/
├── client/        # Vite React 앱
├── server/        # Express API 서버
│   └── migrations/
│       └── 001_init.sql
└── package.json   # 워크스페이스 루트
```
