-- ============================================================
-- 006_data_enrich.sql  |  선수 상세정보 + 가라 유저 랭킹
-- ============================================================

PRAGMA foreign_keys = ON;

-- ============================================================
-- 1. 선수 상세정보 업데이트 (여자부 주요 선수)
-- ============================================================

UPDATE players SET dan_grade=7, birth_year=1998, position='대장',  bio='경주시청 에이스. 정확한 머리 기술과 강인한 체력이 무기.' WHERE slug='jeong-hyeonji';
UPDATE players SET dan_grade=6, birth_year=2000, position='부장',  bio='빠른 발놀림과 날카로운 허리 기술이 특기.' WHERE slug='kim-yujeong';
UPDATE players SET dan_grade=6, birth_year=2001, position='중견',  bio='경주시청 중견. 안정적인 경기 운영이 강점.' WHERE slug='baek-dasom';
UPDATE players SET dan_grade=5, birth_year=2003, position='이봉',  bio='젊은 기대주. 공격적인 스타일.' WHERE slug='jeon-seyeong';
UPDATE players SET dan_grade=7, birth_year=1997, position='선봉',  bio='베테랑 선봉. 첫판을 지배하는 압도적인 기세.' WHERE slug='kim-mijin';

UPDATE players SET dan_grade=7, birth_year=1996, position='대장',  bio='충남체육회 대장. 풍부한 실전 경험과 냉철한 판단력.' WHERE slug='bak-sieun';
UPDATE players SET dan_grade=6, birth_year=1999, position='부장',  bio='변칙 기술과 카운터가 특기인 올라운더.' WHERE slug='gong-subin';
UPDATE players SET dan_grade=6, birth_year=2001, position='중견',  bio='꼼꼼한 수비와 효율적인 공격을 겸비.' WHERE slug='yang-hyewon';

UPDATE players SET dan_grade=7, birth_year=1995, position='대장',  bio='화성시청 에이스. 전국 대회 다수 우승 경력.' WHERE slug='han-haneul';
UPDATE players SET dan_grade=6, birth_year=2000, position='중견',  bio='탄탄한 기본기와 지구력이 강점.' WHERE slug='kim-hyewon';
UPDATE players SET dan_grade=5, birth_year=2003, position='이봉',  bio='신예 돌풍. 과감한 공격으로 주목받는 선수.' WHERE slug='jo-yubin';

UPDATE players SET dan_grade=7, birth_year=1997, position='대장',  bio='탐솔라 에이스. 독보적인 기술 완성도.' WHERE slug='choi-juwon';
UPDATE players SET dan_grade=6, birth_year=1999, position='중견',  bio='안정적인 경기 운영과 강한 멘탈.' WHERE slug='jeong-seohyeon';

UPDATE players SET dan_grade=7, birth_year=1996, position='대장',  bio='충북체육회 간판. 국가대표 출신의 실력자.' WHERE slug='lee-chanju';
UPDATE players SET dan_grade=6, birth_year=2000, position='부장',  bio='파워풀한 타격과 빠른 선제 공격.' WHERE slug='bak-nayeong';

-- ============================================================
-- 2. 선수 상세정보 업데이트 (남자부 주요 선수)
-- ============================================================

UPDATE players SET dan_grade=8, birth_year=1990, position='대장',  bio='광명시청 대장. 8단 고수. 대한민국 최정상급 기량을 보유한 레전드.' WHERE slug='lee-hojin';
UPDATE players SET dan_grade=7, birth_year=1994, position='부장',  bio='넓은 간격과 빠른 머리치기가 일품.' WHERE slug='nam-useok';
UPDATE players SET dan_grade=7, birth_year=1996, position='중견',  bio='균형 잡힌 공수로 팀의 중심을 잡는 선수.' WHERE slug='song-yeongjun';
UPDATE players SET dan_grade=6, birth_year=1999, position='이봉',  bio='기세가 넘치는 돌진형 스타일.' WHERE slug='kim-jonghun';
UPDATE players SET dan_grade=8, birth_year=1988, position='선봉',  bio='전국 최고 수준의 선봉. 첫판을 무조건 가져간다는 평판.' WHERE slug='jeong-jonghyeon';

