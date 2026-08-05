// 웹푸시 발송.
//
// 알림함(notifications)은 앱을 열어야 보인다. 여기서는 앱을 닫아둬도 잠금화면에 뜨게 한다.
// 카카오 알림톡과 달리 사업자등록증·발송대행사·건당 과금이 없다.
//
// VAPID 키는 env(VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY)가 있으면 그걸 쓰고,
// 없으면 app_settings에 한 번 만들어 저장해 계속 같은 키를 쓴다.
// (키가 바뀌면 기존 구독이 전부 무효가 되므로 반드시 고정돼야 한다)
import webpush from 'web-push';
import { db } from '../db.js';

const SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:admin@minorstar.kr';
let cached = null;

async function getVapid() {
  if (cached) return cached;

  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    cached = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  } else {
    const { rows } = await db.execute(
      "SELECT key, value FROM app_settings WHERE key IN ('vapid_public', 'vapid_private')"
    );
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    if (map.vapid_public && map.vapid_private) {
      cached = { publicKey: map.vapid_public, privateKey: map.vapid_private };
    } else {
      const keys = webpush.generateVAPIDKeys();
      await db.execute({
        sql: 'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?), (?, ?)',
        args: ['vapid_public', keys.publicKey, 'vapid_private', keys.privateKey],
      });
      cached = keys;
      console.log('[push] VAPID 키를 새로 만들어 app_settings에 저장했습니다.');
    }
  }

  webpush.setVapidDetails(SUBJECT, cached.publicKey, cached.privateKey);
  return cached;
}

export async function publicKey() {
  return (await getVapid()).publicKey;
}

/** 구독한 기기로 푸시를 보낸다. 실패해도 본 동작을 막지 않는다. */
export async function sendPush(userIds, { title, body, link }) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return;

  try {
    await getVapid();
  } catch (e) {
    console.warn('[push] VAPID 준비 실패:', e.message);
    return;
  }

  const { rows: subs } = await db.execute({
    sql: `SELECT id, endpoint, p256dh, auth FROM push_subscriptions
          WHERE user_id IN (${ids.map(() => '?').join(',')})`,
    args: ids,
  });

  const payload = JSON.stringify({ title, body, link: link ?? '/' });

  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      );
    } catch (e) {
      // 404/410 = 사용자가 알림을 껐거나 브라우저가 구독을 버린 것. 지워야 계속 재시도하지 않는다.
      if (e.statusCode === 404 || e.statusCode === 410) {
        await db.execute({ sql: 'DELETE FROM push_subscriptions WHERE id = ?', args: [s.id] });
      } else {
        await db.execute({
          sql: "UPDATE push_subscriptions SET failed_at = datetime('now') WHERE id = ?", args: [s.id],
        });
        console.warn('[push] 발송 실패', e.statusCode, e.message);
      }
    }
  }
}
