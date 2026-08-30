// 자유게시판 초기 글 채우기. 글이 하나도 없으면 아무도 첫 글을 안 쓴다.
//
// 글쓴이는 시드 팬 계정(58~64)만 쓴다. 실제 가입자 계정으로는 쓰지 않는다.
// 작성 시각은 게시판이 열린 8/28 이후로 흩뿌린다(한 번에 찍힌 티가 나면 안 된다).
// like_count/comment_count는 board_likes·board_comments와 맞물린 캐시값이라 0으로 둔다.
//
// 사용: node seed-board-posts.js          → 미리보기
//       node seed-board-posts.js --apply  → 실제 삽입
import { createClient } from '@libsql/client';
import 'dotenv/config';

const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const APPLY = process.argv.includes('--apply');

// created_at은 UTC(datetime('now') 기준)로 넣는다. 아래 주석은 KST.
const POSTS = [
  {
    user_id: 60, // 머리치기장인
    created_at: '2026-08-28 11:05:00', // 8/28 20:05 KST
    title: '머리치기 타이밍이 계속 늦습니다',
    content: `닉네임이 부끄러운 상황입니다.

연습 때는 괜찮은데 대련만 들어가면 상대 죽도 보고 나서 나가게 됩니다.
그러다 보니 항상 반박자 늦습니다.

머리 들어갈 때 상대를 보고 가는 게 아니라 미리 결정하고 가야 한다는 말은 들었는데
그게 실제로 어떤 감각인지 잘 모르겠습니다.

혹시 이거 넘어가신 분들 계시면 어떻게 잡으셨는지 궁금합니다.`,
  },
  {
    user_id: 61, // 호구전사
    created_at: '2026-08-29 00:18:00', // 8/29 09:18 KST
    title: '여름에 호구 냄새 어떻게 하세요',
    content: `이번 여름 진짜 심했습니다.

호완이랑 면이 문제입니다.
통풍 시켜도 한계가 있고, 세탁하자니 모양 망가질까 봐 못 하겠고요.

탈취제 뿌리는 게 전부인데 이거 말고 다들 어떻게 관리하시는지 궁금합니다.
도장 가면 저만 그런 게 아닌 것 같긴 한데 그래도 신경 쓰이네요.`,
  },
  {
    user_id: 64, // 선봉의신
    created_at: '2026-08-29 03:33:00', // 8/29 12:33 KST
    title: '다들 몇 시에 운동하세요?',
    content: `직장 다니면서 검도하시는 분들께 여쭤봅니다.

저는 퇴근하고 저녁 8시 반 타임 나가는데, 끝나고 씻고 집 오면 11시가 넘습니다.
다음 날 피곤한 게 쌓이니까 요즘 주 2회로 줄였어요.

새벽반 다니시는 분들은 어떠신가요? 그게 오히려 낫다는 얘기도 들어서요.
아침에 일어나는 게 될까 싶긴 합니다.`,
  },
];

const { rows: [{ n }] } = await db.execute('SELECT COUNT(*) AS n FROM board_posts');
console.log(`현재 board_posts: ${n}개\n`);

const ids = [...new Set(POSTS.map(p => p.user_id))];
const { rows: users } = await db.execute(
  `SELECT id, nickname, role FROM users WHERE id IN (${ids.map(() => '?').join(',')})`, ids
);
const byId = Object.fromEntries(users.map(u => [u.id, u]));

let bad = false;
for (const id of ids) {
  if (!byId[id]) { console.log(`✗ user ${id} 없음`); bad = true; }
  else if (byId[id].role !== 'fan') { console.log(`✗ user ${id} role=${byId[id].role} (fan 아님)`); bad = true; }
}
if (bad) { console.log('\n작성자 확인 실패. 중단합니다.'); await db.close(); process.exit(1); }

for (const p of POSTS) {
  console.log(`[${byId[p.user_id].nickname}] ${p.created_at} UTC`);
  console.log(`  ${p.title}`);
  console.log(`  ${p.content.split('\n')[0]} ...`);
  console.log();
}

if (!APPLY) {
  console.log(`미리보기입니다. 실제로 넣으려면 --apply 를 붙이세요. (${POSTS.length}개)`);
  await db.close();
  process.exit(0);
}

for (const p of POSTS) {
  await db.execute({
    sql: `INSERT INTO board_posts (user_id, title, content, created_at)
          VALUES (?, ?, ?, ?)`,
    args: [p.user_id, p.title, p.content, p.created_at],
  });
}
const { rows: [{ n: after }] } = await db.execute('SELECT COUNT(*) AS n FROM board_posts');
console.log(`삽입 완료. board_posts: ${n} → ${after}`);
await db.close();
