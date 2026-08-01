-- 019: 선수 포스팅 · 응원 · 댓글 · 알림.
--
-- 선수가 팬에게 소식을 올리고, 팬이 응원(좋아요)·댓글을 달고,
-- 선수가 그 댓글에 하트/답글을 다는 흐름.
--
-- 적용: node apply-migration.js 019_posts_feed.sql

CREATE TABLE IF NOT EXISTS posts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id     INTEGER NOT NULL REFERENCES players(id),
  type          TEXT    NOT NULL CHECK(type IN ('text','video','image')),
  content       TEXT,
  video_url     TEXT,
  video_id      TEXT,                        -- 유튜브 영상 id (임베드·썸네일용)
  image_url     TEXT,
  -- 목록에서 매번 세지 않도록 집계를 들고 있는다. 좋아요/댓글 변동 시 함께 갱신.
  like_count    INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_posts_player  ON posts(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id    INTEGER NOT NULL REFERENCES posts(id),
  user_id    INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (post_id, user_id)      -- 한 사람이 한 번만
);

-- 선수 답글도 users 행(role='player')으로 로그인하므로 user_id 하나로 통일한다.
-- is_player로 구분하고, parent_id로 어느 댓글에 달린 답글인지 잇는다.
CREATE TABLE IF NOT EXISTS post_comments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id         INTEGER NOT NULL REFERENCES posts(id),
  user_id         INTEGER NOT NULL REFERENCES users(id),
  parent_id       INTEGER REFERENCES post_comments(id),
  is_player       INTEGER NOT NULL DEFAULT 0,
  content         TEXT    NOT NULL CHECK(length(content) <= 500),
  -- 선수 하트는 '글쓴 선수가 눌렀나' 하나뿐이라 별도 테이블 대신 컬럼으로 둔다.
  liked_by_player INTEGER NOT NULL DEFAULT 0,
  player_liked_at TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id, created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  type       TEXT    NOT NULL,     -- new_post | comment_like | comment_reply
  message    TEXT    NOT NULL,
  link       TEXT,
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
