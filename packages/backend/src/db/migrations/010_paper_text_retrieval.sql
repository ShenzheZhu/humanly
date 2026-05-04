-- Derived text index for uploaded papers.
-- The original PDF remains in UPLOAD_DIR/papers and papers.pdf_storage_path.

CREATE TABLE IF NOT EXISTS paper_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (paper_id, page_number)
);

CREATE TABLE IF NOT EXISTS paper_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    section_title TEXT NOT NULL,
    start_page INTEGER,
    end_page INTEGER,
    text TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS paper_text_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    page_number INTEGER,
    section_title TEXT,
    chunk_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (paper_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_paper_pages_paper_page ON paper_pages(paper_id, page_number);
CREATE INDEX IF NOT EXISTS idx_paper_sections_paper_title ON paper_sections(paper_id, lower(section_title));
CREATE INDEX IF NOT EXISTS idx_paper_text_chunks_paper_page ON paper_text_chunks(paper_id, page_number);
CREATE INDEX IF NOT EXISTS idx_paper_pages_text_search ON paper_pages USING GIN(to_tsvector('english', text));
CREATE INDEX IF NOT EXISTS idx_paper_sections_text_search ON paper_sections USING GIN(to_tsvector('english', text));
CREATE INDEX IF NOT EXISTS idx_paper_text_chunks_text_search ON paper_text_chunks USING GIN(to_tsvector('english', text));

COMMENT ON TABLE paper_pages IS 'Extracted per-page text derived from PDFs stored on local filesystem';
COMMENT ON TABLE paper_sections IS 'Detected paper sections derived from extracted PDF text';
COMMENT ON TABLE paper_text_chunks IS 'Searchable text chunks derived from uploaded PDFs';
