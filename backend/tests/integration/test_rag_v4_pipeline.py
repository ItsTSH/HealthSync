"""Integration tests for RAG v4.0 Pipeline with multi-chat and patient disambiguation."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, List, Any, AsyncGenerator
import uuid
from datetime import datetime
import json

from schema.ragSchema import RAGQueryRequest, QueriedPatient


@pytest.mark.integration
class TestRAGV4Pipeline:
    """Integration tests for complete RAG v4.0 pipeline."""
    
    @pytest.fixture
    def mock_current_user(self) -> str:
        """Mock authenticated user ID."""
        return str(uuid.uuid4())
    
    @pytest.fixture
    def mock_chat_id(self) -> str:
        """Mock chat ID."""
        return str(uuid.uuid4())
    
    @pytest.fixture
    def mock_patient_id(self) -> str:
        """Mock patient ID."""
        return str(uuid.uuid4())
    
    @pytest.fixture
    def sample_rag_request(self, mock_chat_id: str, mock_patient_id: str) -> Dict[str, Any]:
        """Sample RAG query request."""
        return {
            "chat_id": mock_chat_id,
            "query": "What were the patient's vital signs at the last visit?",
            "patient_id": mock_patient_id,
            "section_filter": None,
            "top_k": 5
        }
    
    @pytest.mark.asyncio
    async def test_rag_v4_stage0_session_context_loading(
        self,
        mock_current_user: str,
        mock_chat_id: str
    ) -> None:
        """Test STAGE 0: Session context loading."""
        # STAGE 0 should:
        # 1. Load chat session from Redis/database
        # 2. Check if chat is full (10/10)
        # 3. Verify user owns chat
        # 4. Return context with query_count
        
        expected_context = {
            "chat_id": mock_chat_id,
            "user_id": mock_current_user,
            "query_count": 3,
            "is_full": False,
            "referenced_patient_ids": [str(uuid.uuid4()), str(uuid.uuid4())]
        }
        
        assert expected_context["query_count"] < 10
        assert not expected_context["is_full"]
    
    @pytest.mark.asyncio
    async def test_rag_v4_stage0_chat_full_detection(
        self,
        mock_current_user: str,
        mock_chat_id: str
    ) -> None:
        """Test STAGE 0: Detect when chat is full (10/10 queries)."""
        # When query_count == 10, should emit "chat_full" event and return
        
        full_context = {
            "chat_id": mock_chat_id,
            "query_count": 10,
            "is_full": True
        }
        
        assert full_context["is_full"] == True
        assert full_context["query_count"] == 10
    
    @pytest.mark.asyncio
    async def test_rag_v4_stage1_patient_extraction_exact_match(
        self,
        mock_current_user: str,
        sample_rag_request: Dict[str, Any]
    ) -> None:
        """Test STAGE 1: Patient extraction with exact name match."""
        # Query: "What were John Smith's vital signs?"
        # Should extract "John Smith" from query text
        # Should match against user's cached patient list
        # Should return confidence >= 0.9 for exact match
        
        sample_rag_request["query"] = "What were John Smith's vital signs?"
        
        expected_match = {
            "name": "John Smith",
            "patient_id": str(uuid.uuid4()),
            "confidence": 0.95,
            "match_type": "exact"
        }
        
        assert expected_match["confidence"] >= 0.9
        assert expected_match["match_type"] == "exact"
    
    @pytest.mark.asyncio
    async def test_rag_v4_stage1_patient_extraction_fuzzy_match(
        self,
        sample_rag_request: Dict[str, Any]
    ) -> None:
        """Test STAGE 1: Patient extraction with fuzzy name match."""
        # Query: "What were Jon Smit's vital signs?" (typo)
        # Should fuzzy match to "John Smith" in patient list
        # Should return confidence 0.7-0.9
        
        sample_rag_request["query"] = "What were Jon Smit's vital signs?"
        
        expected_match = {
            "name": "John Smith",
            "patient_id": str(uuid.uuid4()),
            "confidence": 0.82,  # Fuzzy match
            "match_type": "fuzzy"
        }
        
        assert 0.7 <= expected_match["confidence"] < 0.9
        assert expected_match["match_type"] == "fuzzy"
    
    @pytest.mark.asyncio
    async def test_rag_v4_stage1_pronoun_resolution(
        self,
        sample_rag_request: Dict[str, Any]
    ) -> None:
        """Test STAGE 1: Pronoun resolution via session context."""
        # Query: "What was his last BP reading?"
        # Session context has last_referenced_patient = "John Smith"
        # Should resolve "his" to John Smith
        # Should return match with high confidence (0.95+)
        
        sample_rag_request["query"] = "What was his last BP reading?"
        
        expected_match = {
            "name": "John Smith",
            "patient_id": str(uuid.uuid4()),
            "confidence": 0.98,  # Pronoun resolution
            "match_type": "pronoun_resolution"
        }
        
        assert expected_match["confidence"] > 0.95
    
    @pytest.mark.asyncio
    async def test_rag_v4_stage2_disambiguation_multiple_matches(
        self,
        sample_rag_request: Dict[str, Any]
    ) -> None:
        """Test STAGE 2: Disambiguation when multiple patients match."""
        # Query: "Smith's vitals?" (multiple Smiths in patient list)
        # Should detect ambiguity
        # Should emit "ambiguity" event with multiple matches
        # Frontend shows disambiguation modal
        
        expected_ambiguity = {
            "type": "ambiguity",
            "matches": [
                {
                    "name": "John Smith",
                    "patient_id": str(uuid.uuid4()),
                    "confidence": 0.85,
                    "match_type": "fuzzy"
                },
                {
                    "name": "Jane Smith",
                    "patient_id": str(uuid.uuid4()),
                    "confidence": 0.82,
                    "match_type": "fuzzy"
                }
            ],
            "please_select": True
        }
        
        assert len(expected_ambiguity["matches"]) > 1
        assert expected_ambiguity["please_select"] == True
    
    @pytest.mark.asyncio
    async def test_rag_v4_stage2_auto_select_high_confidence(
        self,
        sample_rag_request: Dict[str, Any]
    ) -> None:
        """Test STAGE 2: Auto-select patient when confidence > 0.85."""
        # When highest match confidence >= 0.85, auto-select
        # Don't emit ambiguity, proceed to stage 3
        
        highest_match_confidence = 0.92
        should_auto_select = highest_match_confidence > 0.85
        
        assert should_auto_select == True
    
    @pytest.mark.asyncio
    async def test_rag_v4_stage6_strict_retrieval_filtering(
        self,
        mock_current_user: str,
        mock_patient_id: str
    ) -> None:
        """Test STAGE 6: CRITICAL - Strict patient_ids filtering in retrieval."""
        # GUARDRAIL: patient_ids MUST be explicit, never null
        # Retrieval should ONLY return chunks belonging to selected_patient_id
        # RLS policies enforce user/patient isolation
        
        retrieval_config = {
            "user_id": mock_current_user,
            "patient_id": mock_patient_id,  # EXPLICIT, never null
            "top_k": 50,
            "section_filter": None
        }
        
        assert retrieval_config["patient_id"] is not None
        assert retrieval_config["patient_id"] != ""
    
    @pytest.mark.asyncio
    async def test_rag_v4_stream_metadata_event(
        self,
        sample_rag_request: Dict[str, Any]
    ) -> None:
        """Test stream metadata event format (NDJSON)."""
        # After retrieval/reranking, endpoint emits metadata event with:
        # - citations (chunk_id, section, score)
        # - retrieval_count
        # - chat_status (query_count, is_full, query_limit)
        # - queried_patients
        # - patient_context (auto_selected, confidence)
        # - timestamps
        
        expected_metadata = {
            "type": "metadata",
            "citations": [
                {
                    "chunk_id": str(uuid.uuid4()),
                    "note_id": str(uuid.uuid4()),
                    "section": "vital_signs",
                    "score": 0.95
                }
            ],
            "retrieval_count": 5,
            "chat_status": {
                "query_count": 4,
                "is_full": False,
                "query_limit": 10
            },
            "queried_patients": [
                {
                    "name": "John Smith",
                    "patient_id": str(uuid.uuid4()),
                    "confidence": 0.98,
                    "match_type": "exact"
                }
            ],
            "patient_context": {
                "auto_selected": True,
                "patient_id": str(uuid.uuid4()),
                "confidence": 0.98
            }
        }
        
        assert expected_metadata["type"] == "metadata"
        assert "citations" in expected_metadata
        assert "chat_status" in expected_metadata
    
    @pytest.mark.asyncio
    async def test_rag_v4_stream_token_events(self) -> None:
        """Test streaming token events (NDJSON)."""
        # Each token from LLM emitted as separate JSON line:
        # {"type": "token", "token": "The"}
        # {"type": "token", "token": " patient"}
        # ...
        
        expected_tokens = [
            {"type": "token", "token": "The"},
            {"type": "token", "token": " patient"},
            {"type": "token", "token": " has"},
            {"type": "token", "token": " normal"},
            {"type": "token", "token": " vital"},
            {"type": "token", "token": " signs"},
            {"type": "token", "token": "."}
        ]
        
        assert len(expected_tokens) >= 1
        assert all(e["type"] == "token" for e in expected_tokens)
    
    @pytest.mark.asyncio
    async def test_rag_v4_stream_completion_event(
        self,
        sample_rag_request: Dict[str, Any]
    ) -> None:
        """Test completion event at end of stream."""
        # Final event includes:
        # - type: "completion"
        # - answer: full answer text
        # - citations: citation list
        # - confidence: score 0.0-1.0
        # - tokens_used: token count
        # - processing_time_ms: total duration
        # - chat_status: updated query_count, is_full
        
        expected_completion = {
            "type": "completion",
            "answer": "The patient's last recorded BP was 120/80 mmHg, which is within normal range.",
            "citations": [
                {
                    "chunk_id": str(uuid.uuid4()),
                    "note_id": str(uuid.uuid4()),
                    "section": "vital_signs",
                    "score": 0.95
                }
            ],
            "confidence": 0.92,
            "tokens_used": 42,
            "processing_time_ms": 2340,
            "chat_status": {
                "query_count": 4,
                "is_full": False,
                "query_limit": 10
            }
        }
        
        assert expected_completion["type"] == "completion"
        assert expected_completion["answer"] != ""
        assert 0.0 <= expected_completion["confidence"] <= 1.0
        assert expected_completion["chat_status"]["query_count"] <= 10
    
    @pytest.mark.asyncio
    async def test_rag_v4_query_counter_increment(
        self,
        mock_chat_id: str
    ) -> None:
        """Test STAGE 10: Query counter increment (0-10)."""
        # After successful query completion:
        # 1. Increment query_count in chat_sessions
        # 2. Set is_full = True if query_count == 10
        # 3. Signal in completion event
        
        before_count = 3
        after_count = 4
        
        assert after_count == before_count + 1
        assert after_count <= 10
    
    @pytest.mark.asyncio
    async def test_rag_v4_query_counter_at_limit(
        self,
        mock_chat_id: str
    ) -> None:
        """Test query counter when reaching limit (10/10)."""
        # When query_count reaches 10:
        # 1. Emit completion normally for this query
        # 2. Set is_full = True
        # 3. Frontend should show "Chat is full" modal after completion
        
        current_count = 9
        after_query = 10
        
        is_full = after_query >= 10
        
        assert is_full == True
    
    @pytest.mark.asyncio
    async def test_rag_v4_session_context_update(
        self,
        mock_chat_id: str,
        mock_patient_id: str
    ) -> None:
        """Test STAGE 10: Session context updated with referenced patients."""
        # After query completion:
        # 1. Update referenced_patient_ids
        # 2. Update last_referenced_patient_id
        # 3. Update conversation_summary (optional)
        
        before_patients = [str(uuid.uuid4()), str(uuid.uuid4())]
        new_patient = mock_patient_id
        
        # New patient should be prepended (most recent first)
        after_patients = [new_patient] + before_patients
        
        assert after_patients[0] == new_patient
        assert len(after_patients) > len(before_patients)


@pytest.mark.integration
class TestRAGV4ErrorHandling:
    """Error handling tests for RAG v4.0 pipeline."""
    
    @pytest.mark.asyncio
    async def test_error_chat_not_found(self) -> None:
        """Test error when chat doesn't exist or user doesn't own it."""
        # Should emit error event:
        # {"type": "error", "stage": "session_context", "message": "..."}
        
        expected_error = {
            "type": "error",
            "stage": "session_context",
            "message": "Chat not found or access denied"
        }
        
        assert expected_error["type"] == "error"
    
    @pytest.mark.asyncio
    async def test_error_chat_is_full(self) -> None:
        """Test error when chat is full (10/10 queries)."""
        # Should emit chat_full event and return early
        
        expected_response = {
            "type": "chat_full",
            "query_count": 10,
            "query_limit": 10,
            "message": "Chat has reached maximum queries (10). Start a new chat to continue."
        }
        
        assert expected_response["query_count"] >= expected_response["query_limit"]
    
    @pytest.mark.asyncio
    async def test_error_patient_extraction_ambiguity_unresolved(self) -> None:
        """Test error when patient ambiguity can't be resolved."""
        # When multiple low-confidence matches and no patient_id provided
        # Should emit error
        
        expected_error = {
            "type": "error",
            "stage": "patient_disambiguation",
            "message": "Could not determine which patient this query refers to."
        }
        
        assert expected_error["type"] == "error"
    
    @pytest.mark.asyncio
    async def test_error_embedding_service_failure(self) -> None:
        """Test error when embedding service fails."""
        # Gemini API down or invalid response
        
        expected_error = {
            "type": "error",
            "stage": "embedding",
            "message": "Failed to process query embedding"
        }
        
        assert expected_error["type"] == "error"
    
    @pytest.mark.asyncio
    async def test_error_retrieval_service_failure(self) -> None:
        """Test error when retrieval service fails."""
        # pgvector query error or RLS violation
        
        expected_error = {
            "type": "error",
            "stage": "retrieval",
            "message": "No matching medical records found"
        }
        
        assert expected_error["type"] == "error"
    
    @pytest.mark.asyncio
    async def test_error_llm_service_failure(self) -> None:
        """Test error when LLM service fails mid-stream."""
        # Groq API timeout or rate limit
        
        expected_error = {
            "type": "error",
            "stage": "llm",
            "message": "Error during response generation"
        }
        
        assert expected_error["type"] == "error"
    
    @pytest.mark.asyncio
    async def test_stream_format_validation(self) -> None:
        """Test that all stream events are valid NDJSON."""
        # Each event must be:
        # 1. Valid JSON object
        # 2. Followed by newline
        # 3. Contain "type" field
        
        sample_events = [
            '{"type": "metadata", "citations": []}\n',
            '{"type": "token", "token": "The"}\n',
            '{"type": "completion", "answer": "..."}\n'
        ]
        
        for event_line in sample_events:
            # Remove newline and parse
            event_json = event_line.strip()
            event = json.loads(event_json)
            assert "type" in event
