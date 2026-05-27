-- ============================================================
-- 005_pick_system.sql  |  픽 예측 시스템
-- ============================================================

PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------
-- 1. tournaments 테이블 컬럼 추가
-- ------------------------------------------------------------
ALTER TABLE tournaments ADD COLUMN has_male_individual   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN has_male_team         INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN has_female_individual INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN has_female_team       INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN pick_deadline         TEXT;

-- ------------------------------------------------------------
-- 2. tournament_divisions — 부문 (한 대회 안에 최대 4개)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tournament_divisions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id     INTEGER NOT NULL REFERENCES tournaments(id),
  division_type     TEXT    NOT NULL CHECK(division_type IN (
                      'male_individual','male_team',
                      'female_individual','female_team'
                    )),
  participant_count INTEGER,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tournament_id, division_type)
);

-- ------------------------------------------------------------
-- 3. division_participants — 부문별 참가 선수/팀 명단
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS division_participants (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  division_id INTEGER NOT NULL REFERENCES tournament_divisions(id),
  player_id   INTEGER REFERENCES players(id),
  team_id     INTEGER REFERENCES teams(id),
  seed_number INTEGER,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK (
    (player_id IS NOT NULL AND team_id IS NULL) OR
    (player_id IS NULL     AND team_id IS NOT NULL)
  )
);

-- ------------------------------------------------------------
-- 4. tournament_picks — 사용자 픽
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tournament_picks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  division_id INTEGER NOT NULL REFERENCES tournament_divisions(id),
  pick_1st    INTEGER REFERENCES division_participants(id),
  pick_2nd    INTEGER REFERENCES division_participants(id),
  pick_3rd_a  INTEGER REFERENCES division_participants(id),
  pick_3rd_b  INTEGER REFERENCES division_participants(id),
  is_locked   INTEGER NOT NULL DEFAULT 0,
  locked_at   TEXT,
  score       INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, division_id)
);

-- ------------------------------------------------------------
-- 5. division_results — 관리자 입력 부문별 결과
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS division_results (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  division_id  INTEGER NOT NULL UNIQUE REFERENCES tournament_divisions(id),
  rank_1st     INTEGER REFERENCES division_participants(id),
  rank_2nd     INTEGER REFERENCES division_participants(id),
  rank_3rd_a   INTEGER REFERENCES division_participants(id),
  rank_3rd_b   INTEGER REFERENCES division_participants(id),
  is_finalized INTEGER NOT NULL DEFAULT 0,
  finalized_at TEXT
);

-- ------------------------------------------------------------
-- 6. 인덱스
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_picks_user        ON tournament_picks(user_id);
CREATE INDEX IF NOT EXISTS idx_picks_division    ON tournament_picks(division_id);
CREATE INDEX IF NOT EXISTS idx_participants_division ON division_participants(division_id);
