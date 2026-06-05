-- ============================================================
-- 010_inquiries.sql  |  고객 문의
-- ============================================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS inquiries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  nickname   TEXT    NOT NULL,
  category   TEXT    NOT NULL DEFAULT '기타'
             CHECK(category IN ('버그신고','기능제안','계정문의','도장문의','기타')),
  content    TEXT    NOT NULL CHECK(length(content) >= 5),
  status     TEXT    NOT NULL DEFAULT 'pending'
             CHECK(status IN ('pending','in_progress','resolved')),
  admin_reply TEXT,
  replied_at  TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_user   ON inquiries(user_id);
