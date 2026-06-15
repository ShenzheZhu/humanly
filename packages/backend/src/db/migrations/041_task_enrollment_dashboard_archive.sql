-- Hide assigned-task cards from the user dashboard without deleting the
-- enrollment, linked document, submissions, events, or certificates.

ALTER TABLE task_enrollments
  ADD COLUMN IF NOT EXISTS dashboard_hidden_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dashboard_restored_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_task_enrollments_visible_dashboard
  ON task_enrollments(user_id, joined_at DESC)
  WHERE dashboard_hidden_at IS NULL;

COMMENT ON COLUMN task_enrollments.dashboard_hidden_at IS
  'When set, hides the task enrollment from the user dashboard while preserving server-side evidence';

COMMENT ON COLUMN task_enrollments.dashboard_restored_at IS
  'Last time a hidden task enrollment was restored by rejoining the same task';
