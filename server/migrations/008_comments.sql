-- ============================================================
-- 008_comments.sql  |  선수 프로필 댓글 시스템
-- ============================================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS player_comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id  INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  parent_id  INTEGER REFERENCES player_comments(id)  ON DELETE CASCADE,
  content    TEXT    NOT NULL CHECK(length(content) <= 300),
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_comments_player ON player_comments(player_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON player_comments(parent_id);
