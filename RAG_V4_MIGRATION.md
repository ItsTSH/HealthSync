# HealthSync RAG v4.0 Migration Guide

**Status:** Completed April 19, 2026  
**From:** v3.1 (Single chat, basic RAG)  
**To:** v4.0 (Multi-chat, patient disambiguation, 10-stage pipeline)

---

## Executive Summary

HealthSync v4.0 introduces a revolutionary multi-chat system with intelligent patient disambiguation, session-scoped context management, and a refined 10-stage RAG pipeline. This guide helps you upgrade from v3.1 to v4.0.

**Key Changes:**
- ✨ Multi-chat system with 10-query limit per chat
- ✨ Automatic patient extraction and disambiguation
- ✨ Session-scoped context for pronoun resolution
- ✨ Enhanced RAG pipeline with explicit patient filtering
- ✨ NDJSON streaming with detailed event types
- ✨ 36+ unit tests for core services

---

## Breaking Changes

### 1. Frontend Route Structure

**Before (v3.1):**
```
/chatbot → Single chat interface
```

**After (v4.0):**
```
/chatbot → Chat list/router (shows all user's chats)
/chatbot/[chat_id] → Individual chat interface
```

**Migration Action:**
- Old bookmarks to `/chatbot` will now show chat list instead of chat interface
- Users must select or create a chat to start messaging
- Chat IDs are now required in URL for individual chats

### 2. API Request Format

**Before (v3.1):**
```json
POST /search/rag-stream
{
  "query": "Patient symptoms",
  "patient_id": "uuid-optional",
  "top_k": 5
}
```

**After (v4.0):**
```json
POST /search/rag-stream
{
  "query": "Patient symptoms",
  "chat_id": "uuid-required",  // NEW: Required chat context
  "patient_id": "uuid-optional",
  "top_k": 5
}
```

**Migration Action:**
- Always include `chat_id` in RAG requests
- Frontend automatically manages chat_id from URL
- Backend maintains query counter per chat

### 3. Streaming Response Events

**Before (v3.1):**
```json
{"type": "metadata", "citations": [...]}
{"type": "token", "token": "The"}
{"type": "completion", "answer": "...", "confidence": 0.8}
```

**After (v4.0):**
```json
{"type": "ambiguity", "matches": [...], "please_select": true}
{"type": "metadata", "citations": [...], "chat_status": {...}, "patient_context": {...}}
{"type": "token", "token": "The"}
{"type": "chat_full", "query_count": 10, "query_limit": 10}
{"type": "completion", "answer": "...", "confidence": 0.8, "chat_status": {...}}
```

**Migration Action:**
- Frontend must handle new `ambiguity` event type
- Use `chat_full` event to show "chat full" modal
- All completion events now include `chat_status`

---

## Installation & Setup

### 1. Backend Setup

```bash
# Install new dependency
pip install spacy==3.7.2

# Download spaCy model
python -m spacy download en_core_web_sm

# Apply database migrations
# In Supabase SQL Editor, execute:
# - 006_create_chat_tables.sql (creates chats, chat_messages, chat_sessions tables)

# Verify Redis is running (required for session context)
redis-cli ping
# Output: PONG
```

### 2. Frontend Setup

```bash
# No new npm dependencies required
# Existing packages support v4.0

# Just rebuild
npm install
npm run build
```

### 3. Environment Variables

**New Backend Variables:** None required (all existing v3.1 vars still work)

**New Frontend Variables:** None required

**Verify Existing:**
- `GEMINI_API_KEY` - For query embeddings
- `GROQ_API_KEY` - For LLM generation
- `REDIS_URL` - For session caching (NEW in v4.0, critical)
- `SUPABASE_URL`, `SUPABASE_KEY` - Database

---

## Feature Migration

### Feature 1: Multi-Chat System

**v3.1:** Single conversation kept in memory
```typescript
// Always same chat
const response = await api.post('/search/rag-stream', { query })
```

**v4.0:** Multiple chats, each with separate history
```typescript
// Per chat_id
const chatId = 'abc-123'
const response = await api.post('/search/rag-stream', {
  query,
  chat_id: chatId
})
// Each chat has separate message history and query counter
```

**Migration Steps:**
1. Users must create a new chat to start (click "New Chat")
2. Each chat maintains its own conversation history
3. Query counter visible in UI (0/10 to 10/10)
4. When full, prompt to create new chat

### Feature 2: Patient Disambiguation

**v3.1:** Optional patient selection
```typescript
// Patient ID optional
const response = await api.post('/search/rag-stream', {
  query: "Check on John",  // Might refer to multiple patients
  patient_id: optional_uuid  // User guesses
})
```

**v4.0:** Intelligent patient extraction + disambiguation
```typescript
// System automatically extracts patient from query
// If ambiguous, asks user to select
POST /search/rag-stream -> ambiguity event with matches
User selects: John Smith (confidence: 0.92)
Pipeline continues with selected patient
```

**Migration Steps:**
1. No code changes needed - backend handles automatically
2. Frontend displays disambiguation modal when needed
3. Confidence threshold: >0.85 auto-select, <0.7 requires user choice
4. Selected patient remembered in session context

### Feature 3: Session Context

**v3.1:** No pronoun resolution
```
User: "What's his medication?"
System: "Whose medication? Please specify."
```

**v4.0:** Session-scoped pronoun resolution
```
Chat History:
User: "Tell me about John's condition"
System: Identifies John as patient, stores in session
User: "What's his medication?"
System: "his" = John (from session context)
Returns John's medication
```

**Migration Steps:**
1. No frontend code changes - automatic
2. Session context maintained in Redis (7-day TTL)
3. Per-chat isolation (each chat has own context)
4. Cleared when chat is deleted

