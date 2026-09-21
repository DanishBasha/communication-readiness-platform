const path = require('path');
const { Pool } = require(path.join(__dirname, '../backend/node_modules/pg'));

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres123@localhost:5432/college_readiness_db'
});

async function main() {
  await pool.query("DELETE FROM identity.users WHERE email != 'admin@college.edu'");
  const res = await pool.query("SELECT id, name, email, role FROM identity.users");
  console.log("Current registered users in database:");
  console.table(res.rows);
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
