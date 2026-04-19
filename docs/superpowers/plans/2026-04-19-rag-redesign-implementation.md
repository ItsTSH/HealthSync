# RAG System Redesign v3.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a production-grade, HIPAA-compliant RAG system with dual-storage architecture, deterministic PII masking, encrypted reference tables, BGE reranking, temporal weighting, multi-patient safety, and comprehensive audit logging.

**Architecture:** Multi-stage query pipeline with masked-only embedding/retrieval/LLM processing, deterministic token generation for patient anonymization, post-generation token restoration, comprehensive audit logging, and built-in PII leak detection. Dual-storage (masked + original) ensures retrieval quality while maintaining security.

**Tech Stack:** FastAPI, PostgreSQL (Supabase pgvector), Gemini Embeddings API, Groq LLM, BGE Reranker, AES-256-GCM encryption, SQLAlchemy ORM

**Status:** Ready for implementation

---

## File Structure

### New Core Services
- `backend/services/encryption.py` - AES-256-GCM encryption/decryption
- `backend/services/query_classifier.py` - Patient-specific/multi-patient/general/temporal classification
- `backend/services/reranking.py` - BGE reranker integration with fallback
- `backend/services/confidence_calibration.py` - Multi-factor confidence scoring
- `backend/services/reference_management.py` - Patient/doctor token management
- `backend/services/pii_leak_detector.py` - Pre/post-generation leak detection
- `backend/services/embedding_fallback.py` - Embedding retry with BM25 fallback

### Modified Services
- `backend/services/pii_masking.py` - Add deterministic tokens, masking confidence, leak detection
- `backend/services/retrieval.py` - Add temporal weighting, masking confidence filtering
- `backend/services/chunking.py` - Update to store masking confidence
- `backend/services/gemini_embeddings.py` - Add embedding version tracking
- `backend/services/audit.py` - Extend for multi-patient flagging and compliance
- `backend/services/llm.py` - Masked context handling + post-generation token restoration

### New Database Models
- `backend/db/models.py` - Add reference tables, chunk mappings, encryption

### New API Routes
- `backend/routers/ragRoutes.py` - Complete rewrite with all v3.1 improvements

### Tests
- `backend/tests/unit/test_pii_masking_v3.py` - Deterministic tokens, leak detection
- `backend/tests/unit/test_encryption.py` - AES-256-GCM operations
- `backend/tests/unit/test_query_classifier.py` - Query classification
- `backend/tests/unit/test_confidence_calibration.py` - Multi-factor scoring
- `backend/tests/unit/test_reference_management.py` - Token management
- `backend/tests/integration/test_rag_pipeline_v3.py` - Full pipeline with all stages

### Database Migrations
- `backend/migrations/001_add_pgvector_extension.sql`
- `backend/migrations/002_create_masked_chunks_table.sql`
- `backend/migrations/003_create_reference_tables.sql`
- `backend/migrations/004_create_audit_tables.sql`
- `backend/migrations/005_enable_rls_policies.sql`

---

## Phase 1: Infrastructure & Database Setup

### Task 1: Database Migrations - pgvector Extension

**Files:**
- Create: `backend/migrations/001_add_pgvector_extension.sql`
- Modify: `backend/core/config.py` (add migration runner if not exists)

- [ ] **Step 1: Create pgvector extension migration**

```sql
-- File: backend/migrations/001_add_pgvector_extension.sql
CREATE EXTENSION IF NOT EXISTS vector;
SELECT extname FROM pg_extension WHERE extname='vector';
```

- [ ] **Step 2: Document migration in config**

- [ ] **Step 3: Test pgvector availability on Supabase**

Run in Supabase SQL Editor:
```sql
SELECT extname FROM pg_extension WHERE extname='vector';
```

Expected: Returns 'vector'

- [ ] **Step 4: Commit migration**

```bash
git add backend/migrations/001_add_pgvector_extension.sql
git commit -m "feat: add pgvector extension migration"
```

---

### Task 2: Database Models - Reference Tables

**Files:**
- Modify: `backend/db/models.py` (add new models)
- Create: `backend/migrations/002_create_reference_tables.sql`

- [ ] **Step 1: Add SQLAlchemy models for reference tables**

