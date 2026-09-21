const path = require('path');
const { Pool } = require(path.join(__dirname, '../backend/node_modules/pg'));

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres123@localhost:5432/college_readiness_db'
});

async function main() {
  await pool.query("DELETE FROM identity.users WHERE email != 'admin@college.edu'");
  const res = await pool.query("SELECT id, name, email, role, status FROM identity.users");
  console.log('✅ Current Active Users in Database:');
  console.table(res.rows);
  const students = await pool.query("SELECT COUNT(*) FROM college.students");
  console.log('Total Students in college.students:', students.rows[0].count);
  await pool.end();
}

main().catch(console.error);
