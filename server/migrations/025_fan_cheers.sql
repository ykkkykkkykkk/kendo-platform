-- 025: 오늘의 응원(하트) — 팬이 선수를 하루 1번 응원한 기록.
--
-- 팔로우(follows)는 한 번 누르면 끝이라 "지금도 응원하는가"를 알 수 없다.
-- 응원은 매일 눌러야 쌓이므로 팬의 꾸준함이 그대로 숫자가 된다.
-- 누적 일수로 선수별 팬 등급을 매긴다(연속 아님 — 하루 빠져도 리셋하지 않는다).
--
-- 적용: node apply-migration.js 025_fan_cheers.sql

-- cheer_date 는 'YYYY-MM-DD' 문자열이며 한국 날짜(UTC+9)로 기록한다.
-- SQLite의 date('now')는 UTC라 한국 자정 기준으로 끊으려면 항상 '+9 hours'를 붙여야 한다.
-- UNIQUE 제약이 "하루 1회"를 DB 차원에서 보장한다(앱 로직이 뚫려도 두 번 들어가지 않는다).
CREATE TABLE IF NOT EXISTS fan_cheers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  player_id  INTEGER NOT NULL REFERENCES players(id),
  cheer_date TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, player_id, cheer_date)
);

-- 내 누적 일수 = COUNT(*) WHERE user_id + player_id. 이 조회가 프로필 진입마다 돈다.
CREATE INDEX IF NOT EXISTS idx_cheers_user_player ON fan_cheers(user_id, player_id);

-- 선수 대시보드의 "오늘 나를 응원한 팬" 조회용.
CREATE INDEX IF NOT EXISTS idx_cheers_player_date ON fan_cheers(player_id, cheer_date);
