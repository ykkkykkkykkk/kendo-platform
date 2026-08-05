// 웹푸시 구독 관리.
// 브라우저가 만든 구독(endpoint + 키 2개)을 계정에 매달아 두고, 알림 때 그리로 보낸다.
import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { serverError } from '../utils/apiError.js';
import { publicKey, sendPush } from '../utils/push.js';

const router = Router();

// GET /api/push/key — 브라우저가 구독할 때 필요한 공개키
router.get('/push/key', async (_req, res) => {
  try {
    res.json({ key: await publicKey() });
  } catch (e) { serverError(res, e, 'push-key'); }
});

// POST /api/push/subscribe — 구독 등록 (같은 기기면 계정만 갱신)
router.post('/push/subscribe', requireAuth, async (req, res) => {
  try {
    const { endpoint, keys } = req.body ?? {};
    if (!endpoint || !keys?.p256dh || !keys?.auth)
      return res.status(400).json({ error: '구독 정보가 올바르지 않습니다.' });

    await db.execute({
      sql: `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(endpoint) DO UPDATE SET
              user_id = excluded.user_id, p256dh = excluded.p256dh,
              auth = excluded.auth, failed_at = NULL`,
      args: [req.user.userId, endpoint, keys.p256dh, keys.auth],
    });
    res.json({ ok: true });
  } catch (e) { serverError(res, e, 'push-subscribe'); }
});

// DELETE /api/push/subscribe — 이 기기 구독 해제
router.delete('/push/subscribe', requireAuth, async (req, res) => {
  try {
    const { endpoint } = req.body ?? {};
    if (!endpoint) return res.status(400).json({ error: 'endpoint가 필요합니다.' });
    await db.execute({
      sql: 'DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?',
      args: [endpoint, req.user.userId],
    });
    res.json({ ok: true });
  } catch (e) { serverError(res, e, 'push-unsubscribe'); }
});

// POST /api/push/test — 본인에게 테스트 발송 (설정이 됐는지 바로 확인용)
router.post('/push/test', requireAuth, async (req, res) => {
  try {
    const { rows: [{ n }] } = await db.execute({
      sql: 'SELECT COUNT(*) AS n FROM push_subscriptions WHERE user_id = ?', args: [req.user.userId],
    });
    if (!n) return res.status(400).json({ error: '이 계정에 등록된 기기가 없습니다.' });

    await sendPush([req.user.userId], {
      title: '마이너스타',
      body:  '알림이 정상으로 켜졌습니다.',
      link:  '/',
    });
    res.json({ ok: true, devices: n });
  } catch (e) { serverError(res, e, 'push-test'); }
});

export default router;
