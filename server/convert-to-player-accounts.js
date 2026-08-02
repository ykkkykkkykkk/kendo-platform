// 이미 가입한 팬 계정을 선수 계정으로 전환한다.
//
// /admin/player-accounts는 계정을 '새로' 만드는 방식이라, 선수가 이미 팬으로 가입해
// 팔로우·픽을 쌓아둔 경우 그게 따라오지 않는다. 여기서는 기존 user 행을 그대로 두고
// role/player_id/username/password_hash만 채워 넣는다.
//
// 사용: node convert-to-player-accounts.js            → 미리보기
//       node convert-to-player-accounts.js --apply    → 실제 전환
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const APPLY = process.argv.includes('--apply');

// userId: 전환할 기존 계정 / playerName+team: 연결할 선수(팀까지 확인해 동명이인 방지)
const TARGETS = [
  { userId: 161, expectNick: '박효준',  playerName: '박효준', team: '인천광역시청', username: 'bakhyojun', password: '0000' },
  { userId: 159, expectNick: '김준호',  playerName: '김준호', team: '광명시청',     username: 'kimjunho',  password: '0000' },
  { userId: 160, expectNick: 'skarlgh', playerName: '남기호', team: '부천시청',     username: 'namgiho',   password: '0000' },
];

const problems = [];
const plan = [];

for (const t of TARGETS) {
  const { rows: [u] } = await db.execute({
    sql: 'SELECT id, nickname, phone, role, player_id FROM users WHERE id = ?', args: [t.userId],
  });
  if (!u) { problems.push(`user ${t.userId}: 없음`); continue; }
  if (u.nickname !== t.expectNick) { problems.push(`user ${t.userId}: 닉네임 불일치 (DB '${u.nickname}' ≠ '${t.expectNick}')`); continue; }
  if (u.role === 'player') { problems.push(`user ${t.userId}(${u.nickname}): 이미 선수 계정`); continue; }

  const { rows: players } = await db.execute({
    sql: `SELECT p.id, p.name, t.name AS team FROM players p
          LEFT JOIN teams t ON t.id = p.team_id
          WHERE p.name = ? AND t.name = ?`,
    args: [t.playerName, t.team],
  });
  if (players.length !== 1) { problems.push(`${t.playerName}(${t.team}): 선수 ${players.length}명 — 특정 불가`); continue; }

  const { rows: dupU } = await db.execute({ sql: 'SELECT id FROM users WHERE username = ?', args: [t.username] });
  if (dupU.length) { problems.push(`아이디 '${t.username}' 중복`); continue; }

  const { rows: dupP } = await db.execute({
    sql: "SELECT id, nickname FROM users WHERE player_id = ? AND role = 'player'", args: [players[0].id],
  });
  if (dupP.length) { problems.push(`${t.playerName}: 이미 선수 계정 있음 (user ${dupP[0].id})`); continue; }

  const { rows: [{ n: fc }] } = await db.execute({ sql: 'SELECT COUNT(*) AS n FROM follows WHERE user_id = ?', args: [u.id] });
  const { rows: [{ n: pc }] } = await db.execute({ sql: 'SELECT COUNT(*) AS n FROM tournament_picks WHERE user_id = ?', args: [u.id] });

  plan.push({ t, u, player: players[0], fc, pc });
}

console.log(`대상 ${TARGETS.length}건 · 처리 ${plan.length}건\n`);
for (const { t, u, player, fc, pc } of plan) {
  console.log(`  · user${u.id} '${u.nickname}' → 선수 ${player.name} (${player.team}, player id${player.id})`);
  console.log(`      닉네임 ${u.nickname} → ${player.name}`);
  console.log(`      아이디 ${t.username} / 비밀번호 ${t.password}`);
  console.log(`      기존 데이터 유지: 팔로우 ${fc} · 픽 ${pc}`);
}

if (problems.length) {
  console.error(`\n❌ 문제 ${problems.length}건 — 아무것도 바꾸지 않습니다.`);
  for (const p of problems) console.error('   · ' + p);
  process.exit(1);
}

const weak = plan.filter(({ t }) => t.password.length < 6);
if (weak.length) {
  console.log(`\n⚠ 비밀번호 ${weak.length}건이 6자 미만입니다.`);
  console.log('   관리자 화면의 선수 계정 생성은 6자 이상을 요구하지만, 로그인 자체는 길이를 보지 않아 동작합니다.');
  console.log('   선수분들께 첫 로그인 후 변경을 안내하시는 게 좋습니다.');
}

if (!APPLY) { console.log('\n(미리보기 — 반영 안 됨. 실행: --apply)'); process.exit(0); }

for (const { t, u, player } of plan) {
  const hash = await bcrypt.hash(t.password, 10);
  await db.execute({
    sql: `UPDATE users SET role = 'player', player_id = ?, username = ?, password_hash = ?, nickname = ?
          WHERE id = ?`,
    args: [player.id, t.username, hash, player.name, u.id],
  });
  console.log(`✅ user${u.id} → ${player.name} (아이디 ${t.username})`);
}

console.log('\n완료.');
process.exit(0);
