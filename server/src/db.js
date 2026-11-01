import pg from 'pg';
import { config } from './config.js';

// numeric/int8 -> number, date -> 'YYYY-MM-DD'
pg.types.setTypeParser(1700, parseFloat);
pg.types.setTypeParser(20, parseInt);
pg.types.setTypeParser(1082, (v) => v);

const local = /localhost|127\.0\.0\.1/.test(config.databaseUrl);
export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: local ? false : { rejectUnauthorized: false },
  max: 5,
});

export const query = (text, params) => pool.query(text, params);

/** Ejecuta fn(client) dentro de una transacción. */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
