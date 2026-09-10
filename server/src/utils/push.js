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

// SQLite 바인딩 변수는 999개가 한계다. 전체 발송이면 회원 수가 그걸 넘으므로 잘라서 조회한다.
const ID_CHUNK = 400;

/** 해당 회원들이 등록한 구독 기기 목록. */
export async function subscriptionsOf(userIds) {
  const ids = [...new Set(userIds.filter(Boolean))];
  const out = [];
  for (let i = 0; i < ids.length; i += ID_CHUNK) {
    const part = ids.slice(i, i + ID_CHUNK);
    const { rows } = await db.execute({
      sql: `SELECT id, endpoint, p256dh, auth FROM push_subscriptions
            WHERE user_id IN (${part.map(() => '?').join(',')})`,
      args: part,
    });
    out.push(...rows);
  }
  return out;
}

/** 기기 한 대에 보낸다. 결과를 'sent' | 'removed' | 'failed'로 돌려준다. */
async function sendOne(sub, payload) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
    );
    return 'sent';
  } catch (e) {
    // 404/410 = 사용자가 알림을 껐거나 브라우저가 구독을 버린 것. 지워야 계속 재시도하지 않는다.
    if (e.statusCode === 404 || e.statusCode === 410) {
      await db.execute({ sql: 'DELETE FROM push_subscriptions WHERE id = ?', args: [sub.id] });
      return 'removed';
    }
    await db.execute({
      sql: "UPDATE push_subscriptions SET failed_at = datetime('now') WHERE id = ?", args: [sub.id],
    });
    console.warn('[push] 발송 실패', e.statusCode, e.message);
    return 'failed';
  }
}

/**
 * 구독한 기기로 푸시를 보내고 결과를 집계해 돌려준다.
 *
 * 한 대씩 순서대로 보내면 전체 공지처럼 기기가 수백 대일 때 응답이 한참 걸린다.
 * 묶음으로 동시에 보내되, 푸시 서비스(FCM/APNs 게이트웨이)가 한꺼번에 몰린 요청을
 * 거절하지 않도록 동시 개수는 제한한다.
 */
export async function sendPushToUsers(userIds, { title, body, link, tag }, { concurrency = 10 } = {}) {
  const stats = { devices: 0, sent: 0, failed: 0, removed: 0 };
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return stats;

  await getVapid();

  const subs = await subscriptionsOf(ids);
  stats.devices = subs.length;
  if (!subs.length) return stats;

  // tag가 같은 알림은 폰에서 하나로 합쳐진다. 이벤트 알림은 링크가 곧 tag라
  // 같은 글에 댓글이 여러 개 달려도 알림창이 도배되지 않는다(서비스워커 기본값).
  // 반대로 공지처럼 하나하나가 다른 소식이면 서버가 고유 tag를 넘겨 덮어쓰지 않게 한다.
  const payload = JSON.stringify({ title, body, link: link ?? '/', ...(tag ? { tag } : {}) });

  for (let i = 0; i < subs.length; i += concurrency) {
    const results = await Promise.all(
      subs.slice(i, i + concurrency).map((s) => sendOne(s, payload)),
    );
    for (const r of results) stats[r] += 1;
  }
  return stats;
}

/** 구독한 기기로 푸시를 보낸다. 실패해도 본 동작을 막지 않는다. */
export async function sendPush(userIds, payload) {
  try {
    await sendPushToUsers(userIds, payload);
  } catch (e) {
    console.warn('[push] 발송 준비 실패:', e.message);
  }
}
