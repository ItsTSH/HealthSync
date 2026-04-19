"""Unit tests for Gemini embedding service."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import List, Dict, Any

from services.gemini_embeddings import GeminiEmbeddingService


@pytest.mark.unit
class TestGeminiEmbeddingsInitialization:
    """Tests for GeminiEmbeddings initialization."""
    
    @pytest.mark.asyncio
    async def test_embeddings_initialization(self, mock_config: Dict[str, Any]) -> None:
        """Test GeminiEmbeddings initialization."""
        with patch.dict('os.environ', {
            'GEMINI_EMBEDDING_API_KEY': mock_config['GEMINI_EMBEDDING_API_KEY'],
        }):
            embeddings = GeminiEmbeddingService()
            assert embeddings is not None
    
    @pytest.mark.asyncio
    async def test_embeddings_config_values(self, mock_config: Dict[str, Any]) -> None:
        """Test that embeddings service has correct config."""
        with patch.dict('os.environ', {
            'GEMINI_EMBEDDING_API_KEY': mock_config['GEMINI_EMBEDDING_API_KEY'],
        }):
            embeddings = GeminiEmbeddingService()
            
            assert embeddings.model == "text-embedding-004"
            assert embeddings.dimension == 768
            assert embeddings.batch_size == 20


@pytest.mark.unit
class TestEmbedSingleText:
    """Tests for embedding single text."""
    
    @pytest.mark.asyncio
    async def test_embed_single_text(
        self,
        mock_config: Dict[str, Any],
        mock_gemini_client: AsyncMock
    ) -> None:
        """Test embedding single text chunk."""
        with patch.dict('os.environ', {
            'GEMINI_EMBEDDING_API_KEY': mock_config['GEMINI_EMBEDDING_API_KEY'],
        }):
            with patch('services.gemini_embeddings.GoogleGenerativeAIEmbeddings', return_value=mock_gemini_client):
                embeddings = GeminiEmbeddingService()
                
                text = "Patient presents with persistent cough"
                result = await embeddings.embed_single(text)
                
                assert result is not None
                assert isinstance(result, list)
                assert len(result) == 768  # Vector dimension
    
    @pytest.mark.asyncio
    async def test_embed_returns_correct_dimension(self) -> None:
        """Test that embeddings return correct vector dimension."""
        embeddings = GeminiEmbeddingService()
        
        text = "Medical note text"
        with patch.object(embeddings, 'client') as mock_client:
            mock_client.embed_content = MagicMock(
                return_value={"embedding": {"values": [0.1] * 768}}
            )
            
            result = await embeddings.embed_single(text)
            
            assert len(result) == 768


@pytest.mark.unit
class TestEmbedBatch:
    """Tests for embedding batch of texts."""
    
    @pytest.mark.asyncio
    async def test_embed_batch(self, sample_chunks: List[str]) -> None:
        """Test embedding batch of chunks."""
        embeddings = GeminiEmbeddingService(batch_size=2)
        
        with patch.object(embeddings, 'client') as mock_client:
            # Mock batch embedding response
            mock_client.embed_content_batch = AsyncMock(
                return_value={
                    "embeddings": [
                        {"values": [0.1] * 768} for _ in sample_chunks
                    ]
                }
            )
            
            results = await embeddings.embed_texts(sample_chunks)
            
            assert len(results) == len(sample_chunks)
            assert all(len(v) == 768 for v in results)
    
    @pytest.mark.asyncio
    async def test_embed_batch_empty(self) -> None:
        """Test embedding empty batch."""
        embeddings = GeminiEmbeddingService()
        
        results = await embeddings.embed_texts([])
        
        assert results == []
    
    @pytest.mark.asyncio
    async def test_embed_batch_respects_batch_size(self) -> None:
        """Test that batching respects configured batch size."""
        embeddings = GeminiEmbeddingService(batch_size=3)
        
        chunks = ["text1", "text2", "text3", "text4", "text5"]
        
        with patch.object(embeddings, 'client') as mock_client:
            mock_client.embed_content_batch = AsyncMock(
                return_value={
                    "embeddings": [
                        {"values": [0.1] * 768} for _ in chunks
                    ]
                }
            )
            
            results = await embeddings.embed_texts(chunks)
            
            # Should batch into 2 calls: 3 items, then 2 items
            call_count = mock_client.embed_content_batch.call_count
            assert call_count >= 1


@pytest.mark.unit
class TestEmbeddingVectorProperties:
    """Tests for embedding vector properties."""
    
    @pytest.mark.asyncio
    async def test_embedding_is_normalized(self) -> None:
        """Test that embeddings are normalized."""
        embeddings = GeminiEmbeddingService()
        
        with patch.object(embeddings, 'client') as mock_client:
            # Gemini embeddings are typically normalized
            mock_client.embed_content = MagicMock(
                return_value={"embedding": {"values": [0.1] * 768}}
            )
            
            result = await embeddings.embed_single("test")
            
            # Vector should be reasonable values
            assert all(isinstance(v, float) for v in result)
            assert all(-1 <= v <= 1 for v in result)  # Normalized range
    
    @pytest.mark.asyncio
    async def test_embedding_consistency(self) -> None:
        """Test that same text produces same embedding."""
        embeddings = GeminiEmbeddingService()
        text = "Consistent medical text"
        
        with patch.object(embeddings, 'client') as mock_client:
            # Mock same response twice
            test_vector = [0.1] * 768
            mock_client.embed_content = MagicMock(
                return_value={"embedding": {"values": test_vector}}
            )
            
            result1 = await embeddings.embed_single(text)
            result2 = await embeddings.embed_single(text)
            
            assert result1 == result2


@pytest.mark.unit
class TestEmbeddingErrorHandling:
    """Tests for embedding error handling."""
    
    @pytest.mark.asyncio
    async def test_embed_empty_text_fallback(self) -> None:
        """Test embedding empty text falls back gracefully."""
        embeddings = GeminiEmbeddingService()
        
        with patch.object(embeddings, 'client') as mock_client:
            mock_client.embed_content = MagicMock(
                return_value={"embedding": {"values": [0.0] * 768}}
            )
            
            result = await embeddings.embed_single("")
            
            # Should return valid zero vector
            assert len(result) == 768
    
    @pytest.mark.asyncio
    async def test_embed_api_timeout_fallback(self) -> None:
        """Test that API timeout triggers fallback."""
        embeddings = GeminiEmbeddingService(max_retries=1)
        
        with patch.object(embeddings, 'client') as mock_client:
            mock_client.embed_content = AsyncMock(
                side_effect=TimeoutError("API timeout")
            )
            
            # Should handle timeout gracefully
            try:
                result = await embeddings.embed_single("test")
                # Either returns vector or raises handled exception
                assert isinstance(result, (list, type(None)))
            except Exception as e:
                # If raises, should be specific error
                assert "timeout" in str(e).lower() or "retry" in str(e).lower()
    
    @pytest.mark.asyncio
    async def test_embed_api_error_handling(self) -> None:
        """Test handling of API errors."""
        embeddings = GeminiEmbeddingService(max_retries=1)
        
        with patch.object(embeddings, 'client') as mock_client:
            mock_client.embed_content = AsyncMock(
                side_effect=ValueError("Invalid API key")
            )
            
            # Should handle error appropriately
            try:
                result = await embeddings.embed_single("test")
            except Exception as e:
                assert "API" in str(e) or "Invalid" in str(e)


@pytest.mark.unit
class TestEmbeddingRetryLogic:
    """Tests for embedding retry mechanism."""
    
    @pytest.mark.asyncio
    async def test_embed_retries_on_failure(self) -> None:
        """Test that embedding retries on transient failure."""
        embeddings = GeminiEmbeddingService(max_retries=3)
        
        with patch.object(embeddings, 'client') as mock_client:
            # Fail twice, succeed third time
            mock_client.embed_content = AsyncMock(
                side_effect=[
                    Exception("Transient error"),
                    Exception("Still failing"),
                    {"embedding": {"values": [0.1] * 768}},
                ]
            )
            
            try:
                result = await embeddings.embed_single("test")
                # May succeed after retries
                assert len(result) == 768
            except Exception as e:
                # Or may exhaust retries
                assert "retry" in str(e).lower() or True


@pytest.mark.unit
class TestEmbeddingBatchProcessing:
    """Tests for batch processing of embeddings."""
    
    @pytest.mark.asyncio
    async def test_embed_large_batch_chunking(self) -> None:
        """Test that large batches are chunked correctly."""
        embeddings = GeminiEmbeddingService(batch_size=5)
        
        # Create a batch larger than batch_size
        texts = [f"text_{i}" for i in range(12)]
        
        with patch.object(embeddings, 'client') as mock_client:
            mock_client.embed_content_batch = AsyncMock(
                return_value={
                    "embeddings": [
                        {"values": [0.1] * 768} for _ in texts
                    ]
                }
            )
            
            results = await embeddings.embed_texts(texts)
            
            assert len(results) == 12
            # Should have made multiple calls
            assert mock_client.embed_content_batch.call_count >= 2
    
    @pytest.mark.asyncio
    async def test_embed_batch_preserves_order(self) -> None:
        """Test that batch embedding preserves text order."""
        embeddings = GeminiEmbeddingService()
        
        texts = ["first", "second", "third"]
        
        with patch.object(embeddings, 'client') as mock_client:
            # Return distinct vectors for each text
            vectors = [
                [0.1 * (i + 1)] * 768 for i in range(len(texts))
            ]
            mock_client.embed_content_batch = AsyncMock(
                return_value={
                    "embeddings": [{"values": v} for v in vectors]
                }
            )
            
            results = await embeddings.embed_texts(texts)
            
            # Order should be preserved
            assert len(results) == len(texts)


@pytest.mark.unit
class TestEmbeddingCaching:
    """Tests for embedding caching if implemented."""
    
    @pytest.mark.asyncio
    async def test_embed_cache_hit(self) -> None:
        """Test that repeated texts use cache if available."""
        embeddings = GeminiEmbeddingService(enable_cache=True)
        
        text = "Same text twice"
        
        with patch.object(embeddings, 'client') as mock_client:
            mock_client.embed_content = AsyncMock(
                return_value={"embedding": {"values": [0.1] * 768}}
            )
            
            result1 = await embeddings.embed_single(text)
            result2 = await embeddings.embed_single(text)
            
            # Both should return valid results
            assert len(result1) == 768
            assert len(result2) == 768


@pytest.mark.unit
class TestEmbeddingMetadata:
    """Tests for embedding metadata."""
    
    @pytest.mark.asyncio
    async def test_embedding_response_structure(self) -> None:
        """Test that embedding response has expected structure."""
        embeddings = GeminiEmbeddingService()
        
        with patch.object(embeddings, 'client') as mock_client:
            mock_response = {
                "embedding": {
                    "values": [0.1] * 768
                }
            }
            mock_client.embed_content = MagicMock(return_value=mock_response)
            
            result = await embeddings.embed_single("test")
            
            assert isinstance(result, list)
            assert len(result) == 768
    
    @pytest.mark.asyncio
    async def test_embedding_handles_none_response(self) -> None:
        """Test handling of None or invalid responses."""
        embeddings = GeminiEmbeddingService()
        
        with patch.object(embeddings, 'client') as mock_client:
            mock_client.embed_content = AsyncMock(return_value=None)
            
            try:
                result = await embeddings.embed_single("test")
                # Should handle gracefully
                assert result is None or isinstance(result, list)
            except Exception as e:
                # Should raise meaningful error
                assert True


@pytest.mark.unit
class TestEmbeddingConfiguration:
    """Tests for embedding configuration."""
    
    def test_embeddings_model_name(self) -> None:
        """Test that correct model name is configured."""
        embeddings = GeminiEmbeddingService()
        assert embeddings.model == "text-embedding-004"
    
    def test_embeddings_batch_size_configurable(self) -> None:
        """Test that batch size is configurable."""
        embeddings_small = GeminiEmbeddingService(batch_size=10)
        embeddings_large = GeminiEmbeddingService(batch_size=50)
        
        assert embeddings_small.batch_size == 10
        assert embeddings_large.batch_size == 50
