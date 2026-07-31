-- 018: 회원 최근 접속 시각.
--
-- page_visits는 브라우저에 저장된 visitor_id만 기록해서 회원 계정과 연결되지 않는다.
-- 관리자 회원 목록에서 '최근 접속'을 보려면 users에 직접 남겨야 한다.
--
-- 기존 회원은 NULL로 시작하고, 다음 접속 때부터 채워진다.
--
-- 적용: node apply-migration.js 018_user_last_seen.sql

ALTER TABLE users ADD COLUMN last_seen_at TEXT;
