import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// POST /api/track  body: { visitor_id, path }
// 비로그인 포함 모든 방문 1건 기록. 익명 visitor_id(클라 localStorage UUID)만 저장, PII 없음.
router.post('/track', async (req, res) => {
  try {
    const { visitor_id, path, is_app } = req.body ?? {};
    if (!visitor_id || typeof visitor_id !== 'string' || visitor_id.length < 8 || visitor_id.length > 64) {
      return res.status(400).json({ ok: false });
    }
    // 옛 클라이언트는 is_app을 안 보낸다. 그때는 NULL로 둔다 —
    // 모르는 걸 웹으로 몰아 세면 앱 비율이 실제보다 낮게 나온다.
    const isApp = typeof is_app === 'boolean' ? (is_app ? 1 : 0) : null;
    await db.execute({
      sql: 'INSERT INTO page_visits (visitor_id, path, is_app) VALUES (?, ?, ?)',
      args: [visitor_id, typeof path === 'string' ? path.slice(0, 256) : null, isApp],
    });
    res.json({ ok: true });
  } catch {
    // 통계 수집 실패가 사용자 경험을 막지 않도록 조용히 무시
    res.status(200).json({ ok: false });
  }
});

export default router;
