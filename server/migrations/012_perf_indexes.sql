-- ------------------------------------------------------------
-- 성능: player_id 참조 인덱스
-- /api/players 목록은 선수별 (SELECT COUNT(*) FROM follows WHERE player_id=?) 서브쿼리를
-- 돌리는데, follows PK가 (user_id, player_id) 라 player_id 단독 조회는 풀스캔이었다.
-- 인덱스 추가로 목록 응답 1.6s → ~0.4s.
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_follows_player ON follows(player_id);
CREATE INDEX IF NOT EXISTS idx_clinics_player ON clinics(player_id);
CREATE INDEX IF NOT EXISTS idx_stats_player   ON player_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_gear_player    ON player_gear(player_id);
