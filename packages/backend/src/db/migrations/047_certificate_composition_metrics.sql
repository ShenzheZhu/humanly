ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS final_text_composition JSONB,
  ADD COLUMN IF NOT EXISTS process_input_volume JSONB;

COMMENT ON COLUMN certificates.final_text_composition IS
  'Snapshot of surviving final-text character sources: typed, pasted, and in-platform AI-assisted text';

COMMENT ON COLUMN certificates.process_input_volume IS
  'Snapshot of cumulative write-time input volume by source, including deleted or overwritten typed, pasted, and AI-assisted text';
