# HealthSync RAG Backend - Implementation & Deployment Guide

Production-grade RAG system for medical transcription with Supabase pgvector, Gemini embeddings, and Groq LLM.

## ✅ What's Been Implemented

### Phase 1: Infrastructure ✅
- [x] Supabase pgvector migration SQL (3 new tables + RLS)
- [x] Celery configuration (Redis broker, task routing)
- [x] Updated requirements.txt (RAG stack packages)
- [x] Environment variables configuration

### Phase 2: RAG Services ✅
- [x] **Chunking** (`services/chunking.py`) - 4-tier hierarchical chunking with medical sections
- [x] **PII Masking** (`services/pii_masking.py`) - HIPAA-compliant PII removal
- [x] **Gemini Embeddings** (`services/gemini_embeddings.py`) - Batch embedding in 768-dim
- [x] **Retrieval** (`services/retrieval.py`) - Multi-stage retrieval with temporal weighting
- [x] **Reranking** (`services/reranking.py`) - Cross-encoder based reranking
- [x] **LLM** (`services/llm.py`) - Groq integration with fallback handling
- [x] **Audit** (`services/audit.py`) - Append-only compliance logging

### Phase 3: Async Jobs ✅
- [x] **Celery Tasks** (`tasks/embedding_tasks.py`) - Async embedding pipeline with retry logic
- [x] **Worker** (`celery_worker.py`) - Command-line worker entry point

### Phase 4: API Endpoints ✅
- [x] **RAG Routes** (`routers/ragRoutes.py`) with 3 endpoints:
  - `POST /search/rag` - Multi-stage semantic search
  - `POST /search/process-note-async` - Async note processing
  - `GET /search/task-status/{task_id}` - Poll processing status
- [x] **RAG Schema** (`schema/ragSchema.py`) - Request/response models
- [x] **Main App** - Updated to include new routes

## 🚀 Quick Start (Next Steps)

### Step 1: Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Step 2: Setup Environment Variables

```bash
# Copy template
cp .env.example .env

# Edit with your keys
nano .env
# Required:
#   GEMINI_API_KEY / GEMINI_EMBEDDING_API_KEY
#   GROQ_API_KEY
#   SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY
#   REDIS_NOTES_URL
#   SECRET_KEY
```

### Step 3: Create Database Tables

```bash
# Connect to Supabase SQL editor and execute:
# backend/migrations/001_create_pgvector_tables.sql

# OR via CLI:
psql $DATABASE_URL < backend/migrations/001_create_pgvector_tables.sql
```

### Step 4: Start Redis

```bash
# Local development
redis-server

# Or using Docker
docker run -d -p 6379:6379 redis:latest
```

### Step 5: Start Celery Worker

```bash
# Terminal 1: Celery worker
python -m celery -A backend.core.celery_app worker --loglevel=info

# Or using script:
python celery_worker.py
```

### Step 6: Start Backend API

```bash
# Terminal 2: FastAPI server
uvicorn main:app --reload --port 8000
```

### Step 7: Test RAG Pipeline

```bash
# In Python or using curl:
curl -X POST http://localhost:8000/search/rag \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What medications is the patient taking?",
    "patient_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

## 📊 Architecture Overview

```
User Request
    ↓
FastAPI /search/rag endpoint
    ├─ STAGE 1: Embed query (Gemini API)
    ├─ STAGE 2: Retrieve chunks (pgvector, top-50)
    ├─ STAGE 3: Rerank (cross-encoder, top-5)
    ├─ STAGE 4: Generate response (Groq LLM)
    ├─ STAGE 5: Format with citations
    ├─ STAGE 6: Audit log
    └─ STAGE 7: Cache result

Response with:
    - Answer (LLM generated)
    - Citations (source tracking)
    - Confidence score (0-1)
    - Processing time
```

## 🔄 Processing Flow Details

### Synchronous RAG Query (user-facing)
```
Query: "What's the patient's diagnosis?"
    ↓
1. Embed query (30ms) → [768-dim vector]
2. Retrieve (200ms) → top-50 chunks
3. Rerank (150ms) → top-5 chunks  
4. LLM synthesis (800ms) → structured answer
5. Citations + audit → store results
Total: ~1.2 seconds
```

### Asynchronous Embedding (background)
```
New note created
    ↓
POST /search/process-note-async
    ↓
