-- ============================================================
-- 001_init.sql  |  검도 팬덤 플랫폼 초기 스키마
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------
-- 팀 (실업팀)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL,
  slug             TEXT    NOT NULL UNIQUE,
  region           TEXT,
  founded_year     INTEGER,
  logo_url         TEXT,
  color_primary    TEXT,
  championships    INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------
-- 선수
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS players (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id           INTEGER REFERENCES teams(id),
  name              TEXT    NOT NULL,
  name_en           TEXT,
  slug              TEXT    NOT NULL UNIQUE,
  birth_year        INTEGER,
  height_cm         INTEGER,
  dan_grade         INTEGER,
  position          TEXT    CHECK(position IN ('선봉','이봉','중견','부장','대장') OR position IS NULL),
  bio               TEXT,
  profile_image_url TEXT,
  instagram_url     TEXT,
  youtube_url       TEXT,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------
-- 선수 통산 전적
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_stats (
  player_id          INTEGER PRIMARY KEY REFERENCES players(id),
  total_matches      INTEGER NOT NULL DEFAULT 0,
  wins               INTEGER NOT NULL DEFAULT 0,
  losses             INTEGER NOT NULL DEFAULT 0,
  championships_won  INTEGER NOT NULL DEFAULT 0,
  updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------
-- 선수 애용 장비
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_gear (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id     INTEGER NOT NULL REFERENCES players(id),
  category      TEXT    NOT NULL CHECK(category IN ('죽도','호구','도복','하카마','기타')),
  brand         TEXT,
  model_name    TEXT,
  price_krw     INTEGER,
  product_url   TEXT,
  image_url     TEXT,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- ------------------------------------------------------------
-- 대회
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tournaments (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT    NOT NULL,
  slug              TEXT    NOT NULL UNIQUE,
  start_date        TEXT,
  end_date          TEXT,
  venue             TEXT,
  host_organization TEXT,
  tournament_type   TEXT    NOT NULL CHECK(tournament_type IN ('개인전','단체전','혼합')),
  poster_image_url  TEXT,
  status            TEXT    NOT NULL DEFAULT '예정' CHECK(status IN ('예정','진행','종료')),
  created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------
-- 경기
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matches (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id            INTEGER NOT NULL REFERENCES tournaments(id),
  match_type               TEXT    NOT NULL CHECK(match_type IN ('개인전','단체전')),
  round                    TEXT    NOT NULL CHECK(round IN ('예선','16강','8강','4강','결승')),
  position_order           INTEGER,                          -- 단체전 1~5 (선봉~대장)
  bracket_position         INTEGER,
  scheduled_at             TEXT,
  player_a_id              INTEGER REFERENCES players(id),
  player_b_id              INTEGER REFERENCES players(id),
  team_a_id                INTEGER REFERENCES teams(id),
  team_b_id                INTEGER REFERENCES teams(id),
  winner_player_id         INTEGER REFERENCES players(id),
  winner_team_id           INTEGER REFERENCES teams(id),
  score_a                  INTEGER,
  score_b                  INTEGER,
  status                   TEXT    NOT NULL DEFAULT '예정' CHECK(status IN ('예정','진행중','종료')),
  parent_match_id          INTEGER REFERENCES matches(id)
);

-- ------------------------------------------------------------
-- 유저
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  phone            TEXT    UNIQUE,
  nickname         TEXT    NOT NULL,
  dan_grade        INTEGER,
  home_dojo        TEXT,
  favorite_team_id INTEGER REFERENCES teams(id),
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------
-- 팔로우 (팬)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS follows (
  user_id    INTEGER NOT NULL REFERENCES users(id),
  player_id  INTEGER NOT NULL REFERENCES players(id),
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, player_id)
);

-- ------------------------------------------------------------
-- 예측
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS predictions (
  id                          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id                     INTEGER NOT NULL REFERENCES users(id),
  match_id                    INTEGER NOT NULL REFERENCES matches(id),
  predicted_winner_player_id  INTEGER REFERENCES players(id),
  predicted_winner_team_id    INTEGER REFERENCES teams(id),
  predicted_at                TEXT    NOT NULL DEFAULT (datetime('now')),
  is_correct                  INTEGER,   -- 0 | 1 | NULL(미결)
  reward_given                INTEGER    NOT NULL DEFAULT 0,
  UNIQUE(user_id, match_id)
);

-- ------------------------------------------------------------
-- 스폰서십 / 경품
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sponsorships (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id    INTEGER NOT NULL REFERENCES tournaments(id),
  sponsor_name     TEXT    NOT NULL,
  sponsor_logo     TEXT,
  reward_name      TEXT,
  reward_image     TEXT,
  reward_value_krw INTEGER,
  reward_quantity  INTEGER,
  claim_condition  TEXT
);

-- ------------------------------------------------------------
-- 강습 (클리닉)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinics (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id       INTEGER NOT NULL REFERENCES players(id),
  title           TEXT    NOT NULL,
  description     TEXT,
  scheduled_at    TEXT,
  venue           TEXT,
  capacity        INTEGER,
  remaining_slots INTEGER,
  price_krw       INTEGER,
  status          TEXT    NOT NULL DEFAULT '모집중' CHECK(status IN ('모집중','마감','종료')),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------
-- 강습 예약
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinic_bookings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id  INTEGER NOT NULL REFERENCES clinics(id),
  user_id    INTEGER NOT NULL REFERENCES users(id),
  status     TEXT    NOT NULL DEFAULT '확정' CHECK(status IN ('확정','취소','대기')),
  booked_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(clinic_id, user_id)
);
