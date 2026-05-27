-- ============================================================
-- 002_seed.sql  |  실업선수 단체전 1부 팀 / 선수 데이터
-- ============================================================

PRAGMA foreign_keys = ON;

-- ============================================================
-- 팀 25개 (여자부 9 + 남자부 18, 공통 2개 제외)
-- ============================================================
INSERT INTO teams (name, slug, region) VALUES
  ('경주시청',         'gyeongju',      '경북 경주'),
  ('충청남도체육회',    'chungnam',      '충남'),
  ('부산광역시체육회',  'busan',         '부산'),
  ('화성특례시청',     'hwaseong',      '경기 화성'),
  ('포항시체육회',     'pohang',        '경북 포항'),
  ('탐솔라',          'tamsola',       NULL),
  ('충청북도체육회',   'chungbuk',      '충북'),
  ('세종시검도회',     'sejong',        '세종'),
  ('김해시체육회',     'gimhae',        '경남 김해'),
  ('광명시청',        'gwangmyeong',   '경기 광명'),
  ('달서구청',        'dalseo',        '대구 달서'),
  ('광주북구청',      'gwangju-buk',   '광주 북구'),
  ('용인특례시청',     'yongin',        '경기 용인'),
  ('인제군청',        'inje',          '강원 인제'),
  ('구미시청',        'gumi',          '경북 구미'),
  ('울산광역시체육회', 'ulsan',         '울산'),
  ('청주시청',        'cheongju',      '충북 청주'),
  ('부천시청',        'bucheon',       '경기 부천'),
  ('대전광역시체육회', 'daejeon',       '대전'),
  ('남양주시청',      'namyangju',     '경기 남양주'),
  ('인천광역시청',     'incheon',       '인천'),
  ('전북원스포츠단',   'jeonbuk-won',   '전북'),
  ('창원시청',        'changwon',      '경남 창원'),
  ('수원특례시청',     'suwon',         '경기 수원'),
  ('무안군청',        'muan',          '전남 무안');

-- ============================================================
-- 선수 — 여자부 단체전 1부
-- ============================================================

-- A조 1. 경주시청 (team_id=1)
INSERT INTO players (team_id, name, slug) VALUES
  (1, '정현지', 'jeong-hyeonji'),
  (1, '김유정', 'kim-yujeong'),
  (1, '백다솜', 'baek-dasom'),
  (1, '전세영', 'jeon-seyeong'),
  (1, '김미진', 'kim-mijin'),
  (1, '차민지', 'cha-minji');

-- A조 2. 충청남도체육회 (team_id=2)
INSERT INTO players (team_id, name, slug) VALUES
  (2, '박시은', 'bak-sieun'),
  (2, '공수빈', 'gong-subin'),
  (2, '양혜원', 'yang-hyewon'),
  (2, '지은비', 'ji-eunbi'),
  (2, '안수현', 'an-suhyeon'),
  (2, '진소형', 'jin-sohyeong'),
  (2, '이민경', 'lee-mingyeong');

-- A조 3. 부산광역시체육회 (team_id=3)
INSERT INTO players (team_id, name, slug) VALUES
  (3, '신민정', 'shin-minjeong'),
  (3, '김서연', 'kim-seoyeon');

-- A조 4. 화성특례시청 (team_id=4)
INSERT INTO players (team_id, name, slug) VALUES
  (4, '한하늘', 'han-haneul'),
  (4, '김상흔', 'kim-sangheun'),
  (4, '김혜원', 'kim-hyewon'),
  (4, '조유빈', 'jo-yubin'),
  (4, '김은빈', 'kim-eunbin'),
  (4, '신동아', 'shin-donga');

-- B조 5. 포항시체육회 (team_id=5)
INSERT INTO players (team_id, name, slug) VALUES
  (5, '김민서', 'kim-minseo'),
  (5, '윤하늘', 'yoon-haneul'),
  (5, '김민지', 'kim-minji-pohang');

-- B조 6. 탐솔라 (team_id=6)
INSERT INTO players (team_id, name, slug) VALUES
  (6, '최주원', 'choi-juwon'),
  (6, '정서현', 'jeong-seohyeon'),
  (6, '이지은', 'lee-jieun'),
  (6, '조희선', 'jo-huiseon');

-- B조 7. 충청북도체육회 (team_id=7)
INSERT INTO players (team_id, name, slug) VALUES
  (7, '이찬주', 'lee-chanju'),
  (7, '박나영', 'bak-nayeong'),
  (7, '전혜지', 'jeon-hyeji'),
  (7, '박세연', 'bak-seyeon'),
  (7, '조은혜', 'jo-eunhye'),
  (7, '이혜림', 'lee-hyerim');

-- B조 8. 세종시검도회 (team_id=8)
INSERT INTO players (team_id, name, slug) VALUES
  (8, '도윤지',   'do-yunji'),
  (8, '유현지',   'yu-hyeonji'),
  (8, '강새름이', 'gang-saereumi'),
  (8, '김민지',   'kim-minji-sejong');

