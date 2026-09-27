import pg from 'pg';

// A DATE is a calendar day. pg would turn it into a JavaScript Date at local
// midnight, which moves the day in other timezones. Keep it as "YYYY-MM-DD".
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
