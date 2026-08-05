-- 024: 웹푸시(잠금화면 알림).
--
-- 알림함은 앱을 열어야 보인다. 선수는 질문이 온 걸 모르고 팬은 답변이 달린 걸 모른다.
-- 웹푸시는 앱을 닫아둬도 폰 알림이 뜨고, 사업자등록증 없이 무료로 쓸 수 있다.
--
-- 적용: node apply-migration.js 024_web_push.sql

-- 브라우저가 발급한 구독 정보. 기기·브라우저마다 하나씩 생긴다.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  endpoint   TEXT    NOT NULL UNIQUE,
  p256dh     TEXT    NOT NULL,
  auth       TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  -- 만료·해지된 구독은 발송 시 410이 오므로 그때 지운다
  failed_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

-- VAPID 키 보관. env(Render 대시보드)에 넣는 게 정석이지만, 없으면 여기서 한 번 만들어 쓴다.
-- env에 값이 있으면 그쪽이 항상 우선이다.
CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
