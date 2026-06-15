const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  console.log("Connected!");
  
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);

  for (const row of tablesRes.rows) {
    const tableName = row.table_name;
    try {
      const countRes = await client.query(`SELECT COUNT(*) FROM "${tableName}";`);
      const count = countRes.rows[0].count;
      if (parseInt(count) > 0) {
        console.log(`Table ${tableName}: ${count} rows`);
      }
    } catch (e) {
      console.error(`Error querying ${tableName}:`, e.message);
    }
  }

  await client.end();
}

run().catch(console.error);
