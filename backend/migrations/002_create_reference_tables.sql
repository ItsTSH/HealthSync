-- Migration: 002_create_reference_tables.sql
-- Purpose: Create reference tables for patient/doctor token mapping
-- Date: 2026-04-19

-- 1. Patient Reference Table (with encrypted name storage)
CREATE TABLE IF NOT EXISTS patient_reference (
    id BIGSERIAL PRIMARY KEY,
    patient_id UUID NOT NULL UNIQUE,
    patient_token VARCHAR(50) NOT NULL UNIQUE,
    patient_name_encrypted BYTEA NOT NULL,  -- AES-256-GCM encrypted
    patient_name VARCHAR(255) NOT NULL,  -- Cached plaintext (ephemeral)
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_patient_reference_user_id ON patient_reference(user_id);
CREATE INDEX IF NOT EXISTS ix_patient_reference_token ON patient_reference(patient_token);

-- 2. Doctor Reference Table (with encrypted name storage)
CREATE TABLE IF NOT EXISTS doctor_reference (
    id BIGSERIAL PRIMARY KEY,
    doctor_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
    doctor_token VARCHAR(50) NOT NULL UNIQUE,
    doctor_name_encrypted BYTEA NOT NULL,  -- AES-256-GCM encrypted
    doctor_name VARCHAR(255) NOT NULL,  -- Cached plaintext (ephemeral)
    specialization VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_doctor_reference_token ON doctor_reference(doctor_token);

-- 3. Chunk-Patient Mapping Table
CREATE TABLE IF NOT EXISTS chunk_patient_mapping (
    id BIGSERIAL PRIMARY KEY,
    chunk_id UUID NOT NULL REFERENCES masked_note_chunks(id) ON DELETE CASCADE,
    patient_token VARCHAR(50) NOT NULL REFERENCES patient_reference(patient_token),
    patient_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_chunk_mapping_chunk_id ON chunk_patient_mapping(chunk_id);
CREATE INDEX IF NOT EXISTS ix_chunk_mapping_token ON chunk_patient_mapping(patient_token);
CREATE INDEX IF NOT EXISTS ix_chunk_mapping_user_id ON chunk_patient_mapping(user_id);
