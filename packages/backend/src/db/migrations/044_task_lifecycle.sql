ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS launched_at TIMESTAMP;

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_lifecycle_status_check'
  ) THEN
    ALTER TABLE tasks
    ADD CONSTRAINT tasks_lifecycle_status_check
    CHECK (lifecycle_status IN ('draft', 'active', 'paused', 'ended'));
  END IF;
END $$;

UPDATE tasks
SET launched_at = COALESCE(launched_at, created_at, NOW())
WHERE lifecycle_status = 'active'
  AND launched_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_lifecycle_status ON tasks(lifecycle_status);
