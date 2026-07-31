// 가라팬(시드 팬) 20명과 그 팔로우를 복원한다.
//
// 원본은 migrations/006_data_enrich.sql의 '가라 유저 20명'. 값(phone/닉네임/도장/단)을 그대로 쓴다.
// phone이 UNIQUE라 INSERT OR IGNORE면 중복 실행해도 안전하다.
//
// add-fans-all.js를 쓰지 않는 이유: 그 스크립트는 role='fan' 유저 전체를 시드 팬으로 삼는데,
// 지금은 실사용자도 role='fan'이라 실계정 이름으로 팔로우가 생겨버린다.
// 여기서는 phone LIKE '검도팬_%'인 계정만 팔로우 주체로 쓴다.
//
// 사용: node restore-seed-fans.js            → 미리보기
//       node restore-seed-fans.js --apply    → 실제 복원
import { createClient } from '@libsql/client';
import 'dotenv/config';

const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const APPLY = process.argv.includes('--apply');

const MIN = 3, MAX = 10;   // 선수당 목표 팔로워 수 (원본 add-fans-all.js와 동일)

const SEED_FANS = [
  ['검도팬_1001', '검도왕',       '서울 강남도장',   6],
  ['검도팬_1002', '죽도마스터',   '부산 해운대도장', 5],
  ['검도팬_1003', '머리치기장인', '대전 중앙도장',   4],
  ['검도팬_1004', '호구전사',     '대구 달서도장',   5],
  ['검도팬_1005', '코테헌터',     '광주 북구도장',   4],
  ['검도팬_1006', '도헤인',       '인천 남동도장',   3],
  ['검도팬_1007', '선봉의신',     '수원 팔달도장',   6],
  ['검도팬_1008', '대장배출기',   '울산 남구도장',   5],
  ['검도팬_1009', '검도덕후',     '창원 성산도장',   4],
  ['검도팬_1010', '죽도소년',     '청주 상당도장',   3],
  ['검도팬_1011', '국대팬',       '경주 황성도장',   6],
  ['검도팬_1012', '이봉킬러',     '구미 선산도장',   5],
  ['검도팬_1013', '타이밍갓',     '남양주 와부도장', 4],
  ['검도팬_1014', '검도철인',     '부천 원미도장',   5],
  ['검도팬_1015', '면허취득자',   '화성 동탄도장',   4],
  ['검도팬_1016', '격검불이',     '인제 북면도장',   3],
  ['검도팬_1017', '검도사랑',     '전주 완산도장',   4],
  ['검도팬_1018', '죽도신화',     '창원 마산도장',   5],
  ['검도팬_1019', '올라운더',     '무안 삼향도장',   3],
  ['검도팬_1020', '검도입문자',   null,              2],
];

/* ── 1. 계정 복원 ── */
const { rows: existing } = await db.execute(
  "SELECT id, phone, nickname FROM users WHERE phone LIKE '검도팬_%'"
);
const have = new Set(existing.map((r) => r.phone));
const missing = SEED_FANS.filter(([phone]) => !have.has(phone));

console.log(`가라팬 계정: 이미 있음 ${existing.length}명 · 새로 만들 ${missing.length}명`);
for (const [phone, nick] of missing) console.log(`   + ${nick} (${phone})`);

if (APPLY && missing.length) {
  for (const [phone, nickname, dojo, dan] of missing) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO users (phone, nickname, home_dojo, dan_grade) VALUES (?, ?, ?, ?)',
      args: [phone, nickname, dojo, dan],
    });
  }
  console.log(`✅ ${missing.length}명 생성`);
}

/* ── 2. 팔로우 채우기 (가라팬만 주체로) ── */
const { rows: fans } = await db.execute(
  "SELECT id, nickname FROM users WHERE phone LIKE '검도팬_%' ORDER BY phone"
);
const fanIds = fans.map((f) => f.id);
if (!fanIds.length) { console.log('가라팬이 없어 팔로우를 채울 수 없습니다.'); process.exit(1); }

const { rows: players } = await db.execute('SELECT id, name FROM players');
const { rows: follows } = await db.execute('SELECT user_id, player_id FROM follows');
const byPlayer = {};
for (const f of follows) (byPlayer[f.player_id] ??= new Set()).add(f.user_id);

const toAdd = [];
for (const p of players) {
  const cur = byPlayer[p.id] ?? new Set();          // 실사용자 팔로우도 목표치에 포함해 과하게 부풀리지 않는다
  const target = MIN + Math.floor(Math.random() * (MAX - MIN + 1));
  const need = Math.min(target, fanIds.length) - cur.size;
  if (need <= 0) continue;
  const avail = fanIds.filter((id) => !cur.has(id));
  for (let i = avail.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [avail[i], avail[j]] = [avail[j], avail[i]]; }
  for (const uid of avail.slice(0, need)) toAdd.push({ player_id: p.id, user_id: uid });
}

console.log(`\n선수 ${players.length}명 · 채울 팔로우 ${toAdd.length}건 (현재 ${follows.length}건)`);

if (!APPLY) { console.log('\n(미리보기 — 아무것도 바뀌지 않았습니다. 실행: --apply)'); process.exit(0); }

for (const f of toAdd) {
  await db.execute({
    sql: 'INSERT OR IGNORE INTO follows (user_id, player_id) VALUES (?, ?)',
    args: [f.user_id, f.player_id],
  });
}

const { rows: [{ n: total }] } = await db.execute('SELECT COUNT(*) AS n FROM follows');
const { rows: dist } = await db.execute(`
  SELECT fan, COUNT(*) cnt FROM (
    SELECT (SELECT COUNT(*) FROM follows f WHERE f.player_id = p.id) fan FROM players p
  ) GROUP BY fan ORDER BY fan`);
console.log(`\n✅ 팔로우 ${toAdd.length}건 추가 · 총 ${total}건`);
console.log('   선수당 팔로워 분포(팔로워:선수수) — ' + dist.map((r) => `${r.fan}:${r.cnt}`).join('  '));
process.exit(0);
