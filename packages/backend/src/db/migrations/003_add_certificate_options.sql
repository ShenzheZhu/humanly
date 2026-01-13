-- ============================================================================
-- Add certificate generation options
-- ============================================================================

-- Add signer name (optional custom name to display instead of email)
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS signer_name VARCHAR(255);

-- Add option to include full text and edit history in certificate
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS include_full_text BOOLEAN DEFAULT TRUE;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS include_edit_history BOOLEAN DEFAULT TRUE;

-- Add access code protection (hashed)
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS access_code_hash TEXT;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS is_protected BOOLEAN DEFAULT FALSE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_certificates_is_protected ON certificates(is_protected);

-- Comments
COMMENT ON COLUMN certificates.signer_name IS 'Optional custom name to display on certificate instead of email';
COMMENT ON COLUMN certificates.include_full_text IS 'Whether to include full text in the certificate';
COMMENT ON COLUMN certificates.include_edit_history IS 'Whether to include detailed edit history in the certificate';
COMMENT ON COLUMN certificates.access_code_hash IS 'Hashed access code for protected certificates';
COMMENT ON COLUMN certificates.is_protected IS 'Whether certificate requires access code to view';
