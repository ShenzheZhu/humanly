-- Add plaintext access code column for owner reference
-- This is separate from access_code_hash which is used for verification
-- Only visible to certificate owner, never exposed in public APIs
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS access_code TEXT;

-- Create index for access code lookups (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_certificates_access_code ON certificates(access_code) WHERE access_code IS NOT NULL;
