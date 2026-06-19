ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at
  ON tasks(deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_active_not_deleted
  ON tasks(task_token)
  WHERE is_active = TRUE AND deleted_at IS NULL;
