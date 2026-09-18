-- 034: 게시판 공지 고정.
--
-- 운영 공지는 글이 쌓이면 금세 밀려 내려간다. 규칙 안내처럼 계속 보여야 하는 글은
-- 목록 맨 위에 붙여둔다.
--
-- 정렬만 바꾸는 것이라 별도 '공지 테이블'을 만들지 않는다 — 공지도 결국 게시글이고,
-- 댓글로 질문을 받을 수 있어야 하므로 같은 테이블에 두는 게 맞다.
--
-- 적용: node apply-migration.js 034_board_pin.sql

ALTER TABLE board_posts ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_board_pinned ON board_posts(is_pinned, created_at);
