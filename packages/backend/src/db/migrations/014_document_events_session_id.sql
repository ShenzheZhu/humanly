-- Link user-portal document events to the real analytics session created when
-- the submission editor is opened.

ALTER TABLE document_events
    ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_document_events_session_id
    ON document_events(session_id)
    WHERE session_id IS NOT NULL;

