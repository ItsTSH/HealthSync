-- Migration: 005_enable_rls_policies.sql
-- Purpose: Enable Row Level Security policies for user data isolation
-- Date: 2026-04-19

-- 1. Enable RLS on masked_note_chunks
ALTER TABLE masked_note_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS masked_chunks_user_select ON masked_note_chunks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS masked_chunks_user_insert ON masked_note_chunks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Enable RLS on original_note_chunks
ALTER TABLE original_note_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS original_chunks_user_select ON original_note_chunks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS original_chunks_user_insert ON original_note_chunks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Enable RLS on patient_reference
ALTER TABLE patient_reference ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS patient_ref_user_select ON patient_reference
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS patient_ref_user_insert ON patient_reference
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Enable RLS on chunk_patient_mapping
ALTER TABLE chunk_patient_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS chunk_mapping_user_select ON chunk_patient_mapping
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS chunk_mapping_user_insert ON chunk_patient_mapping
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('masked_note_chunks', 'original_note_chunks', 'patient_reference', 'chunk_patient_mapping')
AND schemaname = 'public'
ORDER BY tablename;
