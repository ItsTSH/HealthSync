# HealthSync RAG - Testing Guide

## Quick Test Scripts

Run these scripts in order to validate your RAG system setup:

### 1. Structure Validation (Start Here!)
Verifies all files exist and environment is configured.

```bash
cd backend
python scripts/validate_structure.py
```

**Expected Output:**
- All files should show ✅
- .env file should exist with critical keys populated
- Next steps will be printed

**Common Issues:**
- `.env` file not found → Create from `.env.example` and fill in API keys
- Missing critical keys → Add GEMINI_EMBEDDING_API_KEY, GROQ_API_KEY, etc.
- Missing files → Check you're in the backend directory

---

### 2. Quick Health Check
Fast check that core systems are operational.

```bash
cd backend
python scripts/health_check.py
```

**Expected Output:**
```
✅ Configuration loaded
✅ Database connection
✅ Redis connection
✅ Gemini API
✅ Groq LLM

5/5 systems operational
```

**Common Issues:**
- `Configuration loaded` fails → Missing API keys in .env
- `Database connection` fails → Check SUPABASE_URL and keys in .env
- `Redis connection` fails → Start Redis: `redis-server`
- `Gemini API` fails → Invalid GEMINI_EMBEDDING_API_KEY
- `Groq LLM` fails → Invalid GROQ_API_KEY

---

### 3. Full Setup Validation
Comprehensive test of all components.

```bash
cd backend
python tests/test_rag_setup.py
```

**Expected Output:**
- All module imports listed with ✅
- Configuration tests passed
- Database tests (pgvector, RLS, tables)
- Redis connection verified
- API tests (Gemini, Groq)
- Service tests (chunking, masking, retrieval)
- Summary showing X/Y test groups passed

**What it Tests:**
- ✅ All Python modules can be imported
- ✅ Configuration loads correctly
- ✅ Database connection works
- ✅ pgvector extension is enabled
- ✅ All 3 tables exist (note_embeddings, rag_queries_audit, celery_tasks)
- ✅ Redis can connect and perform SET/GET
- ✅ Gemini API embedding works
- ✅ Groq LLM can generate responses
- ✅ Medical chunking works
- ✅ PII masking functional
- ✅ Vector retrieval ready

---

### 4. End-to-End Pipeline Test
Tests the complete RAG flow.

```bash
cd backend
python scripts/test_rag_pipeline.py
```

**Expected Output:**
```
========  HealthSync RAG - End-to-End Pipeline Test  ========

STEP 1: CHUNKING - Split note into hierarchical chunks
✅ Created 8 chunks: ...

STEP 2: PII MASKING - Remove sensitive information
✅ Masked 2 PII entities

STEP 3: EMBEDDING - Generate vector representations
✅ Generated 3 embeddings

STEP 4: RETRIEVAL - Query and retrieve similar chunks
⚠️  No vectors in database (expected on first run)

STEP 5: RERANKING - Score and rank results
✅ Reranked 2 results

STEP 6: LLM SYNTHESIS - Generate response
✅ Response generated
   Confidence: 87%
   Tokens used: 142

STEP 7: AUDIT LOGGING - Record for compliance
✅ Audit log entry created

========  ✅ END-TO-END TEST COMPLETE  ========
```

**What it Tests:**
- Chunks medical notes into hierarchical chunks
- Masks PII before processing
- Generates embeddings via Gemini
- Queries vector database
- Reranks results for precision
- Generates LLM response
- Records audit log
- **Note:** Empty vector DB is OK on first run - vectors are created when notes are processed

---

## Full Testing Workflow

### Phase 1: Pre-Flight Check (5 min)

```bash
# Terminal 1: Validate structure
cd backend
python scripts/validate_structure.py

# Should output:
# ✅ ALL CHECKS PASSED - System structure is valid
```

### Phase 2: Start Infrastructure (1 min)

```bash
# Terminal 2: Start Redis
redis-server

# Should output:
# Ready to accept connections
```

### Phase 3: Quick Health Check (2 min)

```bash
# Terminal 3: Run health check
cd backend
python scripts/health_check.py

# Should output:
# ✅ Configuration loaded
# ✅ Database connection
# ✅ Redis connection
# ✅ Gemini API
# ✅ Groq LLM
# 5/5 systems operational
```

### Phase 4: Comprehensive Testing (5 min)

```bash
# Terminal 3: Run full setup test
cd backend
python tests/test_rag_setup.py

# Should show ~15-20 test groups passing
```

### Phase 5: End-to-End Test (3 min)

```bash
# Terminal 3: Run pipeline test
cd backend
python scripts/test_rag_pipeline.py

# Should test all 7 pipeline stages successfully
```

### Phase 6: Start Services (for manual testing)

```bash
# Terminal 2: Start Celery worker
cd backend
celery -A core.celery_app worker --loglevel=info

# Terminal 4: Start FastAPI
cd backend
uvicorn main:app --reload

# Terminal 3: Test API endpoints manually
# Open http://localhost:8000/docs for Swagger UI
```

---

## Troubleshooting

### Test Fails at: Config Loading

