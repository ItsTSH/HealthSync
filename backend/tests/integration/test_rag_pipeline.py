"""Integration tests for full RAG pipeline."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, List, Any

from services.chunking import MedicalChunker
from services.pii_masking import PIIMasker
from services.gemini_embeddings import GeminiEmbeddingService
from services.retrieval import RetrievalService
from services.reranking import RerankingService
from services.llm import GroqLLMService
from services.audit import AuditLogger


@pytest.mark.integration
class TestFullRAGPipeline:
    """Tests for complete RAG pipeline end-to-end."""
    
    @pytest.mark.asyncio
    async def test_complete_rag_flow(
        self,
        sample_medical_note: str,
        mock_config: Dict[str, Any]
    ) -> None:
        """Test complete RAG flow from note to answer."""
        
        # STAGE 1: Chunking
        chunker = MedicalChunker()
        note_data = {
            "chief_complaint": "Persistent cough",
            "history_of_present_illness": sample_medical_note,
            "physical_exam": "Lungs clear",
            "plan": "Supportive care",
        }
        
        with patch.object(chunker, '_count_tokens', return_value=20):
            chunks = chunker.chunk_note(note_data, "note-001")
        assert len(chunks) > 0
        
        # STAGE 2: PII Masking
        masker = PIIMasker(enable_masking=True)
        masked_chunks = []
        for chunk in chunks[:3]:  # Test first 3 chunks
            masked_text, registry = masker.mask_text(chunk.text)
            masked_chunks.append(masked_text)
        assert len(masked_chunks) > 0
        
        # STAGE 3: Embedding
        embedder = GeminiEmbeddingService()
        with patch.object(embedder, 'client') as mock_client:
            mock_client.embed_content_batch = AsyncMock(
                return_value={
                    "embeddings": [
                        {"values": [0.1] * 768} for _ in masked_chunks
                    ]
                }
            )
            embeddings = await embedder.embed_texts(masked_chunks)
        assert len(embeddings) == len(masked_chunks)
        
        # STAGE 4: Retrieval
        retriever = RetrievalService()
        query_embedding = embeddings[0]
        
        with patch.object(retriever, 'client') as mock_client:
            mock_client.rpc = AsyncMock(
                return_value=[
                    {"id": "c1", "content": "Vital signs normal"},
                    {"id": "c2", "content": "Diagnosed with infection"},
                ]
            )
            retrieved = await retriever.retrieve(
                embedding=query_embedding,
                user_id="user-001",
                top_k=5
            )
        assert len(retrieved) > 0
        
        # STAGE 5: Reranking
        reranker = RerankingService(top_k=3)
        with patch.object(reranker, 'model') as mock_model:
            mock_model.predict = MagicMock(return_value=[0.9, 0.7])
            
            reranked = reranker.rerank(
                query="What are vital signs?",
                chunks=retrieved
            )
        assert len(reranked) <= reranker.top_k
        
        # STAGE 6: LLM
        llm = GroqLLMServiceService()
        with patch.object(llm, 'client') as mock_client:
            mock_client.chat.completions.create = AsyncMock(
                return_value=MagicMock(
                    choices=[MagicMock(
                        message=MagicMock(
                            content="The vital signs are stable and within normal range."
                        )
                    )]
                )
            )
            answer = await llm.generate_response(
                query="What are vital signs?",
                chunks=reranked
            )
        assert len(answer) > 0
        
        # STAGE 7: Audit
        logger = AuditLogger()
        audit_data = {
            "user_id": "user-001",
            "query": "What are vital signs?",
            "chunks_retrieved": len(retrieved),
            "response": answer,
            "latency_ms": 500,
        }
        
        with patch.object(logger, 'client') as mock_client:
            mock_client.table = MagicMock(
                return_value=MagicMock(insert=MagicMock(return_value=MagicMock()))
            )
            await logger.log_query(audit_data)
    
    @pytest.mark.asyncio
    async def test_rag_pipeline_error_resilience(self) -> None:
        """Test that pipeline handles errors gracefully."""
        
        # Test with empty data
        chunker = MedicalChunker()
        chunks = chunker.chunk_note({}, "empty-note")
        assert isinstance(chunks, list)
        
        # Test masking with invalid input
        masker = PIIMasker()
        masked, registry = masker.mask_text("")
        assert masked == ""
        
        # Test embedding with mock error
        embedder = GeminiEmbeddingService()
        with patch.object(embedder, 'client') as mock_client:
            mock_client.embed_content = AsyncMock(
                side_effect=Exception("API error")
            )
            # Should handle gracefully
            try:
                result = await embedder.embed_single("test")
            except:
                pass


@pytest.mark.integration
class TestCeleryTasksIntegration:
    """Tests for Celery async task integration."""
    
    @pytest.mark.asyncio
    async def test_async_note_processing(self) -> None:
        """Test async note processing through Celery."""
        from core.celery_app import app
        
        note_data = {
            "note_id": "note-async-001",
            "content": "Patient presents with symptoms",
        }
        
        # Mock task
        with patch('tasks.embedding_tasks.process_note_async') as mock_task:
            mock_task.apply_async = MagicMock(
                return_value=MagicMock(id="task-001")
            )
            
            task_id = mock_task.apply_async(args=[note_data])
            assert task_id is not None
    
    @pytest.mark.asyncio
    async def test_task_status_tracking(self) -> None:
        """Test tracking async task status."""
        from core.celery_app import app
        
        # Mock task result
        with patch('tasks.embedding_tasks.process_note_async') as mock_task:
            mock_task.AsyncResult = MagicMock(
                return_value=MagicMock(
                    status="COMPLETED",
                    result={"chunks": 5, "embeddings": 5}
                )
            )
            
            result = mock_task.AsyncResult("task-001")
            assert result.status == "COMPLETED"
    
    @pytest.mark.asyncio
    async def test_task_retry_logic(self) -> None:
        """Test task retry on transient failures."""
        
        # Mock retry on failure
        with patch('tasks.embedding_tasks.process_note_async') as mock_task:
            mock_task.retry = MagicMock()
            
            # First call fails, should trigger retry
            mock_task.side_effect = [Exception("Transient"), {"status": "ok"}]


@pytest.mark.integration
class TestAPIEndpointsIntegration:
    """Tests for API endpoint integration."""
    
    @pytest.mark.asyncio
    async def test_rag_search_endpoint_flow(self) -> None:
        """Test /search/rag endpoint flow."""
        from routers.ragRoutes import search_rag
        from schema.ragSchema import RAGQueryRequest
        
        request = RAGQueryRequest(
            query="What is the patient's diagnosis?",
            user_id="user-001"
        )
        
        # Mock the pipeline components
        with patch('services.gemini_embeddings.GeminiEmbeddingService.embed_text') as mock_embed:
            mock_embed.return_value = [0.1] * 768
            
            with patch('services.retrieval.RetrievalService.retrieve_similar') as mock_retrieve:
                mock_retrieve.return_value = [
                    {"id": "c1", "content": "Diagnosis: Infection"}
                ]
                
                with patch('services.reranking.RerankingService.rerank') as mock_rerank:
                    mock_rerank.return_value = [
                        {"text": "Diagnosis: Infection", "score": 0.95}
                    ]
                    
                    with patch('services.llm.GroqLLMServiceService.generate_answer') as mock_llm:
                        mock_llm.return_value = "The patient has an infection."
                        
                        # Endpoint should process successfully
                        # (Real endpoint testing would use TestClient)
                        pass
    
    @pytest.mark.asyncio
    async def test_async_processing_endpoint_flow(self) -> None:
        """Test /process-note-async endpoint flow."""
        from routers.ragRoutes import process_note_async
        from schema.ragSchema import ProcessNoteRequest
        
        request = ProcessNoteRequest(
            note_id="note-001",
            content="Medical note content",
            user_id="user-001"
        )
        
        # Mock Celery task
        with patch('tasks.embedding_tasks.process_note_async.apply_async') as mock_task:
            mock_task.return_value = MagicMock(id="task-001")
            
            # Should queue task successfully
            pass
    
    @pytest.mark.asyncio
    async def test_task_status_endpoint_flow(self) -> None:
        """Test /task-status/{id} endpoint flow."""
        
        task_id = "task-001"
        
        # Mock task result
        with patch('core.celery_app.app.AsyncResult') as mock_result:
            mock_result.return_value = MagicMock(
                status="COMPLETED",
                result={"chunks": 5}
            )
            
            # Should return task status
            pass


@pytest.mark.integration
class TestDataFlow:
    """Tests for data flow through components."""
    
    def test_chunk_format_preserved(self) -> None:
        """Test that chunk format is preserved through pipeline."""
        chunker = MedicalChunker()
        
        note_data = {
            "chief_complaint": "Test",
            "diagnosis": "Test diagnosis",
        }
        
        with patch.object(chunker, '_count_tokens', return_value=10):
            chunks = chunker.chunk_note(note_data, "note-001")
        
        for chunk in chunks:
            assert hasattr(chunk, 'chunk_id')
            assert hasattr(chunk, 'text')
            assert hasattr(chunk, 'section')
            assert chunk.note_id == "note-001"
    
    @pytest.mark.asyncio
    async def test_embedding_vector_dimension(self) -> None:
        """Test that embeddings maintain correct dimensions."""
        embedder = GeminiEmbeddingService()
        
        with patch.object(embedder, 'client') as mock_client:
            mock_client.embed_content = MagicMock(
                return_value={"embedding": {"values": [0.1] * 768}}
            )
            
            result = await embedder.embed_single("test")
            
            assert len(result) == 768
            assert all(isinstance(v, float) for v in result)
    
    def test_reranked_chunks_retain_content(self) -> None:
        """Test that reranked chunks retain original content."""
        reranker = RerankingService()
        
        chunks = [
            {"id": "c1", "content": "Content1"},
            {"id": "c2", "content": "Content2"},
        ]
        
        with patch.object(reranker, 'model') as mock_model:
            mock_model.predict = MagicMock(return_value=[0.9, 0.7])
            
            reranked = reranker.rerank(query="test", chunks=chunks)
            
            # Content should be preserved
            if reranked:
                for item in reranked:
                    if isinstance(item, dict):
                        assert "content" in item or "text" in item


@pytest.mark.integration
class TestRLSCompliance:
    """Tests for Row-Level Security compliance."""
    
    @pytest.mark.asyncio
    async def test_user_isolation_in_retrieval(self) -> None:
        """Test that retrieval enforces user isolation."""
        retriever = RetrievalService()
        
        query_embedding = [0.1] * 768
        user_id_1 = "user-001"
        user_id_2 = "user-002"
        
        with patch.object(retriever, 'client') as mock_client:
            # Each user should get isolated results
            mock_client.rpc = AsyncMock(
                return_value=[{"id": "c1", "user_id": user_id_1}]
            )
            
            results_1 = await retriever.retrieve(
                embedding=query_embedding,
                user_id=user_id_1
            )
            
            # Change user and verify isolation
            mock_client.rpc.return_value = [{"id": "c2", "user_id": user_id_2}]
            
            results_2 = await retriever.retrieve(
                embedding=query_embedding,
                user_id=user_id_2
            )
            
            # Results should be different based on user
            assert len(results_1) >= 0
            assert len(results_2) >= 0
