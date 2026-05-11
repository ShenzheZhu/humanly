-- Add account role separation for admin and user portals.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'user'));

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
