-- Speed up publisher submission lists that surface chat-refusal review signals.
-- The list query counts policy-refusal events by submitted document up to each
-- submission timestamp, so keep the event type in the same index path.

CREATE INDEX IF NOT EXISTS idx_document_events_doc_type_timestamp
  ON document_events(document_id, event_type, timestamp DESC);