UPDATE players SET dan_grade=8, birth_year=1989, position='대장',  bio='달서구청 대장. 국가대표 출신. 연간 10개 이상 타이틀을 보유한 전설.' WHERE slug='ju-yeonu';
UPDATE players SET dan_grade=7, birth_year=1993, position='부장',  bio='정교한 코테 기술과 냉철한 경기 운영.' WHERE slug='jeong-songyun';
UPDATE players SET dan_grade=7, birth_year=1995, position='중견',  bio='화력과 지구력을 겸비한 다재다능한 선수.' WHERE slug='kim-jinok';

UPDATE players SET dan_grade=7, birth_year=1992, position='대장',  bio='광주북구청 간판. 날카로운 도발과 역습이 특기.' WHERE slug='kim-heonyeong';
UPDATE players SET dan_grade=7, birth_year=1994, position='중견',  bio='안정적인 수비와 반격이 돋보이는 선수.' WHERE slug='kim-heonsu';

UPDATE players SET dan_grade=8, birth_year=1991, position='대장',  bio='용인시청 에이스. 압도적인 피지컬과 기술의 조화.' WHERE slug='jo-jinyong';
UPDATE players SET dan_grade=7, birth_year=1993, position='부장',  bio='전략적 경기 운영으로 팀을 이끄는 핵심 선수.' WHERE slug='shin-wangjun';
UPDATE players SET dan_grade=7, birth_year=1996, position='중견',  bio='화끈한 공격 스타일로 팬들의 사랑을 받는 선수.' WHERE slug='lee-jinhyeok';

-- ============================================================
-- 3. player_stats (선수 전적) 입력
-- ============================================================

INSERT OR IGNORE INTO player_stats (player_id, total_matches, wins, losses, championships_won)
SELECT id, 0, 0, 0, 0 FROM players;

UPDATE player_stats SET total_matches=312, wins=248, losses=64,  championships_won=12 WHERE player_id=(SELECT id FROM players WHERE slug='lee-hojin');
UPDATE player_stats SET total_matches=287, wins=221, losses=66,  championships_won=9  WHERE player_id=(SELECT id FROM players WHERE slug='ju-yeonu');
UPDATE player_stats SET total_matches=195, wins=148, losses=47,  championships_won=6  WHERE player_id=(SELECT id FROM players WHERE slug='jeong-jonghyeon');
UPDATE player_stats SET total_matches=241, wins=183, losses=58,  championships_won=8  WHERE player_id=(SELECT id FROM players WHERE slug='jo-jinyong');
UPDATE player_stats SET total_matches=178, wins=131, losses=47,  championships_won=5  WHERE player_id=(SELECT id FROM players WHERE slug='kim-heonyeong');
UPDATE player_stats SET total_matches=156, wins=112, losses=44,  championships_won=4  WHERE player_id=(SELECT id FROM players WHERE slug='shin-wangjun');
UPDATE player_stats SET total_matches=143, wins=100, losses=43,  championships_won=3  WHERE player_id=(SELECT id FROM players WHERE slug='nam-useok');

UPDATE player_stats SET total_matches=203, wins=162, losses=41,  championships_won=8  WHERE player_id=(SELECT id FROM players WHERE slug='jeong-hyeonji');
UPDATE player_stats SET total_matches=187, wins=144, losses=43,  championships_won=7  WHERE player_id=(SELECT id FROM players WHERE slug='lee-chanju');
UPDATE player_stats SET total_matches=172, wins=128, losses=44,  championships_won=5  WHERE player_id=(SELECT id FROM players WHERE slug='han-haneul');
UPDATE player_stats SET total_matches=145, wins=107, losses=38,  championships_won=4  WHERE player_id=(SELECT id FROM players WHERE slug='bak-sieun');
UPDATE player_stats SET total_matches=134, wins=98,  losses=36,  championships_won=3  WHERE player_id=(SELECT id FROM players WHERE slug='choi-juwon');
UPDATE player_stats SET total_matches=112, wins=79,  losses=33,  championships_won=2  WHERE player_id=(SELECT id FROM players WHERE slug='kim-mijin');

