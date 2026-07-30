-- 015: 부문(division)에 표시용 이름(label)과 정렬 순서(sort_order) 추가.
--
-- 배경: tournament_divisions는 UNIQUE(tournament_id, division_type)이라
--       한 대회에 male_individual 부문을 하나만 만들 수 있었다.
--       2026 하계 전국실업검도대회는 남자 개인전이 3단부/4단부/5단부로 갈리므로
--       같은 division_type을 여러 개 등록할 수 있어야 한다.
--       → label 컬럼을 추가하고 UNIQUE에 label을 포함시켜 완화한다.
--
-- SQLite는 UNIQUE 제약(자동 인덱스)을 DROP할 수 없어 테이블 재생성이 필요하다.
-- tournament_divisions / division_participants / tournament_picks / division_results가
-- 모두 0행일 때만 안전하다. 적용 전 반드시 확인할 것.
--
-- 적용: node apply-migration.js 015_division_label.sql
--       (migrate.js는 전체 DROP+재구축이므로 쓰지 말 것)

DROP TABLE IF EXISTS tournament_divisions;

CREATE TABLE tournament_divisions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id     INTEGER NOT NULL REFERENCES tournaments(id),
  division_type     TEXT    NOT NULL CHECK(division_type IN (
                      'male_individual','male_team',
                      'female_individual','female_team'
                    )),
  label             TEXT,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  participant_count INTEGER,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tournament_id, division_type, label)
);
