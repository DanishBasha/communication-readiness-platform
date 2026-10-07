/**
 * add-coins.js — Set every student's coin balance to 15 in credit.credit_accounts.
 * Run from the backend/ directory:  node add-coins.js
 * Reads DATABASE_URL from .env in the same directory.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

function loadEnv(envPath) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }
  return env;
}

const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('ERROR: .env not found at', envPath);
  process.exit(1);
}

const env = loadEnv(envPath);
const DATABASE_URL = env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set in .env');
  process.exit(1);
}

const TARGET_BALANCE = 15;

const needsSsl = DATABASE_URL.includes('supabase.com') ||
                 DATABASE_URL.includes('supabase.co') ||
                 DATABASE_URL.includes('sslmode=require');

const pool = new Pool({
  connectionString: DATABASE_URL,
  connectionTimeoutMillis: 10000,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

(async () => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `UPDATE credit.credit_accounts
          SET balance = $1, updated_at = now()
        WHERE balance < $1
        RETURNING id, student_id, balance`,
      [TARGET_BALANCE]
    );

    if (rows.length === 0) {
      // Show current balances
      const cur = await client.query(
        `SELECT id, student_id, balance FROM credit.credit_accounts ORDER BY balance DESC`
      );
      if (cur.rows.length === 0) {
        console.log('No credit accounts found.');
      } else {
        console.log(`All accounts already at ${TARGET_BALANCE}+ coins:`);
        for (const r of cur.rows) {
          console.log(`  • student_id=${r.student_id}  balance=${r.balance}`);
        }
      }
    } else {
      console.log(`Updated ${rows.length} account(s) to ${TARGET_BALANCE} coins:`);
      for (const r of rows) {
        console.log(`  • student_id=${r.student_id}  balance=${r.balance}`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
})().catch(err => {
  console.error('DB error:', err.message);
  process.exit(1);
});
