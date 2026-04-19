-- Migration: 001_add_pgvector_extension.sql
-- Purpose: Enable pgvector extension for vector similarity search
-- Date: 2026-04-19

CREATE EXTENSION IF NOT EXISTS vector;

-- Verify the extension is loaded
SELECT extname FROM pg_extension WHERE extname='vector';
