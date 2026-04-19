-- Migration 006: Create Chat Management Tables for RAG v4.0
-- Created: 2026-04-19
-- Purpose: Multi-chat system with session context and message tracking

-- ============================================================================
-- CHATS TABLE - Core chat sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for user's chats, sorted by recency
CREATE INDEX IF NOT EXISTS idx_chats_user ON chats(user_id, updated_at DESC);

-- Row-level security: users only see their own chats
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_chats_policy ON chats;
CREATE POLICY user_chats_policy ON chats
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- CHAT_MESSAGES TABLE - Individual messages within chats
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  queried_patients JSONB, -- Array of {name, id, confidence, match_type}
  cited_chunk_ids UUID[], -- References to note_embeddings
  citations JSONB, -- Full citation metadata
  tokens_used INT,
  confidence FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast chat message retrieval
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON chat_messages(chat_id, created_at DESC);

-- Row-level security: users only see messages in their chats
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_messages_policy ON chat_messages;
CREATE POLICY user_messages_policy ON chat_messages
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- CHAT_SESSIONS TABLE - Server-side session context per chat
-- ============================================================================
-- Stores:
-- - Referenced patients (for pronoun resolution)
-- - Conversation summary
-- - Query counter (0-10)
-- - Session metadata
CREATE TABLE IF NOT EXISTS chat_sessions (
  chat_id UUID PRIMARY KEY REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  referenced_patient_ids UUID[], -- For pronoun resolution (ordered by recency)
  last_referenced_patient_id UUID, -- Most recent patient mentioned
  query_count INT DEFAULT 0, -- Current query count (0-10)
  is_full BOOLEAN DEFAULT FALSE, -- True when query_count == 10
  conversation_summary TEXT, -- Brief summary of conversation
  metadata JSONB, -- Additional context {patient_context, section_filters, etc}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Row-level security: enforce user isolation via RLS on chats table
-- (SELECT from sessions via chats table)
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_sessions_policy ON chat_sessions;
CREATE POLICY user_sessions_policy ON chat_sessions
  FOR ALL USING (
    user_id = auth.uid() AND
    chat_id IN (
      SELECT id FROM chats WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get active chats count for a user
CREATE OR REPLACE FUNCTION get_user_active_chats_count(p_user_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*) 
  FROM chats 
  WHERE user_id = p_user_id 
    AND created_at >= NOW() - INTERVAL '30 days';
$$;

-- Function to check if chat is full (10 queries)
CREATE OR REPLACE FUNCTION is_chat_full(p_chat_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(is_full, FALSE)
  FROM chat_sessions
  WHERE chat_id = p_chat_id;
$$;

-- Function to increment chat query counter
CREATE OR REPLACE FUNCTION increment_chat_query_count(p_chat_id UUID)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_count INT;
BEGIN
  UPDATE chat_sessions
  SET query_count = query_count + 1,
      is_full = (query_count + 1) >= 10,
      updated_at = NOW()
  WHERE chat_id = p_chat_id
  RETURNING query_count INTO v_new_count;
  
  RETURN v_new_count;
END;
$$;

-- Function to update chat session context with new patients
CREATE OR REPLACE FUNCTION update_chat_session_patients(
  p_chat_id UUID,
  p_new_patient_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE chat_sessions
  SET 
    referenced_patient_ids = p_new_patient_ids,
    last_referenced_patient_id = p_new_patient_ids[1],
    updated_at = NOW()
  WHERE chat_id = p_chat_id;
END;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON chats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_active_chats_count TO authenticated;
GRANT EXECUTE ON FUNCTION is_chat_full TO authenticated;
GRANT EXECUTE ON FUNCTION increment_chat_query_count TO authenticated;
GRANT EXECUTE ON FUNCTION update_chat_session_patients TO authenticated;
