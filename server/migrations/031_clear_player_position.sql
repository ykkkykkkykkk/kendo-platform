-- 031: 선수 포지션(선봉/이봉/중견/부장/대장) 데이터 제거.
--
-- 포지션은 팀 단체전 오더에서 그날그날 정해지는 자리지 선수의 고정 속성이 아니다.
-- 006 시드에서 23명한테만 임의로 박아둔 값이 남아 있었고, 선수 프로필의 "주특기" 칩이
-- specialty가 비면 position을 대신 보여주는 바람에 주특기 자리에 "대장/중견"이 떴다.
-- 클라이언트·관리자·API에서 포지션을 모두 걷어냈으므로 데이터도 비운다.
--
-- 컬럼 자체는 남겨둔다(되돌리기 쉽게). 쓰는 코드는 이제 없다.
--
-- 적용: node apply-migration.js 031_clear_player_position.sql

UPDATE players SET position = NULL WHERE position IS NOT NULL;
