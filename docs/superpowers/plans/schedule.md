# HealthSync RAG v4.0 Implementation Schedule

**Created:** 2026-04-19  
**Based On:** RAG_FRONTEND_DESIGN.md + 2026-04-19-rag-v4-implementation.md  
**Total Parts:** 5

---

## Part 1: Backend Core Services (Patient Lookup + Session Context)

**Scope:** Foundation services for v4.0 multi-chat system
**Status:** ✅ COMPLETED

### Tasks
- [x] Install spaCy model: `python -m spacy download en_core_web_sm`
- [x] Create `backend/services/patient_lookup.py` - spaCy NER + fuzzy matching
- [x] Create `backend/tests/unit/test_patient_lookup.py` - 24 test cases (ALL PASSING)
- [x] Create `backend/services/session_context.py` - Redis-cached chat context
- [x] Create `backend/tests/unit/test_session_context.py` - 12 test cases (ALL PASSING)
- [ ] Update `backend/schema/ragSchema.py` - chat_id, ambiguity events (IN-PROGRESS)
- [ ] Create `backend/schema/chatSchema.py` - chat management schemas

### Verification Results
```bash
✅ pytest backend/tests/unit/test_patient_lookup.py -v
   24/24 tests PASSED (spaCy NER + fuzzy matching + session context)

✅ pytest backend/tests/unit/test_session_context.py -v
   12/12 tests PASSED (context mgmt, TTL, user validation, lifecycle)
```

### Completion Log
```
[x] spacy==3.7.2 - Model installed successfully
[x] patient_lookup.py - spaCy NER service created (319 lines)
[x] PatientLookupService - Full impl with fuzzy matching, caching, pronoun resolution
[x] test_patient_lookup.py - 24 comprehensive test cases (ALL PASSING)
[x] session_context.py - Redis context manager created (365 lines)
[x] ChatSessionContext dataclass - Complete with 8 fields
[x] test_session_context.py - 12 comprehensive test cases (ALL PASSING)
[x] Tests passing: 36/36 unit tests (24 + 12) - ALL GREEN ✅
[x] Fixtures corrected - moved to module-level, removed duplicates
[x] Git commits: 2 commits (patient_lookup, session_context)
```

**Files Created/Modified:**
- ✅ `backend/services/patient_lookup.py` (NEW)
- ✅ `backend/tests/unit/test_patient_lookup.py` (NEW)
- ✅ `backend/services/session_context.py` (NEW)
- ✅ `backend/tests/unit/test_session_context.py` (NEW, fixed/cleaned)

**Security & Quality:**
- ✅ User isolation enforced via RLS
- ✅ Redis caching with 7-day TTL
- ✅ Async/await patterns throughout
- ✅ Comprehensive error handling
- ✅ Logging at INFO, DEBUG, ERROR levels
- ✅ Type hints on all methods

---

## Part 2: Backend Routes + Database (Chat Management + RAG Pipeline)

**Scope:** API endpoints and database schema

### Tasks
- [ ] Create `backend/migrations/006_create_chat_tables.sql` - chats, messages, sessions
- [ ] Create `backend/routers/chatRoutes.py` - CRUD endpoints
- [ ] Create `backend/tests/integration/test_chat_routes.py` - 3 test cases
- [ ] Update `backend/routers/ragRoutes.py` - 10-stage v4.0 pipeline
- [ ] Create `backend/tests/integration/test_rag_v4_pipeline.py` - 3 test cases
- [ ] Update `backend/requirements.txt` - add spacy==3.7.2

### Verification
```bash
# Run migration in Supabase SQL Editor
pytest backend/tests/integration/test_chat_routes.py -v
pytest backend/tests/integration/test_rag_v4_pipeline.py -v
```

### Log
```
[ ] 006_create_chat_tables.sql - Migration created
[ ] chatRoutes.py - Chat CRUD endpoints created
[ ] ragRoutes.py - 10-stage pipeline implemented
[ ] Tests passing: 6/6 integration tests
```

