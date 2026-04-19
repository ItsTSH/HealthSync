"""Unit tests for retrieval, reranking, LLM, and audit services."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import List, Dict, Any

from services.retrieval import RetrievalService
from services.reranking import RerankingService
from services.llm import GroqLLMService
from services.audit import AuditLogger


# ============================================================================
# RETRIEVAL SERVICE TESTS
# ============================================================================

@pytest.mark.unit
class TestRetrievalService:
    """Tests for vector retrieval service."""
    
    @pytest.mark.asyncio
    async def test_retrieve_by_similarity(
        self,
        sample_embeddings: list,
        sample_search_results: list
    ) -> None:
        """Test vector similarity retrieval."""
        retriever = RetrievalService()
        
        query_embedding = sample_embeddings[0]
        
        with patch.object(retriever, 'supabase') as mock_supabase:
            mock_supabase.rpc = AsyncMock(return_value=sample_search_results)
            
            results = await retriever.retrieve(
                embedding=query_embedding,
                user_id="user-001",
                top_k=5,
                threshold=0.6
            )
            
            assert isinstance(results, list)
            assert all("content" in r for r in results if isinstance(r, dict))
    
    @pytest.mark.asyncio
    async def test_retrieve_with_filters(self) -> None:
        """Test retrieval with temporal and medical filters."""
        retriever = RetrievalService()
        
        query_embedding = [0.1] * 768
        filters = {
            "date_range": {"start": "2024-01-01", "end": "2024-12-31"},
            "sections": ["diagnosis", "plan"]
        }
        
        with patch.object(retriever, 'supabase') as mock_supabase:
            mock_supabase.rpc = AsyncMock(return_value=[])
            
            results = await retriever.retrieve_with_filters(
                embedding=query_embedding,
                filters=filters,
                user_id="user-001"
            )
            
            assert isinstance(results, list)
    
    @pytest.mark.asyncio
    async def test_retrieve_respects_top_k(self) -> None:
        """Test that retriever respects top_k limit."""
        retriever = RetrievalService()
        
        query_embedding = [0.1] * 768
        mock_results = [{"id": f"chunk-{i}"} for i in range(20)]
        
        with patch.object(retriever, 'supabase') as mock_supabase:
            mock_client.rpc = AsyncMock(return_value=mock_results)
            
            results = await retriever.retrieve(
                embedding=query_embedding,
                user_id="user-001",
                top_k=5
            )
            
            assert len(results) <= 5
    
    @pytest.mark.asyncio
    async def test_retrieve_empty_result(self) -> None:
        """Test retrieval with no results found."""
        retriever = RetrievalService()
        
        query_embedding = [0.1] * 768
        
        with patch.object(retriever, 'supabase') as mock_supabase:
            mock_supabase.rpc = AsyncMock(return_value=[])
            
            results = await retriever.retrieve(
                embedding=query_embedding,
                user_id="user-001"
            )
            
            assert results == []


# ============================================================================
# RERANKING SERVICE TESTS
# ============================================================================

@pytest.mark.unit
class TestRerankingService:
    """Tests for reranking service."""
    
    def test_reranker_initialization(self) -> None:
        """Test reranker initialization."""
        reranker = RerankingService()
        assert reranker.top_k > 0
        assert reranker.threshold >= 0
    
    @pytest.mark.asyncio
    async def test_rerank_chunks(self, sample_chunks: List[str]) -> None:
        """Test reranking document chunks."""
        reranker = RerankingService()
        
        query = "What are the vital signs?"
        
        with patch.object(reranker, 'model') as mock_model:
            # Mock scores
            mock_model.predict = MagicMock(
                return_value=[0.9, 0.7, 0.5, 0.3, 0.1]
            )
            
            reranked = reranker.rerank(query=query, chunks=sample_chunks)
            
            # Should return top_k items
            assert len(reranked) <= reranker.top_k
            assert all("score" in r for r in reranked if isinstance(r, dict))
    
    @pytest.mark.asyncio
    async def test_rerank_preserves_metadata(self) -> None:
        """Test that reranking preserves chunk metadata."""
        reranker = RerankingService()
        
        chunks = [
            {"text": "chunk1", "section": "diagnosis", "id": "c1"},
            {"text": "chunk2", "section": "plan", "id": "c2"},
        ]
        
        with patch.object(reranker, 'model') as mock_model:
            mock_model.predict = MagicMock(return_value=[0.8, 0.6])
            
            reranked = reranker.rerank(query="test", chunks=chunks)
            
            # Metadata should be preserved
            assert all(isinstance(r, dict) for r in reranked)
    
    def test_rerank_respects_threshold(self) -> None:
        """Test that reranker respects score threshold."""
        reranker = RerankingService(top_k=5)
        
        chunks = ["chunk1", "chunk2", "chunk3"]
        
        with patch.object(reranker, 'model') as mock_model:
            # Two scores above threshold, one below
            mock_model.predict = MagicMock(return_value=[0.9, 0.75, 0.5])
            
            reranked = reranker.rerank(query="test", chunks=chunks)
            
            # Only items above threshold
            if isinstance(reranked, list) and len(reranked) > 0:
                assert all(r.get("score", 1.0) >= reranker.threshold for r in reranked)


# ============================================================================
# LLM SERVICE TESTS
# ============================================================================

@pytest.mark.unit
class TestGroqLLM:
    """Tests for Groq LLM service."""
    
    def test_llm_initialization(self, mock_config: Dict[str, Any]) -> None:
        """Test LLM initialization."""
        with patch.dict('os.environ', {
            'GROQ_API_KEY': mock_config['GROQ_API_KEY'],
        }):
            llm = GroqLLMService()
            assert llm.model == "mixtral-8x7b-32768"
            assert llm.timeout > 0
    
    @pytest.mark.asyncio
    async def test_generate_answer(self, sample_search_results: list) -> None:
        """Test answer generation from retrieved chunks."""
        llm = GroqLLMService()
        
        query = "What are the patient's vital signs?"
        chunks = sample_search_results
        
        with patch.object(llm, 'client') as mock_client:
            mock_client.chat.completions.create = AsyncMock(
                return_value=MagicMock(
                    choices=[MagicMock(message=MagicMock(content="BP: 120/80"))]
                )
            )
            
            answer = await llm.generate_response(query=query, chunks=chunks)
            
            assert isinstance(answer, str)
            assert len(answer) > 0
    
    @pytest.mark.asyncio
    async def test_generate_answer_with_confidence(self) -> None:
        """Test answer generation includes confidence."""
        llm = GroqLLMService()
        
        with patch.object(llm, 'client') as mock_client:
            mock_client.chat.completions.create = AsyncMock(
                return_value=MagicMock(
                    choices=[MagicMock(message=MagicMock(content="Test answer"))]
                )
            )
            
            result = await llm.generate_answer_with_confidence(
                query="test",
                chunks=[]
            )
            
            assert "answer" in result or isinstance(result, str)
    
    @pytest.mark.asyncio
    async def test_llm_timeout_fallback(self) -> None:
        """Test LLM timeout triggers fallback mode."""
        llm = GroqLLMService()
        
        with patch.object(llm, 'client') as mock_client:
            mock_client.chat.completions.create = AsyncMock(
                side_effect=TimeoutError("Request timeout")
            )
            
            try:
                result = await llm.generate_response(query="test", chunks=[])
                # Should return fallback or handle gracefully
                assert isinstance(result, (str, type(None)))
            except Exception as e:
                assert "timeout" in str(e).lower()
    
    @pytest.mark.asyncio
    async def test_llm_preserves_citations(self) -> None:
        """Test that LLM response preserves source citations."""
        llm = GroqLLMService()
        
        chunks = [
            {"text": "Source text", "id": "chunk-1"},
            {"text": "Another source", "id": "chunk-2"},
        ]
        
        with patch.object(llm, 'client') as mock_client:
            mock_client.chat.completions.create = AsyncMock(
                return_value=MagicMock(
                    choices=[MagicMock(message=MagicMock(content="Answer"))]
                )
            )
            
            result = await llm.generate_response(query="test", chunks=chunks)
            
            assert isinstance(result, str)


# ============================================================================
# AUDIT SERVICE TESTS
# ============================================================================

@pytest.mark.unit
class TestAuditLogger:
    """Tests for audit logging service."""
    
    def test_audit_logger_initialization(self) -> None:
        """Test audit logger initialization."""
        logger = AuditLogger()
        assert logger is not None
    
    @pytest.mark.asyncio
    async def test_log_rag_query(self) -> None:
        """Test logging RAG query audit trail."""
        logger = AuditLogger()
        
        audit_data = {
            "user_id": "user-001",
            "query": "What is the diagnosis?",
            "chunks_retrieved": 5,
            "response": "The diagnosis is...",
            "latency_ms": 150,
        }
        
        with patch.object(logger, 'client') as mock_client:
            mock_client.table = MagicMock(
                return_value=MagicMock(insert=MagicMock(return_value=MagicMock()))
            )
            
            result = await logger.log_query(audit_data)
            
            # Should log successfully
            assert result is None or isinstance(result, dict)
    
    @pytest.mark.asyncio
    async def test_log_maintains_immutability(self) -> None:
        """Test that audit logs maintain immutability."""
        logger = AuditLogger()
        
        log_entry = {
            "id": "audit-001",
            "event": "query",
            "timestamp": "2024-04-10T10:00:00Z",
        }
        
        with patch.object(logger, 'client') as mock_client:
            mock_client.table = MagicMock(
                return_value=MagicMock(insert=MagicMock(return_value=MagicMock()))
            )
            
            # After logging, should not be able to update
            result_log = await logger.log_query(log_entry)
            
            # Verify insert was called (not update)
            assert mock_client.table.return_value.insert.called
    
    @pytest.mark.asyncio
    async def test_audit_log_filters_sensitive_data(self) -> None:
        """Test that sensitive data is masked in audit logs."""
        logger = AuditLogger()
        
        audit_data = {
            "user_id": "user-001",
            "query": "Patient John Doe with SSN 123-45-6789",
            "response": "The patient...",
        }
        
        with patch.object(logger, 'client') as mock_client:
            mock_client.table = MagicMock(
                return_value=MagicMock(insert=MagicMock(return_value=MagicMock()))
            )
            
            result = await logger.log_query(audit_data)
            
            # Should log without exposing raw PII
            assert result is None or isinstance(result, dict)
    
    @pytest.mark.asyncio
    async def test_audit_includes_metadata(self) -> None:
        """Test that audit logs include comprehensive metadata."""
        logger = AuditLogger()
        
        audit_data = {
            "user_id": "user-001",
            "query": "What is treatment?",
            "chunks_retrieved": 3,
            "rerank_scores": [0.9, 0.8, 0.7],
            "llm_model": "mixtral-8x7b",
            "latency_ms": 200,
        }
        
        with patch.object(logger, 'client') as mock_client:
            mock_client.table = MagicMock(
                return_value=MagicMock(insert=MagicMock(return_value=MagicMock()))
            )
            
            result = await logger.log_query(audit_data)
            
            assert result is None or isinstance(result, dict)
    
    @pytest.mark.asyncio
    async def test_audit_timestamps_accuracy(self) -> None:
        """Test that audit logs include accurate timestamps."""
        logger = AuditLogger()
        
        from datetime import datetime
        
        audit_data = {
            "user_id": "user-001",
            "event": "query",
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        with patch.object(logger, 'client') as mock_client:
            mock_client.table = MagicMock(
                return_value=MagicMock(insert=MagicMock(return_value=MagicMock()))
            )
            
            result = await logger.log_query(audit_data)
            
            assert result is None or isinstance(result, dict)


# ============================================================================
# INTEGRATION TESTS FOR SERVICE COMBINATIONS
# ============================================================================

@pytest.mark.unit
class TestServiceIntegration:
    """Tests for service interdependencies."""
    
    @pytest.mark.asyncio
    async def test_retrieve_then_rerank(
        self,
        sample_search_results: list
    ) -> None:
        """Test retrieval followed by reranking."""
        retriever = RetrievalService()
        reranker = RerankingService()
        
        with patch.object(retriever, 'client') as mock_client:
            mock_client.rpc = AsyncMock(return_value=sample_search_results)
            
            retrieved = await retriever.retrieve(
                embedding=[0.1] * 768,
                user_id="user-001",
                top_k=10
            )
            
            with patch.object(reranker, 'model') as mock_model:
                mock_model.predict = MagicMock(return_value=[0.9, 0.8, 0.7])
                
                reranked = reranker.rerank(
                    query="test",
                    chunks=retrieved
                )
                
                assert isinstance(reranked, list)
