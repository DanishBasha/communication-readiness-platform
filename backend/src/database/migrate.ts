import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { config } from '../config/env';

export async function runMigration() {
  console.log('--- Starting PostgreSQL Database Migration ---');
  
  // 1. Connect to default postgres DB to ensure target database exists
  const setupClient = new Client({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: 'postgres'
  });

  try {
    await setupClient.connect();
    const dbCheck = await setupClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [config.database.database]
    );

    if (dbCheck.rowCount === 0) {
      console.log(`Database '${config.database.database}' does not exist. Creating...`);
      await setupClient.query(`CREATE DATABASE "${config.database.database}"`);
      console.log(`Database '${config.database.database}' created successfully.`);
    } else {
      console.log(`Database '${config.database.database}' already exists.`);
    }
  } catch (error) {
    console.error('Error during initial database verification:', error);
  } finally {
    await setupClient.end();
  }

  // 2. Connect to the target database and execute schema.sql
  const targetClient = new Client({
    connectionString: config.database.url
  });

  try {
    await targetClient.connect();
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing schema.sql DDL...');
    await targetClient.query(sql);
    console.log('All schemas, tables, constraints, and indexes created successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await targetClient.end();
  }
}

if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Migration completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration error:', err);
      process.exit(1);
    });
}