**Error:** `GEMINI_EMBEDDING_API_KEY not set`

**Solution:**
```bash
# 1. Create .env file
cd backend
cp .env.example .env

# 2. Edit .env and add:
GEMINI_EMBEDDING_API_KEY=your-key-here
GROQ_API_KEY=your-key-here
# (Add other keys from ENV_VARIABLES.md)

# 3. Test again
python scripts/health_check.py
```

---

### Test Fails at: Database Connection

**Error:** `Connection refused` or `database "postgres" does not exist`

**Solution:**
```bash
# 1. Verify Supabase credentials in .env
nano .env  # Check SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 2. Test Supabase connection
python -c "import asyncio; from db.base import get_db; asyncio.run(get_db()).__aenter__()"

# 3. If still failing, run migration in Supabase SQL Editor:
# Copy entire content of: backend/migrations/001_create_pgvector_tables.sql
# Paste into Supabase dashboard → SQL Editor → Run
```

---

### Test Fails at: Redis Connection

**Error:** `Connection refused` or `ECONNREFUSED 127.0.0.1:6379`

**Solution:**
```bash
# 1. Start Redis server
redis-server

# 2. Verify Redis is running
redis-cli ping
# Should respond: PONG

# 3. Check REDIS_URL in .env (should be: redis://localhost:6379)
```

---

### Test Fails at: Gemini Embedding

**Error:** `401 Unauthorized` or `APIError`

**Solution:**
```bash
# 1. Get API key from https://ai.google.dev
# 2. Add to .env:
GEMINI_EMBEDDING_API_KEY=your-actual-key

# 3. Try again
python scripts/health_check.py
```

---

### Test Fails at: Groq LLM

**Error:** `401 Unauthorized` or `Rate limit exceeded`

**Solution:**
```bash
# 1. Get API key from https://console.groq.com/keys
# 2. Add to .env:
GROQ_API_KEY=your-actual-key

# 3. Try again
python scripts/health_check.py

# Note: Groq has free tier with limits (30k tokens/min)
# If rate limited, wait a minute and retry
```

---

### Test Fails at: Retrieval (Empty Database)

**Error:** `No vectors in database` (during pipeline test)

**This is OK!** This means:
- ✅ Your database is working correctly
- ✅ RLS policies are working (can't see other users' data)
- ✅ You just need to process some notes first

**To populate vectors:**
```bash
# 1. Create a test note via API
POST /api/notes
{
  "patient_id": "test-patient",
  "title": "Test Note",
  "content": "Patient has hypertension..."
}

# 2. Queue processing
POST /search/process-note-async
{
  "note_id": "your-note-id"
}

# 3. Monitor on Celery worker
# Watch for: "[tasks.embedding_tasks.process_note_embedding]: Task completed"

# 4. Now retrieval will work!
```

---

## Expected Test Results

### ✅ All Tests Pass
```
✅ Structure validation: ALL CHECKS PASSED
✅ Health check: 5/5 systems operational
✅ Setup test: ~15-20 test groups passing
✅ Pipeline test: All 7 stages complete
```

**You're ready for deployment!**

---

### ⚠️ Some Tests Warn (But Still Pass)

Common warnings that are OK:

1. **"No vectors in database"** → Expected on first run
2. **"Audit logging skipped: DB error"** → Try running migration first
3. **"Module import warning"** → Usually just deprecation notices, not critical

**Still deployment-ready if core services pass**

---

### ❌ Tests Fail

Check the error message in the test output and find it in "Troubleshooting" section above.

Most common issues:
1. Missing `.env` file or API keys
2. Redis not running
3. Database migration not executed
4. Wrong credentials in `.env`

---

## Performance Baselines

After passing all tests, expect:
- Single note embedding: **2-5 seconds** (Async, happens in background)
- RAG search query: **800ms - 2 seconds** (Sync, user waits)
- Cache hit (same query): **50-100ms** ⚡
- Concurrent requests: **10-50 req/sec** (depends on Supabase plan)

---

## Next Steps After Tests Pass

✅ **All test scripts passed?** Great!

1. **Start the full system:**
   ```bash
   # Terminal 1
   redis-server
   
   # Terminal 2
   cd backend && celery -A core.celery_app worker --loglevel=info
   
   # Terminal 3
   cd backend && uvicorn main:app --reload
   ```

2. **Test API endpoints:**
   - Open http://localhost:8000/docs
   - Try `/search/rag` endpoint
   - Create notes and test processing

3. **Monitor in production:**
   - Check Celery worker for task status
   - Watch Supabase database for new embeddings
   - Review audit logs in `rag_queries_audit` table

4. **Production deployment:**
   - See DEPLOYMENT_CHECKLIST.md for full guide
   - Configure logging/monitoring
   - Setup auto-scaling for workers
   - Run load tests

---

## Test Script Files

- `scripts/validate_structure.py` - Check file structure
- `scripts/health_check.py` - Quick system check
- `scripts/test_rag_pipeline.py` - Full pipeline test
- `tests/test_rag_setup.py` - Comprehensive setup test

All scripts are self-contained and require no additional dependencies beyond what's in `requirements.txt`.
