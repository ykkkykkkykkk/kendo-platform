-- 017: 선수 영상 링크.
--
-- players.youtube_url이 이미 있지만 그건 채널/SNS 링크 한 개를 담는 자리이고
-- 프로필에서도 SNS 아이콘으로만 쓰인다(현재 입력된 선수 0명).
-- 경기 영상은 선수당 여러 개가 붙으므로 별도 테이블로 둔다.
--
-- 등록은 관리자와 선수 본인이 모두 할 수 있어 누가 넣었는지 남긴다(added_by_user_id).
--
-- 적용: node apply-migration.js 017_player_videos.sql

CREATE TABLE IF NOT EXISTS player_videos (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id        INTEGER NOT NULL REFERENCES players(id),
  url              TEXT    NOT NULL,
  title            TEXT,
  video_id         TEXT,                       -- 유튜브 영상 id (썸네일·임베드용, 없으면 링크로만 처리)
  display_order    INTEGER NOT NULL DEFAULT 0,
  added_by_user_id INTEGER REFERENCES users(id),   -- 선수 본인이 넣은 경우. 관리자면 NULL
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_player_videos_player ON player_videos(player_id, display_order);
