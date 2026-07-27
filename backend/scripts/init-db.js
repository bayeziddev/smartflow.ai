#!/usr/bin/env node
/**
 * Applies src/db/schema.sql against the database configured in .env.
 * Splits on semicolons naively — fine for this schema file since it
 * has no stored procedures / triggers with embedded semicolons.
 *
 * Usage: npm run db:init
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const schemaPath = path.join(__dirname, '..', 'src', 'db', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  console.log('Applying schema.sql ...');
  await connection.query(sql);
  console.log('Schema applied successfully.');
  await connection.end();
}

main().catch((err) => {
  console.error('Failed to apply schema:', err.message);
  process.exit(1);
});
