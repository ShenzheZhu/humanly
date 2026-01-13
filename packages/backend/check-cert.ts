import { query } from './src/config/database';

async function checkCertificate() {
  try {
    const result = await query(
      `SELECT id, is_protected,
       access_code_hash IS NOT NULL as has_hash,
       LENGTH(access_code_hash) as hash_len
       FROM certificates
       WHERE id = '8d520b5f-9ad9-4418-93fd-f5f552115e7d'`
    );

    console.log('Certificate data:', result[0]);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkCertificate();