-- B조 9. 김해시체육회 (team_id=9)
INSERT INTO players (team_id, name, slug) VALUES
  (9, '최성희', 'choi-seonghui'),
  (9, '박지윤', 'bak-jiyun'),
  (9, '남주희', 'nam-juhui'),
  (9, '황유빈', 'hwang-yubin'),
  (9, '남지윤', 'nam-jiyun');

-- ============================================================
-- 선수 — 남자부 단체전 1부
-- ============================================================

-- A조 1. 광명시청 (team_id=10)
INSERT INTO players (team_id, name, slug) VALUES
  (10, '이호진', 'lee-hojin'),
  (10, '남우석', 'nam-useok'),
  (10, '송영준', 'song-yeongjun'),
  (10, '김종훈', 'kim-jonghun'),
  (10, '정종현', 'jeong-jonghyeon'),
  (10, '김배훈', 'kim-baehun'),
  (10, '김상준', 'kim-sangjun'),
  (10, '권오규', 'gwon-ogyu'),
  (10, '김정수', 'kim-jeongsu');

-- A조 2. 달서구청 (team_id=11)
INSERT INTO players (team_id, name, slug) VALUES
  (11, '주연우', 'ju-yeonu'),
  (11, '정송윤', 'jeong-songyun'),
  (11, '김진옥', 'kim-jinok'),
  (11, '김재승', 'kim-jaeseung'),
  (11, '손은기', 'son-eungi'),
  (11, '이영욱', 'lee-yeonguk'),
  (11, '문인식', 'mun-insik'),
  (11, '정지훈', 'jeong-jihun'),
  (11, '장정영', 'jang-jeongyeong');

-- A조 3. 광주북구청 (team_id=12)
INSERT INTO players (team_id, name, slug) VALUES
  (12, '김헌영', 'kim-heonyeong'),
  (12, '김헌수', 'kim-heonsu'),
  (12, '김지형', 'kim-jihyeong'),
  (12, '김현수', 'kim-hyeonsu'),
  (12, '최다원', 'choi-dawon'),
  (12, '김영운', 'kim-yeongun'),
  (12, '안태준', 'an-taejun'),
  (12, '정우진', 'jeong-ujin');

-- A조 4. 용인특례시청 (team_id=13)
INSERT INTO players (team_id, name, slug) VALUES
  (13, '조진용', 'jo-jinyong'),
  (13, '신왕준', 'shin-wangjun'),
  (13, '이진혁', 'lee-jinhyeok'),
  (13, '이환점', 'lee-hwanjeom'),
  (13, '정용석', 'jeong-yongseok'),
  (13, '김태연', 'kim-taeyeon'),
  (13, '김종국', 'kim-jonguk'),
  (13, '한솔민', 'han-solmin');

-- A조 5. 충청남도체육회 (team_id=2) — 남자부 선수 추가
INSERT INTO players (team_id, name, slug) VALUES
  (2, '조성근', 'jo-seonggeun'),
  (2, '전태훈', 'jeon-taehun'),
  (2, '김영준', 'kim-yeongjun'),
  (2, '이지민', 'lee-jimin'),
  (2, '남현준', 'nam-hyeonjun');

-- A조 6. 부산광역시체육회 (team_id=3) — 남자부 선수 추가
INSERT INTO players (team_id, name, slug) VALUES
  (3, '김동은', 'kim-dongeun'),
  (3, '양상범', 'yang-sangbeom'),
  (3, '김태근', 'kim-taegeun'),
  (3, '황성민', 'hwang-seongmin'),
  (3, '이경태', 'lee-gyeongtae'),
  (3, '김성구', 'kim-seongu');

-- A조 7. 인제군청 (team_id=14)
INSERT INTO players (team_id, name, slug) VALUES
  (14, '김선문', 'kim-seonmun'),
  (14, '장보운', 'jang-boun'),
  (14, '이성재', 'lee-seongjae'),
  (14, '최명환', 'choi-myeonghwan'),
  (14, '김현세', 'kim-hyeonse'),
  (14, '배종영', 'bae-jongyeong'),
  (14, '동한혁', 'dong-hanhyeok');

-- A조 8. 구미시청 (team_id=15)
INSERT INTO players (team_id, name, slug) VALUES
  (15, '이주섭', 'lee-juseop'),
  (15, '이창훈', 'lee-changhun-gumi'),
  (15, '김도하', 'kim-doha'),
  (15, '손재혁', 'son-jaehyeok'),
  (15, '김경수', 'kim-gyeongsu'),
  (15, '선재우', 'seon-jaeu'),
  (15, '배진영', 'bae-jinyeong'),
  (15, '장찬익', 'jang-chanik');

-- A조 9. 울산광역시체육회 (team_id=16)
INSERT INTO players (team_id, name, slug) VALUES
  (16, '이지용', 'lee-jiyong'),
  (16, '박인우', 'bak-inu'),
  (16, '이종현', 'lee-jonghyeon'),
  (16, '양옥',   'yang-ok'),
  (16, '김채윤', 'kim-chaeyun'),
  (16, '김우주', 'kim-uju'),
  (16, '양재균', 'yang-jaegyun');

