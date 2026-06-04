-- ============================================================
-- 007_player_accounts.sql  |  선수 계정 + 유저 소속도장
-- ============================================================

PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN role          TEXT NOT NULL DEFAULT 'fan';
ALTER TABLE users ADD COLUMN player_id     INTEGER REFERENCES players(id);
ALTER TABLE users ADD COLUMN username      TEXT;
ALTER TABLE users ADD COLUMN password_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)
  WHERE username IS NOT NULL;
