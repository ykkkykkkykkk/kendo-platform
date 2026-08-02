// 설문으로 받은 아이디/비밀번호로 선수 계정을 미리 만들어 둔다.
//
// 누가 어느 선수인지는 아직 모르므로 player_id는 비워 둔다.
// 이 상태에서는 로그인은 되지만 글쓰기·Q&A 답변·팬 댓글 하트/답글은 막힌다
// (그 기능들이 전부 playerId를 요구한다). 나중에 관리자 화면에서 선수를 연결하면 풀린다.
//
// 사용: node create-player-accounts-batch.js            → 미리보기
//       node create-player-accounts-batch.js --apply    → 실제 생성
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const APPLY = process.argv.includes('--apply');

// 설문 응답 순서대로 [아이디, 비밀번호]
const SUBMISSIONS = [
  ['tjdgns8459',   '84592651'],
  ['soun1240',     'tjrbs28'],
  ['kwonbj7',      'dnflwlq12'],
  ['tjrghks5194',  'h2889662!'],
  ['dntjr1448',    '123456'],
  ['hojin5396',    'rjaehaos24'],
  ['sws7547',      'sws5337541!'],
  ['wnsgh5425',    'Rlawnsgh28!'],
  ['skarlgh',      'zoqls3461'],
  ['rudwo1214',    'cjswo8824@'],
  ['dbtmdu',       'seungu031229'],
  ['윤범열',        '9781'],
  ['xogns559h6',   'xogns12'],
  ['wnsghek7',     'gh2962'],
  ['박효준',        '7391'],
  ['이승준',        '1234'],
  ['skarlgh',      'zoqls1'],        // 중복 제출 (앞의 것을 쓴다)
  ['rudtn5895',    'rlarudtn123'],
  ['lsj3155',      '1274'],
  ['kimdlddj',     'Kimdonghyun03!'],
  ['woo7900',      'Kumdo0602^^*'],
  ['쫑이',          '0324'],
  ['jjrpo',        'jjr981207@'],
  ['alstjsww',     'asd2128503@'],
  ['lipon5',       'acac200500!'],
  ['qowns762301',  'bjy9240$'],
  ['jjh042254',    'wkdwlals03@'],
  ['hyunji900821', 'db20190517'],
  ['kumdo5799',    'Tjdgusrhs1!'],
  ['tkdgjs29',     'ansrud0953!'],
  ['thsdmsrl1',    'dmsrl7814'],
  ['thsdmsrl1',    'dmsrl7814'],     // 중복 제출 (같은 값)
  ['victoryoon',   '3802'],
];

const seen = new Set();
const plan = [];
const skipped = [];

for (const [username, password] of SUBMISSIONS) {
  const id = username.trim();

  if (seen.has(id)) { skipped.push(`${id}: 중복 제출 — 첫 번째 것만 사용`); continue; }
  seen.add(id);

  // 이미 이 아이디를 쓰는 계정
  const { rows: dupU } = await db.execute({ sql: 'SELECT id, nickname, role FROM users WHERE username = ?', args: [id] });
  if (dupU.length) { skipped.push(`${id}: 이미 사용 중인 아이디 (user${dupU[0].id} ${dupU[0].nickname})`); continue; }

  // 아이디를 닉네임으로 쓰는 기존 계정이 있으면 같은 사람일 수 있어 알린다
  const { rows: sameNick } = await db.execute({
    sql: 'SELECT id, nickname, role, username FROM users WHERE nickname = ?', args: [id],
  });

  plan.push({ username: id, password, note: sameNick[0] ?? null });
}

console.log(`제출 ${SUBMISSIONS.length}건 · 생성 대상 ${plan.length}건 · 건너뜀 ${skipped.length}건\n`);
for (const p of plan) {
  const warn = [];
  if (p.password.length < 6) warn.push('비밀번호 6자 미만');
  if (p.note) warn.push(`같은 닉네임 계정 있음(user${p.note.id}, role=${p.note.role}${p.note.username ? `, id=${p.note.username}` : ''})`);
  console.log(`  + ${p.username.padEnd(14)} / ${p.password.padEnd(15)}${warn.length ? '  ⚠ ' + warn.join(' · ') : ''}`);
}
if (skipped.length) {
  console.log(`\n건너뜀:`);
  for (const s of skipped) console.log('   · ' + s);
}

console.log(`\n※ player_id는 비워 둡니다. 연결 전까지는 로그인만 되고 글쓰기·답변은 막힙니다.`);
console.log(`   관리자 → 선수 계정에서 선수를 연결하면 바로 풀립니다.`);

if (!APPLY) { console.log('\n(미리보기 — 생성 안 됨. 실행: --apply)'); process.exit(0); }

for (const p of plan) {
  const hash = await bcrypt.hash(p.password, 10);
  await db.execute({
    sql: `INSERT INTO users (nickname, username, password_hash, role, player_id)
          VALUES (?, ?, ?, 'player', NULL)`,
    args: [p.username, p.username, hash],   // 이름을 모르므로 닉네임은 아이디로 두고, 연결 시 선수 이름으로 바뀐다
  });
  console.log(`✅ ${p.username}`);
}

const { rows: [{ n }] } = await db.execute("SELECT COUNT(*) AS n FROM users WHERE role = 'player'");
const { rows: [{ m }] } = await db.execute("SELECT COUNT(*) AS m FROM users WHERE role = 'player' AND player_id IS NULL");
console.log(`\n선수 계정 ${n}개 (연결 대기 ${m}개)`);
process.exit(0);