-- ============================================================
-- 4. 대회 픽 마감일 + 부문 설정
-- ============================================================

UPDATE tournaments
SET pick_deadline = '2026-06-13T23:59:00',
    has_male_team = 1,
    has_female_team = 1,
    status = '예정'
WHERE slug = '2026-national-championship';

-- 여자부 단체전 부문
INSERT OR IGNORE INTO tournament_divisions (tournament_id, division_type, participant_count)
SELECT id, 'female_team', 9 FROM tournaments WHERE slug='2026-national-championship';

-- 남자부 단체전 부문
INSERT OR IGNORE INTO tournament_divisions (tournament_id, division_type, participant_count)
SELECT id, 'male_team', 16 FROM tournaments WHERE slug='2026-national-championship';

-- ============================================================
-- 5. 부문별 참가팀 등록
-- ============================================================

-- 여자부 (9개 팀)
INSERT OR IGNORE INTO division_participants (division_id, team_id, seed_number)
SELECT
  (SELECT td.id FROM tournament_divisions td
   JOIN tournaments t ON t.id = td.tournament_id
   WHERE t.slug='2026-national-championship' AND td.division_type='female_team'),
  t.id,
  ROW_NUMBER() OVER (ORDER BY t.id)
FROM teams t WHERE t.slug IN (
  'gyeongju','chungnam','busan','hwaseong','pohang','tamsola','chungbuk','sejong','gimhae'
);

-- 남자부 (16개 팀)
INSERT OR IGNORE INTO division_participants (division_id, team_id, seed_number)
SELECT
  (SELECT td.id FROM tournament_divisions td
   JOIN tournaments t ON t.id = td.tournament_id
   WHERE t.slug='2026-national-championship' AND td.division_type='male_team'),
  t.id,
  ROW_NUMBER() OVER (ORDER BY t.id)
FROM teams t WHERE t.slug IN (
  'gwangmyeong','dalseo','gwangju-buk','yongin','chungnam','busan',
  'inje','gumi','ulsan','cheongju','bucheon','daejeon',
  'namyangju','incheon','jeonbuk-won','changwon'
);

-- ============================================================
-- 6. 가라 유저 20명 생성
-- ============================================================

INSERT OR IGNORE INTO users (phone, nickname, home_dojo, dan_grade) VALUES
  ('검도팬_1001',  '검도왕',     '서울 강남도장',   6),
  ('검도팬_1002',  '죽도마스터', '부산 해운대도장', 5),
  ('검도팬_1003',  '머리치기장인', '대전 중앙도장', 4),
  ('검도팬_1004',  '호구전사',   '대구 달서도장',   5),
  ('검도팬_1005',  '코테헌터',   '광주 북구도장',   4),
  ('검도팬_1006',  '도헤인',     '인천 남동도장',   3),
  ('검도팬_1007',  '선봉의신',   '수원 팔달도장',   6),
  ('검도팬_1008',  '대장배출기', '울산 남구도장',   5),
  ('검도팬_1009',  '검도덕후',   '창원 성산도장',   4),
  ('검도팬_1010',  '죽도소년',   '청주 상당도장',   3),
  ('검도팬_1011',  '국대팬',     '경주 황성도장',   6),
  ('검도팬_1012',  '이봉킬러',   '구미 선산도장',   5),
  ('검도팬_1013',  '타이밍갓',   '남양주 와부도장', 4),
  ('검도팬_1014',  '검도철인',   '부천 원미도장',   5),
  ('검도팬_1015',  '면허취득자', '화성 동탄도장',   4),
  ('검도팬_1016',  '격검불이',   '인제 북면도장',   3),
  ('검도팬_1017',  '검도사랑',   '전주 완산도장',   4),
  ('검도팬_1018',  '죽도신화',   '창원 마산도장',   5),
  ('검도팬_1019',  '올라운더',   '무안 삼향도장',   3),
  ('검도팬_1020',  '검도입문자', NULL,             2);

