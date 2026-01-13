import { query } from './src/config/database';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    console.log('Running migration...');

    const sql = fs.readFileSync(
      path.join(__dirname, 'src/db/migrations/003_add_certificate_options.sql'),
      'utf8'
    );

    await query(sql);
    console.log('✓ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
