-- 033: 푸시 구독에 기기 종류를 남긴다.
--
-- 알림 켜기를 유도하는 안내 팝업을 붙이면서, 어디서 켰는지(웹·안드로이드 앱·아이폰)를
-- 알아야 안내 문구를 맞게 띄우고 전환율도 볼 수 있다.
--
-- 토큰 저장 테이블은 새로 만들지 않는다 — push_subscriptions(024)가 이미
-- user_id · endpoint(토큰) · created_at을 갖고 있어 거기에 platform만 덧붙인다.
--
-- 적용: node apply-migration.js 033_push_platform.sql

ALTER TABLE push_subscriptions ADD COLUMN platform TEXT;
ALTER TABLE push_subscriptions ADD COLUMN updated_at TEXT;