-- ============================================================
-- 7. 가라 유저 픽 + 점수 입력
-- ============================================================

-- female_team division_id 변수 역할 (서브쿼리로 처리)
INSERT OR IGNORE INTO tournament_picks
  (user_id, division_id, pick_1st, pick_2nd, pick_3rd_a, pick_3rd_b, is_locked, locked_at, score)
SELECT
  u.id,
  td.id,
  (SELECT dp.id FROM division_participants dp WHERE dp.division_id=td.id ORDER BY dp.seed_number LIMIT 1 OFFSET 0),
  (SELECT dp.id FROM division_participants dp WHERE dp.division_id=td.id ORDER BY dp.seed_number LIMIT 1 OFFSET 1),
  (SELECT dp.id FROM division_participants dp WHERE dp.division_id=td.id ORDER BY dp.seed_number LIMIT 1 OFFSET 2),
  (SELECT dp.id FROM division_participants dp WHERE dp.division_id=td.id ORDER BY dp.seed_number LIMIT 1 OFFSET 3),
  1,
  datetime('now', '-' || (u.id % 5 + 1) || ' days'),
  CASE u.id % 5
    WHEN 0 THEN 9
    WHEN 1 THEN 7
    WHEN 2 THEN 5
    WHEN 3 THEN 3
    ELSE 0
  END
FROM users u
CROSS JOIN tournament_divisions td
JOIN tournaments t ON t.id = td.tournament_id
WHERE t.slug = '2026-national-championship'
  AND td.division_type = 'female_team'
  AND u.phone LIKE '검도팬_%';

-- male_team picks
INSERT OR IGNORE INTO tournament_picks
  (user_id, division_id, pick_1st, pick_2nd, pick_3rd_a, pick_3rd_b, is_locked, locked_at, score)
SELECT
  u.id,
  td.id,
  (SELECT dp.id FROM division_participants dp WHERE dp.division_id=td.id ORDER BY dp.seed_number LIMIT 1 OFFSET 0),
  (SELECT dp.id FROM division_participants dp WHERE dp.division_id=td.id ORDER BY dp.seed_number LIMIT 1 OFFSET 1),
  (SELECT dp.id FROM division_participants dp WHERE dp.division_id=td.id ORDER BY dp.seed_number LIMIT 1 OFFSET 2),
  (SELECT dp.id FROM division_participants dp WHERE dp.division_id=td.id ORDER BY dp.seed_number LIMIT 1 OFFSET 3),
  1,
  datetime('now', '-' || (u.id % 5 + 1) || ' days'),
  CASE u.id % 5
    WHEN 0 THEN 8
    WHEN 1 THEN 6
    WHEN 2 THEN 4
    WHEN 3 THEN 2
    ELSE 1
  END
FROM users u
CROSS JOIN tournament_divisions td
JOIN tournaments t ON t.id = td.tournament_id
WHERE t.slug = '2026-national-championship'
  AND td.division_type = 'male_team'
  AND u.phone LIKE '검도팬_%';

-- ============================================================
-- 8. 팔로우 (인기 선수 팬 수 세팅)
-- ============================================================

INSERT OR IGNORE INTO follows (user_id, player_id)
SELECT u.id, p.id FROM users u
CROSS JOIN players p
WHERE p.slug IN ('lee-hojin','ju-yeonu','jeong-hyeonji','jo-jinyong','jeong-jonghyeon')
  AND u.phone LIKE '검도팬_%';

INSERT OR IGNORE INTO follows (user_id, player_id)
SELECT u.id, p.id FROM users u
CROSS JOIN players p
WHERE p.slug IN ('lee-chanju','han-haneul','bak-sieun','shin-wangjun','lee-jinhyeok')
  AND u.phone LIKE '검도팬_%'
  AND u.id % 2 = 0;

INSERT OR IGNORE INTO follows (user_id, player_id)
SELECT u.id, p.id FROM users u
CROSS JOIN players p
WHERE p.slug IN ('kim-heonyeong','nam-useok','song-yeongjun','choi-juwon','kim-mijin')
  AND u.phone LIKE '검도팬_%'
  AND u.id % 3 = 0;
