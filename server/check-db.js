import { createClient } from '@libsql/client';
import 'dotenv/config';

const db = createClient({
  url:       process.env.TURSO_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const { rows } = await db.execute(
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
);
console.log('테이블 목록:', rows.map(r => r.name));
process.exit(0);
