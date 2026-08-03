// 오타로 갈라진 선수 중복 찾기 (읽기 전용).
//
// 정상헌/정상현 건처럼 한 글자, 실제로는 모음 하나 차이로 다른 사람이 되어 버린 쌍을 찾는다.
// 이름을 글자 단위로 비교하면 '헌'과 '현'은 그냥 다른 글자라 안 잡히므로,
// 한글을 초성/중성/종성으로 분해해 자모 단위 편집거리를 잰다.
import { db } from './src/db.js';

const q = async (sql, args = []) => (await db.execute({ sql, args })).rows;

const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'.split('');
const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'.split('');
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ',
  'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

/** '헌' → ['ㅎ','ㅓ','ㄴ'] */
function toJamo(s) {
  const out = [];
  for (const ch of s.replace(/\s/g, '')) {
    const c = ch.charCodeAt(0) - 0xac00;
    if (c < 0 || c > 11171) { out.push(ch); continue; }
    out.push(CHO[Math.floor(c / 588)], JUNG[Math.floor((c % 588) / 28)], JONG[c % 28]);
  }
  return out.filter(Boolean);
}

function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
  return dp[a.length][b.length];
}

const players = await q(`
  SELECT p.id, p.name, p.slug, p.dan_grade, p.created_at, p.team_id, t.name AS team_name,
         (SELECT COUNT(*) FROM follows f WHERE f.player_id = p.id) AS followers,
         (SELECT COUNT(*) FROM division_participants d WHERE d.player_id = p.id) AS in_draw,
         (SELECT COUNT(*) FROM users u WHERE u.player_id = p.id) AS has_account
  FROM players p LEFT JOIN teams t ON t.id = p.team_id
  ORDER BY p.id`);

const jamo = new Map(players.map((p) => [p.id, toJamo(p.name)]));
const flat = (p) => p.name.replace(/\s/g, '');

const pairs = [];
for (let i = 0; i < players.length; i++) {
  for (let j = i + 1; j < players.length; j++) {
    const a = players[i], b = players[j];
    const sameName = flat(a) === flat(b);
    const sameTeam = a.team_id != null && a.team_id === b.team_id;
    const d = editDistance(jamo.get(a.id), jamo.get(b.id));

    // 같은 팀 + 자모 1~2개 차이 → 오타 의심
    // 이름 완전히 같음 + 다른 팀 → 동명이인일 수도, 이적/중복일 수도 (사람이 봐야 함)
    let kind = null;
    if (sameTeam && sameName) kind = '같은 팀 · 이름 완전히 같음';
    else if (sameTeam && d > 0 && d <= 2) kind = `같은 팀 · 자모 ${d}개 차이`;
    else if (!sameTeam && sameName) kind = '이름 같음 · 다른 팀';
    if (!kind) continue;

    const risk = sameTeam ? (d === 0 ? 3 : d === 1 ? 3 : 2) : 1;
    pairs.push({ a, b, kind, risk, d });
  }
}

pairs.sort((x, y) => y.risk - x.risk || x.d - y.d);

const line = (p) =>
  `player${String(p.id).padEnd(4)} ${p.name.padEnd(5)} ${(p.team_name ?? '팀없음').padEnd(12)} ` +
  `${p.dan_grade ?? '?'}단 | 팔로워 ${String(p.followers).padStart(2)} 대진 ${p.in_draw} 계정 ${p.has_account} | ${(p.created_at ?? '').slice(0, 10)}`;

const strong = pairs.filter((p) => p.risk === 3);
const weak   = pairs.filter((p) => p.risk === 2);
const same   = pairs.filter((p) => p.risk === 1);

console.log(`선수 ${players.length}명 검사\n`);

console.log(`━━ 오타 중복 의심 ${strong.length}쌍 (같은 팀, 자모 1개 이하 차이) ━━`);
strong.forEach((p, i) => { console.log(`\n[${i + 1}] ${p.kind}`); console.log('   ' + line(p.a)); console.log('   ' + line(p.b)); });
if (!strong.length) console.log('   없음');

console.log(`\n\n━━ 확인 권장 ${weak.length}쌍 (같은 팀, 자모 2개 차이) ━━`);
weak.forEach((p, i) => { console.log(`\n[${i + 1}] ${p.kind}`); console.log('   ' + line(p.a)); console.log('   ' + line(p.b)); });
if (!weak.length) console.log('   없음');

console.log(`\n\n━━ 동명이인으로 보이는 ${same.length}쌍 (이름 같음, 팀 다름 — 정상일 수 있음) ━━`);
same.forEach((p, i) => { console.log(`\n[${i + 1}]`); console.log('   ' + line(p.a)); console.log('   ' + line(p.b)); });
if (!same.length) console.log('   없음');

process.exit(0);
