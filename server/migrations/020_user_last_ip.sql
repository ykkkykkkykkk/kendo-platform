-- 회원 관리에서 접속 IP를 보기 위한 컬럼.
-- last_ip  : 가장 최근에 접속한 IP
-- signup_ip: 가입할 때의 IP (중복 가입 판별에 쓴다. 나중에 바뀌지 않는다)
ALTER TABLE users ADD COLUMN last_ip TEXT;
ALTER TABLE users ADD COLUMN signup_ip TEXT;
