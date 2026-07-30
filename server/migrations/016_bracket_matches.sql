-- 016: 부문별 실제 대진 구도(토너먼트 트리) 저장.
--
-- 기존 matches 테이블은 round이 CHECK(예선/16강/8강/4강/결승)로 묶여 있고
-- 조(組)·경기장·경기번호 개념이 없어 이번 대회 대진표(한 조 29명, 5라운드, 2개 조,
-- 부전승 다수)를 담을 수 없다. matches는 기존 예측 기능이 쓰고 있어 건드리지 않고
-- 대진표 전용 테이블을 새로 둔다.
--
-- 각 경기의 양쪽은 둘 중 하나다:
--   · a_participant_id  — 1회전에 바로 들어오는 선수
--   · a_from_match_id   — 앞선 경기의 승자 ('N경기 승자')
-- 부전승은 한쪽이 참가자, 다른 쪽이 앞선 경기인 형태로 자연히 표현된다.
--
-- 적용: node apply-migration.js 016_bracket_matches.sql

CREATE TABLE IF NOT EXISTS bracket_matches (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  division_id           INTEGER NOT NULL REFERENCES tournament_divisions(id),
  group_label           TEXT,                       -- 'A' | 'B' | NULL(부문 결승)
  court_label           TEXT,                       -- '1경기장' | '2경기장' | NULL
  match_number          INTEGER NOT NULL,           -- 조 안에서의 경기번호
  round_depth           INTEGER NOT NULL,           -- 1 = 1회전
  is_group_final        INTEGER NOT NULL DEFAULT 0, -- 조 결승
  is_final              INTEGER NOT NULL DEFAULT 0, -- 부문 결승 (A조 우승 vs B조 우승)
  a_participant_id      INTEGER REFERENCES division_participants(id),
  b_participant_id      INTEGER REFERENCES division_participants(id),
  a_from_match_id       INTEGER REFERENCES bracket_matches(id),
  b_from_match_id       INTEGER REFERENCES bracket_matches(id),
  winner_participant_id INTEGER REFERENCES division_participants(id),
  score_a               INTEGER,
  score_b               INTEGER,
  status                TEXT NOT NULL DEFAULT '예정' CHECK(status IN ('예정','진행중','종료')),
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(division_id, group_label, match_number)
);

CREATE INDEX IF NOT EXISTS idx_bracket_division ON bracket_matches(division_id);
CREATE INDEX IF NOT EXISTS idx_bracket_group    ON bracket_matches(division_id, group_label, match_number);
