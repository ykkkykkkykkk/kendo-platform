// 카카오 로그인 전 과정 점검 (가짜 카카오 서버로).
//
// 실제 카카오 앱 키가 없어도 서버 로직은 여기서 다 확인할 수 있다.
// 가짜 카카오 서버를 띄우고 KAKAO_API_BASE가 그쪽을 보게 한 뒤,
// 처음 로그인 → 가입 → 재로그인 → 기존 계정 연결 → 중복 차단을 순서대로 시험한다.
//
//   node test-kakao-flow.js            미리보기(테스트 계정을 만들었다가 지운다)
//
// 테스트가 만든 흔적은 끝에서 반드시 지운다.
import http from 'node:http';
import { db } from './src/db.js';

const API  = 'http://localhost:4000/api/auth';
const PORT = 4899;

// 토큰 → 카카오 사용자. 실제 카카오가 주는 응답 모양을 그대로 흉내낸다.
const FAKE_USERS = {
  'tok-new':   { id: 900000001, properties: { nickname: '카카오새회원' } },
  'tok-old':   { id: 900000002, properties: { nickname: '기존회원카카오' } },
  'tok-other': { id: 900000003, properties: { nickname: '제3자' } },
};
const KAKAO_IDS = Object.values(FAKE_USERS).map((u) => String(u.id));

const mock = http.createServer((req, res) => {
  const tok = (req.headers.authorization ?? '').replace('Bearer ', '');
  const user = FAKE_USERS[tok];
  res.writeHead(user ? 200 : 401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(user ?? { msg: 'invalid token' }));
});

const post = async (path, body) => {
  const r = await fetch(`${API}/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json() };
};

let pass = 0, fail = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? '✅' : '❌'} ${label}${detail ? '  — ' + detail : ''}`);
  ok ? pass++ : fail++;
};

const nickOf = (t) => { // JWT에서 닉네임 꺼내기
  try { return JSON.parse(Buffer.from(t.split('.')[1], 'base64').toString()).nickname; }
  catch { return null; }
};

async function cleanup(oldUserId) {
  const marks = KAKAO_IDS.map(() => '?').join(',');
  // 테스트로 만든 계정 삭제
  await db.execute({ sql: `DELETE FROM users WHERE kakao_id IN (${marks}) AND phone IS NULL`, args: KAKAO_IDS });
  // 기존 계정에 붙였던 연결 해제
  await db.execute({ sql: `UPDATE users SET kakao_id = NULL, kakao_linked_at = NULL WHERE kakao_id IN (${marks})`, args: KAKAO_IDS });
  if (oldUserId) await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [oldUserId] });
}

await new Promise((r) => mock.listen(PORT, r));
console.log(`가짜 카카오 서버 :${PORT}\n`);

// 연결 대상으로 쓸 예전 방식 계정 하나를 만든다 (실제 회원은 건드리지 않는다)
const OLD_NICK = '테스트옛계정';
const OLD_PHONE = '9911';
await db.execute({
  sql: 'INSERT INTO users (phone, nickname, home_dojo) VALUES (?, ?, ?)',
  args: [`${OLD_NICK}_${OLD_PHONE}`, OLD_NICK, '테스트도장'],
});
const { rows: [old] } = await db.execute({
  sql: 'SELECT id FROM users WHERE phone = ?', args: [`${OLD_NICK}_${OLD_PHONE}`],
});
console.log(`연결 시험용 옛 계정 생성: ${OLD_NICK}_${OLD_PHONE} (user${old.id})\n`);

try {
  console.log('1) 위조 토큰 차단');
  check('가짜 토큰 로그인 거부', (await post('kakao', { accessToken: 'garbage' })).status === 401);

  console.log('\n2) 처음 오는 카카오 계정');
  let r = await post('kakao', { accessToken: 'tok-new' });
  check('바로 로그인시키지 않고 선택을 요구', r.status === 200 && r.body.needs_choice === true);
  check('카카오 닉네임을 넘겨줌', r.body.kakao_nickname === '카카오새회원', r.body.kakao_nickname);

  console.log('\n3) 새 계정 만들기');
  r = await post('kakao/signup', { accessToken: 'tok-new', nickname: '새로시작' });
  check('계정 생성 + 토큰 발급', r.status === 200 && Boolean(r.body.token) && r.body.created === true);
  check('토큰의 닉네임이 맞음', nickOf(r.body.token) === '새로시작', nickOf(r.body.token));

  console.log('\n4) 같은 카카오로 또 가입 시도 (중복 차단 핵심)');
  r = await post('kakao/signup', { accessToken: 'tok-new', nickname: '중복계정' });
  const { rows: dup } = await db.execute({ sql: 'SELECT COUNT(*) AS n FROM users WHERE kakao_id = ?', args: ['900000001'] });
  check('계정이 하나만 유지됨', Number(dup[0].n) === 1, `${dup[0].n}개`);
  check('기존 계정으로 로그인시킴', nickOf(r.body.token) === '새로시작', nickOf(r.body.token));

  console.log('\n5) 두 번째 방문 — 바로 로그인');
  r = await post('kakao', { accessToken: 'tok-new' });
  check('선택 없이 곧장 입장', r.status === 200 && !r.body.needs_choice && Boolean(r.body.token));

  console.log('\n6) 쓰던 계정 가져오기');
  r = await post('kakao/link', { accessToken: 'tok-old', nickname: OLD_NICK, phone: '0000' });
  check('번호가 틀리면 거부', r.status === 404, r.body.error);
  r = await post('kakao/link', { accessToken: 'tok-old', nickname: OLD_NICK, phone: OLD_PHONE });
  check('맞으면 연결 + 토큰 발급', r.status === 200 && r.body.linked === true);
  check('예전 닉네임이 유지됨', nickOf(r.body.token) === OLD_NICK, nickOf(r.body.token));
  const { rows: [linked] } = await db.execute({ sql: 'SELECT kakao_id, phone, home_dojo FROM users WHERE id = ?', args: [old.id] });
  check('같은 계정에 붙음(새로 안 만듦)', linked.kakao_id === '900000002');
  check('예전 정보 그대로', linked.home_dojo === '테스트도장', linked.home_dojo);

  console.log('\n7) 남의 계정 가로채기 차단');
  r = await post('kakao/link', { accessToken: 'tok-other', nickname: OLD_NICK, phone: OLD_PHONE });
  check('이미 연결된 계정은 못 가져감', r.status === 409, r.body.error);
  r = await post('kakao/link', { accessToken: 'tok-old', nickname: '없는닉네임', phone: '1234' });
  check('이미 쓴 카카오로 또 연결 시도 거부', r.status === 409, r.body.error);

  console.log('\n8) 연결한 계정으로 재로그인');
  r = await post('kakao', { accessToken: 'tok-old' });
  check('예전 계정으로 들어감', r.status === 200 && nickOf(r.body.token) === OLD_NICK);
} finally {
  await cleanup(old.id);
  mock.close();
  const { rows: [left] } = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM users WHERE kakao_id IN (${KAKAO_IDS.map(() => '?').join(',')})`,
    args: KAKAO_IDS,
  });
  console.log(`\n정리 완료 — 테스트 흔적 ${left.n}건 남음 (0이어야 정상)`);
}

console.log(`\n통과 ${pass} / 실패 ${fail}`);
process.exit(fail ? 1 : 0);