-- B조 10. 청주시청 (team_id=17)
INSERT INTO players (team_id, name, slug) VALUES
  (17, '김다용', 'kim-dayong'),
  (17, '정형준', 'jeong-hyeongjun'),
  (17, '방준호', 'bang-junho'),
  (17, '하태효', 'ha-taehyo'),
  (17, '임형석', 'im-hyeongseok'),
  (17, '장재선', 'jang-jaeseon'),
  (17, '박찬민', 'bak-chanmin'),
  (17, '이대영', 'lee-daeyeong'),
  (17, '김인성', 'kim-inseong');

-- B조 11. 부천시청 (team_id=18)
INSERT INTO players (team_id, name, slug) VALUES
  (18, '이진영', 'lee-jinyeong'),
  (18, '선현관', 'seon-hyeongwan'),
  (18, '박윤서', 'bak-yunseo'),
  (18, '박인거', 'bak-ingeo'),
  (18, '남기호', 'nam-giho'),
  (18, '김승겸', 'kim-seunggyeom'),
  (18, '송자용', 'song-jayong'),
  (18, '김은우', 'kim-eunu');

-- B조 12. 대전광역시체육회 (team_id=19)
INSERT INTO players (team_id, name, slug) VALUES
  (19, '고현준', 'go-hyeonjun'),
  (19, '조민진', 'jo-minjin'),
  (19, '김규민', 'kim-gyumin'),
  (19, '김범규', 'kim-beomgyu'),
  (19, '김준성', 'kim-junseong'),
  (19, '조인영', 'jo-inyeong'),
  (19, '조재혁', 'jo-jaehyeok');

-- B조 13. 남양주시청 (team_id=20)
INSERT INTO players (team_id, name, slug) VALUES
  (20, '김다온', 'kim-daon'),
  (20, '최강',   'choi-gang'),
  (20, '노진수', 'no-jinsu'),
  (20, '남현호', 'nam-hyeonho'),
  (20, '김경진', 'kim-gyeongjin'),
  (20, '김회찬', 'kim-hoechan'),
  (20, '김용하', 'kim-yongha'),
  (20, '이민재', 'lee-minjae');

-- B조 14. 인천광역시청 (team_id=21)
INSERT INTO players (team_id, name, slug) VALUES
  (21, '윤범열', 'yun-beomnyeol'),
  (21, '박효준', 'bak-hyojun'),
  (21, '송건',   'song-geon'),
  (21, '원건희', 'won-geonhui'),
  (21, '정준호', 'jeong-junho'),
  (21, '최경재', 'choi-gyeongjae'),
  (21, '이마루', 'lee-maru');

-- B조 15. 전북원스포츠단 (team_id=22)
INSERT INTO players (team_id, name, slug) VALUES
  (22, '이창훈', 'lee-changhun-jeonbuk'),
  (22, '서민영', 'seo-minyeong'),
  (22, '권수민', 'gwon-sumin'),
  (22, '장지원', 'jang-jiwon'),
  (22, '위성진', 'wi-seongjin'),
  (22, '황선우', 'hwang-seonu'),
  (22, '김경운', 'kim-gyeongun');

-- B조 16. 창원시청 (team_id=23)
INSERT INTO players (team_id, name, slug) VALUES
  (23, '차석환', 'cha-seokhwan'),
  (23, '이상호', 'lee-sangho-changwon'),
  (23, '박상준', 'bak-sangjun'),
  (23, '장종렬', 'jang-jongyeol'),
  (23, '박현진', 'bak-hyeonjin'),
  (23, '이수준', 'lee-sujun'),
  (23, '최원기', 'choi-wongi'),
  (23, '유승우', 'yu-seungu'),
  (23, '이준혁', 'lee-junhyeok');

-- B조 17. 수원특례시청 (team_id=24)
INSERT INTO players (team_id, name, slug) VALUES
  (24, '홍성훈', 'hong-seonghun'),
  (24, '이상호', 'lee-sangho-suwon'),
  (24, '권병진', 'gwon-byeongjin'),
  (24, '박승준', 'bak-seungjun'),
  (24, '최민선', 'choi-minseon'),
  (24, '김수호', 'kim-suho'),
  (24, '최시연', 'choi-siyeon'),
  (24, '장지민', 'jang-jimin');

-- B조 18. 무안군청 (team_id=25)
INSERT INTO players (team_id, name, slug) VALUES
  (25, '유하늘', 'yu-haneul'),
  (25, '송인준', 'song-injun'),
  (25, '이후성', 'lee-huseong'),
  (25, '정경인', 'jeong-gyeongin'),
  (25, '이해솔', 'lee-haesol'),
  (25, '김현서', 'kim-hyeonseo'),
  (25, '이승헌', 'lee-seungheon');

-- ============================================================
-- 대회
-- ============================================================
INSERT INTO tournaments
  (name, slug, start_date, end_date, venue, host_organization, tournament_type, status)
VALUES
  ('2026 전국실업검도선수권대회',
   '2026-national-championship',
   '2026-06-14',
   '2026-06-15',
   '충무체육관 (창원)',
   '대한검도회',
   '단체전',
   '예정');
