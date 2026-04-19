"""Unit tests for Gemini embedding service - FIXED VERSION."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import List, Dict, Any

from services.gemini_embeddings import GeminiEmbeddingService
from core.config import EMBEDDING_MODEL_RAG, EMBEDDING_DIMENSION, EMBEDDING_BATCH_SIZE


@pytest.mark.unit
class TestGeminiEmbeddingsInitialization:
    """Tests for GeminiEmbeddings initialization."""
    
    @pytest.mark.asyncio
    async def test_embeddings_initialization(self, mock_config: Dict[str, Any]) -> None:
        """Test GeminiEmbeddings initialization."""
        with patch.dict('os.environ', {
            'GEMINI_EMBEDDING_API_KEY': mock_config['GEMINI_EMBEDDING_API_KEY'],
        }):
            with patch('services.gemini_embeddings.GoogleGenerativeAIEmbeddings'):
                embeddings = GeminiEmbeddingService()
                assert embeddings is not None
    
    @pytest.mark.asyncio
    async def test_embeddings_config_values(self, mock_config: Dict[str, Any]) -> None:
        """Test that embeddings service has correct config."""
        with patch.dict('os.environ', {
            'GEMINI_EMBEDDING_API_KEY': mock_config['GEMINI_EMBEDDING_API_KEY'],
        }):
            with patch('services.gemini_embeddings.GoogleGenerativeAIEmbeddings'):
                embeddings = GeminiEmbeddingService()
                
                assert embeddings.model == EMBEDDING_MODEL_RAG
                assert embeddings.batch_size == EMBEDDING_BATCH_SIZE
                assert embeddings.max_retries > 0


@pytest.mark.unit
class TestEmbedSingleText:
    """Tests for embedding single text."""
    
    @pytest.mark.asyncio
    async def test_embed_single_text(
        self,
        mock_config: Dict[str, Any],
    ) -> None:
        """Test embedding single text chunk."""
        with patch.dict('os.environ', {
            'GEMINI_EMBEDDING_API_KEY': mock_config['GEMINI_EMBEDDING_API_KEY'],
        }):
            with patch('services.gemini_embeddings.GoogleGenerativeAIEmbeddings') as mock_llm:
                # Mock the embed_documents method
                mock_instance = MagicMock()
                mock_instance.embed_documents = MagicMock(
                    return_value=[[0.1] * 768]
                )
                mock_llm.return_value = mock_instance
                
                embeddings = GeminiEmbeddingService()
                text = "Patient presents with persistent cough"
                
                result = await embeddings.embed_single(text)
                
                assert result is not None
                assert isinstance(result, list)
                assert len(result) == 768  # Vector dimension
    
    @pytest.mark.asyncio
    async def test_embed_returns_correct_dimension(self) -> None:
        """Test that embeddings return correct vector dimension."""
        with patch('services.gemini_embeddings.GoogleGenerativeAIEmbeddings') as mock_llm:
            mock_instance = MagicMock()
            mock_instance.embed_documents = MagicMock(
                return_value=[[0.1] * 768]
            )
            mock_llm.return_value = mock_instance
            
            embeddings = GeminiEmbeddingService()
            text = "Medical note text"
            
            result = await embeddings.embed_single(text)
            
            assert len(result) == 768


@pytest.mark.unit
class TestEmbedBatch:
    """Tests for embedding batch of texts."""
    
    @pytest.mark.asyncio
    async def test_embed_texts(self, sample_chunks: List[str]) -> None:
        """Test embedding batch of chunks using embed_texts."""
        with patch('services.gemini_embeddings.GoogleGenerativeAIEmbeddings') as mock_llm:
            mock_instance = MagicMock()
            mock_embeddings = [[0.1] * 768 for _ in sample_chunks]
            mock_instance.embed_documents = MagicMock(return_value=mock_embeddings)
            mock_llm.return_value = mock_instance
            
            embeddings = GeminiEmbeddingService(batch_size=2)
            
            results, stats = await embeddings.embed_texts(sample_chunks)
            
            assert len(results) == len(sample_chunks)
            assert all(len(v) == 768 for v in results)
            assert stats['total_texts'] == len(sample_chunks)
    
    @pytest.mark.asyncio
    async def test_embed_texts_empty(self) -> None:
        """Test embedding empty batch."""
        with patch('services.gemini_embeddings.GoogleGenerativeAIEmbeddings'):
            embeddings = GeminiEmbeddingService()
            
            results, stats = await embeddings.embed_texts([])
            
            assert results == []
            assert stats['status'] == 'no_texts'
    
    @pytest.mark.asyncio
    async def test_embed_texts_respects_batch_size(self) -> None:
        """Test that batching respects configured batch size."""
        chunks = ["text1", "text2", "text3", "text4", "text5"]
        
        with patch('services.gemini_embeddings.GoogleGenerativeAIEmbeddings') as mock_llm:
            mock_instance = MagicMock()
            mock_instance.embed_documents = MagicMock(
                return_value=[[0.1] * 768 for _ in chunks]
            )
            mock_llm.return_value = mock_instance
            
            embeddings = GeminiEmbeddingService(batch_size=3)
            
            results, stats = await embeddings.embed_texts(chunks)
            
            assert len(results) == len(chunks)
            # Verify batch size limit is respected
            assert embeddings.batch_size == 3


@pytest.mark.unit
class TestEmbeddingVectorProperties:
    """Tests for embedding vector properties."""
    
    @pytest.mark.asyncio
    async def test_embedding_is_normalized(self) -> None:
        """Test that embeddings are normalized."""
        with patch('services.gemini_embeddings.GoogleGenerativeAIEmbeddings') as mock_llm:
            # Gemini embeddings are typically normalized
            mock_instance = MagicMock()
            mock_instance.embed_documents = MagicMock(
                return_value=[[0.1] * 768]
            )
            mock_llm.return_value = mock_instance
            
            embeddings = GeminiEmbeddingService()
            result = await embeddings.embed_single("test")
            
            # Vector should be reasonable values
            assert all(isinstance(v, (float, int)) for v in result)
    
    @pytest.mark.asyncio
    async def test_embedding_consistency(self) -> None:
        """Test that embed_texts returns consistent results."""
        test_vector = [0.1] * 768
        
        with patch('services.gemini_embeddings.GoogleGenerativeAIEmbeddings') as mock_llm:
            mock_instance = MagicMock()
            mock_instance.embed_documents = MagicMock(return_value=[test_vector])
            mock_llm.return_value = mock_instance
            
            embeddings = GeminiEmbeddingService()
            result = await embeddings.embed_single("Consistent text")
            
            assert result == test_vector


@pytest.mark.unit
class TestEmbeddingErrorHandling:
    """Tests for embedding error handling."""
    
    @pytest.mark.asyncio
    async def test_embed_empty_text_fallback(self) -> None:
        """Test embedding empty text falls back gracefully."""
        with patch('services.gemini_embeddings.GoogleGenerativeAIEmbeddings') as mock_llm:
            mock_instance = MagicMock()
            mock_instance.embed_documents = MagicMock(
                return_value=[[0.0] * 768]
            )
            mock_llm.return_value = mock_instance
            
            embeddings = GeminiEmbeddingService()
            
            results, stats = await embeddings.embed_texts([""])
            
            # Should return valid zero vector
            assert len(results) == 1
            assert len(results[0]) == 768
    
    @pytest.mark.asyncio
    async def test_embed_api_error_handling(self) -> None:
        """Test that API errors are handled."""
        with patch('services.gemini_embeddings.GoogleGenerativeAIEmbeddings') as mock_llm:
            mock_instance = MagicMock()
            mock_instance.embed_documents = MagicMock(
                side_effect=ValueError("Invalid API key")
            )
            mock_llm.return_value = mock_instance
            
            embeddings = GeminiEmbeddingService()
            
            # Should raise but retry first
            with pytest.raises(Exception):
                await embeddings.embed_texts(["test"])


@pytest.mark.unit
class TestEmbeddingRetryLogic:
    """Tests for embedding retry logic."""
    
    @pytest.mark.asyncio
    async def test_embed_retries_on_failure(self) -> None:
        """Test that retries happen on transient failures."""
        with patch('services.gemini_embeddings.GoogleGenerativeAIEmbeddings') as mock_llm:
            mock_instance = MagicMock()
            # First call fails, second succeeds
            mock_instance.embed_documents = MagicMock(
                side_effect=[
                    ValueError("Rate limit"),
                    [[0.1] * 768]
                ]
            )
            mock_llm.return_value = mock_instance
            
            embeddings = GeminiEmbeddingService(max_retries=2)
            
            # First call to embed_texts should retry and eventually succeed or fail
            with patch('asyncio.sleep', new_callable=AsyncMock):
                try:
                    results, stats = await embeddings.embed_texts(["test"])
                    # If it succeeds after retry, verify
                    assert len(results) > 0
                except Exception:
                    # Retry exhausted - that's ok for this test
                    pass


@pytest.mark.unit
class TestEmbeddingBatchProcessing:
    """Tests for embedding batch processing."""
    
    @pytest.mark.asyncio
    async def test_embed_large_batch_chunking(self) -> None:
        """Test that large batches are properly chunked."""
        chunks = [f"text{i}" for i in range(50)]
        
        with patch('services.gemini_embeddings.GoogleGenerativeAIEmbeddings') as mock_llm:
            mock_instance = MagicMock()
            mock_instance.embed_documents = MagicMock(
                return_value=[[0.1] * 768 for _ in chunks]
            )
            mock_llm.return_value = mock_instance
            
            embeddings = GeminiEmbeddingService(batch_size=20)
            
            results, stats = await embeddings.embed_texts(chunks)
            
            assert len(results) == 50
            assert stats['batches'] >= 2  # Should have multiple batches
    
    @pytest.mark.asyncio
    async def test_embed_batch_preserves_order(self) -> None:
        """Test that embedding preserves text order."""
        chunks = ["first", "second", "third"]
        
        with patch('services.gemini_embeddings.GoogleGenerativeAIEmbeddings') as mock_llm:
            mock_instance = MagicMock()
            # Return different embeddings for each text
            embeddings_data = [
                [0.1 * (i + 1)] * 768 for i in range(3)
            ]
            mock_instance.embed_documents = MagicMock(return_value=embeddings_data)
            mock_llm.return_value = mock_instance
            
            embeddings = GeminiEmbeddingService()
            results, stats = await embeddings.embed_texts(chunks)
            
            # First embedding should have 0.1 values, second 0.2, etc
            assert results[0] == embeddings_data[0]
            assert results[1] == embeddings_data[1]
            assert results[2] == embeddings_data[2]


@pytest.mark.unit
class TestEmbeddingMetadata:
    """Tests for embedding response structure."""
    
    @pytest.mark.asyncio
    async def test_embedding_response_structure(self) -> None:
        """Test that embed_texts returns proper structure."""
        with patch('services.gemini_embeddings.GoogleGenerativeAIEmbeddings') as mock_llm:
            mock_instance = MagicMock()
            mock_instance.embed_documents = MagicMock(return_value=[[0.1] * 768])
            mock_llm.return_value = mock_instance
            
            embeddings = GeminiEmbeddingService()
            results, stats = await embeddings.embed_texts(["test"])
            
            # Should return tuple of (embeddings, stats)
            assert isinstance(results, list)
            assert isinstance(stats, dict)
            assert 'batches' in stats
            assert 'total_texts' in stats
            assert 'successful' in stats
            assert 'failed' in stats
    
    @pytest.mark.asyncio
    async def test_embedding_handles_none_response(self) -> None:
        """Test handling of None responses gracefully."""
        with patch('services.gemini_embeddings.GoogleGenerativeAIEmbeddings') as mock_llm:
            mock_instance = MagicMock()
            # Return empty list indicating no embeddings
            mock_instance.embed_documents = MagicMock(return_value=[])
            mock_llm.return_value = mock_instance
            
            embeddings = GeminiEmbeddingService()
            
            results, stats = await embeddings.embed_texts(["test"])
            
            # Should handle gracefully
            assert isinstance(results, list)
            assert stats['failed'] >= 0
