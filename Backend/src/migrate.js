import { readdir, readFile } from 'node:fs/promises';
import { pool } from './db.js';

const migrationsDir = new URL('../migrations/', import.meta.url);

async function runMigration(filename) {
  const sql = await readFile(new URL(filename, migrationsDir), 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

await pool.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    run_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`);

const alreadyRun = await pool.query('SELECT filename FROM schema_migrations');
const runFilenames = new Set(alreadyRun.rows.map((row) => row.filename));
const allFilenames = (await readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort();
const pending = allFilenames.filter((name) => !runFilenames.has(name));

for (const filename of pending) {
  await runMigration(filename);
  console.log(`Ran ${filename}`);
}
if (pending.length === 0) console.log('Nothing to run');

await pool.end();
