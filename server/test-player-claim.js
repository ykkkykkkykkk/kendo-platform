// 선수 본인 신청 → 관리자 승인 전 과정 점검.
//
// 팬으로 쓰던 계정이 선수 계정으로 바뀌면서 팔로우·픽이 그대로 남는지가 핵심이다.
// 테스트가 만든 흔적은 끝에서 반드시 지운다.
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import { db } from './src/db.js';

const API   = 'http://localhost:4000/api';
const TOKEN = process.env.ADMIN_TOKEN;

const q = async (sql, args = []) => (await db.execute({ sql, args })).rows;
let pass = 0, fail = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? '✅' : '❌'} ${label}${detail ? '  — ' + detail : ''}`);
  ok ? pass++ : fail++;
};

const asUser = (u) => jwt.sign(
  { userId: u.id, nickname: u.nickname, role: u.role ?? 'fan', playerId: u.player_id ?? null },
  process.env.JWT_SECRET, { expiresIn: '1h' },
);
const call = async (path, { token, admin, method = 'GET', body } = {}) => {
  const r = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(admin ? { 'X-Admin-Token': TOKEN } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { s: r.status, j: await r.json().catch(() => ({})) };
};

// 계정 하나 없는 선수를 골라 대상으로 삼는다 (실제 데이터를 건드리지 않으려고)
const [target] = await q(`
  SELECT p.id, p.name FROM players p
  WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.player_id = p.id)
  ORDER BY p.id LIMIT 1`);

// 팬 두 명을 만든다: 진짜 신청자와, 같은 선수를 노리는 사람
const made = [];
for (const n of ['클레임테스트A', '클레임테스트B']) {
  await db.execute({ sql: 'INSERT INTO users (phone, nickname) VALUES (?, ?)', args: [`${n}_0001`, n] });
  const [u] = await q('SELECT * FROM users WHERE phone = ?', [`${n}_0001`]);
  made.push(u);
}
const [A, B] = made;
// A에게 팔로우를 하나 붙여, 전환 뒤에도 남는지 본다
const [someone] = await q('SELECT id FROM players LIMIT 1');
await db.execute({ sql: 'INSERT INTO follows (user_id, player_id) VALUES (?, ?)', args: [A.id, someone.id] });

console.log(`대상 선수: ${target.name} (player${target.id})`);
console.log(`신청자: ${A.nickname} (user${A.id}) · 경쟁자: ${B.nickname} (user${B.id})\n`);

try {
  console.log('1) 신청');
  let r = await call('/player-claims', { token: asUser(A), method: 'POST', body: { player_id: target.id, note: '본인입니다' } });
  check('신청 접수', r.s === 200 && r.j.ok === true, r.j.error ?? '');
  r = await call('/player-claims', { token: asUser(A), method: 'POST', body: { player_id: target.id } });
  check('같은 사람이 또 신청 못 함', r.s === 409, r.j.error);
  r = await call('/player-claims/me', { token: asUser(A) });
  check('내 신청 상태 조회', r.j.claim?.status === 'pending' && r.j.is_player === false);

  console.log('\n2) 로그인 없이는 안 됨');
  r = await call('/player-claims', { method: 'POST', body: { player_id: target.id } });
  check('비로그인 거부', r.s === 401);

  console.log('\n3) 관리자 목록');
  r = await call('/admin/player-claims?status=pending', { admin: true });
  const mine = r.j.claims?.find((c) => c.user_id === A.id);
  check('대기 목록에 뜸', Boolean(mine), `대기 ${r.j.pending_count}건`);
  check('판단 근거가 함께 옴', mine?.player_name === target.name && 'follow_count' in mine);

  console.log('\n4) 경쟁 신청도 접수됨');
  r = await call('/player-claims', { token: asUser(B), method: 'POST', body: { player_id: target.id } });
  check('다른 사람도 같은 선수로 신청 가능', r.s === 200, r.j.error ?? '');

  console.log('\n5) 승인 → 선수 계정으로 전환');
  const claimId = mine.id;
  r = await call(`/admin/player-claims/${claimId}/approve`, { admin: true, method: 'POST' });
  check('승인 성공', r.s === 200 && r.j.approved === true, r.j.error ?? '');
  const [after] = await q('SELECT role, player_id, nickname FROM users WHERE id = ?', [A.id]);
  check('role이 player로 바뀜', after.role === 'player', after.role);
  check('선수가 연결됨', after.player_id === target.id);
  check('닉네임이 선수 이름으로', after.nickname === target.name, after.nickname);
  const fc = (await q('SELECT COUNT(*) AS n FROM follows WHERE user_id = ?', [A.id]))[0].n;
  check('팔로우가 그대로 남음', Number(fc) === 1, `${fc}건`);

  console.log('\n6) 뒤처리');
  const [loser] = await q("SELECT status, review_note FROM player_claims WHERE user_id = ?", [B.id]);
  check('경쟁 신청은 자동 거절', loser.status === 'rejected', loser.review_note);
  r = await call(`/admin/player-claims/${claimId}/approve`, { admin: true, method: 'POST' });
  check('같은 신청 두 번 승인 안 됨', r.s === 409, r.j.error);
  r = await call('/player-claims', { token: asUser(B), method: 'POST', body: { player_id: target.id } });
  check('이미 주인 있는 선수는 신청 거부', r.s === 409, r.j.error);

  console.log('\n7) 토큰 갱신 (승인 뒤 권한 반영)');
  r = await call('/auth/refresh', { token: asUser(A), method: 'POST' });
  const p = r.j.token ? JSON.parse(Buffer.from(r.j.token.split('.')[1], 'base64').toString()) : {};
  check('새 토큰이 선수 권한을 가짐', p.role === 'player' && p.playerId === target.id, `role=${p.role}`);
} finally {
  await db.execute({ sql: 'DELETE FROM player_claims WHERE user_id IN (?, ?)', args: [A.id, B.id] });
  await db.execute({ sql: 'DELETE FROM follows WHERE user_id IN (?, ?)', args: [A.id, B.id] });
  await db.execute({ sql: 'DELETE FROM users WHERE id IN (?, ?)', args: [A.id, B.id] });
  const left = (await q('SELECT COUNT(*) AS n FROM users WHERE nickname LIKE ?', ['클레임테스트%']))[0].n;
  console.log(`\n정리 완료 — 테스트 흔적 ${left}건 남음 (0이어야 정상)`);
}

console.log(`\n통과 ${pass} / 실패 ${fail}`);
process.exit(fail ? 1 : 0);
