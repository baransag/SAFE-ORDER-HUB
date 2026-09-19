const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function migrate() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/safe_order_hub';
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected to PostgreSQL:', connectionString.split('@')[1]);

  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await client.query(schemaSql);
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
