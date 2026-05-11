-- Link a user portal project enrollment to the submission document created for it.

ALTER TABLE project_enrollments
    ADD COLUMN IF NOT EXISTS submission_document_id UUID REFERENCES documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_project_enrollments_submission_document_id
    ON project_enrollments(submission_document_id)
    WHERE submission_document_id IS NOT NULL;
