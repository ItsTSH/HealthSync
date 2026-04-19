# HealthSync ChatBot Architecture & Developer Guide

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  /chatbot                                ChatbotPage.tsx          │
│  ├─ Chat UI Component                                            │
│  ├─ Message Display (streaming tokens)                           │
│  ├─ Citation Display                                             │
│  └─ Error Handling & Retry Logic                                 │
│                                                                   │
│  Error Handling (errorHandling.ts)                               │
│  ├─ ErrorType enum                                               │
│  ├─ Error detection & categorization                             │
│  └─ Retry logic                                                  │
│                                                                   │
│  Sidebar Integration (app-sidebar.tsx)                           │
│  ├─ Chatbot navigation                                           │
│  └─ Recent Chats (localStorage)                                  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
           ▼ HTTPS/WebSocket
           │ NDJSON streaming
           │ JWT authentication
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Backend (FastAPI)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  POST /search/rag-stream                  ragRoutes.py            │
│  ├─ Authentication & Rate Limiting                               │
│  ├─ Input Validation                                             │
│  ├─ Query Embedding (Gemini)              embed_single()         │
│  ├─ Document Retrieval (pgvector)         retrieve_chunks()      │
│  ├─ Reranking (cross-encoder)             rerank_chunks()        │
│  └─ Token Streaming (Groq)                stream_response()      │
│                                                                   │
│  LLM Service (llm.py)                                            │
│  ├─ generate_response()  [synchronous]                           │
│  └─ stream_response()    [streaming generator]                   │
│      ├─ Metadata event   → citations, retrieval_count            │
│      ├─ Token events     → individual tokens                     │
│      ├─ Completion event → full answer, confidence              │
│      └─ Error event      → error handling                        │
│                                                                   │
│  Exception Handling (exceptions.py)                              │
│  ├─ ValidationError                                              │
│  ├─ EmbeddingError                                               │
│  ├─ RetrievalError                                               │
│  ├─ RerankingError                                               │
│  ├─ LLMError                                                     │
│  └─ AuthorizationError                                           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: Request to Response

```
1. USER SENDS QUERY
   Input: { query, patient_id, top_k }
   ↓
2. FRONTEND VALIDATION
   ✓ Patient selected?
   ✓ Query 3-1000 chars?
   ↓
3. SEND REQUEST
   POST /search/rag-stream
   Headers: Authorization: Bearer {JWT}
   Body: {query, patient_id, top_k}
   ↓
4. BACKEND PIPELINE
   
   Stage 1: Validate Input
   └─ Check query length, patient access
   
   Stage 2: Embed Query (Gemini API)
   └─ Convert text → 768-dim vector
   
   Stage 3: Retrieve Chunks (pgvector)
   └─ Find top-50 relevant chunks
   └─ Apply temporal weighting
   
   Stage 4: Rerank (Cross-encoder)
   └─ Score 50 chunks → select top-5
   
   Stage 5: Stream LLM Response (Groq)
   ├─ Send metadata event (citations)
   ├─ Stream tokens in real-time
   ├─ Send completion event
   └─ Cleanup
   
5. FRONTEND RECEIVES STREAM
   ├─ metadata event → Save citations
   ├─ token events → Accumulate text
   ├─ completion → Finalize response
   └─ error event → Show error + retry
   
6. DISPLAY IN CHAT
   ├─ Render streaming tokens
   ├─ Show citations below
   ├─ Display confidence score
   └─ Save to recent chats
```

## Streaming Protocol (NDJSON)

Each line is a JSON object followed by newline (`\n`):

```json
{"type": "metadata", "citations": [...], "retrieval_count": 5}
{"type": "token", "token": "The"}
{"type": "token", "token": " patient"}
{"type": "token", "token": " has"}
...
{"type": "completion", "answer": "...", "confidence": 0.95, "tokens_used": 156, "processing_time_ms": 1234}
```

Error example:
```json
{"type": "error", "error": "EmbeddingError", "message": "Failed to generate query embedding"}
```

## Key Components

### Frontend: ChatbotPage Component

**Props/Context:**
- `session` (useAuth) - JWT token
- `selectedPatient` (usePatient) - Current patient context

**State:**
```typescript
messages: Message[]              // Chat history
inputValue: string               // User input
isLoading: boolean               // API request in progress
currentStreamAnswer: string      // Accumulating response text
currentCitations: Citation[]     // Metadata from server
currentConfidence: number        // Response confidence (0-1)
error: string | null             // Error message to display
canRetry: boolean                // Can retry this request
retryCount: number               // Number of retries attempted
lastFailedMessage: string | null // Last message that failed
```

