-- 카카오 로그인.
--
-- kakao_id는 카카오가 주는 회원 고유번호. 같은 사람이 두 번 가입할 수 없게 UNIQUE로 묶는다.
-- (닉네임+휴대폰 끝 4자리 방식은 본인 확인이 안 돼 중복 가입을 막을 수 없었다)
--
-- phone은 NULL 허용이라 카카오로 가입한 회원은 비워둔다.
-- 기존 회원은 phone을 그대로 둔 채 kakao_id만 붙여 연결한다.
ALTER TABLE users ADD COLUMN kakao_id TEXT;

-- NULL은 UNIQUE 검사에서 서로 충돌하지 않으므로 부분 인덱스로 충분하다.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_kakao_id
  ON users(kakao_id) WHERE kakao_id IS NOT NULL;

-- 기존 계정을 카카오에 연결한 시각. 연결 창구를 언제 닫을지 판단할 때 본다.
ALTER TABLE users ADD COLUMN kakao_linked_at TEXT;
