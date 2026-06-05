-- ============================================================
-- 009_dojo_invitations.sql  |  도장 초청권 시스템 (v2 핵심)
-- ============================================================

PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------
-- 시즌
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seasons (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  start_date   TEXT    NOT NULL,
  end_date     TEXT    NOT NULL,
  is_active    INTEGER NOT NULL DEFAULT 0,
  finalized_at TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------
-- 도장
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dojos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  normalized_name TEXT    NOT NULL,
  member_count    INTEGER NOT NULL DEFAULT 0,
  total_score     INTEGER NOT NULL DEFAULT 0,
  season_id       INTEGER REFERENCES seasons(id),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(normalized_name)
);

-- ------------------------------------------------------------
-- 도장 초청권 (시즌 결과)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dojo_invitations (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id         INTEGER NOT NULL REFERENCES seasons(id),
  dojo_id           INTEGER NOT NULL REFERENCES dojos(id),
  rank              INTEGER CHECK(rank IN (1, 2, 3)),
  total_score       INTEGER NOT NULL DEFAULT 0,
  prize_tier        TEXT    CHECK(prize_tier IN (
                      'half_day_clinic', 'two_hour_clinic', 'merchandise'
                    )),
  status            TEXT    NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending', 'matched', 'completed', 'expired')),
  matched_player_id INTEGER REFERENCES players(id),
  scheduled_date    TEXT,
  notes             TEXT,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(season_id, dojo_id)
);

-- ------------------------------------------------------------
-- users 컬럼 추가
-- ------------------------------------------------------------
ALTER TABLE users ADD COLUMN dojo_id                  INTEGER REFERENCES dojos(id);
ALTER TABLE users ADD COLUMN dojo_change_requested_at TEXT;

-- ------------------------------------------------------------
-- 인덱스
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_dojos_normalized  ON dojos(normalized_name);
CREATE INDEX IF NOT EXISTS idx_dojos_season      ON dojos(season_id);
CREATE INDEX IF NOT EXISTS idx_invitations_season ON dojo_invitations(season_id);
CREATE INDEX IF NOT EXISTS idx_users_dojo        ON users(dojo_id);

-- ------------------------------------------------------------
-- 첫 시즌: 2026 상반기 (활성)
-- ------------------------------------------------------------
INSERT INTO seasons (name, start_date, end_date, is_active)
VALUES ('2026 상반기', '2026-01-01', '2026-06-30', 1);