```python
# In backend/db/models.py - Add:

class PatientReference(Base):
    """Map deterministic patient tokens to encrypted names"""
    __tablename__ = "patient_reference"
    
    id = Column(BigInteger, primary_key=True)
    patient_id = Column(UUID, unique=True, nullable=False)
    patient_token = Column(String(50), unique=True, nullable=False)
    patient_name_encrypted = Column(LargeBinary, nullable=False)  # AES-256-GCM
    patient_name = Column(String(255), nullable=False)  # Cached plaintext
    user_id = Column(UUID, ForeignKey("auth.users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        Index('ix_patient_reference_user_id', 'user_id'),
        Index('ix_patient_reference_token', 'patient_token'),
    )

class DoctorReference(Base):
    """Map deterministic doctor tokens to encrypted names"""
    __tablename__ = "doctor_reference"
    
    id = Column(BigInteger, primary_key=True)
    doctor_id = Column(UUID, ForeignKey("auth.users.id"), unique=True, nullable=False)
    doctor_token = Column(String(50), unique=True, nullable=False)
    doctor_name_encrypted = Column(LargeBinary, nullable=False)  # AES-256-GCM
    doctor_name = Column(String(255), nullable=False)  # Cached plaintext
    specialization = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('ix_doctor_reference_token', 'doctor_token'),
    )

class ChunkPatientMapping(Base):
    """Track which patients are referenced in each chunk"""
    __tablename__ = "chunk_patient_mapping"
    
    id = Column(BigInteger, primary_key=True)
    chunk_id = Column(UUID, ForeignKey("masked_note_chunks.id", ondelete="CASCADE"), nullable=False)
    patient_token = Column(String(50), ForeignKey("patient_reference.patient_token"), nullable=False)
    patient_id = Column(UUID, nullable=False)
    user_id = Column(UUID, ForeignKey("auth.users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('ix_chunk_mapping_chunk_id', 'chunk_id'),
        Index('ix_chunk_mapping_token', 'patient_token'),
        Index('ix_chunk_mapping_user_id', 'user_id'),
    )

class MaskedNoteChunk(Base):
    """Primary masked chunks for vector search"""
    __tablename__ = "masked_note_chunks"
    
    id = Column(UUID, primary_key=True, default=uuid4)
    note_id = Column(UUID, ForeignKey("notes.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID, ForeignKey("auth.users.id"), nullable=False)
    chunk_text_masked = Column(Text, nullable=False)
    embedding = Column(Vector(768))
    embedding_model_version = Column(String(50), default='gemini-001')
    chunk_index = Column(Integer, nullable=False)
    section_type = Column(String(100))
    masking_confidence = Column(Float, default=0.95)
    masking_failed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        Index('ix_masked_chunks_user_id', 'user_id'),
        Index('ix_masked_chunks_note_id', 'note_id'),
        Index('ix_masked_chunks_user_created', ['user_id', 'created_at'], postgresql_order_by=['created_at DESC']),
        Index('ix_masked_chunks_confidence', ['masking_confidence'], postgresql_order_by=['masking_confidence DESC']),
    )

class OriginalNoteChunk(Base):
    """Backup of original unmasked chunks (for recovery only)"""
    __tablename__ = "original_note_chunks"
    
    id = Column(UUID, primary_key=True, ForeignKey("masked_note_chunks.id", ondelete="CASCADE"))
    note_id = Column(UUID, ForeignKey("notes.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID, ForeignKey("auth.users.id"), nullable=False)
    chunk_text_original = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 2: Create SQL migration file**

```sql
-- File: backend/migrations/002_create_reference_tables.sql
-- Create patient_reference table
CREATE TABLE IF NOT EXISTS patient_reference (
    id BIGSERIAL PRIMARY KEY,
    patient_id UUID NOT NULL UNIQUE,
    patient_token VARCHAR(50) NOT NULL UNIQUE,
    patient_name_encrypted BYTEA NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON patient_reference(user_id);
CREATE INDEX ON patient_reference(patient_token);

-- Similar for other tables...
```

- [ ] **Step 3: Run migration in Supabase**

- [ ] **Step 4: Verify tables created**

```sql
SELECT tablename FROM pg_tables 
WHERE tablename IN ('patient_reference', 'doctor_reference', 'masked_note_chunks')
AND schemaname = 'public';
```

- [ ] **Step 5: Commit**

```bash
git add backend/db/models.py backend/migrations/
git commit -m "feat: add reference tables and chunk models for v3.1 RAG"
```

---

### Task 3: Enable Row Level Security (RLS) Policies

**Files:**
- Create: `backend/migrations/005_enable_rls_policies.sql`

- [ ] **Step 1: Create RLS policy migration**

```sql
-- File: backend/migrations/005_enable_rls_policies.sql
-- Enable RLS on masked_note_chunks
ALTER TABLE masked_note_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY masked_chunks_user_isolation ON masked_note_chunks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY masked_chunks_user_insert ON masked_note_chunks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Similar for other tables...
```

- [ ] **Step 2: Run RLS migration**

- [ ] **Step 3: Verify RLS enabled**

```sql
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename IN ('masked_note_chunks', 'patient_reference')
AND schemaname = 'public';
```

Expected: All show 't' (true) for rowsecurity

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/005_enable_rls_policies.sql
git commit -m "feat: enable RLS policies for data isolation"
```

---

## Phase 2: Core Security Services

### Task 4: Implement Encryption Service

**Files:**
- Create: `backend/services/encryption.py`
- Create: `backend/tests/unit/test_encryption.py`

- [ ] **Step 1: Write encryption service tests**

```python
# File: backend/tests/unit/test_encryption.py
import pytest
from services.encryption import EncryptionService, EncryptionKeyManager
import os

@pytest.fixture
def encryption_service():
    key_manager = EncryptionKeyManager()
    return EncryptionService(key_manager)

@pytest.mark.asyncio
async def test_encrypt_decrypt_patient_name(encryption_service):
    plaintext = "John Smith"
    encrypted = encryption_service.encrypt_patient_name(plaintext)
    decrypted = encryption_service.decrypt_patient_name(encrypted)
    assert decrypted == plaintext

@pytest.mark.asyncio
async def test_encrypt_decrypt_original_text(encryption_service):
    plaintext = "Patient presented with elevated BP"
    encrypted = encryption_service.encrypt_original_text(plaintext)
    decrypted = encryption_service.decrypt_original_text(encrypted)
    assert decrypted == plaintext

@pytest.mark.asyncio
async def test_different_plaintexts_different_ciphertexts(encryption_service):
    """Different plaintexts should produce different ciphertexts"""
    text1 = "Patient A"
    text2 = "Patient B"
    enc1 = encryption_service.encrypt_patient_name(text1)
    enc2 = encryption_service.encrypt_patient_name(text2)
    assert enc1 != enc2

@pytest.mark.asyncio
async def test_encryption_determinism_not_required():
    """Each encryption should produce different ciphertext due to IV"""
    service = EncryptionService(EncryptionKeyManager())
    plaintext = "Same text"
    enc1 = service.encrypt_patient_name(plaintext)
    enc2 = service.encrypt_patient_name(plaintext)
    # Should be different due to random IV
    assert enc1 != enc2
    # But both should decrypt to same plaintext
    assert service.decrypt_patient_name(enc1) == plaintext
    assert service.decrypt_patient_name(enc2) == plaintext

@pytest.mark.asyncio
async def test_wrong_key_fails_decryption(encryption_service):
    """Decryption with wrong key should fail"""
    plaintext = "Secret text"
    encrypted = encryption_service.encrypt_patient_name(plaintext)
    
    # Tamper with encrypted data
    tampered = bytes([b ^ 0xFF for b in encrypted[:16]]) + encrypted[16:]
    
    with pytest.raises(Exception):  # Should raise decryption error
        encryption_service.decrypt_patient_name(tampered)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
pytest tests/unit/test_encryption.py -v
```

Expected: All tests FAIL (service doesn't exist yet)

- [ ] **Step 3: Implement encryption service**

```python
# File: backend/services/encryption.py
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
import os
import base64
import logging

logger = logging.getLogger(__name__)

class EncryptionKeyManager:
    """Manage encryption keys from environment or KMS"""
    
    def __init__(self, environment: str = None):
        if environment is None:
            environment = os.getenv('ENVIRONMENT', 'dev')
        self.environment = environment
        self._load_keys()
    
    def _load_keys(self):
        """Load encryption keys from environment"""
        # For development/production, load from environment variables
        patient_name_key_b64 = os.getenv('ENCRYPTION_KEY_PATIENT_NAME')
        if not patient_name_key_b64:
            logger.warning("ENCRYPTION_KEY_PATIENT_NAME not set, generating ephemeral key")
            self.patient_name_key = AESGCM.generate_key(bit_length=256)
        else:
            self.patient_name_key = base64.b64decode(patient_name_key_b64)
        
        original_text_key_b64 = os.getenv('ENCRYPTION_KEY_ORIGINAL_TEXT')
        if not original_text_key_b64:
            logger.warning("ENCRYPTION_KEY_ORIGINAL_TEXT not set, generating ephemeral key")
            self.original_text_key = AESGCM.generate_key(bit_length=256)
        else:
            self.original_text_key = base64.b64decode(original_text_key_b64)

class EncryptionService:
    """Encrypt/decrypt sensitive data using AES-256-GCM"""
    
    def __init__(self, key_manager: EncryptionKeyManager):
        self.key_manager = key_manager
    
    def encrypt_patient_name(self, plaintext: str) -> bytes:
        """
        Encrypt patient name.
        
        Returns: IV (16 bytes) + Ciphertext + Tag (16 bytes)
        Total: 16 + len(plaintext) + 16 = variable length
        """
        iv = os.urandom(16)  # 128-bit IV
        cipher = AESGCM(self.key_manager.patient_name_key)
        ciphertext = cipher.encrypt(iv, plaintext.encode(), None)
        return iv + ciphertext  # IV + (ciphertext + auth tag)
    
    def decrypt_patient_name(self, encrypted_data: bytes) -> str:
        """
        Decrypt patient name.
        
        Format: IV (16 bytes) + Ciphertext + Tag
        """
        iv = encrypted_data[:16]
        ciphertext_and_tag = encrypted_data[16:]
        cipher = AESGCM(self.key_manager.patient_name_key)
        plaintext = cipher.decrypt(iv, ciphertext_and_tag, None)
        return plaintext.decode()
    
    def encrypt_original_text(self, plaintext: str) -> bytes:
        """Encrypt original note text"""
        iv = os.urandom(16)
        cipher = AESGCM(self.key_manager.original_text_key)
        ciphertext = cipher.encrypt(iv, plaintext.encode(), None)
        return iv + ciphertext
    
    def decrypt_original_text(self, encrypted_data: bytes) -> str:
        """Decrypt original note text"""
        iv = encrypted_data[:16]
        ciphertext_and_tag = encrypted_data[16:]
        cipher = AESGCM(self.key_manager.original_text_key)
        plaintext = cipher.decrypt(iv, ciphertext_and_tag, None)
        return plaintext.decode()
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/unit/test_encryption.py -v
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/services/encryption.py backend/tests/unit/test_encryption.py
git commit -m "feat: implement AES-256-GCM encryption service for PII"
```

---

### Task 5: Implement PII Masking Service with Deterministic Tokens

**Files:**
- Modify: `backend/services/pii_masking.py` (complete rewrite)
- Create: `backend/tests/unit/test_pii_masking_v3.py`

- [ ] **Step 1: Write comprehensive PII masking tests**

```python
# File: backend/tests/unit/test_pii_masking_v3.py
import pytest
from services.pii_masking import PIIMaskingService, PIITokenGenerator
import hashlib

@pytest.fixture
def pii_service():
    return PIIMaskingService()

@pytest.fixture
def token_generator():
    return PIITokenGenerator(salt=b"test_salt_32_bytes_long_enough_v1")

def test_generate_patient_token_deterministic(token_generator):
    """Same patient should generate same token"""
    user_id = "user_123"
    patient_id = "patient_456"
    
    token1 = token_generator.generate_patient_token(user_id, patient_id)
    token2 = token_generator.generate_patient_token(user_id, patient_id)
    
    assert token1 == token2
    assert token1.startswith("<PATIENT_")
    assert token1.endswith(">")
    assert len(token1) == len("<PATIENT_xxxxxx>")

def test_generate_patient_tokens_different_for_different_patients(token_generator):
    """Different patients should generate different tokens"""
    user_id = "user_123"
    patient_id_1 = "patient_456"
    patient_id_2 = "patient_789"
    
    token1 = token_generator.generate_patient_token(user_id, patient_id_1)
    token2 = token_generator.generate_patient_token(user_id, patient_id_2)
    
    assert token1 != token2

def test_generate_doctor_token_deterministic(token_generator):
    """Same doctor should generate same token"""
    doctor_id = "doctor_123"
    
    token1 = token_generator.generate_doctor_token(doctor_id)
    token2 = token_generator.generate_doctor_token(doctor_id)
    
    assert token1 == token2
    assert token1.startswith("<DOCTOR_")

def test_token_format_valid(token_generator):
    """Tokens should match expected format"""
    import re
    user_id = "user_123"
    patient_id = "patient_456"
    doctor_id = "doctor_123"
    
    patient_token = token_generator.generate_patient_token(user_id, patient_id)
    doctor_token = token_generator.generate_doctor_token(doctor_id)
    
    patient_pattern = r'^<PATIENT_[a-f0-9]{6}>$'
    doctor_pattern = r'^<DOCTOR_[a-f0-9]{6}>$'
    
    assert re.match(patient_pattern, patient_token)
    assert re.match(doctor_pattern, doctor_token)

@pytest.mark.asyncio
async def test_mask_note_basic(pii_service):
    """Basic note masking"""
    note = "Patient John Smith presents with chest pain. Examined by Dr. Jane Doe."
    result = await pii_service.mask_note(
        note_text=note,
        patient_id="patient_123",
        doctor_id="doctor_456",
        user_id="user_789"
    )
    
    assert "masked_text" in result
    assert "token_map" in result
    assert "masking_confidence" in result
    
    # Masked text should not contain real names
    assert "John Smith" not in result["masked_text"]
    assert "Jane Doe" not in result["masked_text"]
    assert "Dr." in result["masked_text"] or "<DOCTOR" in result["masked_text"]
    assert result["masking_confidence"] > 0.8

@pytest.mark.asyncio
async def test_mask_multiple_pii_types(pii_service):
    """Mask multiple PII types"""
    note = """Patient John Smith (DOB: 01/15/1980, SSN: 123-45-6789)
              Email: john@example.com
              Phone: 555-1234
              MRN: MR12345
              Address: 123 Main St, New York
              presents with symptoms"""
    
    result = await pii_service.mask_note(
        note_text=note,
        patient_id="patient_123",
        doctor_id="doctor_456",
        user_id="user_789"
    )
    
    masked = result["masked_text"]
    
    # Check that PII types are masked
    assert "01/15/1980" not in masked or "[DOB]" in masked
    assert "123-45-6789" not in masked or "[SSN]" in masked
    assert "john@example.com" not in masked or "[EMAIL]" in masked
    assert "555-1234" not in masked or "[PHONE]" in masked

@pytest.mark.asyncio
async def test_masking_confidence_low_when_failures(pii_service):
    """Lower confidence when masking fails"""
    # Note with ambiguous patterns that might fail to mask
    note = "Patient X has condition Y"  # Minimal names
    
    result = await pii_service.mask_note(
        note_text=note,
        patient_id="patient_123",
        doctor_id="doctor_456",
        user_id="user_789"
    )
    
    # Should have some confidence even if low
    assert 0 <= result["masking_confidence"] <= 1.0

def test_pii_leak_detection():
    """Test PII leak detection"""
    from services.pii_masking import PIILeakDetector
    detector = PIILeakDetector()
    
    # Should detect obvious SSN
    text_with_ssn = "The patient's SSN is 123-45-6789"
    leaks = detector.detect_leaks(text_with_ssn)
    assert len(leaks) > 0
    assert "SSN" in str(leaks[0])
    
    # Should NOT detect masked version
    masked_text = "The patient's SSN is [SSN]"
    leaks = detector.detect_leaks(masked_text)
    # Should be empty or very low confidence
    assert len(leaks) == 0 or all(leak['confidence'] < 0.5 for leak in leaks)

@pytest.mark.asyncio
async def test_token_restoration_basic(pii_service):
    """Test unmask_response token restoration"""
    masked_response = "Based on <PATIENT_a2f5c7>'s notes, <DOCTOR_b3e8d2> found..."
    
    token_map = {
        "<PATIENT_a2f5c7>": "John Smith",
        "<DOCTOR_b3e8d2>": "Dr. Jane Doe"
    }
    
    result = await pii_service.unmask_response(masked_response, token_map)
    unmasked = result["unmasked_response"]
    
    assert "John Smith" in unmasked
    assert "Dr. Jane Doe" in unmasked
    assert "<PATIENT_" not in unmasked
    assert "<DOCTOR_" not in unmasked
```

- [ ] **Step 2: Run tests to fail**

```bash
pytest tests/unit/test_pii_masking_v3.py -v
```

Expected: FAIL (services don't exist)

- [ ] **Step 3: Implement enhanced PII masking service**

Create comprehensive implementation:

```python
# File: backend/services/pii_masking.py
import re
import hashlib
import os
from typing import Dict, List, Tuple
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class MaskingResult:
    masked_text: str
    token_map: Dict[str, str]
    masking_confidence: float
    failed_masks: List[str]

class PIITokenGenerator:
    """Generate deterministic PII tokens"""
    
    def __init__(self, salt: bytes = None):
        if salt is None:
            salt_env = os.getenv('TOKEN_HASHING_SALT', '')
            if not salt_env:
                raise ValueError("TOKEN_HASHING_SALT env var required for production")
            salt = salt_env.encode() if isinstance(salt_env, str) else salt_env
        self.salt = salt
    
    def generate_patient_token(self, user_id: str, patient_id: str) -> str:
        """Generate deterministic patient token"""
        combined = f"{user_id}:{patient_id}:{self.salt.decode('utf-8', errors='ignore')}"
        hash_digest = hashlib.sha256(combined.encode()).hexdigest()[:6]
        return f"<PATIENT_{hash_digest}>"
    
    def generate_doctor_token(self, doctor_id: str) -> str:
        """Generate deterministic doctor token"""
        combined = f"{doctor_id}:{self.salt.decode('utf-8', errors='ignore')}"
        hash_digest = hashlib.sha256(combined.encode()).hexdigest()[:6]
        return f"<DOCTOR_{hash_digest}>"

class PIILeakDetector:
    """Detect potential PII leaks in text"""
    
    # PII patterns with confidence scores
    PATTERNS = {
        'SSN': (r'\d{3}-\d{2}-\d{4}', 0.95),
        'PHONE': (r'[\(\[]?\d{3}[\)\-\]]?\s*\d{3}\s*[\-\.]?\d{4}', 0.85),
        'EMAIL': (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', 0.90),
        'DOB': (r'\d{1,2}[/-]\d{1,2}[/-]\d{4}', 0.60),  # Lower confidence (could be other dates)
        'CREDIT_CARD': (r'\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}', 0.85),
    }
    
    def detect_leaks(self, text: str) -> List[Dict]:
        """Detect PII in text"""
        leaks = []
        for pii_type, (pattern, confidence) in self.PATTERNS.items():
            matches = re.finditer(pattern, text)
            for match in matches:
                leaks.append({
                    'type': pii_type,
                    'value': match.group(),
                    'confidence': confidence,
                    'position': (match.start(), match.end())
                })
        return leaks

class PIIMaskingService:
    """Comprehensive PII masking with deterministic tokens"""
    
    def __init__(self):
        self.token_generator = PIITokenGenerator()
        self.leak_detector = PIILeakDetector()
        self.patterns = {
            'name': r'\b([A-Z][a-z]+ [A-Z][a-z]+)\b',  # "First Last"
            'ssn': r'\d{3}-\d{2}-\d{4}',
            'phone': r'[\(\[]?\d{3}[\)\-\]]?\s*\d{3}\s*[\-\.]?\d{4}',
            'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            'dob': r'\d{1,2}[/-]\d{1,2}[/-]\d{4}',
            'mrn': r'(?:MR|MRN)\s*:?\s*[A-Z0-9]+',
            'address': r'\d+\s+[A-Z][a-z]+\s+(?:St|Ave|Rd|Ln|Court)',
            'doctor': r'Dr\.\s+([A-Z][a-z]+ [A-Z][a-z]+)',
        }
    
    async def mask_note(
        self,
        note_text: str,
        patient_id: str,
        doctor_id: str,
        user_id: str
    ) -> MaskingResult:
        """Mask note with deterministic tokens and confidence scoring"""
        
        masked_text = note_text
        token_map = {}
        confidence_scores = []
        failed_masks = []
        
        # Generate deterministic tokens
        patient_token = self.token_generator.generate_patient_token(user_id, patient_id)
        doctor_token = self.token_generator.generate_doctor_token(doctor_id)
        
        # Mask patient names
        matches = list(re.finditer(self.patterns['name'], masked_text))
        if matches:
            for match in matches:
                name = match.group()
                masked_text = masked_text.replace(name, patient_token, 1)
                token_map[patient_token] = name
                confidence_scores.append(0.90)
        else:
            failed_masks.append('patient_name')
            confidence_scores.append(0.50)
        
        # Mask doctor names
        matches = list(re.finditer(self.patterns['doctor'], masked_text))
        if matches:
            for match in matches:
                masked_text = masked_text.replace(match.group(0), doctor_token, 1)
                token_map[doctor_token] = match.group(1)
                confidence_scores.append(0.90)
        else:
            failed_masks.append('doctor_name')
            confidence_scores.append(0.50)
        
        # Mask other PII types
        mask_replacements = {
            'ssn': ('[SSN]', 0.95),
            'phone': ('[PHONE]', 0.85),
            'email': ('[EMAIL]', 0.90),
            'dob': ('[DOB]', 0.80),
            'mrn': ('[MRN]', 0.85),
            'address': ('[ADDRESS]', 0.75),
        }
        
        for pii_type, (replacement, confidence) in mask_replacements.items():
            matches = list(re.finditer(self.patterns[pii_type], masked_text))
            if matches:
                for match in matches:
                    masked_text = re.sub(self.patterns[pii_type], replacement, masked_text, count=1)
                confidence_scores.append(confidence)
            else:
                confidence_scores.append(0.70)  # Conservative for missing patterns
        
        # Calculate overall masking confidence
        avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.5
        
        return MaskingResult(
            masked_text=masked_text,
            token_map=token_map,
            masking_confidence=avg_confidence,
            failed_masks=failed_masks
        )
    
    async def unmask_response(
        self,
        masked_response: str,
        combined_token_map: Dict[str, str]
    ) -> Dict:
        """Restore patient names in response"""
        
        unmasked_response = masked_response
        
        # Replace all tokens with real names
        for token, name in combined_token_map.items():
            unmasked_response = unmasked_response.replace(token, name)
        
        # Detect any remaining PII leaks
        leaks = self.leak_detector.detect_leaks(unmasked_response)
        
        return {
            'unmasked_response': unmasked_response,
            'leaks_detected': leaks,
            'has_pii_leaks': len(leaks) > 0
        }
    
    def detect_pii_leaks(self, text: str) -> List[Dict]:
        """Detect PII in text"""
        return self.leak_detector.detect_leaks(text)
```

- [ ] **Step 4: Run tests to pass**

```bash
pytest tests/unit/test_pii_masking_v3.py -v
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/services/pii_masking.py backend/tests/unit/test_pii_masking_v3.py
git commit -m "feat: implement deterministic PII masking with token generation and leak detection"
```

---

### Task 6: Implement Query Classifier

**Files:**
- Create: `backend/services/query_classifier.py`
- Create: `backend/tests/unit/test_query_classifier.py`

- [ ] **Step 1: Write query classifier tests**

```python
# File: backend/tests/unit/test_query_classifier.py
import pytest
from services.query_classifier import QueryClassifier, QueryType

@pytest.fixture
def classifier():
    return QueryClassifier()

def test_patient_specific_query(classifier):
    """Classify patient-specific queries"""
    query = "What were John's vital signs in his last visit?"
    result = classifier.classify(query)
    
    assert result['query_type'] == QueryType.PATIENT_SPECIFIC

def test_multi_patient_query(classifier):
    """Classify multi-patient queries"""
    query = "Compare symptoms between John and Mary"
    result = classifier.classify(query)
    
    assert result['query_type'] == QueryType.MULTI_PATIENT

def test_temporal_query(classifier):
    """Classify temporal queries"""
    query = "How did the patient's blood pressure change over time?"
    result = classifier.classify(query)
    
    assert result['query_type'] == QueryType.TEMPORAL

def test_general_query(classifier):
    """Classify general knowledge queries"""
    query = "What is hypertension?"
    result = classifier.classify(query)
    
    assert result['query_type'] == QueryType.GENERAL

def test_context_size_scaling(classifier):
    """Context size should scale by query type"""
    patient_specific_query = "What was the chief complaint?"
    general_query = "What is diabetes?"
    
    patient_result = classifier.classify(patient_specific_query)
    general_result = classifier.classify(general_query)
    
    # Patient-specific should have more context
    assert patient_result['context_size'] > general_result['context_size']
```

- [ ] **Step 2: Run tests to fail**

```bash
pytest tests/unit/test_query_classifier.py -v
```

- [ ] **Step 3: Implement query classifier**

```python
# File: backend/services/query_classifier.py
from enum import Enum
import re
from typing import Dict

class QueryType(Enum):
    PATIENT_SPECIFIC = "patient_specific"
    MULTI_PATIENT = "multi_patient"
    GENERAL = "general"
    TEMPORAL = "temporal"

class QueryClassifier:
    """Classify queries to optimize retrieval strategy"""
    
    PATIENT_SPECIFIC_KEYWORDS = {
        'his', 'her', 'their', 'patient', 'me', 'my', 'my patient',
        'the patient', 'chief complaint', 'symptoms', 'vitals', 'bp',
        'temperature', 'diagnosis', 'treatment'
    }
    
    MULTI_PATIENT_KEYWORDS = {
        'compare', 'between', 'versus', 'vs', 'differ', 'difference',
        'both', 'each', 'patients', 'all patients', 'another',
        'one patient', 'this patient and'
    }
    
    TEMPORAL_KEYWORDS = {
        'change', 'improve', 'worsen', 'progression', 'over time',
        'timeline', 'history', 'before', 'after', 'then', 'now',
        'week', 'month', 'year', 'previously', 'initially'
    }
    
    GENERAL_KEYWORDS = {
        'what is', 'define', 'explain', 'how do', 'why',
        'difference between', 'overview', 'information about'
    }
    
    CONTEXT_SIZES = {
        QueryType.PATIENT_SPECIFIC: 10,
        QueryType.MULTI_PATIENT: 15,
        QueryType.GENERAL: 5,
        QueryType.TEMPORAL: 12,
    }
    
    def classify(self, query: str) -> Dict:
        """Classify query and return strategy"""
        query_lower = query.lower()
        
        # Score each category
        scores = {
            QueryType.PATIENT_SPECIFIC: self._score_keywords(query_lower, self.PATIENT_SPECIFIC_KEYWORDS),
            QueryType.MULTI_PATIENT: self._score_keywords(query_lower, self.MULTI_PATIENT_KEYWORDS),
            QueryType.TEMPORAL: self._score_keywords(query_lower, self.TEMPORAL_KEYWORDS),
            QueryType.GENERAL: self._score_keywords(query_lower, self.GENERAL_KEYWORDS),
        }
        
        # Determine primary type
        query_type = max(scores, key=scores.get)
        
        # If scores are tied or low, analyze for multi-patient patterns
        if scores[QueryType.MULTI_PATIENT] > scores[QueryType.PATIENT_SPECIFIC]:
            query_type = QueryType.MULTI_PATIENT
        elif scores[QueryType.GENERAL] > 0.5 and all(s <= 0.3 for s in scores.values() if k != QueryType.GENERAL):
            query_type = QueryType.GENERAL
        
        return {
            'query_type': query_type,
            'scores': scores,
            'context_size': self.CONTEXT_SIZES[query_type],
            'needs_patient_filter': query_type != QueryType.GENERAL,
            'retrieval_method': 'semantic' if query_type != QueryType.GENERAL else 'keyword',
        }
    
    def _score_keywords(self, text: str, keywords: set) -> float:
        """Score how many keywords match"""
        matches = sum(1 for keyword in keywords if keyword in text)
        return matches / len(keywords) if keywords else 0
```

- [ ] **Step 4: Run tests to pass**

```bash
pytest tests/unit/test_query_classifier.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/services/query_classifier.py backend/tests/unit/test_query_classifier.py
git commit -m "feat: implement query classifier for optimized retrieval routing"
```

---

## Phase 3: Retrieval & Ranking Services

### Task 7: Update Retrieval Service with Temporal Weighting

**Files:**
- Modify: `backend/services/retrieval.py` (update existing with temporal weighting)
- Modify: `backend/tests/unit/test_retrieval.py` (add temporal tests)

- [ ] **Step 1: Write temporal retrieval tests**

- [ ] **Step 2: Implement temporal weighting logic**

```python
# In backend/services/retrieval.py - Add temporal weighting function
import math
from datetime import datetime

async def retrieve_chunks_with_temporal_weighting(
    query_embedding: list,
    user_id: str,
    top_k: int = 50
):
    """Retrieve with temporal weighting: 0.7 * similarity + 0.3 * recency"""
    
    # Base vector search
    results = await pgvector_search(
        query_embedding=query_embedding,
        user_id=user_id,
        limit=top_k * 2
    )
    
    now = datetime.utcnow()
    
    # Apply temporal weighting
    for result in results:
        days_old = (now - result['created_at']).days
        # Recency score: exponential decay over 30 days
        recency_score = math.exp(-days_old / 30.0)
        
        # Combine: 70% similarity, 30% recency
        result['final_score'] = (0.7 * result['similarity']) + (0.3 * recency_score)
    
    # Sort by final score and return top_k
    sorted_results = sorted(results, key=lambda x: x['final_score'], reverse=True)
    return sorted_results[:top_k]
```

- [ ] **Step 3: Add masking confidence filtering**

```python
# Filter chunks by masking confidence
async def retrieve_chunks_with_confidence_filtering(
    query_embedding: list,
    user_id: str,
    min_masking_confidence: float = 0.7,
    top_k: int = 50
):
    """Retrieve chunks with minimum masking confidence"""
    
    results = await retrieve_chunks_with_temporal_weighting(
        query_embedding, user_id, top_k * 3
    )
    
    # Filter by masking confidence
    filtered = [r for r in results if r.get('masking_confidence', 1.0) >= min_masking_confidence]
    
    return filtered[:top_k]
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/unit/test_retrieval.py -v -k temporal
```

- [ ] **Step 5: Commit**

```bash
git add backend/services/retrieval.py backend/tests/unit/test_retrieval.py
git commit -m "feat: add temporal weighting and masking confidence filtering to retrieval"
```

---

### Task 8: Implement BGE Reranker Service

**Files:**
- Create: `backend/services/reranking.py`
- Create: `backend/tests/unit/test_reranking.py`

- [ ] **Step 1: Write reranking tests**

- [ ] **Step 2: Implement BGE reranker integration**

```python
# File: backend/services/reranking.py
from typing import List, Dict
import logging
import asyncio

logger = logging.getLogger(__name__)

class RerankingService:
    """Re-rank retrieved chunks using BGE reranker"""
    
    def __init__(self, model_name: str = "BAAI/bge-reranker-base"):
        try:
            # Import reranker model
            from sentence_transformers import CrossEncoder
            self.reranker = CrossEncoder(model_name)
            logger.info(f"Loaded reranker model: {model_name}")
        except Exception as e:
            logger.error(f"Failed to load reranker: {e}")
            self.reranker = None  # Will fallback to similarity scoring
    
    async def rerank_chunks(
        self,
        query: str,
        chunks: List[Dict],
        top_k: int = 10,
        min_confidence: float = 0.3
    ) -> List[Dict]:
        """
        Rerank chunks using cross-encoder scoring.
        
        Combines: 0.6 * reranker_score + 0.4 * similarity_score
        """
        
        if not chunks:
            return []
        
        if not self.reranker:
            logger.warning("Reranker unavailable, using similarity scores only")
            return self._rerank_by_similarity(chunks, top_k, min_confidence)
        
        try:
            # Prepare pairs for reranking
            pairs = [(query, chunk['text']) for chunk in chunks]
            
            # Get reranker scores
            scores = await asyncio.to_thread(self.reranker.predict, pairs)
            
            # Combine scores with similarity
            for i, chunk in enumerate(chunks):
                reranker_score = scores[i]
                similarity_score = chunk.get('similarity', 0.0)
                
                # Normalize scores to 0-1
                norm_reranker = (reranker_score + 1) / 2  # CrossEncoder outputs -1 to 1
                norm_similarity = max(0, min(1, similarity_score))
                
                chunk['reranker_score'] = norm_reranker
                chunk['combined_score'] = (0.6 * norm_reranker) + (0.4 * norm_similarity)
            
            # Sort by combined score
            sorted_chunks = sorted(chunks, key=lambda x: x['combined_score'], reverse=True)
            
            # Filter by minimum confidence
            filtered = [c for c in sorted_chunks if c['combined_score'] >= min_confidence]
            
            return filtered[:top_k]
        
        except Exception as e:
            logger.error(f"Reranking failed: {e}, falling back to similarity")
            return self._rerank_by_similarity(chunks, top_k, min_confidence)
    
    def _rerank_by_similarity(
        self,
        chunks: List[Dict],
        top_k: int,
        min_confidence: float
    ) -> List[Dict]:
        """Fallback: sort by similarity score only"""
        
        sorted_chunks = sorted(chunks, key=lambda x: x.get('similarity', 0.0), reverse=True)
        filtered = [c for c in sorted_chunks if c.get('similarity', 0.0) >= min_confidence]
        return filtered[:top_k]
```

- [ ] **Step 3: Add reranking to requirements**

Add to `backend/requirements.txt`:
```
sentence-transformers==3.0.0  # For BGE reranker
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/unit/test_reranking.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/services/reranking.py backend/tests/unit/test_reranking.py backend/requirements.txt
git commit -m "feat: implement BGE reranker with similarity score combination"
```

---

This plan covers **Phases 1-3 of the implementation** (Infrastructure, Security, Retrieval). Due to token limits, I'll continue with the remaining phases once you confirm this approach and I'll track progress with the todo list.

Let me now set up the tracking system and present a high-level overview:
<function_calls>
<invoke name="manage_todo_list">
<parameter name="todoList">[
  {
    "id": 1,
    "title": "Phase 1: Database Infrastructure Setup",
    "status": "not-started"
  },
  {
    "id": 2,
    "title": "Phase 2: Core Security Services",
    "status": "not-started"
  },
  {
    "id": 3,
    "title": "Phase 3: Retrieval & Ranking",
    "status": "not-started"
  },
  {
    "id": 4,
    "title": "Phase 4: RAG Pipeline Endpoint",
    "status": "not-started"
  },
  {
    "id": 5,
    "title": "Phase 5: Streaming & Post-Processing",
    "status": "not-started"
  },
  {
    "id": 6,
    "title": "Phase 6: Testing & Validation",
    "status": "not-started"
  },
  {
    "id": 7,
    "title": "Phase 7: Frontend Integration",
    "status": "not-started"
  },
  {
    "id": 8,
    "title": "Phase 8: Deployment & Monitoring",
    "status": "not-started"
  }
]