**Key Methods:**
```typescript
handleSendMessage(text, retryCount)  // Send query, with retry logic
handleRetry()                         // Manual retry button
saveRecentChat(query, response)       // Save to localStorage
```

### Backend: Streaming Endpoint

**Endpoint:**
```
POST /search/rag-stream
```

**Authentication:**
- Required: JWT Bearer token
- Checked: User has access to patient

**Rate Limiting:**
- 30 requests/minute per user

**Request Body:**
```python
{
    "query": str,           # 3-1000 characters
    "patient_id": str,      # UUID of patient
    "top_k": int,           # 1-10, default 5
    "section_filter": str   # Optional: filter by section
}
```

**Response:**
- Content-Type: `application/x-ndjson`
- Transfer-Encoding: `chunked`
- Streaming: True

### LLM Streaming Service

**sync Method:**
```python
async def generate_response(
    query: str,
    context_chunks: List[Dict],
    patient_info: Dict
) -> LLMResponse
```

**async streaming Method:**
```python
async def stream_response(
    query: str,
    context_chunks: List[Dict],
    patient_info: Dict
) -> AsyncGenerator[str, None]:
    # Yields NDJSON events one per line
    yield json.dumps({"type": "metadata", ...}) + "\n"
    yield json.dumps({"type": "token", ...}) + "\n"
    # ... more tokens ...
    yield json.dumps({"type": "completion", ...}) + "\n"
```

## Error Handling Strategy

### Frontend Error Types

```typescript
ErrorType.VALIDATION_ERROR    // 400 (invalid input)
ErrorType.NETWORK_ERROR       // Connection issues
ErrorType.TIMEOUT_ERROR       // 60s timeout exceeded
ErrorType.EMBEDDING_ERROR     // 500+ (embedding failed)
ErrorType.RETRIEVAL_ERROR     // 500+ (retrieval failed)
ErrorType.RERANKING_ERROR     // 500+ (reranking failed)
ErrorType.LLM_ERROR           // 500+ (LLM failed)
ErrorType.AUTH_ERROR          // 401 (auth failed)
ErrorType.PERMISSION_ERROR    // 403 (no access)
ErrorType.NOT_FOUND_ERROR     // 404 (no results)
ErrorType.UNKNOWN_ERROR       // Any other error
```

### Backend Exception Hierarchy

```
RAGException (base)
├─ ValidationError (400)
├─ EmbeddingError (500)
├─ RetrievalError (500)
├─ RerankingError (500)
├─ LLMError (500)
├─ AuthorizationError (403)
└─ NotFoundError (404)
```

### Retry Logic

**Retryable Errors:**
- NETWORK_ERROR
- TIMEOUT_ERROR
- Transient server errors (500+)

**Non-Retryable Errors:**
- VALIDATION_ERROR
- AUTH_ERROR
- PERMISSION_ERROR

**Retry Mechanism:**
1. First attempt: Show loading
2. Auto-retry (1x) on transient error
3. User can click "Retry" for manual retry
4. Max 2 total attempts

## LocalStorage Structure

### Recent Chats
```javascript
// Key: "recent_chats"
// Value: JSON array of RecentChat objects

[
    {
        id: "chat-1713456789",
        title: "What are the patient diagnoses?...",
        query: "What are the patient diagnoses? I need to...",
        patientId: "uuid-123",
        patientName: "John Doe",
        timestamp: "2024-04-18T10:15:00Z"
    },
    // ... up to 10 chats
]
```

## Performance Metrics

### Expected Latencies

```
Backend:
  Query embedding:     100-200ms   (Gemini API)
  Document retrieval:  200-400ms   (pgvector)
  Reranking:          100-150ms   (cross-encoder)
  LLM first token:    400-600ms   (Groq streaming)
  Remaining tokens:    50-100ms/token

Frontend:
  Message render:      <50ms
  Token display:       <5ms per token
  Auto-scroll:         <100ms
  LocalStorage write:  <10ms
```

### Throughput

```
Max Concurrent Requests: 100 (Supabase free tier)
Rate Limit: 30 req/min per user
Average Response Time: 800ms-2s
Tokens/Second: 5-20 tokens/sec (depending on Groq speed)
```

## Testing Approach

