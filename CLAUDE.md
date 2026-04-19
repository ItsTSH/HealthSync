# HealthSync - Complete Claude Development Guide

> **Last Updated:** April 18, 2026  
> **Status:** Production-Ready (v2.0) | v3.0 Coming Soon  
> **⚠️ IMPORTANT:** Claude must update this file whenever new features, changes, or tech stack modifications are added.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Features & Implementation](#features--implementation)
5. [Backend Services](#backend-services)
6. [Frontend Components](#frontend-components)
7. [API Endpoints](#api-endpoints)
8. [Database Schema](#database-schema)
9. [Setup & Installation](#setup--installation)
10. [Development Workflow](#development-workflow)
11. [Testing & Validation](#testing--validation)
12. [Deployment](#deployment)
13. [Common Issues & Solutions](#common-issues--solutions)
14. [Future Roadmap](#future-roadmap)

---

## Project Overview

**HealthSync** is a production-grade AI-powered medical transcription and documentation system designed to transform doctor-patient conversations into structured, HIPAA-compliant clinical notes in real-time.

### Key Strengths

- ✅ Real-time audio processing with speaker diarization (doctor vs. patient)
- ✅ Intelligent metadata extraction using LLM-powered analysis
- ✅ Semantic retrieval through vector embeddings and RAG
- ✅ Production reliability: caching, concurrency control, graceful degradation
- ✅ HIPAA compliance awareness via UUID-based patient identification
- ✅ Advanced hierarchical chunking for medical notes
- ✅ PII masking for sensitive data protection
- ✅ Comprehensive audit logging

### Current Version Details

- **Version:** 2.0 (Production-Ready)
- **Release Date:** April 11, 2026
- **Total LOC:** 15,000+ lines (backend + frontend)
- **Test Coverage:** Unit tests (50+ test cases per service), Integration tests (25+ scenarios)
- **Performance:** Single query: <2000ms | Cache hit: <100ms | Throughput: 1-100 ops/sec

---

## Architecture

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER (Next.js)                     │
│  • React 19 Components with TypeScript                          │
│  • Real-time Supabase listeners                                 │
│  • Audio recording & streaming (ElevenLabs Scribe)              │
│  • Chatbot with RAG semantic search & citations                 │
├─────────────────────────────────────────────────────────────────┤
│                   API LAYER (FastAPI)                           │
│  • Rate Limiting (slowapi)                                      │
│  • CORS & GZIP Compression                                      │
│  • JWT Authentication (Supabase + Backend tokens)               │
│  • Request validation & error handling                          │
├─────────────────────────────────────────────────────────────────┤
│                    ROUTER LAYER                                 │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│  │ authRoutes   │ ragRoutes    │ searchRoutes │processingRts │  │
│  └──────────────┴──────────────┴──────────────┴──────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                   SERVICE LAYER                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Core Services:                                           │  │
│  │ • LLM (Groq)              • Embeddings (Gemini)          │  │
│  │ • Retrieval (pgvector)    • Reranking (cross-encoder)    │  │
│  │ • Chunking (hierarchical) • PII Masking (transformers)   │  │
│  │ • Transcription           • Audit Logging                │  │
│  │ • Cache Management        • Auth Service                 │  │
│  └──────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                  DATA PERSISTENCE LAYER                         │
│  ┌─────────────────────┬─────────────────┬───────────────────┐  │
│  │ PostgreSQL(Supabase)│     Redis       │   ChromaDB        │  │
│  │ • Notes             │ • Query cache   │  • Embeddings     │  │
│  │ • Embeddings        │ • Session state │  • Metadata       │  │
│  │ • RLS policies      │ • Rate limits   │                   │  │
│  └─────────────────────┴─────────────────┴───────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│               ASYNC PROCESSING (Celery + Redis)                 │
│  • Background embedding tasks                                   │
│  • Async note processing                                        │
│  • Task status tracking                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow: Query Processing Pipeline

```
USER QUERY
    ↓
[VALIDATION] - Check auth, validate input (3-1000 chars)
    ↓
[EMBEDDING] - Convert query to 768-dim vector (Gemini API)
    ↓
[RETRIEVAL] - Fetch top-50 relevant chunks (pgvector + RLS)
    ↓
[RERANKING] - Score & select top-5 most relevant chunks
    ↓
[LLM SYNTHESIS] - Generate answer with citations (Groq)
    ↓
[STREAMING RESPONSE] - Stream tokens in NDJSON format
    ↓
[AUDIT LOGGING] - Log query for compliance & analysis
    ↓
CLIENT RECEIVES ANSWER + CITATIONS + CONFIDENCE
```

### Multi-Stage Streaming Protocol (NDJSON)

Each line is a JSON object followed by newline (`\n`):

```json
{"type": "metadata", "citations": [...], "retrieval_count": 5}
{"type": "token", "token": "The"}
{"type": "token", "token": " patient"}
{"type": "token", "token": " has"}
...
{"type": "completion", "answer": "...", "confidence": 0.95, "tokens_used": 156}
```

---

## Tech Stack

### Backend Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | FastAPI | 0.120.0 | High-performance async web framework |
| **ASGI Server** | Uvicorn | 0.38.0 | Async HTTP server |
| **Data Validation** | Pydantic | 2.12.3 | Request/response schema validation |
| **Authentication** | PyJWT | 2.10.1 | JWT token encoding/decoding |
| **Database** | PostgreSQL | 15+ (Supabase) | Primary relational database |
| **Vector DB** | ChromaDB | Latest | Embedded vector storage |
| **Vector Search** | pgvector | 0.2.5 | PostgreSQL vector similarity search |
| **Cache** | Redis | 5.0.1 | In-memory caching & rate limiting |
| **Task Queue** | Celery | 5.3.4 | Async background job processing |
| **ORM** | SQLAlchemy | 2.0.44 | Database abstraction layer |
| **AI/ML** | LangChain | 0.1.0+ | LLM orchestration framework |
| **Embedding LLM** | Gemini API | text-embedding-004 | 768-dim medical embeddings |
| **Generation LLM** | Groq API | mixtral-8x7b-32768 | Fast medical text generation |
| **Reranking** | Transformers | 4.57.1 | Cross-encoder for ranking |
| **PII Detection** | Transformers | 4.57.1 | Named entity recognition |
| **Audio Transcription** | ElevenLabs Scribe | API | Real-time audio-to-text |
| **HTTP Client** | Requests/Httpx | 2.32.5 | HTTP API communication |
| **Rate Limiting** | slowapi | 0.1.9 | Per-endpoint rate limiting |
| **Logging** | Python logging | Built-in | Structured logging & telemetry |

### Frontend Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | Next.js | 16.0.10 | React metaframework with SSR |
| **UI Library** | React | 19.2.0 | Component-based UI |
| **Type System** | TypeScript | 5+ | Static type checking |
| **Styling** | Tailwind CSS | 4+ | Utility-first CSS framework |
| **UI Components** | Radix UI | Latest | Unstyled accessible components |
| **Form Handling** | react-hook-form | 7.72.0 | Efficient form state management |
| **Data Table** | TanStack React Table | 8.21.3 | Advanced table component |
| **Charts** | Recharts | 2.15.4 | React charting library |
| **Database** | Supabase JS SDK | 2.100.1 | Real-time PostgreSQL client |
| **Auth** | Supabase Auth | Built-in | JWT-based authentication |
| **Date Utils** | date-fns | 4.1.0 | Date manipulation & formatting |
| **Icons** | Lucide React | 0.556.0 | React icon library |
| **Notifications** | Sonner | 2.0.7 | Toast notification system |
| **Animations** | Motion | 12.34.0 | Animation library |
| **HTTP Client** | Axios | 1.13.6 | Promise-based HTTP client |
| **State Management** | React Context | Built-in | Client-side state management |

### Infrastructure

- **Hosting:** Vercel (Frontend) / Cloud provider (Backend)
- **Database:** Supabase (PostgreSQL + Auth)
- **Cache:** Redis (deployed separately)
- **Vector DB:** ChromaDB (local/deployed)
- **APIs:** Gemini, Groq, ElevenLabs

---

## Features & Implementation

### 1. Core Transcription Features

#### 📹 Real-Time Audio Processing

**Implementation:**
- **Technology:** ElevenLabs Scribe API for streaming transcription
- **Speaker Diarization:** Identifies doctor vs. patient voices
- **Multi-language Support:** Auto-detection and transcription
- **Files:** `routers/transcriptionRoutes.py`, `services/transcription.py`

**Key Components:**
```python
# Streaming audio ingestion
POST /transcribe
  Input: Audio file (WAV/MP3)
  Output: Partial transcripts with speaker labels
  
# Speaker diarization
extract_speaker_diarization()
  Identifies: Doctor (speaker 0), Patient (speaker 1)
  Confidence: Speaker identification accuracy
```

#### 🧠 Metadata Extraction

**Implementation:**
- **Technology:** Gemini 2.5 Flash LLM for structured extraction
- **Outputs:** JSON-structured clinical metadata
- **Files:** `routers/processingRoutes.py`, `services/extraction.py`

**Extracted Fields:**
- Chief complaint / Presenting symptom
- Symptoms & their characteristics
- Vital signs (BP, HR, RR, O2, Temp)
- Medications (current & previous)
- Allergies & adverse reactions
- Past medical history
- Physical exam findings
- Assessment & diagnosis
- Treatment plan

#### 🔐 PII Masking

**Implementation:**
- **Technology:** Transformers-based NER (Named Entity Recognition)
- **Masked Fields:** Names, emails, phone numbers, SSN, addresses, medical record IDs
- **Files:** `services/pii_masking.py`

**Example:**
```
Original: "John Smith (john@email.com) born 01/15/1980 has diabetes"
Masked:   "[NAME] ([EMAIL]) born [DOB] has diabetes"
```

---

### 2. Advanced RAG Implementation

#### 🔍 Vector-Based Semantic Search

**Implementation:**
- **Embedding Model:** Gemini text-embedding-004 (768 dimensions)
- **Vector Storage:** pgvector in PostgreSQL (Supabase)
- **Retrieval:** Cosine similarity search with hard user/patient filtering
- **Files:** `services/gemini_embeddings.py`, `services/retrieval.py`

**Process:**
1. Convert query to 768-dim vector using Gemini API
2. Search pgvector for top-50 similar chunks (with RLS)
3. Apply temporal weighting (boost recent notes)
4. Return ranked results with similarity scores

#### 📊 Reranking & Filtering

**Implementation:**
- **Technology:** Cross-encoder model (transformers)
- **Purpose:** Re-score retrieved chunks for optimal relevance
- **Files:** `services/reranking.py`

**Features:**
- Cross-encoder scoring on top-50 results
- Threshold filtering (configurable)
- Top-K selection (default: 5)
- Citation preservation for final answer

#### 📝 LLM Response Generation

**Implementation:**
- **Model:** Groq API (mixtral-8x7b-32768)
- **Temperature:** 0.2 (deterministic, medical-appropriate)
- **Max Tokens:** 500 per response
- **Files:** `services/llm.py`

**Features:**
- Medical-aware prompt engineering
- Streaming token generation (NDJSON)
- Citation extraction from retrieved chunks
- Confidence scoring (0-1 range)
- Graceful error handling & fallbacks

#### 4️⃣ Hierarchical Chunking Strategy

**Implementation:**
- **Tier 1:** Section extraction (Chief Complaint, HPI, Medications, etc.)
- **Tier 2:** Token-based sub-chunking (300 tokens target, 50 overlap)
- **Tier 3:** Context windows (add neighboring chunks)
- **Tier 4:** Deduplication (remove duplicates within note)
- **Files:** `services/chunking.py`

**Metadata Per Chunk:**
- Section type & hierarchy
- Token count
- Chunk index
- Parent chunk reference
- Temporal metadata (creation/update time)

---

### 3. Production Features

#### ⚡ Advanced Caching Layer (Redis)

**Implementation:**
- **Pattern:** Cache-aside (check Redis → DB if miss)
- **TTL Strategy:**
  - Query results: 30 minutes
  - User profile: 1 hour
  - Session: 7 days
  - 404s: 5 minutes (short TTL)
- **Hot Key Protection:** Extended TTL for frequently accessed keys
- **Files:** `services/cache.py`, `core/redis.py`

**Cache Keys:**
```
rag:user_id:patient_id:query_hash
embeddings:note_id
session:user_id:patient_id
```

#### 🔐 Security & Authentication

**JWT Implementation:**
- **Token Type:** Bearer tokens (Supabase + Backend-generated)
- **Claims:** `sub` (user_id), `iss` (issuer), `exp` (expiration)
- **Refresh Flow:** Access (60 min) + Refresh (7 days) tokens
- **Validation:** Signature verification (backend tokens) or issuer check (Supabase)
- **Files:** `core/auth.py`, `core/security.py`

**HIPAA Considerations:**
- UUID-based patient identification (no PHI in URLs)
- PII masking before storage
- RLS policies enforcing user/patient isolation
- Audit logging for all data access
- Encryption of sensitive fields (FERNET_KEY)

#### 🎛️ Rate Limiting & Concurrency

**Implementation:**
- **Framework:** slowapi (per-endpoint rate limiting)
- **Limits:**
  - Search: 30/minute per user
  - Processing: 10/minute per user
  - Auth: 5/minute per IP
- **Concurrency:** Redis-based locks (prevent duplicate processing)
- **Files:** `core/rate_limit.py`

**Double-Check Pattern:**
```python
# Prevent thundering herd on cache miss
lock = redis.set(f"processing:{note_id}", "1", nx=True, ex=30)
if not lock:
    wait_for_processing()
else:
    process_and_cache()
```

#### 📊 Status-Based Processing Pipeline

**States:** `pending` → `processing` → `completed`/`failed`

**Files:** `routers/processingRoutes.py`, `tasks/embedding_tasks.py`

**Features:**
- Automatic state transitions
- Error tracking & retry mechanisms
- Celery task integration for async work
- Status polling endpoint for clients

#### 🔄 Audit Logging & Compliance

**Implementation:**
- **Immutable Log:** Append-only `rag_queries_audit` table
- **Tracked Data:** Query text, user ID, patient ID, retrieved chunks, LLM response
- **Retention:** 1 year (configurable)
- **Files:** `services/audit.py`

**Query Log Entry:**
```python
{
    "query_id": "uuid",
    "user_id": "uuid",
    "patient_id": "uuid",
    "query_text": "masked_query",
    "retrieval_count": 5,
    "chunks_id": ["..."],
    "confidence": 0.95,
    "timestamp": "2026-04-18T10:30:00Z",
    "ip_address": "masked_ip"
}
```

---

## Backend Services

### Service Architecture

All services are located in `backend/services/`:

| Service | Purpose | Key Functions |
|---------|---------|---|
| **llm.py** | Groq LLM integration | `generate_response()`, `stream_response()` |
| **gemini_embeddings.py** | Gemini embedding API | `embed_single()`, `embed_batch()` |
| **retrieval.py** | pgvector semantic search | `retrieve_chunks()` |
| **reranking.py** | Cross-encoder reranking | `rerank_chunks()` |
| **chunking.py** | Medical note chunking | `chunk_note()`, `chunk_batch()` |
| **pii_masking.py** | PII detection & masking | `mask_pii()`, `extract_entities()` |
| **extraction.py** | Metadata extraction | `extract_metadata()` |
| **transcription.py** | Audio transcription | `transcribe_stream()` |
| **authService.py** | Authentication | `create_token()`, `verify_token()` |
| **audit.py** | Compliance logging | `log_rag_query()`, `get_audit_logs()` |
| **cache.py** | Redis caching | `get()`, `set()`, `delete()` |
| **telemetry.py** | Performance metrics | `record_metric()`, `get_latency_percentiles()` |

### Core Modules

| Module | Purpose |
|--------|---------|
| **core/config.py** | Configuration management (env vars, models, limits) |
| **core/auth.py** | JWT verification & token handling |
| **core/redis.py** | Redis connection pooling |
| **core/dependencies.py** | FastAPI dependency injection |
| **core/exceptions.py** | Custom exception classes |
| **core/rate_limit.py** | Rate limiting configuration |
| **core/security.py** | Encryption/decryption utilities |

---

## Frontend Components

### Page Structure

```
frontend/app/
├── layout.tsx              # Root layout with providers
├── page.tsx                # Dashboard/home page
├── globals.css             # Global styles
├── providers.tsx           # Context providers (Auth, Theme)
├── api/                    # Next.js API routes
├── auth/                   # Login/signup pages
├── dashboard/              # Main dashboard pages
├── chatbot/                # RAG chatbot interface
├── patients/               # Patient management
├── appointments/           # Appointment scheduling
├── record-session/         # Audio recording interface
├── sessions/               # Recording sessions list
├── settings/               # User settings
└── upgrade/                # Upgrade/pricing page
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **ChatbotPage** | `app/chatbot/` | Main RAG chat interface with streaming |
| **DashboardActions** | `components/dashboard-actions.tsx` | Quick action buttons |
| **AppSidebar** | `components/app-sidebar.tsx` | Navigation sidebar |
| **ErrorBoundary** | `components/error-boundary.tsx` | Error handling |
| **AppChart** | `components/app-chart.tsx` | Chart visualization |
| **Providers** | `app/providers.tsx` | Auth & theme context |

### Critical Hooks & Utilities

**Authentication:**
- `useAuth()` - Access JWT token & user info
- `usePatient()` - Get selected patient context
- Supabase SSR integration for secure token handling

**Form Management:**
- `react-hook-form` for efficient state management
- Zod validation schemas
- Real-time field validation

**Real-Time Updates:**
- Supabase listeners for note updates
- Auto-refresh on chat messages
- Presence tracking (who's viewing/editing)

---

## API Endpoints

### Authentication Endpoints

```http
POST /auth/login
  Headers: Content-Type: application/json
  Body: { email, password }
  Response: { access_token, refresh_token, user }

POST /auth/register
  Headers: Content-Type: application/json
  Body: { email, password, full_name }
  Response: { access_token, refresh_token, user }

POST /auth/refresh
  Headers: Authorization: Bearer {refresh_token}
  Response: { access_token, refresh_token }

GET /auth/me
  Headers: Authorization: Bearer {access_token}
  Response: { user_id, email, full_name, role }
```

### RAG Search Endpoints

```http
POST /search/rag
  Rate Limit: 30/minute
  Headers: Authorization: Bearer {token}
  Body: { query, patient_id, top_k (optional), section_filter (optional) }
  Response: {
    answer: string,
    citations: [{ chunk_id, text, similarity_score }],
    confidence: float,
    tokens_used: int,
    processing_time_ms: int
  }

POST /search/rag-stream
  Rate Limit: 30/minute
  Headers: Authorization: Bearer {token}
  Response: Streaming NDJSON (metadata → tokens → completion)
```

### Processing Endpoints

```http
POST /process/note
  Rate Limit: 10/minute
  Headers: Authorization: Bearer {token}
  Body: { note_data, patient_id, extract_metadata (optional) }
  Response: {
    note_id: uuid,
    status: "completed",
    metadata: {...},
    embeddings_stored: bool
  }

POST /process/note-async
  Body: { note_data, patient_id }
  Response: { task_id, status: "pending" }

GET /process/task-status/{task_id}
  Response: { task_id, status, result (if complete) }
```

### Transcription Endpoints

```http
POST /transcribe/stream
  Headers: Content-Type: audio/wav
  Response: Streaming partial transcripts with speaker labels
```

### Search Endpoints (Legacy)

```http
POST /search/semantic
  Deprecated in favor of /search/rag-stream
  
POST /search/keyword
  Deprecated
```

### Health Check

```http
GET /
  Response: { status: "healthy", service: "HealthSync API", version: "v0.2.0" }
  Cache: 1 hour (static)
```

---

## Database Schema

### Primary Tables (Supabase PostgreSQL)

#### `notes` Table
```sql
-- Original notes with full clinical data
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  patient_id UUID NOT NULL,
  chief_complaint TEXT,
  symptoms TEXT,
  vital_signs JSONB,
  medications JSONB,
  allergies TEXT,
  previous_diagnosis TEXT,
  physical_exam TEXT,
  assessment TEXT,
  diagnosis TEXT,
  plan TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- RLS Policy: Users only see their own notes
CREATE POLICY user_isolation ON notes
  FOR SELECT USING (auth.uid() = user_id);
```

#### `note_embeddings` Table
```sql
-- Chunks with pgvector embeddings
CREATE TABLE note_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  chunk_id UUID NOT NULL,
  section VARCHAR(100),
  text TEXT NOT NULL,
  text_masked TEXT,
  tokens INT,
  chunk_index INT,
  embedding vector(768),  -- pgvector dimension
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Performance indexes
  FOREIGN KEY (note_id) REFERENCES notes(id)
);

-- Fast vector similarity search
CREATE INDEX ON note_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

#### `rag_queries_audit` Table
```sql
-- Immutable audit log for compliance
CREATE TABLE rag_queries_audit (
  id BIGSERIAL PRIMARY KEY,
  query_id UUID NOT NULL,
  user_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  query_text TEXT,
  retrieval_count INT,
  chunk_ids UUID[],
  confidence FLOAT,
  tokens_used INT,
  ip_address VARCHAR(50),
  timestamp TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT immutable_append CHECK (id IS NOT NULL)
);

-- Append-only (no UPDATE/DELETE allowed)
CREATE TRIGGER prevent_audit_modification
  BEFORE UPDATE OR DELETE ON rag_queries_audit
  FOR EACH ROW EXECUTE FUNCTION raise_immutable_error();
```

#### `celery_tasks` Table
```sql
-- Async background job tracking
CREATE TABLE celery_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id VARCHAR(255) NOT NULL UNIQUE,
  task_name VARCHAR(255),
  status VARCHAR(50),
  args JSONB,
  kwargs JSONB,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

### Vector Storage (ChromaDB)

**Collection:** `medical_notes`
```
- ids: chunk_id (UUID string)
- embeddings: 768-dim vectors (stored)
- documents: chunk text
- metadatas:
  {
    "note_id": "uuid",
    "user_id": "uuid",
    "section": "medical_section",
    "tokens": 300,
    "created_at": "timestamp"
  }
```

### Redis Keys (Caching)

```
rag:{user_id}:{patient_id}:{query_hash}     → RAGQueryResponse (30 min)
embeddings:{note_id}                        → Embedding vector (24 hrs)
session:{session_id}                        → Session data (7 days)
rate_limit:{endpoint}:{user_id}             → Request count (1 min window)
processing_lock:{note_id}                   → Task lock (30 sec)
```

---

## Setup & Installation

### Prerequisites

- **Python:** 3.10 or higher
- **Node.js:** 18+ (for frontend)
- **Redis:** Running locally or via Docker
- **PostgreSQL:** Via Supabase (or local)
- **API Keys:**
  - Gemini API Key (https://ai.google.dev)
  - Groq API Key (https://console.groq.com)
  - Supabase Project & Keys
  - ElevenLabs API Key (optional, for transcription)

### Backend Setup

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create .env file
cp .env.example .env
# Edit .env with your API keys (see ENV_VARIABLES.md for details)

# 5. Test environment configuration
python -c "from core.config import settings; print('✅ Config loaded')"

# 6. Start Redis server (in separate terminal)
redis-server  # OR: docker run -d -p 6379:6379 redis:7-alpine

# 7. Run FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Create .env.local file
# Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

# 4. Run development server
npm run dev  # Runs on http://localhost:3000
```

### Database Setup

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create new project
   - Copy URL and anon/service role keys

2. **Run Migrations**
   ```bash
   # In Supabase SQL Editor, execute:
   CREATE EXTENSION IF NOT EXISTS vector;
   
   -- Then run all SQL from migrations/ directory
   ```

3. **Verify Setup**
   ```sql
   SELECT * FROM information_schema.tables WHERE table_name IN 
     ('notes', 'note_embeddings', 'rag_queries_audit');
   SELECT extname FROM pg_extension WHERE extname='vector';
   ```

---

## Development Workflow

### Running Tests

```bash
# Unit tests (all services)
cd backend
pytest tests/unit/ -v

# Integration tests
pytest tests/integration/ -v

# Specific service tests
pytest tests/unit/test_chunking.py -v
pytest tests/unit/test_pii_masking.py -v

# With coverage
pytest tests/ --cov=services --cov-report=html
```

### Performance Profiling

```bash
# Benchmark RAG pipeline stages
python scripts/benchmark_rag.py

# Load testing (concurrent users)
python scripts/load_test.py

# Health check
python scripts/health_check.py
```

### Database Debugging

```bash
# Connect to Supabase via CLI
supabase status

# Run migrations
supabase db push

# View logs
supabase logs
```

### Adding New Features

**1. Backend Service:**
```python
# services/my_service.py
class MyService:
    def __init__(self, ...):
        pass
    
    async def process(self, data):
        """Process data and return result"""
        pass
```

**2. Router Endpoint:**
```python
# routers/myRoutes.py
@router.post("/my-endpoint")
async def my_endpoint(
    request: Request,
    payload: MySchema = Body(...),
    current_user: str = Depends(get_current_user)
) -> MyResponse:
    """Endpoint documentation"""
    pass
```

**3. Frontend Component:**
```typescript
// app/my-feature/page.tsx
export default function MyFeaturePage() {
  const { session } = useAuth();
  const { selectedPatient } = usePatient();
  
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}
```

**4. Add Tests:**
```python
# tests/unit/test_my_service.py
@pytest.mark.asyncio
async def test_my_service():
    service = MyService()
    result = await service.process(data)
    assert result is not None
```

---

## Testing & Validation

### Test Structure

```
tests/
├── unit/
│   ├── test_chunking.py             (50+ cases, 85% coverage)
│   ├── test_pii_masking.py          (45+ cases, 90% coverage)
│   ├── test_gemini_embeddings.py    (35+ cases, 80% coverage)
│   ├── test_services.py             (50+ cases, 80% coverage)
│   └── ...
├── integration/
│   ├── test_rag_pipeline.py         (15+ test suites)
│   ├── test_error_handling.py       (25+ cases)
│   └── test_api_endpoints.py        (10+ cases)
├── conftest.py                       # Pytest fixtures
└── __init__.py
```

### Test Coverage

| Service | Coverage | Key Tests |
|---------|----------|-----------|
| Chunking | 85% | Section extraction, token counting, hierarchy |
| PII Masking | 90% | Name, email, phone, SSN, address masking |
| Embeddings | 80% | Batch processing, retry logic, error handling |
| Retrieval | 75% | Filtering, similarity search, RLS enforcement |
| Reranking | 75% | Cross-encoder scoring, threshold filtering |
| LLM | 80% | Streaming, timeouts, citation extraction |
| Audit | 75% | Immutability, compliance logging |

### Running Full Test Suite

```bash
# All tests
pytest tests/ -v --tb=short

# With coverage report
pytest tests/ --cov=services --cov-report=term-missing

# Parallel execution (faster)
pytest tests/ -n auto

# Stop on first failure
pytest tests/ -x
```

---

## Deployment

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] API keys validated
- [ ] Redis connection verified
- [ ] CORS settings reviewed
- [ ] Rate limits configured appropriately
- [ ] Logging enabled
- [ ] Error tracking configured (Sentry, etc.)

### Backend Deployment

**Option 1: Cloud Run (Google Cloud)**
```bash
gcloud run deploy healthsync-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --set-env-vars GEMINI_API_KEY=$GEMINI_API_KEY,GROQ_API_KEY=$GROQ_API_KEY
```

**Option 2: Heroku (Classic)**
```bash
heroku login
git push heroku main
heroku logs --tail
```

**Option 3: Docker (On-Premise)**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend Deployment (Vercel)

```bash
# Connect repo to Vercel
vercel

# Deploy specific branch
vercel --prod

# Environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Production Considerations

- **Scaling:** Use load balancer (Nginx/HAProxy) for backend replicas
- **Database:** Enable connection pooling in Supabase
- **Cache:** Use managed Redis (AWS ElastiCache, Google Cloud Memorystore)
- **CDN:** Front Next.js with Cloudflare or similar
- **Monitoring:** Set up health checks & alerting
- **Backup:** Enable database backups (Supabase automatic daily)
- **Security:** Enable HTTPS, HSTS headers, WAF rules

---

## Common Issues & Solutions

### Backend Issues

**Issue: "GEMINI_EMBEDDING_API_KEY not found"**
```
Solution:
1. Check .env file exists in backend/ directory
2. Verify key is not empty: echo $GEMINI_EMBEDDING_API_KEY
3. Restart terminal/IDE after adding to .env
4. Test: python -c "from core.config import settings; print(settings.GEMINI_API_KEY)"
```

**Issue: "Redis connection refused"**
```
Solution:
1. Ensure Redis is running: redis-cli ping → PONG
2. If not running: redis-server (or docker run -d -p 6379:6379 redis:7-alpine)
3. Check connection string: REDIS_URL=redis://localhost:6379
4. Restart FastAPI server after Redis is running
```

**Issue: "pgvector extension not found"**
```
Solution:
1. Enable in Supabase: CREATE EXTENSION IF NOT EXISTS vector;
2. Verify: SELECT extname FROM pg_extension WHERE extname='vector';
3. Use SERVICE_ROLE_KEY (not anon key) for migrations
```

**Issue: "Rate limit exceeded"**
```
Solution:
1. Check current rate limits: core/rate_limit.py
2. Increase if needed: LIMITS = { "search": "60/minute" }
3. Redis keys may be persisting: redis-cli FLUSHDB
4. Wait for sliding window to expire (1 minute)
```

### Frontend Issues

**Issue: "401 Unauthorized" on API calls**
```
Solution:
1. Verify JWT token exists: localStorage.getItem('sb-token')
2. Check token not expired: jwt.decode(token)
3. Include auth header: Authorization: Bearer {token}
4. Clear localStorage & re-login if needed
```

**Issue: "CORS policy blocked request"**
```
Solution:
1. Backend CORS enabled for all origins (*)
2. Check headers include Origin header
3. Try with credentials=true if needed
4. Check Supabase RLS policies if querying directly
```

**Issue: "Hydration mismatch"**
```
Solution:
1. Ensure same data server/client side during SSR
2. Use suppressHydrationWarning on mismatched elements
3. Move data fetching to useEffect (client-only)
4. Check date/time libraries (date-fns) for timezone issues
```

---

## Future Roadmap

### Version 3.0 (In Development)

**Advanced RAG Capabilities:**
- ✨ Enhanced contextual retrieval with multi-document reasoning
- ✨ Intelligent pattern recognition across patient histories
- ✨ Personalized clinical insights using retrieved context
- ✨ Advanced SOAP note generation with evidence-based recommendations
- ✨ Voice-based knowledge base querying
- ✨ Real-time clinical decision support

**New Features:**
- [ ] Multi-language support (Spanish, French, Mandarin)
- [ ] Integration with EHR systems (HL7/FHIR)
- [ ] Advanced analytics dashboard
- [ ] Team collaboration features
- [ ] Mobile app (React Native)
- [ ] Advanced workflow automation

**Performance Improvements:**
- [ ] Query optimization for large datasets (10M+ chunks)
- [ ] Distributed embedding computation
- [ ] Compressed embeddings (quantization)
- [ ] GraphQL API layer
- [ ] WebSocket real-time updates

**Security Enhancements:**
- [ ] End-to-end encryption for sensitive notes
- [ ] Biometric authentication
- [ ] Advanced audit trail with signatures
- [ ] Compliance with additional standards (GDPR, CCPA)

---

## Important: Updating This Document

### For Claude/AI Assistants

**⚠️ CRITICAL INSTRUCTION:** Every time you add new features, modify the tech stack, change API endpoints, or alter the architecture, you MUST update this CLAUDE.md file immediately in the same commit/PR.

**What to Update:**
1. **Tech Stack** → Add new dependencies/versions
2. **Features** → Add new capability sections
3. **Architecture** → Update diagrams if structure changes
4. **API Endpoints** → Add new routes
5. **Database Schema** → Add new tables/columns
6. **Services** → Document new service files
7. **Frontend Components** → Add new page/component entries
8. **Roadmap** → Move completed items to previous versions

**Update Template:**
```markdown
### [Feature Name]
- **Files:** Path/to/files
- **Technology:** Used library/framework
- **Implementation:** Brief description
- **Status:** Completed/In Progress/Planned
- **Related Docs:** Link to detailed docs
```

**Before Committing:**
- [ ] Run tests to ensure feature works
- [ ] Add tests to test suite
- [ ] Update CLAUDE.md with complete details
- [ ] Update DEPLOYMENT_CHECKLIST.md if needed
- [ ] Add migration scripts if database changed
- [ ] Update ENV_VARIABLES.md if new env vars needed

---

## Contact & Support

- **Project Lead:** HealthSync Team
- **Repository:** [Your GitHub URL]
- **Issues:** [GitHub Issues]
- **Documentation:** See `backend/IMPLEMENTATION_SUMMARY.md` & `CHATBOT_ARCHITECTURE.md`

---

**Last Updated:** April 18, 2026 | **Version:** 2.0 | **Status:** Production-Ready
