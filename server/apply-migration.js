// 단일 마이그레이션을 "비파괴적"으로 적용한다 (migrate.js는 전체 DROP+재구축이라 위험).
// 사용법: node apply-migration.js 011_player_questions.sql
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

const file = process.argv[2];
if (!file) {
  console.error('사용법: node apply-migration.js <마이그레이션 파일명>');
  process.exit(1);
}

const sql = readFileSync(join(__dirname, 'migrations', file), 'utf8');
const statements = sql
  .split('\n')
  .map((line) => line.replace(/--.*$/, ''))
  .join('\n')
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

for (const stmt of statements) {
  await db.execute(stmt);
  console.log('✓', stmt.slice(0, 70).replace(/\s+/g, ' '));
}
console.log(`\n완료: ${file} (${statements.length}개 구문 적용)`);
process.exit(0);
