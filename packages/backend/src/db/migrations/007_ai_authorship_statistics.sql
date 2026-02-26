-- ============================================================================
-- AI Authorship Statistics - Track AI selection actions and question categories
-- for certificate generation
-- ============================================================================

-- AI Selection Actions - Track grammar fix, improve writing, simplify, make formal
-- with acceptance/rejection decisions
CREATE TABLE IF NOT EXISTS ai_selection_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Action type: grammar, improve, simplify, formal
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'grammar', 'improve', 'simplify', 'formal'
    )),

    -- Original and suggested text
    original_text TEXT NOT NULL,
    suggested_text TEXT NOT NULL,

    -- User decision
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('accepted', 'rejected')),

    -- Final text (if accepted, same as suggested_text; if rejected, same as original_text)
    final_text TEXT NOT NULL,

    -- Metadata
    response_time_ms INTEGER,
    model_version VARCHAR(100),

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_selection_actions_document_id ON ai_selection_actions(document_id);
CREATE INDEX idx_ai_selection_actions_user_id ON ai_selection_actions(user_id);
CREATE INDEX idx_ai_selection_actions_action_type ON ai_selection_actions(action_type);
CREATE INDEX idx_ai_selection_actions_decision ON ai_selection_actions(decision);
CREATE INDEX idx_ai_selection_actions_created_at ON ai_selection_actions(created_at DESC);
CREATE INDEX idx_ai_selection_actions_document_created ON ai_selection_actions(document_id, created_at DESC);

-- Add question_category to ai_interaction_logs for understanding vs generation classification
ALTER TABLE ai_interaction_logs
ADD COLUMN IF NOT EXISTS question_category VARCHAR(50) CHECK (question_category IN (
    'understanding', 'generation', 'other'
));

-- Add index for question_category
CREATE INDEX IF NOT EXISTS idx_ai_interaction_logs_question_category
ON ai_interaction_logs(question_category);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE ai_selection_actions IS 'Track AI text improvement actions (grammar, improve, simplify, formal) with user acceptance/rejection decisions';
COMMENT ON COLUMN ai_selection_actions.action_type IS 'Type of AI action: grammar, improve, simplify, formal';
COMMENT ON COLUMN ai_selection_actions.decision IS 'User decision: accepted or rejected';
COMMENT ON COLUMN ai_selection_actions.final_text IS 'The text that was ultimately used (suggested if accepted, original if rejected)';
COMMENT ON COLUMN ai_interaction_logs.question_category IS 'Category of AI question: understanding (questions about content) or generation (requests to create/modify content)';
