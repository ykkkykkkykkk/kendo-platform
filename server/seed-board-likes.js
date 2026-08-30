// 자유게시판 시드 글에 좋아요 채우기.
//
// board_likes 행을 넣고 board_posts.like_count를 실제 개수로 다시 계산한다.
// like_count는 캐시값이라 행만 넣고 두면 화면 숫자가 0으로 남는다(라우트도 같이 갱신한다).
// 누르는 사람은 시드 팬 계정(58~64)만, 자기 글은 누르지 않는다.
//
// 사용: node seed-board-likes.js          → 미리보기
//       node seed-board-likes.js --apply  → 실제 반영
import { createClient } from '@libsql/client';
import 'dotenv/config';

const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const APPLY = process.argv.includes('--apply');

// created_at은 UTC. 글이 올라온 뒤 시간을 두고 하나씩 눌린 모양으로 흩는다.
const LIKES = [
  { post_id: 7, user_id: 58, created_at: '2026-08-28 11:40:00' },
  { post_id: 7, user_id: 59, created_at: '2026-08-28 12:15:00' },
  { post_id: 7, user_id: 61, created_at: '2026-08-28 13:02:00' },
  { post_id: 7, user_id: 62, created_at: '2026-08-28 22:30:00' },
  { post_id: 7, user_id: 64, created_at: '2026-08-29 01:10:00' },

  { post_id: 8, user_id: 58, created_at: '2026-08-29 00:52:00' },
  { post_id: 8, user_id: 60, created_at: '2026-08-29 01:34:00' },
  { post_id: 8, user_id: 63, created_at: '2026-08-29 02:20:00' },
  { post_id: 8, user_id: 64, created_at: '2026-08-29 03:05:00' },

  { post_id: 9, user_id: 59, created_at: '2026-08-29 03:51:00' },
  { post_id: 9, user_id: 60, created_at: '2026-08-29 04:07:00' },
  { post_id: 9, user_id: 62, created_at: '2026-08-29 04:20:00' },
];

const postIds = [...new Set(LIKES.map(l => l.post_id))];
const userIds = [...new Set(LIKES.map(l => l.user_id))];

const { rows: posts } = await db.execute(
  `SELECT id, user_id, title, like_count FROM board_posts WHERE id IN (${postIds.map(() => '?').join(',')})`, postIds);
const { rows: users } = await db.execute(
  `SELECT id, nickname, role FROM users WHERE id IN (${userIds.map(() => '?').join(',')})`, userIds);

const postById = Object.fromEntries(posts.map(p => [p.id, p]));
const userById = Object.fromEntries(users.map(u => [u.id, u]));

let bad = false;
for (const id of postIds) if (!postById[id]) { console.log(`✗ post ${id} 없음`); bad = true; }
for (const id of userIds) {
  if (!userById[id]) { console.log(`✗ user ${id} 없음`); bad = true; }
  else if (userById[id].role !== 'fan') { console.log(`✗ user ${id} role=${userById[id].role}`); bad = true; }
}
for (const l of LIKES) {
  if (postById[l.post_id]?.user_id === l.user_id) {
    console.log(`✗ post ${l.post_id}: 글쓴이(${l.user_id})가 자기 글에 좋아요`); bad = true;
  }
}
if (bad) { console.log('\n확인 실패. 중단합니다.'); await db.close(); process.exit(1); }

for (const id of postIds) {
  const p = postById[id];
  const who = LIKES.filter(l => l.post_id === id).map(l => userById[l.user_id].nickname);
  console.log(`#${id} ${p.title}`);
  console.log(`   like_count ${p.like_count} → ${who.length}   (${who.join(', ')})`);
}

if (!APPLY) {
  console.log(`\n미리보기입니다. 실제로 넣으려면 --apply 를 붙이세요. (좋아요 ${LIKES.length}개)`);
  await db.close();
  process.exit(0);
}

for (const l of LIKES) {
  await db.execute({
    sql: `INSERT OR IGNORE INTO board_likes (post_id, user_id, created_at) VALUES (?, ?, ?)`,
    args: [l.post_id, l.user_id, l.created_at],
  });
}
// 증가시키지 않고 실제 행 수로 맞춘다. 두 번 돌려도 숫자가 어긋나지 않는다.
for (const id of postIds) {
  await db.execute({
    sql: `UPDATE board_posts SET like_count = (SELECT COUNT(*) FROM board_likes WHERE post_id = ?) WHERE id = ?`,
    args: [id, id],
  });
}
const { rows: after } = await db.execute(
  `SELECT id, title, like_count FROM board_posts WHERE id IN (${postIds.map(() => '?').join(',')}) ORDER BY id`, postIds);
console.log('\n반영 완료');
for (const p of after) console.log(`  #${p.id} ♥${p.like_count}  ${p.title}`);

await db.close();