Enqueue Celery task (returns immediately)
    ↓
Worker processes:
    1. Fetch note (50ms)
    2. Chunk (100ms)
    3. PII mask (50ms)
    4. Embed batch (500ms - Gemini API)
    5. Store pgvector (200ms)
Total: ~900ms (in background)
```

## 📁 File Structure

### Core Services (/backend/services/)
```
chunking.py          - 4-tier hierarchical chunking
pii_masking.py      - HIPAA-compliant PII removal
gemini_embeddings.py - Batch Gemini embeddings
retrieval.py        - Multi-stage retrieval
reranking.py        - Cross-encoder reranking
llm.py              - Groq LLM integration
audit.py            - Compliance logging
```

### Async Tasks (/backend/tasks/)
```
embedding_tasks.py  - Celery task definitions
  - process_note_embedding()
  - batch_embed_notes()
  - retry_failed_embedding()
  - monitor_task_status()
```

### API (/backend/routers/)
```
ragRoutes.py        - RAG endpoints
  - POST /search/rag
  - POST /search/process-note-async
  - GET /search/task-status/{task_id}
```

### Configuration
```
core/celery_app.py  - Celery setup
core/config.py      - Environment + RAG config
core/initialization.py - Clients (to be updated)
celery_worker.py    - Worker entry point
```

## 🧪 Testing

### Test Embeddings
```bash
python scripts/test_gemini_embeddings.py
```

### Test LLM
```bash
python scripts/test_groq_llm.py
```

### Test Redis
```bash
python scripts/test_redis.py
```

### Test Full RAG Pipeline
```bash
python -c "
import asyncio
from backend.services.chunking import chunk_note

note = {'chiefComplaint': 'Headache', 'symptoms': 'Pain in forehead'}
chunks = chunk_note(note, 'test-note-id')
print(f'Generated {len(chunks)} chunks')
"
```

## 🔑 Key Features

### 1. 4-Tier Chunking
```
Tier 1: Medical sections (chief complaint, symptoms, etc.)
Tier 2: Sub-chunks if >300 tokens (sentence boundaries)
Tier 3: Context windows (neighboring chunks referenced)
Tier 4: Deduplication (within note)
Result: ~20-50 clean, overlapping chunks per note
```

### 2. PII Masking (Before Embedding)
```
Masks: Names, phone numbers, addresses
Preserves: Medications, symptoms, diagnoses
Applied to: chunk_text_masked before Gemini API
Safety: No PII ever sent to external API
```

### 3. Multi-Stage Retrieval
```
Stage 1: Hard filter (user_id + patient_id) - RLS enforcement
Stage 2: Vector search (pgvector cosine) - top-50
Stage 3: Temporal boost - recent chunks +20%
Stage 4: Final scoring - similarity * 0.8 + temporal * 0.2
```

### 4. Reranking
Uses cross-encoder model to re-score top-50 chunks against original query.
Improves precision significantly vs. pure vector similarity.

### 5. LLM Synthesis
- Medical-aware prompts
- Structured JSON output
- Token counting for cost tracking
- Graceful fallback (returns raw chunks if LLM fails)

### 6. Citations & Compliance
- Every answer includes source citations
- Audit trail of all queries
- Timestamps and confidence scores
- HIPAA-ready logging

## ⚙️ Configuration Tuning

### For Low Latency (< 1 second)
```env
RETRIEVAL_TOP_K=30        # Reduce initial retrieval
RERANK_TOP_K=3            # Return fewer results
LLM_MAX_TOKENS=300        # Shorter responses
EMBEDDING_BATCH_SIZE=10   # Smaller batches
```

### For High Quality
```env
RETRIEVAL_TOP_K=100       # More context
RERANK_TOP_K=10           # Better selection
LLM_MAX_TOKENS=500        # Detailed responses
LLM_TEMPERATURE=0.3       # More consistent
ENABLE_QUERY_CACHE=false  # Always fresh
```

### For Cost Optimization
```env
QUERY_CACHE_TTL_SECONDS=3600  # Cache 1 hour
EMBEDDING_BATCH_SIZE=50       # Batch more aggressively
RERANK_TOP_K=3                # Return fewer results
CHUNK_SIZE_TOKENS=400         # Larger chunks (fewer embeddings)
```

## 📈 Performance Metrics

Expected latencies on standard hardware:

- Query embedding: 30-50ms
- Vector search: 100-200ms
- Reranking: 100-200ms
- LLM synthesis: 500-1500ms
- **Total: 800ms - 2s** (depending on config)

Caching reduces repeat queries to ~50ms.

## 🛡️ Production Safeguards

### Circuit Breaker
If Groq API fails 3x in 5 minutes, return raw chunks with disclaimer.

### Rate Limiting
- 30 queries/minute per user (global)
- 10 note processing/minute per user
- Configurable in `core/rate_limit.py`

### Timeouts
- LLM: 10 seconds
- Embedding: 30 seconds
- Retrieval: 5 seconds
- All have graceful fallbacks

### Monitoring
- Comprehensive logging at each stage
- Audit trail in database
- Performance timing tracked
- Error tracking for debugging

## 🔄 Migration Path

### From ChromaDB to pgvector (Optional)
```bash
# After deployment, run migration:
python scripts/migrate_chromadb_to_pgvector.py

