import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = createClient({
  url:       process.env.TURSO_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

function parseStatements(sql) {
  return sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// FK 의존 순서대로 DROP
const DROP_ORDER = [
  'clinic_bookings','clinics','sponsorships','predictions',
  'follows',
  'division_results','tournament_picks','division_participants','tournament_divisions',
  'player_comments',
  'dojo_invitations',
  'inquiries',
  'users',
  'dojos',
  'seasons',
  'matches','tournaments',
  'player_gear','player_stats','players','teams',
];

async function dropAll() {
  for (const t of DROP_ORDER) {
    await db.execute(`DROP TABLE IF EXISTS ${t}`).catch(() => {});
  }
  console.log('✓ 기존 테이블 DROP');
}

async function run(file) {
  const sql        = readFileSync(join(__dirname, 'migrations', file), 'utf8');
  const statements = parseStatements(sql);
  for (const stmt of statements) {
    try {
      await db.execute(stmt);
    } catch (e) {
      if (!stmt.toUpperCase().startsWith('PRAGMA')) throw e;
    }
  }
  console.log(`✓ ${file}  (${statements.length}개 구문)`);
}

await dropAll();
await run('001_init.sql');
await run('002_seed.sql');
await run('003_enrich.sql');
await run('004_clinics_sponsors.sql');
await run('005_pick_system.sql');
await run('006_data_enrich.sql');
await run('007_player_accounts.sql');
await run('008_comments.sql');
await run('009_dojo_invitations.sql');
await run('010_inquiries.sql');
console.log('마이그레이션 완료!');
process.exit(0);
