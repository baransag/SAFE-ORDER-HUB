import { Pool, PoolClient, QueryResult } from 'pg';

let pool: Pool | null = null;

export function isPostgresConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  return Boolean(url && url.trim().length > 0 && !url.includes('NOT_SET'));
}

export function assertPostgresConfigured(): string {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim().length === 0 || url.includes('NOT_SET')) {
    throw new Error(
      'CONFIGURATION_ERROR: DATABASE_URL is not configured. ' +
      'SAFE ORDER HUB requires an authoritative PostgreSQL / Neon database connection. ' +
      'No fake/mock in-memory database fallback is permitted. ' +
      'Please configure DATABASE_URL in environment variables.'
    );
  }
  return url;
}

export function getPool(): Pool {
  if (pool) return pool;

  const connectionString = assertPostgresConfigured();
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });

  return pool;
}

export async function queryPostgres<T = any>(queryText: string, params: any[] = []): Promise<T[]> {
  const p = getPool();
  try {
    const res = await p.query(queryText, params);
    return res.rows as T[];
  } catch (err: any) {
    console.error('PostgreSQL Query Error:', {
      query: queryText.substring(0, 100),
      params,
      message: err.message,
    });
    throw err;
  }
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
