import { db } from '../db.js';
import { sendPush } from './push.js';

/** 알림 쌓기 + 웹푸시. 실패해도 본 동작(글쓰기·질문 등)을 막지 않는다. */
export async function notify(userIds, { type, message, link, title }) {
  const ids = [...new Set(userIds.filter(Boolean))];
  for (const uid of ids) {
    try {
      await db.execute({
        sql: 'INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
        args: [uid, type, message, link ?? null],
      });
    } catch { /* 알림 실패가 본 동작을 막을 이유는 없다 */ }
  }

  // 앱을 닫아둔 사람에게도 닿게 한다. 구독하지 않았으면 조용히 넘어간다.
  try {
    await sendPush(ids, { title: title ?? '마이너스타', body: message, link });
  } catch { /* 푸시 실패도 본 동작을 막지 않는다 */ }
}

/** 그 선수 본인의 계정 id. 선수 계정이 아직 없으면 null. */
export async function userIdOfPlayer(playerId) {
  const { rows: [u] } = await db.execute({
    sql: "SELECT id FROM users WHERE player_id = ? AND role = 'player'",
    args: [playerId],
  });
  return u?.id ?? null;
}