# This:
# 1. Reads ChromaDB collection
# 2. Re-chunks notes with new system
# 3. Re-embeds with Gemini API
# 4. Stores in pgvector
# 5. Validates data integrity
```

### Decommissioning ChromaDB
```bash
# Once pgvector migration validates
rm -rf backend/chroma_db/
# Remove chromadb from requirements.txt
# Remove embedding code from services/embeddings.py
```

## 📋 API Documentation

### POST /search/rag
Multi-stage RAG semantic search

**Request:**
```json
{
  "query": "What medications is patient currently taking?",
  "patient_id": "550e8400-e29b-41d4-a716-446655440000",
  "section_filter": "medications",  // optional
  "top_k": 5
}
```

**Response:**
```json
{
  "answer": "Based on recent medical records, the patient is taking Metformin (500mg daily) and Lisinopril (10mg daily).",
  "citations": [
    {
      "chunk_id": "uuid-1",
      "note_id": "note-uuid",
      "section": "medications",
      "timestamp": "2024-01-15T10:30:00Z",
      "score": 0.95
    }
  ],
  "confidence": 0.92,
  "retrieval_count": 5,
  "processing_time_ms": 1240
}
```

### POST /search/process-note-async
Asynchronously process note for embeddings

**Request:**
```json
{
  "note_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "task_id": "celery-task-uuid",
  "status": "queued",
  "message": "Note processing queued. Use task_id to check status."
}
```

### GET /search/task-status/{task_id}
Poll task status

**Response:**
```json
{
  "task_id": "celery-task-uuid",
  "state": "processing",  // pending, processing, completed, failed
  "status_message": null,
  "progress_percent": 50,
  "result": null,
  "error": null
}
```

## 🐛 Troubleshooting

### "Embedding failed after 3 attempts"
1. Check Gemini API key: `echo $GEMINI_EMBEDDING_API_KEY`
2. Verify API is enabled: Google Cloud Console
3. Check quota: may need to upgrade plan

### "No chunks retrieved"
1. Verify patient_id is correct
2. Check user owns this patient (RLS)
3. Ensure notes have been processed (status=completed)
4. Check pgvector table has embeddings

### "LLM timeout"
1. Check Groq API limits (free tier is restricted)
2. Increase `LLM_TIMEOUT_SECONDS` if needed
3. Switch to fallback mode (returns chunks)

### "Redis connection refused"
1. Start Redis: `redis-server`
2. Check REDIS_NOTES_URL in .env
3. Or deploy Redis container

## 📚 Additional Resources

- [Supabase pgvector Docs](https://supabase.com/docs/guides/ai)
- [Gemini API Docs](https://ai.google.dev/)
- [Groq API Docs](https://console.groq.com/)
- [LangChain Docs](https://python.langchain.com/)
- [Celery Docs](https://docs.celeryproject.io/)

## ✨ What's Next (Future Improvements)

- [ ] Implement SQL migrations for automatic DB setup
- [ ] Add GraphQL API
- [ ] Support vector DB read replicas
- [ ] Implement model fine-tuning
- [ ] Add multi-language support
- [ ] Implement federated learning for privacy
- [ ] Add voice query support
- [ ] Real-time collaboration
- [ ] Advanced analytics dashboard
- [ ] Export compliance reports

---

**Version:** 1.0.0 (Production RAG)  
**Last Updated:** April 2026  
**Maintainer:** HealthSync Team
