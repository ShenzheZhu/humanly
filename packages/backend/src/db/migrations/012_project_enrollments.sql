-- Persist user portal invite-code enrollments so admin views can count them.

CREATE TABLE IF NOT EXISTS project_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_enrollments_project_id
    ON project_enrollments(project_id);

CREATE INDEX IF NOT EXISTS idx_project_enrollments_user_id
    ON project_enrollments(user_id);
