-- Migration: 004_create_audit_table.sql
-- Purpose: Create immutable audit log for RAG queries
-- Date: 2026-04-19

CREATE TABLE IF NOT EXISTS rag_queries_audit (
    id BIGSERIAL PRIMARY KEY,
    query_id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Query information (stored MASKED)
    query_text_masked TEXT NOT NULL,
    query_embedding_requested BOOLEAN DEFAULT FALSE,
    
    -- Retrieval information
    retrieved_chunk_count INT,
    retrieved_chunk_ids UUID[],
    retrieval_method VARCHAR(50) DEFAULT 'semantic',
    
    -- LLM generation
    tokens_generated INT,
    confidence_score FLOAT,
    
    -- Multi-patient flagging (NEW v3.1)
    is_multi_patient_query BOOLEAN DEFAULT FALSE,
    query_classification VARCHAR(50),  -- patient_specific, multi_patient, general, temporal
    
    -- Metadata
    ip_address_masked VARCHAR(50),
    response_time_ms INT,
    model_version VARCHAR(50) DEFAULT 'v3.1',
    
    -- Timestamps
    query_time TIMESTAMP DEFAULT NOW(),
    completion_time TIMESTAMP
);

-- Create immutable trigger (prevent updates/deletes)
CREATE OR REPLACE FUNCTION raise_immutable_error()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit log is immutable - cannot modify records';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS rag_audit_immutable
    BEFORE UPDATE OR DELETE ON rag_queries_audit
    FOR EACH ROW EXECUTE FUNCTION raise_immutable_error();

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS ix_rag_audit_user_time ON rag_queries_audit(user_id, query_time DESC);
CREATE INDEX IF NOT EXISTS ix_rag_audit_query_time ON rag_queries_audit(query_time DESC);
CREATE INDEX IF NOT EXISTS ix_rag_audit_multi_patient ON rag_queries_audit(is_multi_patient_query);
