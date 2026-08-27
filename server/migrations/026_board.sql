-- 026: 유저 자유게시판.
--
-- 기존 posts는 선수만 쓰는 소식이라 팬끼리 이야기할 자리가 없었다. 이건 회원 누구나 쓴다.
-- 카테고리는 두지 않는다. 글이 쌓여 분리가 필요해지면 그때 컬럼 하나 붙이면 된다.
--
-- 적용: node apply-migration.js 026_board.sql

CREATE TABLE IF NOT EXISTS board_posts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  title         TEXT    NOT NULL,
  content       TEXT    NOT NULL,
  image_url     TEXT,
  video_url     TEXT,
  -- 유튜브 영상 id. 저장해두면 목록·상세에서 매번 주소를 파싱하지 않아도 된다.
  video_id      TEXT,
  -- 매번 세지 않으려고 갖고 있는 값. 좋아요·댓글 시점에 같이 갱신한다.
  like_count    INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  -- 서로 다른 3명에게 신고당하면 1이 된다. 목록에서 내용이 가려진다.
  is_blinded    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_board_posts_created ON board_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_board_posts_user    ON board_posts(user_id);

CREATE TABLE IF NOT EXISTS board_comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id    INTEGER NOT NULL REFERENCES board_posts(id),
  user_id    INTEGER NOT NULL REFERENCES users(id),
  -- 대댓글이면 부모 댓글 id. 1단계까지만 쓴다(대댓글의 대댓글은 받지 않는다).
  parent_id  INTEGER REFERENCES board_comments(id),
  content    TEXT    NOT NULL,
  is_blinded INTEGER NOT NULL DEFAULT 0,
  /* 답글이 달린 댓글을 지우면 답글이 갈 곳을 잃는다. 그래서 답글이 있는 댓글은
     행을 남기고 이 값만 1로 세워 '삭제된 댓글입니다'로 보여준다.
     답글이 없으면 그냥 행을 지운다. */
  is_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_board_comments_post ON board_comments(post_id, created_at);

CREATE TABLE IF NOT EXISTS board_likes (
  post_id    INTEGER NOT NULL REFERENCES board_posts(id),
  user_id    INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (post_id, user_id)
);

/* 신고. 같은 사람이 세 번 눌러 남의 글을 가려버리는 걸 막아야 하므로
   (대상, 신고자)를 유일하게 잡는다. 블라인드 기준은 '서로 다른 3명'이다. */
CREATE TABLE IF NOT EXISTS board_reports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type TEXT    NOT NULL CHECK(target_type IN ('post','comment')),
  target_id   INTEGER NOT NULL,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  reason      TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(target_type, target_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_board_reports_target ON board_reports(target_type, target_id);
