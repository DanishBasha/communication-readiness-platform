const path = require('path');
const { Pool } = require(path.join(__dirname, '../backend/node_modules/pg'));

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres123@localhost:5432/college_readiness_db'
});

async function run() {
  console.log('--- Applying created_by Columns Migration ---');
  await pool.query(`
    ALTER TABLE identity.users 
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES identity.users(id) ON DELETE SET NULL;

    ALTER TABLE college.students 
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES identity.users(id) ON DELETE SET NULL;

    ALTER TABLE college.trainer_tenures 
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES identity.users(id) ON DELETE SET NULL;
  `);
  console.log('✅ created_by columns successfully added to identity.users, college.students, and college.trainer_tenures!');
  await pool.end();
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
