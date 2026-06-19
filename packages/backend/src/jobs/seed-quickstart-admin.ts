import { closeDatabaseConnection, queryOne } from '../config/database';
import { hashPassword } from '../utils/crypto';
import { logger } from '../utils/logger';

const DEFAULT_ADMIN_EMAIL = 'admin@mail.com';
const DEFAULT_ADMIN_PASSWORD = 'admin123456';

async function main() {
  if (process.env.HUMANLY_QUICKSTART !== 'true') {
    throw new Error('Refusing to seed quickstart admin outside HUMANLY_QUICKSTART=true');
  }

  const email = process.env.QUICKSTART_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
  const password = process.env.QUICKSTART_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
  const passwordHash = await hashPassword(password);

  const user = await queryOne<{ id: string; email: string }>(
    `
      INSERT INTO users (
        email,
        password_hash,
        email_verified,
        email_verification_token,
        email_verification_expires,
        password_reset_token,
        password_reset_expires,
        name,
        first_name,
        last_name,
        profile_completed,
        role
      )
      VALUES ($1, $2, TRUE, NULL, NULL, NULL, NULL, 'Humanly Admin', 'Humanly', 'Admin', TRUE, 'admin')
      ON CONFLICT (email) DO UPDATE
      SET password_hash = EXCLUDED.password_hash,
          email_verified = TRUE,
          email_verification_token = NULL,
          email_verification_expires = NULL,
          password_reset_token = NULL,
          password_reset_expires = NULL,
          name = EXCLUDED.name,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          profile_completed = TRUE,
          role = 'admin',
          updated_at = NOW()
      RETURNING id, email
    `,
    [email, passwordHash]
  );

  logger.info('Quickstart admin account is ready', {
    userId: user?.id,
    email,
  });
}

main()
  .catch((error) => {
    logger.error('Failed to seed quickstart admin account', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabaseConnection();
  });