---

## Database Schema Changes

### New Tables

```sql
-- Chats: User's conversations
CREATE TABLE chats (
  id UUID PRIMARY KEY,
  user_id UUID,
  title VARCHAR,
  created_at TIMESTAMP
);

-- Chat Messages: Individual messages in a chat
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY,
  chat_id UUID,
  role VARCHAR,  -- 'user' or 'assistant'
  content TEXT,
  created_at TIMESTAMP
);

-- Chat Sessions: Server-side context per chat
CREATE TABLE chat_sessions (
  chat_id UUID PRIMARY KEY,
  user_id UUID,
  query_count INT,  -- 0-10
  is_full BOOLEAN,
  referenced_patient_ids UUID[],
  created_at TIMESTAMP
);
```

### Existing Tables (Unchanged)
- `notes`, `note_embeddings` - Medical records (unchanged)
- `rag_queries_audit` - Audit log (unchanged)
- `auth.users` - User accounts (unchanged)

---

## API Endpoint Changes

### New Endpoints

```http
POST /chats/
  Create new chat
  Returns: { id, title, created_at }

GET /chats/
  List user's chats
  Returns: { id, title, query_count, message_count }[]

GET /chats/{chat_id}
  Get chat details
  Returns: { id, title, messages, query_count, is_full }

DELETE /chats/{chat_id}
  Delete/archive chat
  Returns: { status: "deleted" }

POST /chats/{chat_id}/messages
  Add message to chat
  Returns: { id, role, content, created_at }
```

### Updated Endpoints

```http
POST /search/rag-stream
  # Now requires chat_id
  Request: { query, chat_id, patient_id?, top_k? }
  Response: NDJSON with new event types (ambiguity, chat_full)
```

### Deprecated Endpoints (Still Work in v4.0)
- `POST /search/rag` - Non-streaming endpoint
- `POST /search/semantic` - Old search endpoint

---

## Testing & Validation

### 1. Backend Tests

```bash
# Run all tests
cd backend
pytest tests/ -v

# Expected Results:
# Unit Tests: 36/36 PASSING
#   - test_patient_lookup.py: 24 tests
#   - test_session_context.py: 12 tests
# Integration Tests: 6/6 PASSING
#   - test_chat_routes.py: 3 tests
#   - test_rag_v4_pipeline.py: 3 tests
```

### 2. Frontend Tests

```bash
# Build (type checking)
npm run build

# Expected:
# ✓ Compiled successfully
# ✓ All 16 routes generated
# ✓ No TypeScript errors
```

### 3. Manual Testing Checklist

- [ ] Create new chat
- [ ] Send query to empty chat
- [ ] See patient disambiguation modal (if query is ambiguous)
- [ ] See query counter (0/10)
- [ ] Send 10 queries (should show "Chat Full" on 10th)
- [ ] List chats on /chatbot route
- [ ] Switch between chats
- [ ] Delete a chat
- [ ] Create new chat after full chat
- [ ] Check pronouns resolve correctly in chat

---

## Performance Expectations

| Metric | v3.1 | v4.0 | Notes |
|--------|------|------|-------|
| First Query | 2000ms | 2100ms | +100ms for patient extraction |
| Subsequent Query | 1900ms | 1950ms | Slight overhead for session management |
| Chat Switch | N/A | 150ms | Loading messages + context |
| Session Load | N/A | 50ms | Redis cache hit |
| Build Time | 9s | 8.3s | Improved bundling |
| Frontend Bundle | 450KB | 480KB | +30KB new components |

---

## Rollback Instructions

If you need to revert to v3.1:

```bash
# Git
git checkout v3.1-stable

# Database (WARNING: Destructive)
# Drop new tables:
DROP TABLE chat_sessions CASCADE;
DROP TABLE chat_messages CASCADE;
DROP TABLE chats CASCADE;

# Remove spaCy dependency
pip uninstall spacy

# Frontend
npm install

# Restart services
```

---

## Upgrade Troubleshooting

### Issue: "spacy module not found"
```
Solution:
pip install spacy==3.7.2
python -m spacy download en_core_web_sm
```

### Issue: "chat_id not found in request"
```
Solution:
All RAG requests now require chat_id parameter
Frontend automatically includes it from URL
Check: POST body includes "chat_id": "<uuid>"
```

### Issue: "No matching patients found"
```
Solution:
Check that user's patients are in database
Run: SELECT * FROM note_embeddings WHERE user_id = '<user_uuid>'
Verify patient names match query text
```

### Issue: "Build fails with ChatbotPage prop error"
```
Solution:
Ensure ChatbotPage accepts initialChatId prop:
export function ChatbotPage({ initialChatId }: ChatbotPageProps) { }
```

---

## Support & Documentation

- **Architecture:** See `CHATBOT_ARCHITECTURE.md`
- **RAG Design:** See `RAG_DESIGN.md`
- **Implementation Details:** See `CLAUDE.md` (section: Features & Implementation)
- **Backend Guide:** See `backend/IMPLEMENTATION_SUMMARY.md`

---

## Version Compatibility

- **v4.0 Requires:** Node.js 18+, Python 3.10+, PostgreSQL 14+
- **Database:** PostgreSQL (Supabase)
- **Cache:** Redis 6.0+
- **LLM:** Groq API (mixtral-8x7b-32768)
- **Embeddings:** Gemini API (text-embedding-004)

---

## Next Steps (v5.0 Roadmap)

- Collaborative chats (multiple users per chat)
- Advanced analytics dashboard
- Custom prompt templates
- Integration with EHR systems (HL7/FHIR)
- Mobile app (React Native)

---

**Document Last Updated:** April 19, 2026  
**Created By:** HealthSync Development Team  
**Status:** Final