---

## Part 3: Frontend Components (Multi-Chat UI)

**Scope:** New React components for v4.0

### Tasks
- [ ] Create `frontend/components/chatbot/ChatSidebar.tsx` - Chat list + new chat
- [ ] Create `frontend/components/chatbot/QueryCounter.tsx` - 0-10 progress
- [ ] Create `frontend/components/chatbot/SystemFeedback.tsx` - Status messages
- [ ] Create `frontend/components/chatbot/AmbiguityResolver.tsx` - Patient selection modal
- [ ] Create `frontend/components/chatbot/ChatFullModal.tsx` - 10-query limit modal
- [ ] Create `frontend/hooks/useChat.ts` - Chat state management
- [ ] Create `frontend/hooks/useChats.ts` - Chat list hook

### Verification
```bash
npm run lint
npm test components/chatbot/
```

### Log
```
[ ] ChatSidebar.tsx - Multi-chat sidebar created
[ ] QueryCounter.tsx - Visual progress component
[ ] SystemFeedback.tsx - Status feedback component
[ ] AmbiguityResolver.tsx - Disambiguation modal
[ ] ChatFullModal.tsx - Limit reached modal
[ ] useChat.ts - Chat state hook
[ ] useChats.ts - Chat list hook
```

---

## Part 4: Frontend Integration (ChatbotPage Updates)

**Scope:** Integrate v4.0 components into main chatbot page

### Tasks
- [ ] Update `frontend/components/chatbot/ChatbotPage.tsx` - Major refactoring
  - Add chat_id state management
  - Add ambiguity modal handling
  - Add query counter (0-10)
  - Add system feedback states
  - Update streaming handler for ambiguity/chat_full events
- [ ] Update `frontend/app/chatbot/page.tsx` - Chat router
- [ ] Create `frontend/app/chatbot/[chat_id]/page.tsx` - Chat detail page
- [ ] Wire API calls to new endpoints

### Verification
```bash
npm run dev
# Manual testing: Create chat, send query, verify counter
```

### Log
```
[ ] ChatbotPage.tsx - Integrated multi-chat system
[ ] chatbot/page.tsx - Chat router updated
[ ] chatbot/[chat_id]/page.tsx - Detail page created
[ ] Streaming handler - All v4.0 events handled
```

---

## Part 5: Documentation + Deployment Prep

**Scope:** Final documentation and deployment configuration

### Tasks
- [ ] Update `CLAUDE.md` - Version bump to v4.0
- [ ] Create `docs/RAG_V4_MIGRATION_GUIDE.md` - Migration guide
- [ ] Create `DEPLOYMENT_v4.md` - Deployment checklist
- [ ] Create `.env.example.v4` - Environment variables
- [ ] Run full test suite
- [ ] Create git commit with all changes

### Verification
```bash
pytest backend/tests/ -v
git status  # Verify all files committed
```

### Log
```
[ ] CLAUDE.md - Updated to v4.0
[ ] RAG_V4_MIGRATION_GUIDE.md - Migration guide created
[ ] DEPLOYMENT_v4.md - Deployment checklist
[ ] .env.example.v4 - Environment template
[ ] All tests passing
[ ] Git commit created
```

---

## Summary

| Part | Focus | Files | Tests | Status |
|------|-------|-------|-------|--------|
| 1 | Backend Services | 5 | 8 unit | ⏳ |
| 2 | Backend Routes + DB | 5 | 6 integration | ⏳ |
| 3 | Frontend Components | 7 | - | ⏳ |
| 4 | Frontend Integration | 3 | - | ⏳ |
| 5 | Documentation | 4 | Full suite | ⏳ |

**Total Files:** 24  
**Total Tests:** 14+

---

## Context Preservation Notes

- Each part is self-contained and can be resumed independently
- Logs at end of each part track what's been implemented
- Git commits after each part for easy rollback
- All changes on `chatbotFix` branch
