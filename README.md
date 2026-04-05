# HealthSync

<div align="center">

[![FastAPI](https://img.shields.io/badge/FastAPI-0.119-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Redis](https://img.shields.io/badge/Redis-Latest-DC382D?logo=redis)](https://redis.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?logo=postgresql)](https://supabase.com/)

**AI-Powered Medical Transcription & Documentation System**

*Transform doctor-patient conversations into structured, HIPAA-compliant clinical notes in real-time.*

[Features](#-features) • [Architecture](#-system-architecture) • [Quick Start](#-installation--setup) • [API Reference](#-api-overview) • [Tech Stack](#-tech-stack)

</div>

---

## 🎯 Overview

**HealthSync** is a production-grade AI assistant for modern clinical environments.

**Key strengths:**
- Real-time processing of audio with speaker diarization (doctor vs. patient)
- Intelligent metadata extraction using LLM-powered analysis
- Semantic retrieval through vector embeddings and RAG
- Production reliability: caching, concurrency control, graceful degradation
- HIPAA compliance awareness via UUID-based patient identification

**Current Version:** 2.0 | **Status:** Production-Ready

---

## 🚀 Version 3.0 Coming Soon

The next iteration of HealthSync will introduce **advanced RAG (Retrieval-Augmented Generation)** capabilities:

✨ **What's Coming:**
- Enhanced contextual retrieval with multi-document reasoning
- Intelligent pattern recognition across patient histories
- Personalized clinical insights using retrieved context
- Advanced SOAP note generation with evidence-based recommendations
- Voice-based knowledge base querying
- Real-time clinical decision support

Stay tuned for a more intelligent, context-aware clinical assistant.

---

## 🎨 Features

### Core Capabilities

**📹 Real-Time Audio Processing**
- Speaker diarization (identify doctor vs. patient)
- Multi-language transcription support
- Streaming audio ingestion (ElevenLabs Scribe)
- Language detection and auto-adaptation

**🧠 AI-Powered Metadata Extraction**
- Symptom identification and classification
- Chief complaint extraction
- Medical history parsing
- Medication & allergy detection
- Vital signs recognition
- JSON-structured output via Gemini 2.5 Flash

**🔍 Semantic Search & RAG**
- Vector-based patient record retrieval
- Cosine similarity matching
- ChromaDB embedding storage
- Context-aware search results
- HIPAA-compliant patient data handling

**📝 SOAP Note Generation**
- Structured clinical documentation
- Subjective, Objective, Assessment, Plan formatting
- LLM-powered synthesis
- Real-time note generation

### Production Features

**⚡ Advanced Caching Layer (Redis)**
- Cache-aside pattern implementation
- TTL with jitter (prevents thundering herd)
- Hot key protection (access-based TTL extension)
- Null result caching (short TTL for 404s)
- Graceful fallback to Supabase if Redis unavailable

**🔐 Security & Authentication**
- JWT-based token authentication
- Access & refresh token management
- UUID-based patient identification
- Input validation and sanitization
- HIPAA compliance considerations

**🎛️ Rate Limiting & Concurrency**
- Per-endpoint rate limiting (slowapi)
- Redis-based processing locks
- Concurrent request deduplication
- Double-check patterns for race conditions

**🔄 Processing Lifecycle**
- Status-based pipelines (pending → processing → completed/failed)
- Automatic state transitions
- Error handling and retry mechanisms
- Logging and audit trails

---

## 🏗️ System Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                          │
│  • Next.js Web Application (React 19)                       │
│  • Real-time Supabase listener                              │
│  • Audio recording & streaming                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
        ┌─────────────────┐
        │  FastAPI Layer  │
        │  (Middlewares)  │
        ├─────────────────┤
        │ • Rate Limiting │
        │ • CORS          │
        │ • GZIP          │
        └────────┬────────┘
                 │
        ┌────────┴──────────────────────────────────────┐
        │                                               │
        ▼                                               ▼
   ┌─────────────────────┐              ┌──────────────────────┐
   │   Search Router     │              │  Processing Router   │
   │ ┌─────────────────┐ │              │ ┌──────────────────┐ │
   │ │ Semantic Search │ │              │ │ Status Pipeline  │ │
   │ │ (ChromaDB)      │ │              │ │ (Embed & Store)  │ │
   │ └─────────────────┘ │              │ └──────────────────┘ │
   └──────────┬──────────┘              └──────────┬───────────┘
              │                                    │
              └────────────┬─────────────────────┘
                           │
              ┌────────────┴──────────────────┬──────────────┐
              │                               │              │
              ▼                               ▼              ▼
         ┌─────────────┐          ┌──────────────────┐  ┌────────┐
         │ PostgreSQL  │          │     Redis        │  │ChromaDB│
         │  (Supabase) │          │    (Caching)     │  │(Vectors)
         │             │          │                  │  │        │
         │ • notes     │          │ • Cache-aside    │  │ Cosine │
         │ • users     │          │ • Locks          │  │ Search │
         │ • records   │          │ • TTL + Jitter   │  │        │
         └─────────────┘          └──────────────────┘  └────────┘
```

### Request Lifecycle

1. **Transcription** — Audio uploaded, transcribed with speaker diarization (ElevenLabs)
2. **Metadata Extraction** — LLM analyzes transcript, extracts chief complaint, symptoms, vitals, meds, allergies
3. **Storage** — Structured note stored in PostgreSQL (Supabase), assigned UUID, status set to "pending"
4. **Processing** — Background job acquires Redis lock, validates/normalizes data
5. **Embedding** — SentenceTransformer generates 384-dim vector, stored in ChromaDB
6. **Search Ready** — Note indexed and queryable via semantic search
7. **Voice Summary** — Optional TTS synthesis of metadata for voice-based recall



---

## 📋 Request Lifecycle Details

### Processing Pipeline State Machine

```
                    ┌─────────────────────┐
                    │  Initial State      │
                    │  (Not in DB)        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  PENDING            │
                    │  (Stored in DB)     │
                    └──────────┬──────────┘
                               │
                    (User triggered /process/note)
                               │
                               ▼
                    ┌─────────────────────┐
                    │  PROCESSING         │
                    │  (Redis lock held)  │
                    ├─────────────────────┤
                    │ • Acquire lock      │
                    │ • Fetch note        │
                    │ • Validate          │
                    │ • Generate embed    │
                    │ • Store in ChromaDB │
                    └──────────┬──────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼ (success)                   ▼ (error)
    ┌───────────────────────────┐   ┌─────────────────────┐
    │  COMPLETED                │   │  FAILED             │
    │  (Ready for search)       │   │  (Error logged)     │
    │  • Lock released          │   │  • Lock released    │
    │  • Cache invalidated      │   │  • Error stored     │
    │  • Indexed in ChromaDB    │   │  • Retry available  │
    └───────────────────────────┘   └─────────────────────┘
```



## 🛠️ Tech Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Backend Framework** | FastAPI | 0.119 | REST API, ASGI async |
| **Language** | Python | 3.10+ | Backend logic |
| **Frontend Framework** | Next.js | 16 | React meta-framework |
| **Frontend Language** | TypeScript | 5 | Type-safe frontend |
| **Database (Primary)** | PostgreSQL | Latest | Supabase-managed |
| **Cache Layer** | Redis | Latest | Cache-aside, locks |
| **Vector DB** | ChromaDB | 1.2.1 | Semantic embeddings |
| **Embedding Model** | SentenceTransformer | all-MiniLM-L6-v2 | 384-dim vectors |
| **LLM** | Google Gemini | 2.5 Flash | Metadata extraction |
| **Speech-to-Text** | ElevenLabs Scribe | v1 | Audio transcription |
| **Rate Limiting** | slowapi | Latest | Endpoint protection |
| **Auth** | JWT | (PyJWT) | Token-based auth |
| **UI Framework** | shadcn/ui | Latest | React components |
| **Styling** | Tailwind CSS | 4 | Utility CSS |
| **HTTP Client** | axios | 1.13 | Frontend requests |

**Dependencies Summary:**
- Backend: FastAPI, SQLAlchemy, chromadb, sentence-transformers, google-genai, elevenlabs, redis, supabase-py
- Frontend: React, Next.js, TypeScript, Tailwind, Supabase JS, React Hook Form, TanStack Table, Recharts

---

## 📦 Installation & Setup

### Prerequisites

- **Python 3.10+** with pip
- **Node.js 18+** with npm/yarn
- **Redis** (local or cloud: Redis Cloud, AWS ElastiCache)
- **PostgreSQL** (via Supabase)
- **API Keys**: Google Gemini, ElevenLabs, Supabase

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/healthsync.git
cd healthsync
```

### Step 2: Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

### Step 3: Frontend Setup

```bash
cd frontend
npm install
```

### Step 4: Environment Configuration

Copy `.env.example` and rename to `.env` for backend, `.env.local` for frontend. Key variables:

**Backend:** `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `REDIS_NOTES_URL`, `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `SECRET_KEY`, `FERNET_KEY`

**Frontend:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_BASE_URL`

### Step 5: Database Initialization

Create table `notes` in Supabase with fields for patient metadata (name, age, gender, chief complaint, symptoms, vitals, medications, allergies, diagnosis, status). Create table `users` for authentication. Set up Row-Level Security policies as needed.

### Step 6: Start Redis

**Local:** `brew services start redis` (macOS), `sudo systemctl start redis-server` (Linux), or `docker run -d -p 6379:6379 redis:latest` (Docker)

**Cloud:** Use Redis Cloud, AWS ElastiCache, or Azure Cache for Redis. Update `REDIS_NOTES_URL` in `.env`.

---

## 🚀 Running the Project

### Development Mode

**Backend:** Navigate to `backend/`, activate virtualenv, run `uvicorn main:app --reload` on port 8000. Swagger UI at `/docs`.

**Frontend:** Navigate to `frontend/`, run `npm run dev` on port 3000.

### Production Mode

**Backend:** Use Gunicorn with Uvicorn workers: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000`

**Frontend:** Run `npm run build && npm start`

**Docker:** Build images with `docker build -t healthsync-api:latest .` (backend) and `docker build -t healthsync-web:latest .` (frontend), then run with Docker Compose.

---

## 🔌 API Overview

**Authentication** (`/auth/signup`, `/auth/login`) — User registration and login return JWT access + refresh tokens for subsequent requests.

**Transcription** (`POST /transcribe/`) — Accept audio files, extract structured metadata including patient info, chief complaint, symptoms, vitals, medications, and allergies. Returns validated JSON.

**Processing** (`POST /process/note`) — Trigger embedding generation and storage for a note. Returns status (success, duplicate, error) to indicate if processing started, was already running, or failed.

**Search** (`POST /search/notes`) — Semantic search by text query or note ID. Returns top-k similar notes with metadata and similarity scores.

**Health Check** (`GET /`) — Verify API availability and version.

### Rate Limits

| Endpoint | Limit | Notes |
|----------|-------|-------|
| `/transcribe/*` | 10/min | Audio processing is resource-intensive |
| `/process/*` | 30/min | Embedding generation |
| `/search/*` | 60/min | Lightweight search operations |
| `/auth/*` | 100/min | General rate limit |

---

## 📂 Project Structure

```
healthsync/
├── backend/
│   ├── main.py                          # FastAPI app entry point
│   ├── requirements.txt                 # Python dependencies
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── auth.py                      # JWT token generation & validation
│   │   ├── config.py                    # Configuration & cache headers
│   │   ├── dependencies.py              # FastAPI dependencies
│   │   ├── initialization.py            # Client initialization (LLM, embedding, etc.)
│   │   ├── rate_limit.py                # Rate limiting configuration
│   │   ├── redis.py                     # Redis client & lifecycle
│   │   └── security.py                  # Password hashing & encryption
│   │
│   ├── db/
│   │   ├── __init__.py
│   │   ├── base.py                      # SQLAlchemy base
│   │   └── models.py                    # User model (authentication)
│   │
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── authRoutes.py                # Auth endpoints (/auth)
│   │   ├── processingRoutes.py          # Processing endpoints (/process)
│   │   ├── searchRoutes.py              # Search endpoints (/search)
│   │   └── transcriptionRoutes.py       # Transcription endpoints (/transcribe)
│   │
│   ├── schema/
│   │   ├── __init__.py
│   │   ├── authSchema.py                # Pydantic models for auth
│   │   ├── processingSchema.py          # Pydantic models for processing
│   │   ├── searchSchema.py              # Pydantic models for search
│   │   └── transcriptionSchema.py       # Pydantic models for transcription
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── authService.py               # Auth business logic
│   │   ├── cache.py                     # Redis caching service
│   │   ├── embeddings.py                # Embedding generation & storage
│   │   ├── extraction.py                # LLM-based metadata extraction
│   │   ├── supabaseService.py           # Supabase CRUD operations
│   │   └── transcription.py             # Audio transcription service
│   │
│   ├── utils/
│   │   ├── __init__.py
│   │   └── utils.py                     # Utility functions
│   │
│   └── chroma_db/                       # ChromaDB persistence directory
│       ├── chroma.sqlite3
│       └── [collection-data]/
│
├── frontend/
│   ├── package.json                     # Node.js dependencies
│   ├── tsconfig.json                    # TypeScript configuration
│   ├── next.config.ts                   # Next.js configuration
│   ├── tailwind.config.js               # Tailwind CSS configuration
│   │
│   ├── app/
│   │   ├── layout.tsx                   # Root layout
│   │   ├── page.tsx                     # Home page
│   │   ├── globals.css                  # Global styles
│   │   ├── providers.tsx                # App providers (Supabase, Theme, etc.)
│   │   │
│   │   ├── auth/                        # Authentication pages
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── callback/
│   │   │
│   │   ├── dashboard/                   # Main dashboard
│   │   │   └── page.tsx
│   │   │
│   │   ├── record-session/              # Audio recording interface
│   │   │   └── page.tsx
│   │   │
│   │   ├── sessions/                    # Session management
│   │   │   ├── page.tsx
│   │   │   └── [sessionID]/
│   │   │
│   │   ├── patients/                    # Patient management
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │
│   │   ├── appointments/                # Appointment scheduling
│   │   │   └── page.tsx
│   │   │
│   │   └── api/                         # API routes (Next.js API)
│   │       └── patients/
│   │
│   ├── components/
│   │   ├── **/*.tsx                     # Reusable React components
│   │   ├── auth/                        # Auth-related components
│   │   ├── patients/                    # Patient UI components
│   │   ├── sessions/                    # Session UI components
│   │   ├── shadcn/                      # shadcn/ui components
│   │   └── ui/                          # Custom UI components
│   │
│   ├── lib/
│   │   ├── api.ts                       # Axios client configuration
│   │   ├── supabase-client.ts           # Supabase client
│   │   ├── types.ts                     # TypeScript types
│   │   └── utils.ts                     # Utility functions
│   │
│   ├── hooks/
│   │   ├── use-controlled-state.ts      # Custom hooks
│   │   ├── use-data-state.ts
│   │   └── use-mobile.ts
│   │
│   └── public/                          # Static assets
│
└── README.md                            # This file
```

---

## 🏗️ Architecture & Design Patterns

### 1. Redis Caching Strategy

- Cache-aside pattern with randomized TTL jitter to prevent synchronized cache misses
- Hot key detection: frequently-accessed notes get extended TTL automatically
- Connection pooling (max 20 connections) with keep-alive probes

### 2. Concurrent Request Handling

- Redis-based distributed locks prevent concurrent processing of same note
- Lock timeout: 300s, auto-released on success or error (prevents deadlocks)

### 3. Async I/O & Non-Blocking Design

- All routes are async; blocking ops (LLM, STT) offloaded to thread pools
- Event loop never blocks → handles thousands of concurrent requests

### 4. Error Handling & Resilience

- Pydantic validation at API boundary catches type errors early
- UUID injection prevention via format validation

### 5. Scalability Considerations

- Stateless backend: all state in Redis or Supabase
- Horizontal scaling: add instances behind load balancer, no coordination needed

### 6. Security & Compliance

- Patient data identified by UUID (not PHI); no SSN/names in logs
- HTTPS enforced in production; all data encrypted in transit

---

## 📊 Performance Characteristics

### Typical Latencies

- Transcription (audio): 15-30s (ElevenLabs)
- Metadata extraction (LLM): 2-5s
- Embedding generation: 500-800ms
- ChromaDB storage: 50-150ms
- Semantic search: 100-300ms
- Note fetch (cache hit): <5ms | (cache miss): 20-50ms

### Optimization Approach

- Frontend: lazy loading, code splitting, minimal initial load
- Backend: 90%+ cache hit rate via intelligent TTL management
- Connection pooling maximizes throughput, minimizes overhead
- GZIP compression reduces response sizes for large datasets
- Read replicas optional for search queries (future scaling)

---

## 🎯 Use Cases

### 1. **Doctor's Cabin - Real-Time Documentation**
- Audio recorded during consultation → transcribed with speaker diarization
- Metadata auto-extracted (symptoms, vitals, meds) → SOAP note generated
- **Outcome:** Eliminates manual note-taking, reduces admin burden

### 2. **Clinical Research - Case Similarity Search**
- Researchers query: "Patients with persistent cough + chest pain + asthma"
- System returns semantically similar cases from database
- **Outcome:** Accelerates case finding, enables evidence-based decisions

### 3. **Patient Follow-Up - Voice-Based Recall**
- Doctor asks: "What meds did we discuss last month?"
- System retrieves relevant notes via semantic search
- TTS generates instant verbal summary
- **Outcome:** Better continuity of care, less manual file review

### 4. **Quality Assurance - Note Consistency**
- Flag notes with inconsistencies: "asthma diagnosis but no inhaler meds"
- System identifies documentation gaps automatically
- **Outcome:** Improves note quality and compliance

---

## 🤝 Contribution Guidelines

We welcome contributions from the community! Whether it's bug fixes, feature implementations, or documentation improvements, all contributions are valued.

### Development Workflow

1. Fork repo and create feature branch: `git checkout -b feature/your-feature-name`
2. Setup: create venv, install deps (backend + frontend)
3. Make changes, test thoroughly (pytest backend, npm run lint frontend)
4. Commit with semantic messages: `git commit -m "feat|fix|docs: description"`
5. Push and create Pull Request

### Coding Standards

- **Python:** PEP 8, type hints, docstrings
- **TypeScript:** eslint, strict mode, no any types
- **Commits:** Semantic (feat:, fix:, docs:, etc.)
- **Testing:** 80%+ coverage for new code
- **Docs:** Update README for new features

### Reporting Issues

- Use GitHub Issues for bugs
- Include: steps to reproduce, error logs, environment (Python/Node version, OS)

---

## 📄 License

HealthSync is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024-2026 HealthSync Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software...
```

---

## 🙋 Support & Community

- **Documentation:** [Full Docs](https://healthsync.readthedocs.io)
- **Issues:** [GitHub Issues](https://github.com/yourusername/healthsync/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/healthsync/discussions)
- **Email:** support@healthsync.dev

---

## 🎓 Acknowledgments

Built with ❤️ by healthcare technology enthusiasts. Special thanks to:
- **FastAPI** for the incredible async framework
- **Supabase** for managed PostgreSQL
- **Google Gemini** for powerful LLM capabilities
- **ElevenLabs** for state-of-the-art speech processing
- **ChromaDB** for vector database excellence
- **The community** for feedback and contributions

---

<div align="center">

**Made with ❤️ for better healthcare documentation**

⭐ If you find HealthSync useful, please consider giving us a star on GitHub!

</div>
