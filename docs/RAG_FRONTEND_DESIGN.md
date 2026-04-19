# HealthSync RAG Chatbot Design Specification v4.0

**Status:** Design Specification (Ready for Implementation) - v4.0+  
**Date:** 2026-04-19 (Updated: v4.0+ Multi-Chat System)  
**Author:** AI Assistant  
**Review:** Approved by User  

---

## Executive Summary

Transform the HealthSync chatbot into a multi-chat, context-aware medical assistant with advanced patient detection (spaCy NER), intelligent disambiguation, controlled retrieval guardrails, and conversation-scoped session memory.

### Key Changes (v4.0+)
- **Replace** regex-based patient extraction with spaCy NER + fuzzy matching
- **Add** multi-chat system (ChatGPT-style) with 10-query limits per chat
- **Implement** session context memory (per chat) for pronoun resolution
- **Add** patient disambiguation UX (confidence-based, user-selected when ambiguous)
- **Enforce** strict retrieval guardrails (explicit patient_ids filtering)
- **Add** confidence-aware behavior (high/medium/low UI feedback)
- **Cache** user patient lists (avoid DB fetch per query)
- **Maintain** NDJSON streaming, PII masking, JWT auth, RLS security

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Backend Implementation](#backend-implementation)
3. [Frontend Implementation](#frontend-implementation)
4. [Security & Authentication](#security--authentication)
5. [API Contracts](#api-contracts)
6. [Component Specifications](#component-specifications)
7. [Implementation Phases](#implementation-phases)
8. [Testing Strategy](#testing-strategy)

---

## Implementation Constraints

**CRITICAL GUARDRAILS** — Must be enforced throughout implementation:

### 1. Reuse Existing Stream Event Structure
- **Rule:** Extend NDJSON format without renaming or removing existing keys
- **Implementation:**
  - Add new fields to existing events (e.g., `chat_status`, `patient_context` to metadata)
  - Create new event types (ambiguity, chat_full) that don't conflict
  - Backward compatible: old clients can safely ignore new fields
  - **Example — Metadata Event:**
    ```json
    {
      "type": "metadata",
      "citations": [...],        // Existing
      "retrieval_count": 5,       // Existing
      "chat_status": {...},       // NEW: don't remove old fields
      "patient_context": {...}    // NEW: extends structure
    }
    ```

### 2. Maintain Backward Compatibility with API Contracts
- **Rule:** Existing API clients must continue working without modification
- **Implementation:**
  - `chat_id` field: Optional in request (v4.0 sends it, v3.1 clients may omit)
  - Graceful fallback: Create anonymous/default chat if chat_id missing
  - All existing `/search/rag-stream` parameters still accepted
  - No field renames or deletions in core schemas
  - **Example — Request Handling:**
    ```python
    # v4.0 client
    POST /search/rag-stream { chat_id: "uuid", query: "..." }
    
    # v3.1 client (still works)
    POST /search/rag-stream { query: "..." }
    # Backend creates temporary chat_id automatically
    ```

### 3. Backend Session Context = Single Source of Truth
- **Rule:** Frontend reads session state from backend; never overrides
- **Implementation:**
  - Frontend syncs state exclusively from stream response (metadata event)
  - Backend maintains authoritative session in Supabase + Redis
  - No optimistic UI updates that conflict with server state
  - After each query: Frontend receives updated context in completion event
  - Conflict resolution: Always trust backend state
  - **Example — State Flow:**
    ```
    Backend: Session(patient_ids=[], query_count=5) → Stream
    Frontend receives: metadata{chat_status: {query_count: 5}} 
    Frontend updates: Local state = Backend state (never override)
    ```

### 4. Explicit Clarification Over Auto-Inference
- **Rule:** When confidence is low or ambiguity exists, ask user instead of guessing
- **Implementation:**
  - Confidence < 0.85: Don't auto-select, show disambiguation modal
  - Multiple similar patient matches: Pause stream, wait for user selection
  - Ambiguous pronouns ("his", "her"): Ask which patient, don't assume from history
  - Never guess; always prefer explicit user input
  - **Thresholds:**
    - ≥ 0.95: Exact match (proceed)
    - 0.85–0.95: High confidence (auto-select)
    - 0.70–0.85: Medium confidence (ask user via modal)
    - < 0.70: Reject (not enough confidence)
  - **Example — Decision Tree:**
    ```
    Match 1: "John Smith" (confidence: 0.92) ✓ Auto-select
    Match 1: "John Smith" (0.78) + Match 2: "Jon Smith" (0.75)
      → Multiple similar → Show modal
    Match 1: "John Smith" (0.65) 
      → Below threshold → Reject, ask for clarification
    ```

---

### Follow this implementation order strictly:
1. Backend extraction + disambiguation
2. Retrieval filtering updates
3. Session context layer
4. Caching optimization
5. Frontend updates
## System Architecture

### High-Level Data Flow

```
USER QUERY (in Chat): "What was his last BP?"
    ↓
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND: ChatWindow.tsx (Multi-Chat)                           │
│ • Query input + chat context                                    │
│ • POST /search/rag-stream {chat_id, query}                      │
│ • Stream response handler (NDJSON)                              │
│ • Query counter: 3/10 (visual progress)                         │
└─────────────────────────────────────────────────────────────────┘
                      ↓ HTTPS + JWT + chat_id
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND: /search/rag-stream (ragRoutes.py)                      │
├─────────────────────────────────────────────────────────────────┤
│ STAGE 0: Load Session Context (NEW v4.0+)                      │
│   • Load chat session (patient_ids, conversation_summary)      │
│   • Check query counter (0-10)                                  │
│   • Validate user owns chat                                     │
│                                                                   │
│ STAGE 1: Patient Extraction (REFACTORED v4.0+)                 │
│   • spaCy NER: Extract PERSON entities (en_core_web_sm)        │
│   • Fuzzy match against user's cached patient list             │
│   • Combine with session context ("his" → last_patient_ids)     │
│   • Confidence-based ranking (0.0-1.0)                          │
│                                                                   │
│ STAGE 2: Patient Disambiguation (NEW v4.0+)                    │
│   ├─ Single match: Proceed ✓                                    │
│   ├─ Highest confidence >0.85: Auto-select + proceed            │
│   └─ Multiple similar matches: Signal ambiguity, wait for user  │
│                                                                   │
│ STAGE 3: Query Classification (Existing)                        │
│   • QueryClassifier.classify(query)                             │
│   • Type: PATIENT_SPECIFIC, GENERAL, TEMPORAL                  │
│                                                                   │
│ STAGE 4: PII Masking (Existing v3.1)                            │
│   • Mask query patient names                                    │
│   • Generate deterministic tokens                               │
│                                                                   │
│ STAGE 5: Embed Query (Existing)                                 │
│   • Gemini API: query → 768-dim vector                          │
│                                                                   │
│ STAGE 6: Controlled Retrieval (REFACTORED v4.0+)               │
│   • CRITICAL: Explicit patient_ids filtering (never null)       │
│   • pgvector cosine similarity (RLS enforced)                   │
│   • No cross-patient data leakage                               │
│   • Temporal weighting (recency boost)                          │
│                                                                   │
│ STAGE 7: Rerank (Existing)                                      │
│   • Cross-encoder scoring (top-50 → top-5)                     │
│                                                                   │
│ STAGE 8: Stream LLM Response (Existing)                         │
│   • Groq API streaming (Mixtral-8x7b)                           │
│   • NDJSON: metadata → tokens → completion                      │
│                                                                   │
│ STAGE 9: Post-Process (Existing v3.1)                           │
│   • Token restoration (real names in final response)            │
│   • PII leak detection                                          │
│                                                                   │
│ STAGE 10: Query Counter & Context Update (NEW v4.0+)           │
│   • Increment chat query counter                                │
│   • Update session context (referenced patients)                │
│   • Signal if chat is now full (10/10)                          │
│   • Log to rag_queries_audit                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND: Streaming Handler (Enhanced)                          │
│ • ambiguity: Show disambiguation modal, wait for user selection │
│ • metadata: Display patient badge, citations, query count       │
│ • token: Accumulate and display in real-time                    │
│ • completion: Update chat context, check if full (10/10)       │
│ • if_full: Show modal "Start new chat to continue queries"     │
│ • error: Display with retry option                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Backend Implementation

### 1. New Service: Patient Lookup (`services/patient_lookup.py`) - REFACTORED v4.0+

```python
"""
Patient Lookup Service v4.0+ with spaCy NER

Extract patient names using:
1. spaCy Named Entity Recognition (PERSON entities)
2. Token-based matching against user's patient list
3. Fuzzy matching for robustness (typos, partial names)
4. Cached patient list (Redis) to avoid DB fetch per query

Supports:
- Non-Western naming patterns
- Lowercase/mixed-case input
- Partial name matches
- Session context integration (pronoun resolution)

Security:
- User isolation: RLS enforced on patient queries
- Patient enumeration prevention: Rate limiting, audit logging
- Confidence thresholds: >0.85 auto-select, <0.7 requires disambiguation
"""
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass
import spacy
from difflib import SequenceMatcher
import hashlib

from supabase import create_client, Client
from core.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from core.redis import get_redis_client

logger = logging.getLogger(__name__)

# Load spaCy model (en_core_web_sm)
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    logger.warning("spaCy model not found. Install: python -m spacy download en_core_web_sm")
    nlp = None


@dataclass
class PatientMatch:
    """Matched patient from query"""
    name: str
    patient_id: str
    confidence: float  # 0.0-1.0
    match_type: str  # "exact", "fuzzy", "contextual"
    source: str  # "ner_entity", "session_context"
    matched_text: str  # Original text that matched


class PatientLookupService:
    """
    Extract and match patient names from queries.
    
    Matching Strategy:
    1. Use spaCy NER to extract PERSON entities
    2. Fetch user's cached patient list (Redis first, then DB)
    3. Fuzzy match entities against patient names
    4. Combine with session context (pronoun resolution)
    5. Return ranked matches with confidence scores
    6. Return ambiguity signal if multiple similar matches
    """
    
    CONFIDENCE_THRESHOLD = 0.7   # Minimum for consideration
    AUTO_SELECT_THRESHOLD = 0.85  # Auto-select if above this
    EXACT_MATCH_THRESHOLD = 0.95
    PATIENT_LIST_CACHE_TTL = 3600  # 1 hour
    
    def __init__(self):
        """Initialize with Supabase client"""
        self.supabase: Client = create_client(
            SUPABASE_URL, 
            SUPABASE_SERVICE_ROLE_KEY
        )
    
    async def extract_patient_names(
        self, 
        query: str, 
        user_id: str,
        session_context: Optional[Dict] = None
    ) -> 'PatientLookupResult':
        """
        Extract patient names from query using spaCy NER + fuzzy matching.
        Integrates with session context for pronoun resolution.
        
        Args:
            query: User query text
            user_id: Authenticated user ID (for RLS)
            session_context: Optional session state {patient_ids, summary}
        
        Returns:
            PatientLookupResult with status, matches, auto-selection decision
        """
        if not nlp:
            logger.error("spaCy model not loaded")
            return PatientLookupResult(status="error", matches=[])
        
        # Step 1: Fetch cached patient list (Redis first, then DB)
        patients = await self._get_user_patients_cached(user_id)
        if not patients:
            logger.info(f"No patients found for user {user_id}")
            return PatientLookupResult(status="not_found", matches=[])
        
        # Step 2: Extract PERSON entities using spaCy NER
        doc = nlp(query)
        ner_entities = [ent.text for ent in doc.ents if ent.label_ == "PERSON"]
        
        # Step 3: Resolve pronouns using session context
        pronouns_resolved = self._resolve_pronouns(query, session_context)
        candidates = list(set(ner_entities + pronouns_resolved))
        
        if not candidates:
            logger.debug("No PERSON entities or pronouns detected in query")
            return PatientLookupResult(status="not_found", matches=[])
        
        # Step 4: Fuzzy match candidates against patient list
        matches = []
        for candidate in candidates:
            for patient in patients:
                confidence = self._fuzzy_match(candidate, patient['name'])
                
                if confidence >= self.CONFIDENCE_THRESHOLD:
                    match = PatientMatch(
                        name=patient['name'],
                        patient_id=patient['id'],
                        confidence=confidence,
                        match_type="exact" if confidence >= self.EXACT_MATCH_THRESHOLD else "fuzzy",
                        source="ner_entity",
                        matched_text=candidate
                    )
                    matches.append(match)
                    logger.debug(
                        f"Patient match: '{candidate}' → '{patient['name']}' "
                        f"(confidence: {confidence:.2f})"
                    )
                    break
        
        # Deduplicate and sort by confidence
        unique_matches = {}
        for match in matches:
            if match.patient_id not in unique_matches:
                unique_matches[match.patient_id] = match
        
        sorted_matches = sorted(
            unique_matches.values(),
            key=lambda m: m.confidence,
            reverse=True
        )
        
        # Step 5: Determine auto-selection or ambiguity
        if len(sorted_matches) == 0:
            return PatientLookupResult(status="not_found", matches=[])
        elif len(sorted_matches) == 1:
            # Single match: auto-select
            return PatientLookupResult(
                status="single",
                matches=sorted_matches,
                selected_patient_id=sorted_matches[0].patient_id,
                needs_disambiguation=False
            )
        else:
            # Multiple matches: check confidence gap
            top_confidence = sorted_matches[0].confidence
            if top_confidence >= self.AUTO_SELECT_THRESHOLD:
                # High confidence: auto-select top match
                return PatientLookupResult(
                    status="single",
                    matches=sorted_matches,
                    selected_patient_id=sorted_matches[0].patient_id,
                    needs_disambiguation=False
                )
            else:
                # Ambiguous: return all matches, ask user to choose
                logger.info(f"Patient ambiguity detected: {[m.name for m in sorted_matches]}")
                return PatientLookupResult(
                    status="ambiguous",
                    matches=sorted_matches,
                    selected_patient_id=None,
                    needs_disambiguation=True
                )
    
    def _resolve_pronouns(
        self,
        query: str,
        session_context: Optional[Dict]
    ) -> List[str]:
        """
        Resolve pronouns (his, her, their) using session context.
        
        Example: "His symptoms?" + session_context[patient_ids=['uuid-john']] → ['John']
        """
        if not session_context or not session_context.get('patient_ids'):
            return []
        
        pronouns = {'his', 'her', 'their', 'his/her'}
        query_lower = query.lower()
        
        resolved = []
        if any(pronoun in query_lower for pronoun in pronouns):
            # Use last referenced patient(s) from session
            last_patient_ids = session_context.get('patient_ids', [])
            if last_patient_ids:
                logger.debug(f"Resolving pronouns to session patients: {last_patient_ids}")
                # In practice, fetch patient names from DB by IDs
                # For now, return IDs (caller will map to names)
                resolved = last_patient_ids
        
        return resolved
    
    async def _get_user_patients_cached(self, user_id: str) -> List[Dict]:
        """
        Fetch user's patients with Redis caching.
        
        Avoids DB fetch on every query. Cache hit: O(1), miss: RLS-enforced DB query.
        """
        redis = get_redis_client()
        cache_key = f"user_patients:{user_id}"
        
        # Try cache first
        try:
            cached = redis.get(cache_key)
            if cached:
                logger.debug(f"Patient list cache hit for user {user_id}")
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Redis cache miss: {e}")
        
        # Fall back to DB (RLS enforced)
        try:
            response = self.supabase.table('patients')\
                .select('id, name, mrn')\
                .eq('user_id', user_id)\
                .execute()
            
            patients = response.data or []
            
            # Cache for 1 hour
            try:
                redis.setex(
                    cache_key,
                    self.PATIENT_LIST_CACHE_TTL,
                    json.dumps(patients)
                )
            except Exception as e:
                logger.warning(f"Failed to cache patient list: {e}")
            
            logger.debug(f"Fetched {len(patients)} patients for user {user_id}")
            return patients
            
        except Exception as e:
            logger.error(f"Failed to fetch patients: {e}")
            return []
    
    def _extract_ner_entities(self, query: str) -> List[str]:
        """
        Extract PERSON entities using spaCy NER.
        Handles non-Western names, lowercase, and mixed-case input.
        
        Returns list of unique person names found in query.
        """
        if not nlp:
            return []
        
        doc = nlp(query)
        entities = [ent.text for ent in doc.ents if ent.label_ == "PERSON"]
        
        # Remove duplicates
        return list(set(entities))
    
    def _fuzzy_match(self, candidate: str, patient_name: str) -> float:
        """
        Calculate fuzzy match confidence between candidate and patient name.
        
        Uses:
        - Exact match (case-insensitive)
        - SequenceMatcher ratio for partial matches
        - Token-based matching for multi-word names
        """
        # Exact match (case-insensitive)
        if candidate.lower() == patient_name.lower():
            return 1.0
        
        # SequenceMatcher ratio
        ratio = SequenceMatcher(None, candidate.lower(), patient_name.lower()).ratio()
        
        # Token-based matching (for multi-word names)
        candidate_tokens = set(candidate.lower().split())
        patient_tokens = set(patient_name.lower().split())
        
        # Jaccard similarity
        intersection = candidate_tokens & patient_tokens
        union = candidate_tokens | patient_tokens
        jaccard = len(intersection) / len(union) if union else 0.0
        
        # Use best score
        return max(ratio, jaccard)
    
    async def get_patient_by_id(
        self, 
        patient_id: str, 
        user_id: str
    ) -> Optional[Dict]:
        """
        Fetch single patient by ID with user isolation.
        
        Security: Verify patient belongs to user.
        """
        try:
            response = self.supabase.table('patients')\
                .select('id, name, mrn')\
                .eq('id', patient_id)\
                .eq('user_id', user_id)\
                .single()\
                .execute()
            
            return response.data
            
        except Exception as e:
            logger.error(f"Failed to fetch patient {patient_id}: {e}")
            return None


@dataclass
class PatientLookupResult:
    """Result of patient name extraction and matching"""
    status: str  # "single", "ambiguous", "not_found", "error"
    matches: List[PatientMatch]
    selected_patient_id: Optional[str] = None  # Auto-selected if status="single"
    needs_disambiguation: bool = False


# Singleton instance
_patient_lookup_service: Optional[PatientLookupService] = None


def get_patient_lookup_service() -> PatientLookupService:
    """Get or create patient lookup service singleton"""
    global _patient_lookup_service
    if _patient_lookup_service is None:
        _patient_lookup_service = PatientLookupService()
    return _patient_lookup_service
```

---

### 2. New Service: Session Context Manager (`services/session_context.py`)

```python
"""
Chat Session Context Manager v4.0+

Manages conversation-scoped state per chat:
- Referenced patients (for pronoun resolution)
- Conversation summary (for context)
- Query counter (0-10)

State is NOT persisted beyond session scope (compliant with medical privacy).
"""
import logging
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import json

from core.redis import get_redis_client

logger = logging.getLogger(__name__)


@dataclass
class ChatSessionContext:
    """Session context for a single chat"""
    chat_id: str
    user_id: str
    patient_ids: List[str]  # UUIDs of patients referenced in this chat
    conversation_summary: str  # Brief summary for context
    query_count: int  # 0-10
    created_at: str
    last_updated: str
    is_full: bool = False  # True when query_count == 10


class SessionContextManager:
    """Manage chat session context in Redis + Supabase"""
    
    CONTEXT_CACHE_TTL = 86400  # 24 hours (session lifetime)
    QUERY_LIMIT = 10
    SUMMARY_MAX_CHARS = 500
    
    def __init__(self):
        self.redis = get_redis_client()
        self.supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    async def load_context(self, chat_id: str, user_id: str) -> ChatSessionContext:
        """Load session context from Redis or create new"""
        cache_key = f"chat_context:{chat_id}"
        
        # Try Redis first
        try:
            cached = self.redis.get(cache_key)
            if cached:
                logger.debug(f"Session context cache hit for chat {chat_id}")
                data = json.loads(cached)
                return ChatSessionContext(**data)
        except Exception as e:
            logger.warning(f"Failed to load cached context: {e}")
        
        # Load from Supabase if exists, else create new
        try:
            response = self.supabase.table('chat_sessions')\
                .select('*')\
                .eq('chat_id', chat_id)\
                .single()\
                .execute()
            
            if response.data:
                context = ChatSessionContext(**response.data['context'])
                self._cache_context(chat_id, context)
                return context
        except Exception as e:
            logger.debug(f"No existing session context: {e}")
        
        # Create new context
        context = ChatSessionContext(
            chat_id=chat_id,
            user_id=user_id,
            patient_ids=[],
            conversation_summary="",
            query_count=0,
            created_at=datetime.utcnow().isoformat(),
            last_updated=datetime.utcnow().isoformat()
        )
        
        self._cache_context(chat_id, context)
        return context
    
    async def update_context(
        self,
        chat_id: str,
        patient_ids: Optional[List[str]] = None,
        summary_update: Optional[str] = None
    ) -> ChatSessionContext:
        """Update session context after query"""
        context = await self.load_context(chat_id, context.user_id)  # Load current
        
        if patient_ids:
            # Add new patient IDs (avoid duplicates)
            context.patient_ids = list(set(context.patient_ids + patient_ids))
        
        if summary_update:
            # Update summary (truncate if needed)
            context.conversation_summary = (
                context.conversation_summary + " " + summary_update
            )[:self.SUMMARY_MAX_CHARS]
        
        context.last_updated = datetime.utcnow().isoformat()
        
        self._cache_context(chat_id, context)
        return context
    
    async def increment_query_count(self, chat_id: str) -> int:
        """Increment query counter, return new count"""
        context = await self.load_context(chat_id, context.user_id)
        context.query_count += 1
        context.is_full = (context.query_count >= self.QUERY_LIMIT)
        context.last_updated = datetime.utcnow().isoformat()
        
        self._cache_context(chat_id, context)
        
        logger.info(f"Chat {chat_id}: query_count = {context.query_count}/10")
        return context.query_count
    
    def is_chat_full(self, context: ChatSessionContext) -> bool:
        """Check if chat has reached query limit"""
        return context.query_count >= self.QUERY_LIMIT
    
    def _cache_context(self, chat_id: str, context: ChatSessionContext):
        """Cache context in Redis"""
        try:
            cache_key = f"chat_context:{chat_id}"
            self.redis.setex(
                cache_key,
                self.CONTEXT_CACHE_TTL,
                json.dumps(asdict(context))
            )
        except Exception as e:
            logger.warning(f"Failed to cache context: {e}")
```

---

### 3. New Chat Management Routes (`routers/chatRoutes.py`)

```python
"""
Chat Management API v4.0+

Endpoints for multi-chat system:
- Create new chat
- List user's chats
- Get chat details + session context
- Archive/delete chat
"""
from fastapi import APIRouter, Depends, HTTPException
from schema.chatSchema import ChatCreateRequest, ChatResponse, ChatListResponse
from core.auth import get_current_user
from services.session_context import SessionContextManager

router = APIRouter(prefix="/chats", tags=["Chats"])
context_manager = SessionContextManager()


@router.post("/", response_model=ChatResponse)
async def create_chat(
    request: ChatCreateRequest,
    current_user: str = Depends(get_current_user)
):
    """Create new chat session"""
    chat_id = str(uuid.uuid4())
    
    # Store in Supabase
    supabase.table('chats').insert({
        'id': chat_id,
        'user_id': current_user,
        'title': request.title or "New Chat",
        'query_count': 0,
        'created_at': datetime.utcnow().isoformat()
    }).execute()
    
    return ChatResponse(id=chat_id, user_id=current_user, title=request.title)


@router.get("/", response_model=ChatListResponse)
async def list_chats(current_user: str = Depends(get_current_user)):
    """List user's chats (sorted by recency)"""
    response = supabase.table('chats')\
        .select('*')\
        .eq('user_id', current_user)\
        .order('updated_at', desc=True)\
        .execute()
    
    return ChatListResponse(chats=response.data or [])


@router.get("/{chat_id}", response_model=ChatResponse)
async def get_chat(
    chat_id: str,
    current_user: str = Depends(get_current_user)
):
    """Get chat details + session context"""
    response = supabase.table('chats')\
        .select('*')\
        .eq('id', chat_id)\
        .eq('user_id', current_user)\
        .single()\
        .execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Load session context
    context = await context_manager.load_context(chat_id, current_user)
    
    return ChatResponse(**response.data, context=context.asdict())


@router.delete("/{chat_id}")
async def delete_chat(
    chat_id: str,
    current_user: str = Depends(get_current_user)
):
    """Archive/delete chat"""
    # Verify ownership
    response = supabase.table('chats')\
        .select('user_id')\
        .eq('id', chat_id)\
        .single()\
        .execute()
    
    if not response.data or response.data['user_id'] != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Mark as archived
    supabase.table('chats')\
        .update({'is_archived': True})\
        .eq('id', chat_id)\
        .execute()
    
    return {"status": "deleted"}
```

**Database Tables:**
```sql
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title VARCHAR(255) NOT NULL,
  query_count INT DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_chats_user ON chats(user_id, updated_at DESC);
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_chats ON chats
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(20),  -- 'user', 'assistant'
  content TEXT,
  cited_patients UUID[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_chat_messages_chat ON chat_messages(chat_id, created_at DESC);

CREATE TABLE chat_sessions (
  chat_id UUID PRIMARY KEY REFERENCES chats(id) ON DELETE CASCADE,
  context JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### 4. Updated RAG Routes (`routers/ragRoutes.py`)

**Changes to `rag_search_stream` endpoint:**

```python
# Add imports
from services.patient_lookup import get_patient_lookup_service
from services.session_context import SessionContextManager
from schema.ragSchema import RAGQueryRequest

router = APIRouter(prefix="/search", tags=["RAG"])
context_manager = SessionContextManager()

@router.post("/rag-stream")
@limiter.limit(LIMITS.get("search", "30/minute"))
async def rag_search_stream(
    request: Request,
    query_input: RAGQueryRequest = Body(...),
    current_user: str = Depends(get_current_user)
):
    """
    Streaming RAG search with multi-chat support (v4.0+).
    
    New features:
    - chat_id: Required (identifies chat session)
    - Session context: Maintains patient_ids, summary per chat
    - Patient extraction: spaCy NER + fuzzy matching
    - Disambiguation: Returns ambiguity signal if needed
    - Query counter: Increments, signals when chat full (10/10)
    - Strict retrieval: Explicit patient_ids, no null queries
    """
    chat_id = query_input.chat_id
    query_text = query_input.query
    patient_id = query_input.patient_id  # Optional override
    
    logger.info(
        f"RAG stream v4.0+: user={current_user}, chat={chat_id}, "
        f"query_len={len(query_text)}"
    )
    
    async def stream_generator():
        start_time = time.time()
        
        try:
            # === STAGE 0: Load Session Context (NEW v4.0+) ===
            logger.info(f"Loading session context for chat {chat_id}")
            session_context = await context_manager.load_context(chat_id, current_user)
            
            # Check query limit
            if context_manager.is_chat_full(session_context):
                yield json.dumps({
                    "type": "error",
                    "error": "CHAT_FULL",
                    "message": "This chat has reached 10 queries. Start a new chat to continue."
                }) + "\n"
                return
            
            # === STAGE 1: Patient Extraction (REFACTORED v4.0+) ===
            logger.info("Stage 1: Extracting patient names with spaCy NER...")
            patient_lookup = get_patient_lookup_service()
            lookup_result = await patient_lookup.extract_patient_names(
                query=query_text,
                user_id=current_user,
                session_context=session_context.asdict()
            )
            
            # === STAGE 2: Patient Disambiguation (NEW v4.0+) ===
            if lookup_result.needs_disambiguation:
                logger.info(f"Ambiguity detected: {[m.name for m in lookup_result.matches]}")
                
                # Signal ambiguity to frontend, wait for user selection
                yield json.dumps({
                    "type": "ambiguity",
                    "matches": [
                        {
                            "name": m.name,
                            "patient_id": m.patient_id,
                            "confidence": m.confidence,
                            "match_type": m.match_type
                        }
                        for m in lookup_result.matches
                    ],
                    "please_select": True
                }) + "\n"
                return  # Wait for frontend to resend with explicit patient_id
            
            # Single patient selected (auto or explicit)
            selected_patient_id = (
                patient_id or lookup_result.selected_patient_id
            )
            
            # CRITICAL: Strict retrieval guardrail
            if not selected_patient_id:
                # No patient identified - this is a GENERAL query (rare in medical context)
                logger.warning("General query detected (no patient match)")
                # Can choose to:
                # Option A: Reject with error (safest for medical)
                # Option B: Allow general retrieval (not recommended)
                selected_patient_ids = None
            else:
                selected_patient_ids = [selected_patient_id]
                # Update session with referenced patient
                await context_manager.update_context(
                    chat_id=chat_id,
                    patient_ids=[selected_patient_id]
                )
            
            queried_patients = []
            if selected_patient_id and lookup_result.matches:
                # Get details of selected patient
                selected = next(
                    (m for m in lookup_result.matches if m.patient_id == selected_patient_id),
                    None
                )
                if selected:
                    queried_patients = [{
                        "name": selected.name,
                        "patient_id": selected.patient_id,
                        "confidence": selected.confidence,
                        "match_type": selected.match_type
                    }]
            
            # === STAGE 3: Query Classification (Existing) ===
            query_classification = query_classifier.classify(query_text)
            
            # === STAGE 4: PII Masking (Existing) ===
            masked_result = pii_masking_service.mask_query(query_text)
            masked_query_text = masked_result["masked_text"]
            
            # === STAGE 5: Embed Query (Existing) ===
            query_embedding = await embed_single(masked_query_text)
            
            # === STAGE 6: Controlled Retrieval (REFACTORED v4.0+) ===
            # CRITICAL: Pass explicit patient_ids, never null
            if selected_patient_ids:
                retrieved = await retrieve_chunks(
                    embedding=query_embedding,
                    user_id=current_user,
                    patient_ids=selected_patient_ids,  # EXPLICIT filtering
                    top_k=50
                )
            else:
                # General query (edge case) - still filter by user
                retrieved = await retrieve_chunks(
                    embedding=query_embedding,
                    user_id=current_user,
                    patient_ids=[],  # Empty list: retrieve user's data only
                    top_k=50
                )
            
            # === STAGE 7: Rerank (Existing) ===
            reranked = await rerank_chunks(query_text, retrieved, top_k=5)
            
            # === STAGE 8: Stream LLM Response (Existing) ===
            # Yield metadata with enhanced chat status
            metadata_event = {
                "type": "metadata",
                "chat_id": chat_id,
                "chat_status": {
                    "query_count": session_context.query_count,
                    "is_full": False,
                    "query_limit": 10
                },
                "patient_context": {
                    "auto_selected": lookup_result.selected_patient_id is not None,
                    "patient_id": selected_patient_id,
                    "confidence": lookup_result.matches[0].confidence if lookup_result.matches else 0
                },
                "retrieval_count": len(retrieved),
                "reranked_count": len(reranked)
            }
            yield json.dumps(metadata_event) + "\n"
            
            # Stream tokens
            async for token in stream_response(
                query=query_text,
                context_chunks=reranked,
                temperature=0.2
            ):
                if token:
                    yield json.dumps({"type": "token", "token": token}) + "\n"
            
            # === STAGE 9: Post-Process (Existing) ===
            final_answer = await generate_response(
                query=query_text,
                context_chunks=reranked
            )
            
            # === STAGE 10: Query Counter & Context Update (NEW v4.0+) ===
            new_query_count = await context_manager.increment_query_count(chat_id)
            chat_now_full = (new_query_count >= 10)
            
            # Update session summary
            summary_update = f"Query: {query_text[:50]}... Answer: {final_answer[:50]}..."
            await context_manager.update_context(
                chat_id=chat_id,
                summary_update=summary_update
            )
            
            # Confidence calibration
            confidence = await calibrate_confidence(
                query=query_text,
                retrieved_chunks=retrieved,
                llm_response=final_answer
            )
            
            # Yield completion
            completion_event = {
                "type": "completion",
                "answer": final_answer,
                "citations": [
                    {
                        "chunk_id": c.chunk_id,
                        "note_id": c.note_id,
                        "section": c.section,
                        "timestamp": c.timestamp,
                        "score": c.similarity_score
                    }
                    for c in reranked
                ],
                "confidence": confidence,
                "chat_status": {
                    "query_count": new_query_count,
                    "is_full": chat_now_full,
                    "query_limit": 10
                }
            }
            yield json.dumps(completion_event) + "\n"
            
            # If chat is now full, signal to frontend
            if chat_now_full:
                yield json.dumps({
                    "type": "chat_full",
                    "message": "This chat has reached 10 queries. Start a new chat to continue."
                }) + "\n"
            
            # === Audit Logging ===
            await log_rag_query(
                user_id=current_user,
                patient_id=selected_patient_id or "GENERAL",
                query_text=masked_query_text,
                chat_id=chat_id,
                retrieval_data={"count": len(retrieved)},
                queried_patients=queried_patients,
                query_classification=query_classification,
                confidence=confidence
            )
            
        except Exception as e:
            logger.error(f"RAG stream error: {e}", exc_info=True)
            yield json.dumps({
                "type": "error",
                "error": "PROCESSING_ERROR",
                "message": str(e)
            }) + "\n"
```

---

### 3. Updated Schema (`schema/ragSchema.py`)

```python
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class QueriedPatient(BaseModel):
    """Patient matched from query"""
    name: str
    patient_id: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    match_type: str  # "exact" or "fuzzy"


class RAGQueryRequest(BaseModel):
    """
    RAG query request.
    
    v4.0 Changes:
    - patient_id is now OPTIONAL (backend extracts from query if not provided)
    """
    query: str = Field(..., min_length=3, max_length=1000)
    patient_id: Optional[str] = None  # Now optional
    top_k: int = Field(default=5, ge=1, le=10)
    section_filter: Optional[str] = None


class RAGQueryResponse(BaseModel):
    """RAG query response"""
    answer: str
    citations: List["Citation"]
    confidence: float
    retrieval_count: int
    processing_time_ms: int
    queried_patients: Optional[List[QueriedPatient]] = None  # NEW


class StreamMetadataEvent(BaseModel):
    """Metadata event in stream"""
    type: str = "metadata"
    retrieval_count: int
    reranked_count: int
    query_type: str
    is_multi_patient: bool
    queried_patients: Optional[List[QueriedPatient]] = None  # NEW
    timestamps: Dict[str, float]


# Update existing stream event types similarly
```

---

## Frontend Implementation

### 1. Multi-Chat System Architecture

**Page structure (v4.0+):**
```
frontend/app/chatbot/
├── page.tsx                      # Chat router (select/create chat)
├── [chat_id]/
│   └── page.tsx                 # Chat detail with multi-turn conversation
└── components/
    ├── ChatSidebar.tsx          # Chat list + new chat button
    ├── ChatWindow.tsx           # Main message area
    ├── QueryCounter.tsx         # Visual progress (0-10)
    ├── AmbiguityResolver.tsx    # Disambiguation modal (NEW)
    ├── SystemFeedback.tsx       # Status messages (NEW)
    └── ChatFullModal.tsx        # "Chat full" prompt (NEW)
```

**Key changes:**
- Remove single-chat assumption
- Add chat context at app level
- Implement 10-query limit enforcement
- Add disambiguation UX
- Add system feedback states

---

### 2. Updated ChatbotPage Component

**File: `frontend/components/chatbot/ChatbotPage.tsx`**

```typescript
"use client"

import { useState, useRef, useEffect } from "react"
import {
  ChatInput,
  ChatMessage,
  MessageContent,
  MessageGroup,
  ChatBubble,
} from "@llamaindex/chat-ui"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/AuthContext"
import { toast } from "sonner"
import { Loader2, AlertCircle, Check, Copy, RefreshCw, Users, Database } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import axios from "axios"
import {
  ErrorType,
  parseAPIError,
  isRetryableError,
  getErrorMessage,
} from "@/lib/errorHandling"
import { QueriedPatientsBadge } from "./QueriedPatientsBadge"
import { DashboardContextPanel } from "./DashboardContextPanel"

// === Interfaces ===

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: Citation[]
  confidence?: number
  queried_patients?: QueriedPatient[]  // NEW
  timestamp: Date
}

interface Citation {
  chunk_id: string
  note_id: string
  section: string
  timestamp: string
  score: number
}

interface QueriedPatient {
  name: string
  patient_id: string
  confidence: number
  match_type: "exact" | "fuzzy"
}

interface StreamEvent {
  type: "metadata" | "token" | "completion" | "error"
  token?: string
  citations?: Citation[]
  retrieval_count?: number
  reranked_count?: number
  query_type?: string
  is_multi_patient?: boolean
  queried_patients?: QueriedPatient[]  // NEW
  answer?: string
  confidence?: number
  tokens_used?: number
  processing_time_ms?: number
  error?: string
  message?: string
}

// === Component ===

export function ChatbotPage() {
  const { session } = useAuth()
  
  // State
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentStreamAnswer, setCurrentStreamAnswer] = useState("")
  const [currentCitations, setCurrentCitations] = useState<Citation[]>([])
  const [currentQueriedPatients, setCurrentQueriedPatients] = useState<QueriedPatient[]>([])
  const [currentConfidence, setCurrentConfidence] = useState(0)
  const [error, setError] = useState<string | null>(false)
  const [canRetry, setCanRetry] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null)
  
  // NEW v4.0+ states
  const [queryCount, setQueryCount] = useState(0)  // 0-10
  const [showChatFullModal, setShowChatFullModal] = useState(false)
  const [showAmbiguityModal, setShowAmbiguityModal] = useState(false)
  const [ambiguousMatches, setAmbiguousMatches] = useState<QueriedPatient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null)  // User-selected patient
  const [systemStatus, setSystemStatus] = useState<string>("idle")  // "analyzing", "retrieving", etc.
  
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }

  useEffect(() => {
    scrollTimeoutRef.current = setTimeout(scrollToBottom, 100)
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [messages, currentStreamAnswer])

  // === Message Handler ===

  const handleSendMessage = async (text: string, _retryCount = 0) => {
    if (!text.trim()) {
      toast.error("Please enter a message")
      return
    }

    // Max 2 retries
    if (_retryCount > 1) {
      const errorMsg = "Failed to get response after multiple attempts. Please try again later."
      setError(errorMsg)
      toast.error(errorMsg)
      setCanRetry(false)
      return
    }

    // Add user message (only on first attempt)
    if (_retryCount === 0) {
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])
      setLastFailedMessage(text)
    }

    setInputValue("")
    setIsLoading(true)
    setError(null)
    setCanRetry(false)
    setRetryCount(_retryCount)
    setCurrentStreamAnswer("")
    setCurrentCitations([])
    setCurrentQueriedPatients([])  // NEW
    setCurrentConfidence(0)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      
      if (!session?.access_token) {
        throw new Error("Authentication token not available. Please log in again.")
      }

      // NEW: Send query without patient_id (backend extracts from query)
      let response: Response
      try {
        response = await fetch(`${apiUrl}/search/rag-stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            chat_id: currentChatId,  // NEW: required
            query: text,
            // patient_id: optional override
            top_k: 5,
          }),
          signal: AbortSignal.timeout(60000),
        })
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === "AbortError") {
            throw new Error("Request timed out. Please try again.")
          }
          if (err.message.includes("fetch")) {
            throw new Error("Network error. Please check your connection and try again.")
          }
        }
        throw err
      }

      if (!response.ok) {
        let errorData: any
        try {
          errorData = await response.json()
        } catch {
          errorData = { detail: `HTTP ${response.status} error` }
        }

        const appError = parseAPIError(response, errorData)
        const errorMsg = appError.details || appError.message

        if (isRetryableError(appError) && _retryCount < 1) {
          setCanRetry(true)
          setError(`${errorMsg}. Retrying...`)
          toast.loading("Retrying request...")
          setTimeout(() => {
            handleSendMessage(text, _retryCount + 1)
          }, 1000)
          return
        }

        throw new Error(errorMsg)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let streamAssistantMessage: Message | null = null
      let hasError = false
      let errorOccurred: Error | null = null

      if (!reader) {
        throw new Error("Response body is not readable")
      }

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")

          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim()
            if (!line) continue

            try {
              const event: StreamEvent = JSON.parse(line)

              switch (event.type) {
                case "metadata":
                  // NEW: Process chat status
                  if (event.chat_status) {
                    setQueryCount(event.chat_status.query_count)
                    if (event.chat_status.is_full) {
                      setShowChatFullModal(true)
                    }
                  }
                  setCurrentCitations(event.citations || [])
                  setCurrentQueriedPatients(event.patient_context ? [{
                    name: "Selected Patient",
                    patient_id: event.patient_context.patient_id,
                    confidence: event.patient_context.confidence,
                    match_type: "auto"
                  }] : [])
                  break

                case "ambiguity":
                  // NEW: Show disambiguation modal
                  setAmbiguousMatches(event.matches)
                  setShowAmbiguityModal(true)
                  reader.cancel()  // Pause streaming
                  return  // Wait for user selection

                case "token":
                  setCurrentStreamAnswer((prev) => prev + (event.token || ""))
                  break

                case "completion":
                  if (!streamAssistantMessage) {
                    streamAssistantMessage = {
                      id: `msg-${Date.now()}-assistant`,
                      role: "assistant",
                      content: event.answer || currentStreamAnswer,
                      citations: currentCitations,
                      confidence: event.confidence,
                      queried_patients: currentQueriedPatients,
                      timestamp: new Date(),
                    }
                    setMessages((prev) => [...prev, streamAssistantMessage!])
                  } else {
                    streamAssistantMessage.content = event.answer || currentStreamAnswer
                    streamAssistantMessage.confidence = event.confidence
                    streamAssistantMessage.queried_patients = currentQueriedPatients
                    setMessages((prev) => [...prev])
                  }
                  // Update query count from completion event
                  if (event.chat_status) {
                    setQueryCount(event.chat_status.query_count)
                    if (event.chat_status.is_full) {
                      setShowChatFullModal(true)
                    }
                  }
                  setCurrentConfidence(event.confidence || 0)
                  break

                case "chat_full":
                  // NEW: Chat reached 10-query limit
                  setShowChatFullModal(true)
                  break

                case "error":
                  if (event.error === "CHAT_FULL") {
                    setShowChatFullModal(true)
                  } else {
                    hasError = true
                    errorOccurred = new Error(event.message || `${event.error}: An error occurred`)
                  }
                  break
              }
            } catch (parseError) {
              if (parseError instanceof SyntaxError) {
                console.warn("Failed to parse JSON:", line)
              } else {
                throw parseError
              }
            }
          }

          buffer = lines[lines.length - 1]
        }

        if (hasError && errorOccurred) {
          throw errorOccurred
        }
      } catch (streamError) {
        reader.cancel()
        throw streamError
      }

      if (!streamAssistantMessage && currentStreamAnswer) {
        const assistantMessage: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content: currentStreamAnswer,
          citations: currentCitations,
          confidence: currentConfidence,
          queried_patients: currentQueriedPatients,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
        saveRecentChat(text, currentStreamAnswer)
      }

      toast.success("Response received successfully")
      setLastFailedMessage(null)
    } catch (err) {
      const errorMessage = getErrorMessage(err)
      setError(errorMessage)
      
      if (errorMessage.includes("timeout") || errorMessage.includes("network")) {
        setCanRetry(_retryCount < 1)
      }

      toast.error(errorMessage)
      console.error("Chat error:", err)
    } finally {
      setIsLoading(false)
      setCurrentStreamAnswer("")
    }
  }

  const handleRetry = () => {
    if (lastFailedMessage) {
      handleSendMessage(lastFailedMessage, retryCount + 1)
    }
  }

  const saveRecentChat = (query: string, response: string) => {
    try {
      const chatTitle = query.substring(0, 40) + (query.length > 40 ? "..." : "")
      const chatId = `chat-${Date.now()}`
      
      const newChat = {
        id: chatId,
        title: chatTitle,
        query: query,
        patientId: null,  // No longer single-patient focused
        timestamp: new Date().toISOString(),
      }

      const stored = localStorage.getItem("recent_chats")
      const chats = stored ? JSON.parse(stored) : []
      const updated = [newChat, ...chats].slice(0, 10)
      localStorage.setItem("recent_chats", JSON.stringify(updated))
    } catch (error) {
      console.error("Error saving recent chat:", error)
    }
  }

  // === Render ===

  return (
    <div className="flex h-[calc(100vh-64px)] w-full">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full gap-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Medical Assistant
            </h1>
            <p className="text-sm text-muted-foreground">
              Ask questions about your patients' medical records
            </p>
          </div>
        </div>

        {/* Query Counter (NEW v4.0+) */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Queries in this chat:</span>
          <div className="flex items-center gap-1">
            <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  queryCount >= 8 ? "bg-red-500" :
                  queryCount >= 5 ? "bg-yellow-500" :
                  "bg-green-500"
                }`}
                style={{ width: `${(queryCount / 10) * 100}%` }}
              />
            </div>
            <span className={`font-medium ${
              queryCount >= 10 ? "text-red-600" :
              queryCount >= 8 ? "text-orange-600" :
              "text-foreground"
            }`}>
              {queryCount}/10
            </span>
          </div>
        </div>

        {/* Queried Patients Badge (ENHANCED) */}
        {currentQueriedPatients.length > 0 && (
          <QueriedPatientsBadge patients={currentQueriedPatients} />
        )}

        {/* System Status Feedback (NEW v4.0+) */}
        {systemStatus !== "idle" && (
          <SystemFeedback status={systemStatus} />
        )}

        {/* Messages Container */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto space-y-4 pb-4 px-2"
        >
          {/* Empty state, messages, streaming, error - existing render logic */}
          {/* ... (keep existing message rendering) */}
        </div>

        {/* Input Area */}
        <div className="border-t border-border pt-4 px-2">
          <div className="flex gap-2">
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !isLoading) {
                  e.preventDefault()
                  handleSendMessage(inputValue)
                }
              }}
              placeholder="Ask about your patients' records... (e.g., 'What was John Smith's last BP?')"
              disabled={isLoading}
              className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button
              onClick={() => handleSendMessage(inputValue)}
              disabled={isLoading || !inputValue.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Send"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard Context Panel (NEW - Collapsible Right Sidebar) */}
      <DashboardContextPanel />
    </div>
  )
}
```

---

### 2. New Component: QueriedPatientsBadge

**File: `frontend/components/chatbot/QueriedPatientsBadge.tsx`**

```typescript
"use client"

import { Users, Check, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

interface QueriedPatient {
  name: string
  patient_id: string
  confidence: number
  match_type: "exact" | "fuzzy"
}

interface QueriedPatientsBadgeProps {
  patients: QueriedPatient[]
}

export function QueriedPatientsBadge({ patients }: QueriedPatientsBadgeProps) {
  return (
    <Card className="p-3 border-border bg-secondary/50">
      <div className="flex items-center gap-2 flex-wrap">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Queried:</span>
        <div className="flex gap-1 flex-wrap">
          {patients.map((patient, idx) => (
            <Badge
              key={patient.patient_id}
              variant={patient.match_type === "exact" ? "default" : "secondary"}
              className="flex items-center gap-1"
            >
              {patient.name}
              {patient.match_type === "exact" ? (
                <Check className="h-3 w-3 opacity-70" />
              ) : (
                <AlertCircle className="h-3 w-3 opacity-70" />
              )}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  )
}
```

---

### 3. New Component: DashboardContextPanel

**File: `frontend/components/chatbot/DashboardContextPanel.tsx`**

```typescript
"use client"

import { useState, useEffect } from "react"
import { Clock, TrendingUp, Users, ChevronRight, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useRouter } from "next/navigation"

export function DashboardContextPanel() {
  const router = useRouter()
  const [recentChats, setRecentChats] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalPatients: 0,
    queriesThisWeek: 0,
    sessionsThisWeek: 0,
  })

  // Load recent chats from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("recent_chats")
      if (stored) {
        const chats = JSON.parse(stored).slice(0, 5)
        setRecentChats(chats)
      }
    } catch (error) {
      console.error("Error loading recent chats:", error)
    }
  }, [])

  // Load stats (would come from backend in production)
  useEffect(() => {
    // Placeholder - would fetch from /api/chatbot/stats
    setStats({
      totalPatients: 0,  // Would be fetched
      queriesThisWeek: 0,
      sessionsThisWeek: 0,
    })
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    }
  }

  return (
    <div className="w-80 border-l border-border bg-sidebar h-full overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Dashboard</h2>
        
        {/* Quick Stats */}
        <Card className="p-4 mb-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            This Week
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Queries</span>
              <span className="font-medium">{stats.queriesThisWeek}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sessions</span>
              <span className="font-medium">{stats.sessionsThisWeek}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Patients</span>
              <span className="font-medium">{stats.totalPatients}</span>
            </div>
          </div>
        </Card>

        <Separator className="my-4" />

        {/* Recent Chats */}
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Chats
          </h3>
          <div className="space-y-2">
            {recentChats.length > 0 ? (
              recentChats.map((chat) => (
                <Card
                  key={chat.id}
                  className="p-3 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => router.push(`/chatbot?session=${chat.id}`)}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium truncate flex-1">
                        {chat.title}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(chat.timestamp)}
                    </span>
                  </div>
                </Card>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent chats
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## Security & Authentication

### Backend Security

| Concern | Mitigation |
|---------|------------|
| **Authentication** | JWT verification via `get_current_user()` dependency |
| **User Isolation** | RLS policies on all patient/note tables |
| **Patient Enumeration** | Rate limiting (30/min), audit logging of all lookups |
| **PII Leakage** | Token-based masking, post-generation validation |
| **Injection Attacks** | Parameterized queries, input validation (3-1000 chars) |
| **Multi-Patient Access** | Verify all matched patients belong to authenticated user |

### Frontend Security

| Concern | Mitigation |
|---------|------------|
| **Token Storage** | Supabase auth context (httpOnly cookies) |
| **XSS Prevention** | React escaping, no dangerouslySetInnerHTML |
| **CSRF Protection** | SameSite cookies, token validation |
| **Patient ID Leakage** | UUIDs only (no MRN in URLs) |
| **Error Handling** | User-friendly messages (no internal details) |

### Environment Variables Required

```bash
# Backend .env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_EMBEDDING_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
REDIS_URL=redis://localhost:6379
TOKEN_HASHING_SALT=your_32_byte_salt
ENCRYPTION_KEY_PATIENT_NAME=your_32_byte_key
```

```bash
# Frontend .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## API Contracts

### POST /search/rag-stream

**Request:**
```json
{
  "query": "What was John Smith's last BP reading?",
  "patient_id": null,  // Optional - backend extracts from query
  "top_k": 5
}
```

**Response (NDJSON Stream):**
```
{"type": "metadata", "retrieval_count": 10, "queried_patients": [{"name": "John Smith", "patient_id": "uuid-123", "confidence": 0.95, "match_type": "exact"}]}
{"type": "token", "token": "Based"}
{"type": "token", "token": " on"}
{"type": "token", "token": " John"}
{"type": "token", "token": " Smith's"}
...
{"type": "completion", "answer": "...", "confidence": 0.87, "citations": [...]}
```

---

## Component Specifications (v4.0+)

### Component Tree

```
ChatLayout
├── ChatSidebar (NEW)
│   ├── "New Chat" button
│   ├── ChatList[]
│   │   └── ChatCard (click to switch)
│   └── Archive button
├── ChatWindow (Main)
│   ├── Header
│   │   ├── Chat title
│   │   └── QueryCounter badge (0/10)
│   ├── QueryCounter (NEW - visual progress bar)
│   ├── SystemFeedback (NEW - "Analyzing...", "Retrieving...")
│   ├── QueriedPatientsBadge (ENHANCED - clickable)
│   ├── MessagesContainer
│   │   ├── Message[] (user/assistant)
│   │   ├── AmbiguityResolver modal (NEW)
│   │   └── ChatFullModal (NEW)
│   └── InputArea
│       ├── TextInput
│       └── SendButton
└── Modals (NEW)
    ├── AmbiguityResolver (patient selection)
    └── ChatFullModal (10-query limit reached)
```

### New Components (v4.0+)

**SystemFeedback.tsx:**
```typescript
interface SystemFeedbackProps {
  status: "idle" | "analyzing" | "retrieving" | "generating"
}

// Shows: "🔍 Analyzing query...", "📚 Retrieving records...", "✍️ Generating response..."
// Appears between query and first token
// Smooth fade-out when first token arrives
```

**AmbiguityResolver.tsx:**
```typescript
interface AmbiguityResolverProps {
  matches: QueriedPatient[]
  onSelect: (patient_id: string) => void
}

// Modal with patient cards
// Shows confidence scores
// "Select patient to continue" prompt
```

**ChatFullModal.tsx:**
```typescript
interface ChatFullModalProps {
  onCreateNewChat: () => void
}

// "This chat has reached 10 queries"
// "Create new chat" button
// Link to chat list
```

**QueryCounter.tsx (ENHANCED):**
```typescript
interface QueryCounterProps {
  current: number  // 0-10
  limit: number    // 10
}

// Visual progress bar
// Color: green (0-5), yellow (5-8), red (8-10)
// Text: "3/10 queries"
```

---

## Implementation Phases (v4.0+)

### Phase 1: Backend - Patient Lookup & Session Management (Days 1-3)

| Task | File | Status |
|------|------|--------|
| Refactor patient_lookup.py with spaCy NER | `backend/services/patient_lookup.py` | ⏳ |
| Create session_context.py | `backend/services/session_context.py` | ⏳ |
| Add Redis caching for patient lists | `backend/services/patient_lookup.py` | ⏳ |
| Update ragSchema.py with chat_id, ambiguity events | `backend/schema/ragSchema.py` | ⏳ |
| Create chatSchema.py | `backend/schema/chatSchema.py` | ⏳ |
| Unit tests: patient lookup (spaCy, fuzzy, cache) | `backend/tests/unit/test_patient_lookup.py` | ⏳ |

### Phase 2: Backend - Chat & RAG Routes (Days 4-5)

| Task | File | Status |
|------|------|--------|
| Create chatRoutes.py (CRUD operations) | `backend/routers/chatRoutes.py` | ⏳ |
| Create database migrations (chats, messages, sessions) | `backend/migrations/` | ⏳ |
| Update ragRoutes.py with spaCy extraction + disambiguation | `backend/routers/ragRoutes.py` | ⏳ |
| Add query counter + strict retrieval guardrails | `backend/routers/ragRoutes.py` | ⏳ |
| Add NDJSON ambiguity/chat_full events | `backend/routers/ragRoutes.py` | ⏳ |
| Integration tests: RAG + session context | `backend/tests/integration/test_rag_with_chats.py` | ⏳ |

### Phase 3: Frontend - Chat Infrastructure (Days 6-7)

| Task | File | Status |
|------|------|--------|
| Create ChatSidebar component | `frontend/components/chatbot/ChatSidebar.tsx` | ⏳ |
| Create QueryCounter component | `frontend/components/chatbot/QueryCounter.tsx` | ⏳ |
| Create SystemFeedback component | `frontend/components/chatbot/SystemFeedback.tsx` | ⏳ |
| Create AmbiguityResolver modal | `frontend/components/chatbot/AmbiguityResolver.tsx` | ⏳ |
| Create ChatFullModal component | `frontend/components/chatbot/ChatFullModal.tsx` | ⏳ |
| Add chat_id state management | `frontend/hooks/useChat.ts` | ⏳ |
| Add chat list API hook | `frontend/hooks/useChats.ts` | ⏳ |

### Phase 4: Frontend - Chat Integration (Days 8-9)

| Task | File | Status |
|------|------|--------|
| Update ChatbotPage with chat_id support | `frontend/components/chatbot/ChatbotPage.tsx` | ⏳ |
| Add ambiguity modal handling | `frontend/components/chatbot/ChatbotPage.tsx` | ⏳ |
| Add query counter + chat full detection | `frontend/components/chatbot/ChatbotPage.tsx` | ⏳ |
| Add system feedback states ("Analyzing...", etc.) | `frontend/components/chatbot/ChatbotPage.tsx` | ⏳ |
| Wire chat creation/switching | `frontend/app/chatbot/page.tsx` | ⏳ |
| Update streaming handler for all v4.0+ events | `frontend/components/chatbot/ChatbotPage.tsx` | ⏳ |

### Phase 5: Testing & Validation (Days 10-11)

| Task | Type | Status |
|------|------|--------|
| Unit tests: patient lookup (spaCy, fuzzy) | Backend | ⏳ |
| Unit tests: session context manager | Backend | ⏳ |
| Integration tests: full RAG + chat pipeline | Backend | ⏳ |
| Integration tests: disambiguation flow | Backend | ⏳ |
| E2E tests: multi-chat system | Frontend | ⏳ |
| E2E tests: 10-query limit enforcement | Frontend | ⏳ |
| Performance tests: query latency, cache hits | Both | ⏳ |
| Load tests: concurrent chat sessions | Both | ⏳ |

### Phase 6: Documentation & Hardening (Days 12+)

| Task | Type | Status |
|------|------|--------|
| Update CLAUDE.md with v4.0+ architecture | Documentation | ⏳ |
| Update RAG_IMPLEMENTATION_GUIDE.md | Documentation | ⏳ |
| Add spaCy model setup instructions | Documentation | ⏳ |
| Create CHAT_SYSTEM_GUIDE.md | Documentation | ⏳ |
| Security audit: patient isolation, RLS | Security | ⏳ |
| Performance optimization: retrieval speed | Performance | ⏳ |
| Production hardening checklist | Deployment | ⏳ |

---

## Testing Strategy

### Backend Unit Tests

```python
# tests/unit/test_patient_lookup.py

class TestPatientLookup:
    
    def test_extract_patient_names_exact_match(self):
        """Test exact patient name matching"""
        service = PatientLookupService()
        matches = await service.extract_patient_names(
            query="What was John Smith's BP?",
            user_id="test-user-123"
        )
        assert len(matches) == 1
        assert matches[0].name == "John Smith"
        assert matches[0].match_type == "exact"
    
    def test_extract_patient_names_fuzzy_match(self):
        """Test fuzzy matching (typos)"""
        service = PatientLookupService()
        matches = await service.extract_patient_names(
            query="What was Jon Smith's BP?",  # Typo: "Jon" vs "John"
            user_id="test-user-123"
        )
        assert len(matches) == 1
        assert matches[0].match_type == "fuzzy"
        assert matches[0].confidence >= 0.8
    
    def test_extract_patient_names_multi_patient(self):
        """Test multi-patient extraction"""
        service = PatientLookupService()
        matches = await service.extract_patient_names(
            query="Compare John Smith and Mary Doe's symptoms",
            user_id="test-user-123"
        )
        assert len(matches) == 2
    
    def test_user_isolation(self):
        """Test user can only see their own patients"""
        service = PatientLookupService()
        matches = await service.extract_patient_names(
            query="What was John Smith's BP?",
            user_id="different-user-456"  # Different user
        )
        assert len(matches) == 0  # No matches (patient belongs to other user)
```

### Frontend Integration Tests

```typescript
// tests/integration/chatbot.test.tsx

describe("ChatbotPage", () => {
  
  it("sends query without patient_id", async () => {
    render(<ChatbotPage />)
    
    const input = screen.getByPlaceholderText(/ask about/i)
    const sendButton = screen.getByText("Send")
    
    await userEvent.type(input, "What was John's BP?")
    await userEvent.click(sendButton)
    
    // Verify request body
    const fetchCall = fetchMock.mock.calls[0]
    const body = JSON.parse(fetchCall[1].body as string)
    expect(body.patient_id).toBeUndefined()
    expect(body.query).toBe("What was John's BP?")
  })
  
  it("displays queried patients badge", async () => {
    // Mock streaming response with queried_patients
    fetchMock.mockResponseOnce(streamingResponse({
      queried_patients: [{
        name: "John Smith",
        patient_id: "uuid-123",
        confidence: 0.95,
        match_type: "exact"
      }]
    }))
    
    render(<ChatbotPage />)
    // ... trigger query
    
    const badge = await screen.findByText(/queried:/i)
    expect(badge).toBeInTheDocument()
    expect(screen.getByText("John Smith")).toBeInTheDocument()
  })
})
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Patient name detection accuracy | ≥90% | Unit test coverage |
| False positive rate | ≤5% | Manual testing |
| Query response time (p99) | <6s | Backend telemetry |
| First token time | <1s | Frontend performance |
| User satisfaction | ≥4.5/5 | User testing feedback |

---

**Document Version:** 4.0  
**Last Updated:** 2026-04-19  
**Status:** Ready for Implementation  
**Next Step:** User Review → Invoke writing-plans skill
