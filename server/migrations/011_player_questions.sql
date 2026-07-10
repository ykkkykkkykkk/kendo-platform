-- 선수 Q&A: 팬이 선수에게 질문, 선수 본인이 답변
-- 질문은 계정당 하루 1회 제한 (백엔드에서 KST 기준 검증)

CREATE TABLE IF NOT EXISTS player_questions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id   INTEGER NOT NULL REFERENCES players(id),
  user_id     INTEGER NOT NULL REFERENCES users(id),
  question    TEXT    NOT NULL,
  answer      TEXT,
  answered_at TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pq_player    ON player_questions(player_id);
CREATE INDEX IF NOT EXISTS idx_pq_user_date ON player_questions(user_id, created_at);
