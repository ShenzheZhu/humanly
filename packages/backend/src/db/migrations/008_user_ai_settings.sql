-- User AI Settings table
-- Stores per-user AI configuration (API key encrypted with AES-256-GCM)

CREATE TABLE IF NOT EXISTS user_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  encrypted_api_key TEXT NOT NULL,
  base_url TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
  model TEXT NOT NULL DEFAULT 'gpt-4o',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_ai_settings_user ON user_ai_settings(user_id);
