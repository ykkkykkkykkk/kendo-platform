-- 032: 대나무 키우기 — 앱 활동으로 물을 모아 대나무를 키우고, 다 자라면 죽도를 신청한다.
--
-- 대회가 없는 공백기에 앱을 열 이유를 만드는 장치다. 픽은 대회가 있어야 하고 응원은
-- 선수가 글을 올려야 하는데, 대나무는 매일 혼자서도 조금씩 자란다.
--
-- 물은 water_logs가 정본이고 bamboo_progress.water는 읽기용 사본이다. 회수(revoked_at)가
-- 있어서 합계가 바뀔 수 있는데, 매번 SUM을 다시 재면 홈이 느려진다. 둘이 어긋나면
-- 언제나 logs가 맞다.
--
-- cycle: 죽도를 받으면 대나무를 리셋한다. 이때 물을 0으로 되돌려야 하는데 지난 기록을
-- 지우면 어뷰징 추적이 끊긴다. 그래서 회차 번호를 올리고, 물은 '현재 회차' 로그만 더한다.
--
-- 적용: node apply-migration.js 032_bamboo.sql

CREATE TABLE IF NOT EXISTS bamboo_progress (
  user_id               INTEGER PRIMARY KEY REFERENCES users(id),
  cycle                 INTEGER NOT NULL DEFAULT 1,
  water                 INTEGER NOT NULL DEFAULT 0,
  stage                 INTEGER NOT NULL DEFAULT 0,
  streak_days           INTEGER NOT NULL DEFAULT 0,
  last_attendance_date  TEXT,
  started_at            TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at          TEXT,
  cooldown_until        TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
-- 지급 이력. 어뷰징 추적 + 중복 방지 + 회수를 전부 여기서 본다.
-- ref_id는 '같은 활동'을 가리키는 열쇠라 비워둘 수 없다(SQLite는 NULL끼리 중복으로 치지 않아,
-- 비워두면 UNIQUE가 아무것도 막지 못한다). 날짜 단위 지급은 ref_id에 KST 날짜를 넣는다.
CREATE TABLE IF NOT EXISTS water_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  cycle       INTEGER NOT NULL DEFAULT 1,
  source      TEXT    NOT NULL CHECK(source IN
                ('attendance','pick','pick_bonus','comment','board','invite','streak')),
  amount      INTEGER NOT NULL,
  ref_id      TEXT    NOT NULL,
  revoked_at  TEXT,
  revoke_note TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, source, ref_id)
);
CREATE INDEX IF NOT EXISTS idx_water_user_cycle ON water_logs(user_id, cycle);
CREATE INDEX IF NOT EXISTS idx_water_created    ON water_logs(created_at);

CREATE TABLE IF NOT EXISTS shinai_requests (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  cycle       INTEGER NOT NULL DEFAULT 1,
  name        TEXT    NOT NULL,
  phone       TEXT    NOT NULL,
  address     TEXT    NOT NULL,
  size        TEXT    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'pending'
                CHECK(status IN ('pending','approved','rejected','shipped')),
  admin_note  TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  approved_at TEXT,
  shipped_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_shinai_status ON shinai_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_shinai_user   ON shinai_requests(user_id);

-- 초대. ip_hash는 관리자 화면에 '확인 필요'를 띄우기 위한 기록일 뿐 차단용이 아니다 —
-- 도장 와이파이나 가정용 공유기를 쓰면 정상 유저가 통째로 같은 IP로 잡힌다.
CREATE TABLE IF NOT EXISTS invites (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  inviter_id  INTEGER NOT NULL REFERENCES users(id),
  invitee_id  INTEGER NOT NULL UNIQUE REFERENCES users(id),
  invited_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  rewarded_at TEXT,
  ip_hash     TEXT
);
CREATE INDEX IF NOT EXISTS idx_invites_inviter ON invites(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invites_ip      ON invites(ip_hash);

-- 초대 코드는 회원마다 하나. 가입할 때 입력받는다.
ALTER TABLE users ADD COLUMN invite_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code);

-- 월 지급 상한처럼 운영 중에 바꿀 값. 코드 배포 없이 어드민에서 고친다.
CREATE TABLE IF NOT EXISTS bamboo_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO bamboo_settings (key, value) VALUES ('monthly_shinai_limit', '10');
