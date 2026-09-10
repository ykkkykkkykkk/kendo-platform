-- 028: 어드민 푸시 발송 이력.
--
-- 이벤트 알림(질문·댓글 등)은 notify()가 알아서 보내지만, 대회 공지나 대진표 발표처럼
-- 사람이 직접 쏘는 알림은 보낼 자리가 없었다. 전체 발송은 되돌릴 수 없으므로
-- 누가 언제 무엇을 몇 명에게 보냈는지 남긴다.
--
-- 적용: node apply-migration.js 028_push_broadcasts.sql

CREATE TABLE IF NOT EXISTS push_broadcasts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT    NOT NULL,
  body         TEXT    NOT NULL,
  link         TEXT,
  -- all | players | fans | player_followers | user
  target       TEXT    NOT NULL,
  target_ref   INTEGER,
  target_label TEXT    NOT NULL DEFAULT '',
  -- 대상 회원 수와 그중 알림을 켠 기기 수 (기기 수가 실제 발송량)
  user_count   INTEGER NOT NULL DEFAULT 0,
  device_count INTEGER NOT NULL DEFAULT 0,
  sent         INTEGER NOT NULL DEFAULT 0,
  failed       INTEGER NOT NULL DEFAULT 0,
  -- 만료된 구독은 발송 중 지워진다. 기기 수가 줄어든 이유를 알 수 있게 센다.
  removed      INTEGER NOT NULL DEFAULT 0,
  save_inbox   INTEGER NOT NULL DEFAULT 0,
  -- sending | done | error
  status       TEXT    NOT NULL DEFAULT 'sending',
  error        TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  finished_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_push_broadcasts_at ON push_broadcasts(created_at DESC);
