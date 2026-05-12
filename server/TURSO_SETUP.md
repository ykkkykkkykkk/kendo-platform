# Turso 셋업 가이드

## 1. Turso CLI 설치

```bash
# Windows (PowerShell)
winget install turso
# 또는
scoop install turso
```

설치 확인:
```bash
turso --version
```

## 2. 로그인

```bash
turso auth login
# 브라우저에서 GitHub 계정으로 인증
```

## 3. DB 생성

```bash
turso db create kendo-platform
```

## 4. 접속 정보 확인

```bash
# DB URL 확인
turso db show kendo-platform --url

# 인증 토큰 발급
turso db tokens create kendo-platform
```

## 5. .env 파일 작성

`server/.env` 를 아래처럼 채워넣기:

```
TURSO_URL=libsql://kendo-platform-<your-username>.turso.io
TURSO_AUTH_TOKEN=<위에서 발급한 토큰>
PORT=4000
```

## 6. 마이그레이션 실행

```bash
turso db shell kendo-platform < migrations/001_init.sql
```

실행 후 확인:
```bash
turso db shell kendo-platform "SELECT name FROM sqlite_master WHERE type='table';"
```

총 11개 테이블이 나와야 함:
teams, players, player_stats, player_gear, tournaments,
matches, users, follows, predictions, sponsorships,
clinics, clinic_bookings
