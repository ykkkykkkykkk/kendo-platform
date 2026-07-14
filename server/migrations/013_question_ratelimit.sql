-- ------------------------------------------------------------
-- 선수 Q&A 하루 1회 제한을 '질문 행 수'가 아닌 users.last_question_at 로 판정.
-- 기존엔 질문을 삭제하면 오늘 행이 사라져 하루제한을 우회할 수 있었다.
-- last_question_at 은 삭제와 무관하게 남으므로 삭제→재질문 우회가 불가능하다.
-- ------------------------------------------------------------
ALTER TABLE users ADD COLUMN last_question_at TEXT;

-- 백필: 기존 유저의 마지막 질문 시각으로 채워 현재 하루제한 상태 보존
UPDATE users SET last_question_at = (
  SELECT MAX(created_at) FROM player_questions WHERE user_id = users.id
) WHERE EXISTS (SELECT 1 FROM player_questions WHERE user_id = users.id);
