-- Add document_id column to papers table to link papers with documents
ALTER TABLE papers ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents(id) ON DELETE SET NULL;

-- Index for fast lookup by document_id
CREATE INDEX IF NOT EXISTS idx_papers_document_id ON papers(document_id) WHERE document_id IS NOT NULL;
