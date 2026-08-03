-- 선수 본인 신청.
--
-- 지금까지는 설문을 받아 관리자가 계정을 만들고 어느 선수인지 손으로 이어줬다.
-- 선수 200명 중 계정이 있는 사람이 19명뿐이라 이 방식으로는 감당이 안 된다.
--
-- 앞으로는 본인이 카카오로 들어와 선수 명단에서 자기를 고르고, 관리자가 승인한다.
-- 승인되면 그 회원이 role='player'로 바뀌고 player_id가 붙는다.
-- 팬으로 가입해 쓰던 사람도 그대로 전환되므로 팔로우·픽이 유지된다.
CREATE TABLE IF NOT EXISTS player_claims (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  player_id   INTEGER NOT NULL REFERENCES players(id),
  -- 본인임을 알아볼 근거를 적는 칸 (소속·단·대회 성적 등). 관리자가 보고 판단한다.
  note        TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK(status IN ('pending', 'approved', 'rejected')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  review_note TEXT
);

-- 한 사람이 같은 선수로 여러 번 신청해 목록을 어지럽히지 않게 한다.
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_claims_unique
  ON player_claims(user_id, player_id);

-- 대기 중인 신청을 자주 훑으므로 인덱스를 둔다.
CREATE INDEX IF NOT EXISTS idx_player_claims_status ON player_claims(status);
