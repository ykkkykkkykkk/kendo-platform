-- 방문 기록 (익명 방문자 통계용). PII 없음: visitor_id는 클라이언트 localStorage의 랜덤 UUID.
CREATE TABLE IF NOT EXISTS page_visits (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id TEXT NOT NULL,
  path       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 기간 필터(일별/월별 집계)용
CREATE INDEX IF NOT EXISTS idx_page_visits_created ON page_visits (created_at);
-- 순방문자(DISTINCT visitor_id) 집계 가속
CREATE INDEX IF NOT EXISTS idx_page_visits_visitor ON page_visits (visitor_id, created_at);
