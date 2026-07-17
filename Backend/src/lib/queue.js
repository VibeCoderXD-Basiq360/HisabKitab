const PgBoss = require('pg-boss');

let boss = null;

function getQueue() {
  if (!boss) {
    boss = new PgBoss({
      connectionString: process.env.DATABASE_URL,
      // Don't let pg-boss create its own pool — share Supabase connection limit
      max: 2,
      deleteAfterSeconds: 86400 * 7, // keep completed jobs 7 days for audit
    });

    boss.on('error', (err) => console.error('[queue] pg-boss error:', err.message));
  }
  return boss;
}

module.exports = { getQueue };
