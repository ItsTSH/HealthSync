# HealthSync - Voice-Based Medical Documentation Platform

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009485?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2Fpgvector-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![ElevenLabs](https://img.shields.io/badge/Transcription-ElevenLabs-3C4C6B?style=flat-square&logo=voice)](https://elevenlabs.io/)
[![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-8B2BE2?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python)](https://www.python.org/)

> A seamless voice-to-documentation system that transforms clinician conversations into structured medical records with intelligent search capabilities.

---

## 🎯 Overview

HealthSync enables clinicians to **simply speak** during patient consultations. The system automatically transcribes conversations with speaker diarization, extracts structured medical metadata, generates clinical documentation, and indexes everything for intelligent retrieval. Say goodbye to manual note-taking—let AI handle the documentation burden.

**Core Workflow:**
1. 🎙️ **Record** - Clinician speaks naturally during patient consultation
2. 📝 **Transcribe** - Multi-speaker audio converted to text with diarization
3. 🏷️ **Extract** - AI automatically identifies patient info, symptoms, diagnosis, vitals
4. 💾 **Document** - Structured clinical notes created and stored
5. 🔍 **Search** - Query all documentation with semantic RAG search

**Key Capabilities:**
- 🎙️ **Live Voice Recording** - Browser-based audio capture with quality guidelines
- 📊 **Speaker Diarization** - Identify who said what (clinician vs. patient)
- 🏷️ **Automatic Metadata Extraction** - Structured data from free-form speech
- 📅 **Appointment Integration** - Link sessions to patient appointments
- 🔍 **Semantic Search** - Find relevant notes across all sessions via RAG
- 🛡️ **HIPAA Compliance** - PII masking, audit logs, RLS enforcement
- 💬 **Multi-Chat Q&A** - Ask questions about accumulated medical records

---

## 🏗️ System Architecture

### Core Workflow: From Voice to Documentation

```
┌─────────────────────────────────────────────────────────────────┐
│                     HealthSync Voice Pipeline                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Clinician              System Processing          Data Layer   │
│  (Frontend)             (Backend)                  (Storage)    │
│                                                                 │
│  🎙️ Record      →  ElevenLabs    →  Transcription  →  🗄️       │
│  Voice Session     (Scribe API)      + Diarization    Database  │
│                        │                                        │
│                        ↓                                        │
│                   🏷️ Extract          ↓                         │
│                   Structured Data  Metadata Store               │
│                   (Gemini)                                      │
│                        │                                        │
│                        ↓                                        │
│  📝 Documentation ← Formatted         ↓                         │
│  Clinical Note      Medical Record   Clinical Notes             │
│                                        Table                    │
│                        │                                        │
│                        ↓                                        │
│  🔍 Search      ← Indexed &          ↓                          │
│  via RAG          Searchable      Vector Embeddings             │
│                   Knowledge Base     (pgvector)                 │
│                                        │                        │
│                        │                                        │
│  💬 Chat with      ← LLM Synthesis ← Retrieved Context          │
│  AI Assistant        + Citations                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Component Stack

**Frontend (Next.js + React)**
- 🎙️ Recording Interface - Browser audio capture with live waveform
- 📅 Appointment Calendar - Schedule and link sessions to appointments  
- 📊 Session Dashboard - View recordings, transcriptions, extracted metadata
- 💬 Chat Interface - Query documentation and get AI responses
- 📝 Documentation Viewer - Display and edit clinical notes

**Backend (FastAPI)**
- 🎙️ Audio Processing - File upload, format validation, storage
- 📝 Transcription Service - ElevenLabs integration with diarization parsing
- 🏷️ Metadata Extraction - Gemini-powered structured data extraction
- 📚 RAG Pipeline - Semantic search + LLM synthesis (10-stage process)
- 💾 Session Management - Link records to appointments and patients

**Storage & Infrastructure**
- 🗄️ PostgreSQL + pgvector - Structured data + vector embeddings
- 📦 Supabase - Auth, RLS policies, real-time subscriptions
- ⚡ Redis/Celery - Background processing, query caching
- 🔐 Encryption - PII masking before external API calls

---

## 🎙️ Voice Recording & Transcription (Primary Feature)

### Step 1: Live Recording

Clinician opens **Record Session** page and:
- Selects microphone device
- Starts recording patient consultation (natural conversation)
- System captures bidirectional audio (or records directly)
- Review before uploading

```typescript
// Frontend: Browser Audio API
const mediaRecorder = new MediaRecorder(stream);
const audioChunks: Blob[] = [];
mediaRecorder.addEventListener('dataavailable', (event) => {
  audioChunks.push(event.data);
});
// Upload to backend
const formData = new FormData();
formData.append('audio_file', new Blob(audioChunks, { type: 'audio/webm' }));
await axios.post('/transcribe/', formData);
```

### Step 2: Transcription with Diarization

ElevenLabs Scribe API processes audio:

```python
# Backend: ElevenLabs Speech-to-Text
transcription = elevenClient.speech_to_text.convert(
    file=audio_file,
    model_id="scribe_v1",              # Latest model
    tag_audio_events=True,             # Detect pauses, overlaps
    language_code="en",                # English
    diarize=True                       # Speaker identification (clinician vs. patient)
)

# Output: Speaker turns with timestamps
# [Speaker 1] - Clinician: "What brings you in today?"
# [Speaker 2] - Patient: "I've had a persistent cough for two weeks..."
# [Speaker 1] - Clinician: "Any fever or chills?"
```

**Why ElevenLabs Scribe?**
- ✅ Multi-speaker diarization (identifies who said what)
- ✅ Medical accuracy (trained on healthcare terminology)
- ✅ Fast processing (~real-time)
- ✅ Event detection (silence, overlaps, tone)

### Step 3: Metadata Extraction

Gemini AI analyzes transcription and extracts structured data:

```python
# Backend: Gemini API
instruction = """Extract these fields as JSON:
- patientName
- age
- gender
- chiefComplaint (reason for visit)
- symptoms (reported symptoms)
- previousDiagnosis
- bloodPressure (systolic)
- heartRate (BPM)
- temperature (Celsius)
- allergies
- medication (current)
- diagnosis (assessment)
"""

response = geminiClient.models.generate_content(
    model="gemini-2.5-flash",
    config=GenerateContentConfig(
        system_instruction=instruction,
        response_mime_type="application/json"  # Structured output
    ),
    contents=clean_transcription
)

# Returns: Structured JSON with all fields
{
  "patientName": "John Smith",
  "age": 45,
  "gender": "M",
  "chiefComplaint": "Persistent cough",
  "symptoms": "Dry cough, mild throat soreness",
  "bloodPressure": 128,
  "heartRate": 72,
  "temperature": 37.2,
  "allergies": "Penicillin",
  "medication": "Lisinopril for hypertension",
  "diagnosis": "Acute bronchitis, likely viral"
}
```

**Extracted Fields:**
| Field | Type | Purpose |
|-------|------|---------|
| Patient Demographics | String/Number | Identify patient, track across visits |
| Chief Complaint | String | Primary reason for visit |
| Vitals | Number | Blood pressure, heart rate, temperature |
| Symptoms | String | Patient-reported symptoms |
| History | String | Previous diagnoses, medications, allergies |
| Assessment | String | Clinician's diagnosis |

### Step 4: Clinical Documentation Generation

System formats extracted data into clinical note:

```markdown
# Clinical Session - 2026-04-20 14:30:00

## Patient Information
- **Name:** John Smith
- **Age:** 45 years old
- **Gender:** Male

## Chief Complaint
Persistent cough for 2 weeks

## Vital Signs
- Blood Pressure: 128/80 mmHg
- Heart Rate: 72 BPM
- Temperature: 37.2°C

## History
- **Allergies:** Penicillin
- **Current Medications:** Lisinopril
- **Previous Diagnoses:** Hypertension (controlled)

## Subjective
Patient reports persistent dry cough with mild throat soreness, 
started 2 weeks ago. No fever but occasional malaise.

## Assessment & Plan
**Diagnosis:** Acute bronchitis, likely viral
- Rest and hydration advised
- Monitor for escalation
- Follow-up in 1 week if symptoms persist

## Recording
- Duration: 12 minutes 34 seconds
- Quality: High (background noise: minimal)
- Speakers: 2 (clinician, patient)
```

This note is:
- 💾 Stored in `notes` table
- 🔍 Indexed for search
- 📚 Chunked and embedded (768-dim vectors)
- 🛡️ PII-masked before embedding
- 🔐 Subject to RLS (user/patient isolation)

---

## 🔍 RAG Search on Medical Documentation

Once all voice-recorded sessions are transcribed, extracted, and indexed, clinicians can search across the entire knowledge base:

### RAG Pipeline (10-Stage Process)

```
Query → Embed → Retrieve → Rerank → Classify → Guard → Prompt → LLM → Citation → Audit
(768d)  (50k)   (Cross-E)  (Type)   (Patient) (Groq)  (Format) (Log)
```

| Stage | Component | Purpose |
|-------|-----------|---------|
| **1** | Query Embedding | Convert search text to 768-dim Gemini vector |
| **2** | Retrieval | Fetch top-50 relevant chunks from all sessions |
| **3** | Reranking | Cross-encoder narrows to top-5 most relevant |
| **4** | Query Classification | Detect domain + intent |
| **5** | Patient Guardrail | Verify patient context (prevent cross-patient queries) |
| **6** | LLM Synthesis | Groq generates medical answer |
| **7** | Citation Formatting | Include source session + section + confidence |
| **8** | Confidence Scoring | 60% retrieval quality + 40% LLM confidence |
| **9** | Response Streaming | Progressive token delivery (NDJSON) |
| **10** | Audit Logging | Immutable query record (HIPAA compliance) |

### Example RAG Query

**Clinician asks:** *"What was Mr. Smith's blood pressure reading across his last 3 visits?"*

**System searches:**
- Retrieves all sessions mentioning "Smith" + "blood pressure"
- Reranks by relevance and recency (temporal boost)
- LLM synthesizes: "Based on 3 sessions... BP was 128/80, 130/82, 126/78"
- Citations show exact notes + timestamps

**Response includes:**
```json
{
  "answer": "Mr. Smith's blood pressure readings across his last 3 visits were: 128/80 mmHg (Apr 18), 130/82 mmHg (Apr 11), 126/78 mmHg (Mar 28). Overall trend is stable.",
  "citations": [
    { "session_id": "sess_001", "date": "2026-04-20", "confidence": 0.94 },
    { "session_id": "sess_002", "date": "2026-04-11", "confidence": 0.91 },
    { "session_id": "sess_003", "date": "2026-03-28", "confidence": 0.88 }
  ],
  "confidence": 0.91
}
```

### Multi-Chat Conversation Interface

- 💬 **Create Chat Sessions** - Start a new Q&A conversation about a patient
- 🔗 **Link Sessions** - Query can reference multiple recorded sessions
- 📝 **10-Query Limit** - Per chat (encourages focused investigation)
- 🧠 **Pronoun Resolution** - "He" → patient name via context
- ⏳ **Query Count Display** - Visualize remaining queries

---

## ✨ Key Technical Features

### 1. **4-Tier Hierarchical Chunking** 📚
Voice-generated clinical notes are chunked for optimal search:
- **Document Level** → Extract sections (Subjective, Assessment, Plan)
- **Section Level** → Split into logical paragraphs
- **Sub-Chunk Level** → 300-token chunks with 50-token overlap
- **Context Window** → Preserve surrounding clinical context
- **Deduplication** → Remove redundant content

*Benefit:* Multi-resolution retrieval; context preserved; efficient search.

### 2. **Advanced Multi-Stage Retrieval** 🔎
```python
# Intelligent filtering strategy
hard_filter      # Patient/user/date constraints
  ↓
similarity       # HNSW vector similarity (top-50)
  ↓
temporal_boost   # +20% weight for recent sessions (7 days)
  ↓
reranking        # Cross-encoder precision (top-5)
```

*Benefit:* Recent sessions prioritized; fast filtering; high precision results.

### 3. **PII Masking & HIPAA Compliance** 🔐
Before transcription/documentation is indexed:
- 🔒 Masks **patient names, phone numbers, SSNs, addresses**
- 📋 Preserves clinical meaning (replaces with category tokens)
- 📝 Append-only audit log for all queries (immutable)
- 🔐 Row-Level Security enforces user/patient isolation
- ♾️ Indefinite retention (lifecycle-managed)

*Benefit:* Safe external API usage; compliance trail; data isolation guaranteed.

### 4. **Async Processing Pipeline** 🚀
```
1. Recording uploaded
2. Transcription queued (ElevenLabs)
3. Extraction queued (Gemini metadata)
4. Chunking + PII masking
5. Embedding generated (Gemini 768-dim)
6. Vectors stored in pgvector
```

- ⚡ **Non-blocking** - User can continue while processing
- 📊 **Progress tracking** - Poll `/task-status` for real-time updates
- 🔄 **Retry logic** - Exponential backoff (1s, 4s, 9s max)
- 👁️ **Transparent** - Users see processing status in dashboard

### 5. **Query Caching** 💾
```
Same query + same patient + same time window = 50ms hit
(vs. 1-2 seconds for full RAG pipeline)
```

- **TTL:** 30 minutes per query
- **Hit Rate:** ~40-60% on typical workflows
- **Fallback:** Works without Redis (graceful degradation)

### 6. **Confidence Scoring & Citations** 📍
Every RAG response includes:
```
Confidence = 0.6 * retrieval_quality + 0.4 * llm_confidence

Each citation shows:
├── Which session (date, duration)
├── Which section (Subjective, Assessment, Plan)
├── Relevance score (0.0 - 1.0)
└── Exact timestamp of recording
```

*Benefit:* Clinicians verify responses; transparency for audits; full traceability.

---

## 💡 Use Case Example

### Scenario: Dr. Chen Reviews Patient History

**Day 1 - Session Recording:**
```
Dr. Chen: "What brings you in today?"
Patient: "I've had a persistent headache for a week..."
Dr. Chen: [Takes notes by speaking naturally]
System: [Records, transcribes, extracts automatically]
Result: Clinical note created in database
```

**Day 8 - Follow-up Query:**
```
Dr. Chen: "Open chat, query all of this patient's sessions"
Asks: "Has the headache improved? What treatments did we try?"

RAG System:
1. Searches 5 previous sessions for "headache"
2. Retrieves relevant sections
3. Synthesizes: "Headache first mentioned Apr 8 (persistent). 
   Treated with ibuprofen (Day 1) and rest. Follow-up showed 
   50% improvement on Day 4. No improvement on Day 8."
4. Shows citations + confidence scores
5. Dr. Chen verifies response + continues care
```

**Result:** No manual chart review needed. Complete history retrieved in seconds. Full compliance trail maintained.

---

## 🛠️ Technology Stack

### Voice & Audio Processing
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Audio Capture** | Browser MediaRecorder API | Client-side voice recording |
| **Transcription** | ElevenLabs Scribe v1 | Medical-optimized speech-to-text |
| **Diarization** | ElevenLabs (built-in) | Speaker identification (clinician vs. patient) |
| **Metadata Extraction** | Google Gemini 2.5 Flash | Structured data extraction from transcription |

### Backend
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | FastAPI 0.120+ | RESTful API with OpenAPI docs |
| **Database** | PostgreSQL (Supabase) | Structured data: sessions, notes, patients |
| **Vector DB** | pgvector + HNSW | Semantic search on 768-dim embeddings |
| **Cache** | Redis | Query caching + Celery task broker |
| **Task Queue** | Celery 5.3+ | Async processing (transcription, embedding) |
| **NLP** | spaCy 3.7+ | Named Entity Recognition (extract patient names) |
| **Embeddings** | Gemini 768-dim | Medical-aware vector embeddings |
| **LLM** | Groq (Mixtral) | Fast medical response generation |
| **Rate Limiting** | SlowAPI | Per-user request limits |
| **Encryption** | Fernet + TLS | Data encryption in transit/rest |

### Frontend
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | Next.js 16 | React SSR + routing |
| **Runtime** | React 19 | Component-based UI |
| **Styling** | Tailwind CSS 4 | Utility-first CSS |
| **Components** | shadcn/ui + Radix UI | Accessible, pre-built UI components |
| **Icons** | Lucide React | Consistent icon system |
| **HTTP** | Axios | Promise-based HTTP client |
| **Forms** | React Hook Form + Zod | Efficient form handling + validation |
| **Calendar** | React Day Picker | Appointment scheduling |
| **Tables** | TanStack React Table | Complex data display |
| **Charts** | Recharts | Medical data visualization |
| **Notifications** | Sonner | Toast notifications |
| **State** | React Hooks | Custom hooks for state management |

### Infrastructure & Compliance
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Auth** | Supabase Auth + JWT | Secure user authentication |
| **Database Security** | Row-Level Security (RLS) | User/patient data isolation |
| **Audit Logging** | Supabase (custom table) | Immutable query logs (HIPAA) |
| **PII Masking** | Regex patterns + Fernet | Secure handling of sensitive data |
| **Monitoring** | Custom logging + Sentry | Error tracking and performance |

---

## 📊 Database Schema Overview

### Voice & Session Data
```sql
notes                      # Clinical notes (auto-generated from voice)
├── id, user_id, patient_id
├── title, content
├── extracted_metadata    # {patient_name, age, symptoms, vitals, diagnosis}
├── recording_duration    # Session length
├── status                # pending | processing | completed | failed
└── created_at, updated_at

sessions                   # Recorded audio sessions
├── id, user_id, patient_id
├── appointment_id        # Link to scheduled appointment
├── audio_url            # Stored audio file
├── transcription        # Full transcription from ElevenLabs
├── speaker_count        # Number of speakers detected
└── duration_seconds

chat_sessions             # RAG query conversations
├── id, user_id, patient_id
├── query_count          # 0-10 limit
├── referenced_patients  # Array of patient IDs mentioned
└── created_at
```

### Search & Retrieval
```sql
note_embeddings          # Chunked + embedded notes (768-dim)
├── id, note_id, user_id, patient_id
├── chunk_text, chunk_text_masked
├── embedding            # 768-dim pgvector
├── section              # HPI, Assessment, Plan, etc.
├── tokens
└── timestamp

rag_queries_audit        # Immutable compliance log
├── id, user_id, patient_id
├── query_text
├── retrieved_chunks_count
├── llm_response
├── confidence_score
├── citations            # JSON array of sources
└── created_at
```

### Appointments & Organization
```sql
appointments             # Scheduled patient appointments
├── id, user_id, patient_id
├── date, time
├── status               # scheduled | completed | cancelled
├── notes
└── linked_session_id    # FK to sessions table

patients                 # Patient reference information
├── id, user_id
├── patient_name
├── age, gender
├── medical_history
└── allergies
```

### Key Indexes
- **HNSW Vector Index** on embeddings for fast similarity search
- **Composite Index** on (user_id, patient_id, created_at) for filtering
- **GiST Index** for temporal range queries
- **Full-text Index** on note content

### Row-Level Security (RLS)
All tables enforce user/patient isolation:
```sql
-- Users can only see their own notes
SELECT * FROM notes WHERE user_id = auth.uid();

-- Clinicians can only access assigned patients
SELECT * FROM sessions 
WHERE user_id = auth.uid() 
  AND patient_id = ANY(clinician_patients);
```

---

## 🚀 Getting Started

### Prerequisites
- **Frontend:** Node.js 18+, npm/yarn
- **Backend:** Python 3.10+
- **Database:** PostgreSQL 14+ (or Supabase account - free tier works)
- **External APIs:** 
  - ElevenLabs API key (transcription)
  - Google Gemini API key (metadata extraction + embeddings)
  - Groq API key (optional, for LLM responses)

### Installation

#### Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy model for NER
python -m spacy download en_core_web_sm

# Configure environment
cp .env.example .env
# Edit .env with your API keys:
# - ELEVENLABS_API_KEY
# - GEMINI_API_KEY
# - GROQ_API_KEY
# - DATABASE_URL (Supabase connection string)
# - SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY

# Run database migrations (create tables)
python -m alembic upgrade head

# Start Celery worker (in a separate terminal)
celery -A core.celery_app worker --loglevel=info

# Start FastAPI server
uvicorn main:app --reload
```

#### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with backend API URL:
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Start development server
npm run dev
```

### Quick Test

**Test Voice Recording & Transcription:**
```bash
# 1. Open browser to http://localhost:3000
# 2. Go to "Record Session"
# 3. Click "Start Recording"
# 4. Speak for 10-20 seconds (e.g., "Patient John Smith, 45 years old...")
# 5. Click "Stop Recording"
# 6. System automatically:
#    - Uploads to backend
#    - Transcribes via ElevenLabs
#    - Extracts metadata via Gemini
#    - Creates clinical note
#    - Generates embeddings

# Or test via curl:
curl -X POST http://localhost:8000/transcribe/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "audio_file=@recording.wav"
```

**Test RAG Search:**
```bash
curl -X POST http://localhost:8000/search/rag-stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "query": "What was the patient'\''s diagnosis?",
    "patient_id": "patient_uuid"
  }'

# Response (NDJSON streaming):
{"type": "metadata", "chat_id": "..."}
{"type": "token", "content": "The"}
{"type": "token", "content": " patient"}
{"type": "completion", "answer": "...", "citations": [...]}
```

---

## 📈 Performance Characteristics

| Operation | Typical Latency | Notes |
|-----------|-----------------|-------|
| **Voice Recording (30 min)** | Real-time | Browser-based capture |
| **Transcription (ElevenLabs)** | ~1-2 min | Processing time proportional to length |
| **Metadata Extraction** | 2-5 sec | Gemini API call |
| **Clinical Note Generation** | 1-2 sec | Formatting extracted data |
| **Embedding (single note)** | 5-10 sec | Gemini batch processing |
| **Async processing (100 notes)** | 3-5 min | Parallel Celery workers |
| **RAG Query (cache miss)** | 800ms - 2s | Full 10-stage pipeline |
| **RAG Query (cache hit)** | 50-100ms | Redis lookup |
| **Concurrent queries** | >100 req/sec | Supabase scaling |

### Cost Estimates (Monthly)
| Component | Cost @ 10k sessions/month |
|-----------|--------------------------|
| ElevenLabs Scribe API | ~$50-100 (based on audio duration) |
| Gemini Embeddings | ~$0.02 (768-dim batch) |
| Groq LLM | Free (free tier) |
| Supabase pgvector | Included (free tier) |
| **Total** | ~$50-100/month |

---

## 🔒 Security & HIPAA Compliance

### Data Protection
✅ **Encryption in Transit** - TLS/HTTPS required for all API calls  
✅ **Encryption at Rest** - Supabase encryption + app-level encryption for PII  
✅ **PII Masking** - Names, SSNs, addresses removed before external APIs  
✅ **Audit Logging** - Immutable record of all queries (for compliance audits)  
✅ **Access Control** - JWT auth + Row-Level Security policies  
✅ **Data Isolation** - User/patient records strictly segregated  

### Rate Limiting
```
Transcription: 100 requests/minute per user
RAG searches:  30 requests/minute per user
Chat queries:  100 requests/minute per user
Auth endpoint: 10 requests/minute per IP
```

### Privacy Features
- 🔐 Audio files not stored permanently (processed then deleted)
- 🤐 Transcription masked before external embedding APIs
- 📋 Audit log shows who accessed what patient data
- 🚫 Prevents cross-patient queries via RLS enforcement

---

## 📚 API Endpoints

### Recording & Transcription
```
POST   /transcribe/               Upload audio → transcribe → extract metadata
```

**Request:**
```json
{
  "audio_file": "[multipart file]"
}
```

**Response:**
```json
{
  "extractedMetadata": {
    "patientName": "John Smith",
    "age": 45,
    "gender": "M",
    "chiefComplaint": "Persistent cough",
    "symptoms": "Dry cough, mild throat soreness",
    "bloodPressure": 128,
    "heartRate": 72,
    "temperature": 37.2,
    "allergies": "Penicillin",
    "medication": "Lisinopril",
    "diagnosis": "Acute bronchitis"
  }
}
```

### Session Management
```
GET    /sessions/                 List all recorded sessions
POST   /sessions/                 Create new session
GET    /sessions/{id}             Get session details
DELETE /sessions/{id}             Delete session
```

### Chat & RAG
```
POST   /chats/                    Create new chat
GET    /chats/                    List chats
POST   /search/rag-stream         Execute RAG query (streaming)
GET    /search/task-status/{id}   Check async task status
```

### Appointments
```
GET    /appointments/             List appointments
POST   /appointments/             Create appointment
GET    /appointments/{id}         Get appointment details
POST   /appointments/{id}/link    Link to session
```

### Authentication
```
POST   /auth/register             User signup
POST   /auth/login                User login
POST   /auth/refresh              Refresh token
POST   /auth/logout               Logout
```

---

## 🧪 Testing & Validation

### Test Recording Workflow
```bash
# 1. Record audio using record-session page
# 2. Verify transcription appears
# 3. Check extracted metadata
# 4. Confirm note created in database

pytest backend/tests/test_transcription.py -v
pytest backend/tests/test_extraction.py -v
```

### Test RAG Pipeline
```bash
pytest backend/tests/test_rag_pipeline.py -v      # 28 test cases
pytest backend/tests/test_chat_routes.py -v       # 14 test cases
```

### Health Checks
```bash
# Backend health
curl http://localhost:8000/

# Database connectivity
curl http://localhost:8000/health/database

# External APIs (ElevenLabs, Gemini, Groq)
curl http://localhost:8000/health/external-apis
```

---

## 🎯 Project Status

### Current Release: v4.0 ✅
- ✅ Voice recording & transcription (ElevenLabs Scribe)
- ✅ Metadata extraction (Gemini AI)
- ✅ Clinical note generation
- ✅ Appointment integration
- ✅ RAG search on documentation (multi-chat)
- ✅ HIPAA audit logging
- ⏳ Frontend full integration (ChatbotPage)

### Known Limitations
- **Session Duration:** Recommended <30 min per recording (transcription speed)
- **Speaker Limit:** Best results with 2-4 speakers (diarization)
- **Language:** English only (v4.0)
- **RAG Queries:** 10 per chat session (prevents hallucination)

### Roadmap (v4.1+)
- 🌍 Multi-language support
- 📊 Advanced analytics dashboard
- 👥 Team collaboration features
- 📱 Mobile app (React Native)
- 🔊 Voice-based Q&A (speak to search)
- 🔄 GraphQL API layer
- 📈 Performance optimization (quantized embeddings)

---

## 📖 Documentation

- **[Backend Setup Guide](./backend/docs/DEPLOYMENT_CHECKLIST.md)** - Detailed installation
- **[Environment Variables](./backend/docs/ENV_VARIABLES.md)** - Complete reference
- **[RAG Architecture](./backend/docs/RAG_IMPLEMENTATION_GUIDE.md)** - Deep dive into search
- **[Frontend Design](./CHAT_FRONTEND_DESIGN.md)** - UI/UX specifications
- **[Database Schema](./backend/migrations/006_create_chat_tables.sql)** - SQL definitions

---

## 💡 Sample Workflow: Complete User Journey

### Step 1: Schedule Appointment
```
Dr. Chen's staff schedules: John Smith - April 20, 2026, 2:00 PM
Session is linked in the system
```

### Step 2: Record Consultation
```
Dr. Chen arrives at appointment
Opens "Record Session" → "New Recording"
Hits START
Natural conversation happens (12 minutes)
Doctor takes no manual notes - just speaks naturally
Hits STOP
```

### Step 3: Automatic Processing
```
Backend automatically:
1. Transcribes audio (ElevenLabs)
2. Extracts: patient name, age, symptoms, BP, HR, diagnosis
3. Generates clinical note (markdown)
4. Creates embeddings (Gemini 768-dim)
5. Stores in vector database (pgvector)
→ All done in ~1-2 minutes
```

### Step 4: Follow-up Review
```
One week later, Dr. Chen sees John Smith again
Opens "Chats" → "New Chat"
Asks: "What was John's BP last visit?"

RAG system:
1. Searches embeddings for "blood pressure"
2. Retrieves relevant session
3. LLM synthesizes: "BP was 128/80 mmHg"
4. Shows citation + confidence

Result: Complete history in seconds, no manual chart review
```

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork repository
2. Create feature branch (`git checkout -b feature/name`)
3. Commit changes (`git commit -m 'Add feature'`)
4. Push (`git push origin feature/name`)
5. Open Pull Request

---

## 📝 License

Proprietary - All rights reserved

---

## 👥 Team & Support

**Developed by:** HealthSync Team  
**Version:** v4.0 (2026-04-20)  
**Latest Update:** April 20, 2026

For issues or feature requests, contact the development team.

---

## 🙏 Acknowledgments

- **ElevenLabs** - Medical-grade transcription with diarization
- **Google Gemini** - Metadata extraction and embeddings
- **Groq** - Lightning-fast medical LLM inference
- **Supabase** - PostgreSQL + pgvector backend
- **spaCy** - Industrial NLP
- **Next.js & React** - Modern frontend framework
- **shadcn/ui** - Accessible components

---

<div align="center">

**From voice to documentation in seconds** 🎙️ → 📝

[Backend Docs](./backend) | [Frontend Docs](./frontend) | [Deploy Guide](./docs) | [API Ref](./docs/API.md)

</div>
