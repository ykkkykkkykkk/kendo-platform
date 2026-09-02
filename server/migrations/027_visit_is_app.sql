-- 027: 방문이 앱에서 온 건지 브라우저에서 온 건지 기록.
--
-- Play Console의 설치 수는 깔아놓고 안 여는 사람까지 세서 실제 사용과 차이가 크다.
-- 홈화면에 추가했거나 TWA로 연 경우(display-mode: standalone)를 앱으로 본다.
--
-- 이 컬럼이 생기기 전에 쌓인 방문은 NULL로 남는다. 앱도 웹도 아닌 '모름'이라
-- 집계에서 양쪽 다 빠진다 — 지난 기록을 웹으로 몰아 세면 숫자가 거짓말이 된다.
--
-- 적용: node apply-migration.js 027_visit_is_app.sql

ALTER TABLE page_visits ADD COLUMN is_app INTEGER;

-- 앱/웹 구분 집계용
CREATE INDEX IF NOT EXISTS idx_page_visits_isapp ON page_visits (is_app, created_at);
