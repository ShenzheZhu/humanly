-- ============================================================================
-- AI Assistant Tables - Chat sessions, messages, and interaction logs
-- ============================================================================

-- AI Chat Sessions - conversations with the AI assistant per document
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_chat_sessions_document_id ON ai_chat_sessions(document_id);
CREATE INDEX idx_ai_chat_sessions_user_id ON ai_chat_sessions(user_id);
CREATE INDEX idx_ai_chat_sessions_status ON ai_chat_sessions(status);
CREATE INDEX idx_ai_chat_sessions_created_at ON ai_chat_sessions(created_at DESC);

-- AI Chat Messages - individual messages in a chat session
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_chat_messages_session_id ON ai_chat_messages(session_id);
CREATE INDEX idx_ai_chat_messages_role ON ai_chat_messages(role);
CREATE INDEX idx_ai_chat_messages_created_at ON ai_chat_messages(created_at);

-- AI Interaction Logs - detailed logs of AI interactions for traceability
CREATE TABLE IF NOT EXISTS ai_interaction_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE SET NULL,

    -- Request details
    query TEXT NOT NULL,
    query_type VARCHAR(50) DEFAULT 'other' CHECK (query_type IN (
        'grammar_check', 'spelling_check', 'rewrite', 'summarize',
        'expand', 'translate', 'format', 'question', 'reference', 'other'
    )),
    context_snapshot JSONB DEFAULT '{}',

    -- Response details
    response TEXT,
    suggestions JSONB DEFAULT '[]',
    response_time_ms INTEGER,
    tokens_used JSONB DEFAULT '{}',

    -- Modification tracking
    modifications_applied BOOLEAN DEFAULT FALSE,
    modifications JSONB DEFAULT '[]',

    -- Metadata
    model_version VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('success', 'error', 'cancelled', 'pending')),
    error_message TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_interaction_logs_document_id ON ai_interaction_logs(document_id);
CREATE INDEX idx_ai_interaction_logs_user_id ON ai_interaction_logs(user_id);
CREATE INDEX idx_ai_interaction_logs_session_id ON ai_interaction_logs(session_id);
CREATE INDEX idx_ai_interaction_logs_query_type ON ai_interaction_logs(query_type);
CREATE INDEX idx_ai_interaction_logs_status ON ai_interaction_logs(status);
CREATE INDEX idx_ai_interaction_logs_created_at ON ai_interaction_logs(created_at DESC);
CREATE INDEX idx_ai_interaction_logs_document_created ON ai_interaction_logs(document_id, created_at DESC);

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger to update updated_at timestamp on ai_chat_sessions
CREATE OR REPLACE FUNCTION update_ai_chat_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_chat_sessions_updated_at
    BEFORE UPDATE ON ai_chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_chat_sessions_updated_at();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE ai_chat_sessions IS 'AI assistant chat sessions per document';
COMMENT ON TABLE ai_chat_messages IS 'Individual messages in AI chat sessions';
COMMENT ON TABLE ai_interaction_logs IS 'Detailed logs of AI interactions for full traceability';
COMMENT ON COLUMN ai_interaction_logs.context_snapshot IS 'Document state at time of AI request (content, selection, cursor)';
COMMENT ON COLUMN ai_interaction_logs.suggestions IS 'AI-generated suggestions for content modifications';
COMMENT ON COLUMN ai_interaction_logs.modifications IS 'Applied modifications (before/after diffs)';
