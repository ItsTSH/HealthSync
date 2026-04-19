-- Migration: 003_create_masked_chunk_tables.sql
-- Purpose: Create masked and original note chunk storage tables
-- Date: 2026-04-19

-- 1. Masked Note Chunks (PRIMARY - used for retrieval)
CREATE TABLE IF NOT EXISTS masked_note_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Chunk content and embedding
    chunk_text_masked TEXT NOT NULL,
    embedding vector(768),
    embedding_model_version VARCHAR(50) DEFAULT 'gemini-001',
    
    -- Chunk metadata
    chunk_index INT NOT NULL,
    section_type VARCHAR(100),
    
    -- Masking confidence and status
    masking_confidence FLOAT DEFAULT 0.95,
    masking_failed BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Vector search index (IVFFlat for speed)
CREATE INDEX IF NOT EXISTS ix_masked_chunks_embedding ON masked_note_chunks 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- User and temporal filtering indexes
CREATE INDEX IF NOT EXISTS ix_masked_chunks_user_id ON masked_note_chunks(user_id);
CREATE INDEX IF NOT EXISTS ix_masked_chunks_note_id ON masked_note_chunks(note_id);
CREATE INDEX IF NOT EXISTS ix_masked_chunks_user_created ON masked_note_chunks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_masked_chunks_confidence ON masked_note_chunks(masking_confidence DESC);

-- 2. Original Note Chunks (BACKUP - for recovery only)
CREATE TABLE IF NOT EXISTS original_note_chunks (
    id UUID PRIMARY KEY,
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Original (unmasked) text
    chunk_text_original TEXT NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key to masked chunk
    CONSTRAINT fk_masked_chunk FOREIGN KEY (id) REFERENCES masked_note_chunks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_original_chunks_user_id ON original_note_chunks(user_id);
CREATE INDEX IF NOT EXISTS ix_original_chunks_note_id ON original_note_chunks(note_id);
