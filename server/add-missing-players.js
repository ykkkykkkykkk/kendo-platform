// 엑셀엔 있지만 DB에 없는 선수를 추가한다 (이름·팀·단, 슬러그 로마자 자동생성).
// 사용: node add-missing-players.js                 → 미리보기
//       node add-missing-players.js --apply         → 실제 추가
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const APPLY = process.argv.includes('--apply');
const files = process.argv.filter((a) => a.endsWith('.txt'));
if (!files.length) files.push('dan-data-men.txt', 'dan-data-women.txt');

/* ── 한글 로마자(개정 로마자표기법, 음절 단위) ── */
const CHO  = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
const JUNG = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
const JONG = ['','k','k','ks','n','nj','nh','t','l','lk','lm','lb','ls','lt','lp','lh','m','p','ps','t','t','ng','t','t','k','t','p','h'];
const SURNAME = { '김':'kim','이':'lee','박':'bak','최':'choi','신':'shin','윤':'yoon' };
function romanize(kor) {
  let out = '';
  for (const ch of kor) {
    const code = ch.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) continue;
    out += CHO[Math.floor(code / 588)] + JUNG[Math.floor((code % 588) / 28)] + JONG[code % 28];
  }
  return out;
}
function slugify(name) {
  const sur = name[0], given = name.slice(1);
  return ((SURNAME[sur] ?? romanize(sur)) + '-' + romanize(given)).toLowerCase().replace(/[^a-z0-9-]/g, '');
}

/* ── 팀명 정규화 (약칭·접미사) ── */
function teamCore(t) {
  if (!t) return '';
  let s = t;
  const map = [['충청남도','충남'],['충청북도','충북'],['경상남도','경남'],['경상북도','경북'],['전라남도','전남'],['전라북도','전북'],['강원도','강원']];
  for (const [f, a] of map) s = s.replace(f, a);
  return s.replace(/광역시|특례시|특별시|자치시|자치도/g, '').replace(/체육회|스포츠단/g, '')
          .replace(/시청|군청|구청|도청/g, '').replace(/[시군구도청]$/g, '').trim();
}

/* ── 파싱 ── */
const re = /(\d)단부\s+([가-힣]+)\s+([가-힣]+)/g;
const records = [];
for (const f of files) {
  const raw = readFileSync(join(__dirname, f), 'utf8');
  let m; while ((m = re.exec(raw)) !== null) records.push({ dan: Number(m[1]), team: m[2], name: m[3] });
}

const { rows: teams } = await db.execute('SELECT id, name FROM teams');
const findTeam = (ex) => teams.find((t) => teamCore(t.name) === teamCore(ex));
const usedSlugs = new Set((await db.execute('SELECT slug FROM players')).rows.map((r) => r.slug));

const toAdd = [], skip = [], noTeam = [];
const seen = new Set();
for (const rec of records) {
  const team = findTeam(rec.team);
  if (!team) { noTeam.push(rec); continue; }
  const key = rec.name + '@' + team.id;
  if (seen.has(key)) continue;
  seen.add(key);

  const { rows } = await db.execute({
    sql: `SELECT t.name AS team FROM players p JOIN teams t ON t.id = p.team_id WHERE p.name = ?`,
    args: [rec.name],
  });
  const existsSameTeam = rows.some((r) => teamCore(r.team) === teamCore(rec.team));
  if (existsSameTeam) { skip.push(rec); continue; }

  let base = slugify(rec.name), slug = base, n = 2;
  while (usedSlugs.has(slug)) slug = `${base}-${n++}`;
  usedSlugs.add(slug);

  const otherTeamDup = rows.length > 0;   // 같은 이름이 다른 팀에 있음
  toAdd.push({ name: rec.name, team: team.name, team_id: team.id, dan: rec.dan, slug, otherTeamDup });
}

console.log(`\n파싱 ${records.length}건 · 이미 있음 ${skip.length} · 추가대상 ${toAdd.length} · 팀못찾음 ${noTeam.length}`);
console.log(`\n■ 추가할 선수 ${toAdd.length}명 ─────────────`);
for (const a of toAdd)
  console.log(`  ${a.name} (${a.team}) ${a.dan}단  slug=${a.slug}${a.otherTeamDup ? '  ⚠️타팀동명이인' : ''}`);
if (noTeam.length) {
  console.log(`\n■ 팀 못 찾음 ${noTeam.length}건 (추가 불가)`);
  for (const n of noTeam) console.log(`  ${n.name} (${n.team})`);
}

if (APPLY) {
  for (const a of toAdd)
    await db.execute({
      sql: 'INSERT INTO players (name, slug, team_id, dan_grade) VALUES (?, ?, ?, ?)',
      args: [a.name, a.slug, a.team_id, a.dan],
    });
  console.log(`\n✅ ${toAdd.length}명 추가 완료`);
} else {
  console.log(`\n(미리보기 — 추가 안 됨. 실행하려면 --apply)`);
}
process.exit(0);