### Unit Tests (TODO)
- [ ] Error type detection
- [ ] NDJSON parsing
- [ ] Citation extraction
- [ ] Retry logic

### Integration Tests (TODO)
- [ ] End-to-end streaming
- [ ] Error scenarios
- [ ] Auth flow
- [ ] Rate limiting

### Manual Testing
- See CHATBOT_TESTING_GUIDE.md

## Extending the System

### Adding New Error Types

1. **Backend:**
   ```python
   # in core/exceptions.py
   class MyNewError(RAGException):
       def __init__(self, message: str):
           super().__init__(
               message,
               error_code="MY_ERROR",
               status_code=500,
           )
   ```

2. **Frontend:**
   ```typescript
   // in lib/errorHandling.ts
   ErrorType.MY_ERROR = "MY_ERROR"
   errorMessages[ErrorType.MY_ERROR] = "User-friendly message"
   ```

### Adding New Events in Stream

1. **Backend (llm.py):**
   ```python
   yield json.dumps({
       "type": "my_event",
       "data": "..."
   }) + "\n"
   ```

2. **Frontend (ChatbotPage.tsx):**
   ```typescript
   switch (event.type) {
       case "my_event":
           // Handle new event
           break
   }
   ```

### Modifying RAG Pipeline

Pipeline stages can be modified in `ragRoutes.py`:

```python
# STAGE 3: Retrieve chunks
# Modify retrieve_chunks() parameters

# STAGE 4: Rerank chunks
# Modify rerank_chunks() parameters

# STAGE 5: Stream LLM response
# Modify LLM prompt in llm.py
```

## Troubleshooting Guide

### Symptoms & Solutions

| Symptom | Likely Cause | Solution |
|---------|-------------|----------|
| No tokens appear | Backend not streaming | Check `/search/rag-stream` endpoint |
| Tokens appear slowly | Network throttling | Disable browser throttling |
| No citations | Metadata event not sent | Check backend stream_response() |
| Error: "No patient selected" | Patient context missing | Select patient before chat |
| Error: "Timeout" | Frontend 60s timeout | Check backend latency |
| Error: "Network error" | Connection dropped | Check backend/frontend connection |
| Tokens but no completion | Streaming ended early | Check for exceptions in backend |
| High latency | Slow embedding/retrieval | Monitor Gemini & QdrantDB latency |

## Code Locations Reference

| Component | File | Lines |
|-----------|------|-------|
| ChatBot Page | `frontend/components/chatbot/ChatbotPage.tsx` | Full file |
| Streaming Endpoint | `backend/routers/ragRoutes.py` | ~400-550 |
| LLM Streaming | `backend/services/llm.py` | ~140-210 |
| Error Handling | `frontend/lib/errorHandling.ts` | Full file |
| Sidebar Update | `frontend/components/app-sidebar.tsx` | ~70, ~220+ |
| Exception Classes | `backend/core/exceptions.py` | Full file |

## Future Enhancements

### Phase 2 (Optional)
- [ ] Persistent chat history (database)
- [ ] Export conversations (PDF)
- [ ] Conversation search
- [ ] Follow-up refinement
- [ ] Voice input
- [ ] Response regeneration
- [ ] Feedback mechanism
- [ ] Usage analytics

### Phase 3 (Nice to Have)
- [ ] Multi-turn conversations
- [ ] Context continuation
- [ ] Conversation sharing
- [ ] Team collaboration
- [ ] Custom RAG parameters per user

## Security Considerations

✅ **Implemented:**
- JWT authentication on streaming endpoint
- Rate limiting (30 req/min per user)
- Patient access control (RLS)
- Input validation
- Proper error messages (no internal details leaked)

⚠️ **To Consider:**
- IP whitelisting for RAG services
- Audit logging for sensitive queries
- Encryption of streaming data
- CORS policy review

## Monitoring & Observability

### Logs to Monitor

**Backend:**
```
INFO: "Stage 2: Embedding query..."
INFO: "Retrieved {N} chunks"
INFO: "Reranked to {N} chunks"
WARNING: "No chunks retrieved"
ERROR: "Failed to initialize Groq"
```

**Frontend:**
```
console.log("Chat error:", err)
console.warn("Failed to parse JSON:", line)
```

### Metrics to Track

- Response time (metadata to completion)
- Token throughput (tokens/second)
- Error rate by type
- Retry rate
- Cache hit rate (if caching added)

---

**Last Updated:** April 2026
**Implemented By:** AI Assistant
**Status:** ✅ Complete and Ready for Testing
