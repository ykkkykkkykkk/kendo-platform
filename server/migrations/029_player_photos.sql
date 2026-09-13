-- 029: 선수 프로필을 사진 중심으로 바꾸면서 필요한 칸.
--
-- 지금까지 선수 사진은 profile_image_url 하나뿐이라 목록용 동그란 썸네일로만 썼다.
-- 프로필 상단을 명패처럼 만들려면 성격이 다른 사진 두 장이 필요하다.
--   hero_image_url — 호구를 쓴 세로 사진. 이름이 얹히는 배경이라 인물이 가운데 있어야 한다.
--   face_image_url — 호구를 벗은 맨얼굴. "이 사람이 이렇게 생겼다"를 보여준다.
-- 둘 다 없으면 화면은 예전처럼 이니셜과 글씨로만 채워진다(필수 아님).
--
-- specialty는 정보 칩에 들어갈 주특기 한 마디다 ("머리치기", "손목-머리" 같은).
--
-- 적용: node apply-migration.js 029_player_photos.sql

ALTER TABLE players ADD COLUMN hero_image_url TEXT;
ALTER TABLE players ADD COLUMN face_image_url TEXT;
ALTER TABLE players ADD COLUMN specialty      TEXT;
