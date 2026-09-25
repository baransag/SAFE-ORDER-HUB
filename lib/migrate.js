const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function migrate() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/safe_order_hub';
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const client = new Client({ 
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false }
  });
  await client.connect();
  console.log('Connected to PostgreSQL:', connectionString.split('@')[1]);

  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const cleanSql = schemaSql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

  const statements = cleanSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    console.log(`[${i + 1}/${statements.length}] ${stmt.substring(0, 60).replace(/\n/g, ' ')}...`);
    let retries = 10;
    while (retries > 0) {
      try {
        await client.query(stmt);
        break;
      } catch (err) {
        if ((err.code === '40001' || err.code === '55000') && retries > 1) {
          retries--;
          console.log(`Waiting for table descriptor (${err.code})... retrying (${retries} attempts left)`);
          await new Promise(r => setTimeout(r, 1500));
        } else {
          console.error('Error on statement:', stmt.substring(0, 80));
          throw err;
        }
      }
    }
  }
  console.log('Schema applied successfully.');

  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('Tables in database:', res.rows.map(r => r.table_name));

  await client.end();
}

migrate().catch(e => {
  console.error('Migration error:', e);
  process.exit(1);
});
