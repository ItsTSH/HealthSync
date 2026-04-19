"""Gemini embedding service for batch text embeddings

Uses Google's text-embedding-004 model via LangChain for high-quality
768-dimensional embeddings optimized for medical text similarity.
"""
import logging
import asyncio
from typing import List, Tuple, Dict, Optional
import time

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from core.config import (
    GEMINI_EMBEDDING_API_KEY,
    EMBEDDING_MODEL_RAG,
    EMBEDDING_DIMENSION,
    EMBEDDING_BATCH_SIZE,
    EMBEDDING_RETRY_MAX,
    EMBEDDING_TIMEOUT_SECONDS,
)

logger = logging.getLogger(__name__)


class GeminiEmbeddingService:
    """
    Batch embedding service using Gemini API.
    
    Features:
    - Batch processing (up to 100 embeddings per request)
    - Automatic retry with exponential backoff
    - Token counting for cost tracking
    - Timeout protection
    """
    
    def __init__(
        self,
        api_key: str = GEMINI_EMBEDDING_API_KEY,
        model: str = EMBEDDING_MODEL_RAG,
        batch_size: int = EMBEDDING_BATCH_SIZE,
        max_retries: int = EMBEDDING_RETRY_MAX,
        timeout: int = EMBEDDING_TIMEOUT_SECONDS,
    ):
        """
        Initialize Gemini embedding service.
        
        Args:
            api_key: Gemini API key
            model: Model name (text-embedding-004)
            batch_size: Batch size for embeddings (1-100)
            max_retries: Maximum retries on failure
            timeout: Timeout per request in seconds
        """
        if not api_key:
            raise ValueError("GEMINI_EMBEDDING_API_KEY is required")
        
        self.api_key = api_key
        self.model = model
        self.batch_size = min(batch_size, 100)  # Cap at API limit
        self.max_retries = max_retries
        self.timeout = timeout
        self.embedding_stats = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "total_texts": 0,
            "total_tokens": 0,
        }
        
        # Initialize LangChain embeddings
        try:
            self.embeddings_model = GoogleGenerativeAIEmbeddings(
                model=model,
                google_api_key=api_key,
            )
            logger.info(f"✅ Initialized Gemini embeddings: {model}")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini embeddings: {e}")
            raise
    
    async def embed_texts(self, texts: List[str]) -> Tuple[List[List[float]], Dict]:
        """
        Embed multiple texts using Gemini API with batching.
        
        Args:
            texts: List of texts to embed
            
        Returns:
            (embeddings, stats) where embeddings[i] is the vector for texts[i]
            
        Raises:
            Exception: If embedding fails after max retries
        """
        if not texts:
            return [], {"status": "no_texts"}
        
        logger.info(f"Embedding {len(texts)} texts (batch_size={self.batch_size})")
        
        all_embeddings = []
        batch_stats = {
            "batches": 0,
            "total_texts": len(texts),
            "total_tokens": 0,
            "successful": 0,
            "failed": 0,
            "duration_seconds": 0,
        }
        
        start_time = time.time()
        
        # Process in batches
        for i in range(0, len(texts), self.batch_size):
            batch = texts[i : i + self.batch_size]
            batch_idx = (i // self.batch_size) + 1
            num_batches = (len(texts) + self.batch_size - 1) // self.batch_size
            
            logger.info(f"Processing batch {batch_idx}/{num_batches}")
            
            try:
                embed_result = await self._embed_batch_with_retry(batch)
                all_embeddings.extend(embed_result["embeddings"])
                batch_stats["batches"] += 1
                batch_stats["successful"] += 1
                batch_stats["total_tokens"] += embed_result.get("tokens", 0)
            except Exception as e:
                logger.error(f"Failed to embed batch {batch_idx}: {str(e)}")
                batch_stats["failed"] += 1
                raise
        
        batch_stats["duration_seconds"] = time.time() - start_time
        
        # Update global stats
        self.embedding_stats["total_requests"] += 1
        self.embedding_stats["successful_requests"] += 1 if batch_stats["failed"] == 0 else 0
        self.embedding_stats["total_texts"] += len(texts)
        self.embedding_stats["total_tokens"] += batch_stats["total_tokens"]
        
        logger.info(
            f"✅ Embedded {len(texts)} texts in {batch_stats['duration_seconds']:.2f}s "
            f"({batch_stats['total_tokens']} tokens)"
        )
        
        return all_embeddings, batch_stats
    
    async def _embed_batch_with_retry(self, texts: List[str], attempt: int = 0) -> Dict:
        """
        Embed a single batch with exponential backoff retry.
        
        Args:
            texts: List of texts to embed (max 100)
            attempt: Current attempt number
            
        Returns:
            Dict with embeddings and metadata
            
        Raises:
            Exception: If all retries exhausted
        """
        try:
            # Run embedding in thread pool (LangChain is sync)
            loop = asyncio.get_event_loop()
            embeddings = await asyncio.wait_for(
                loop.run_in_executor(
                    None,
                    lambda: self.embeddings_model.embed_documents(texts)
                ),
                timeout=self.timeout
            )
            
            # Estimate tokens (rough: ~4 chars per token)
            total_chars = sum(len(t) for t in texts)
            estimated_tokens = total_chars // 4
            
            return {
                "embeddings": embeddings,
                "tokens": estimated_tokens,
                "texts_count": len(texts),
            }
            
        except asyncio.TimeoutError:
            logger.warning(f"Embedding request timed out (attempt {attempt + 1})")
            if attempt < self.max_retries - 1:
                wait_time = 2 ** attempt  # Exponential backoff
                logger.info(f"Retrying in {wait_time} seconds...")
                await asyncio.sleep(wait_time)
                return await self._embed_batch_with_retry(texts, attempt + 1)
            else:
                raise Exception(f"Embedding timeout after {self.max_retries} attempts")
        
        except Exception as e:
            logger.warning(f"Embedding error (attempt {attempt + 1}): {str(e)}")
            if attempt < self.max_retries - 1:
                wait_time = 2 ** attempt
                logger.info(f"Retrying in {wait_time} seconds...")
                await asyncio.sleep(wait_time)
                return await self._embed_batch_with_retry(texts, attempt + 1)
            else:
                raise Exception(f"Embedding failed after {self.max_retries} attempts: {str(e)}")
    
    async def embed_single(self, text: str) -> List[float]:
        """
        Embed a single text.
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector (768-dimensional)
        """
        embeddings, _ = await self.embed_texts([text])
        if embeddings:
            return embeddings[0]
        raise Exception("Failed to embed single text")
    
    def verify_embedding_quality(self, embedding: List[float]) -> Tuple[bool, str]:
        """
        Verify embedding quality/validity.
        
        Args:
            embedding: Embedding vector
            
        Returns:
            (is_valid, error_message)
        """
        if not embedding:
            return False, "Empty embedding"
        
        if len(embedding) != EMBEDDING_DIMENSION:
            return False, f"Wrong dimension: {len(embedding)} vs {EMBEDDING_DIMENSION}"
        
        if not all(isinstance(x, (int, float)) for x in embedding):
            return False, "Non-numeric values in embedding"
        
        # Check for NaN or Inf
        if any(x != x for x in embedding):  # NaN check
            return False, "NaN values in embedding"
        
        if any(abs(x) == float('inf') for x in embedding):
            return False, "Infinite values in embedding"
        
        return True, ""
    
    def get_stats(self) -> Dict:
        """Get embedding service statistics"""
        return {
            **self.embedding_stats,
            "success_rate": (
                self.embedding_stats["successful_requests"] / max(1, self.embedding_stats["total_requests"])
            ),
        }
    
    async def cost_estimate(self, num_texts: int, avg_tokens_per_text: int = 100) -> Dict:
        """
        Estimate API costs for embeddings.
        
        Args:
            num_texts: Number of texts to embed
            avg_tokens_per_text: Average tokens per text
            
        Returns:
            Cost estimate dictionary
        """
        # Gemini pricing: $0.025 per 1M tokens
        total_tokens = num_texts * avg_tokens_per_text
        cost_usd = (total_tokens / 1_000_000) * 0.025
        
        return {
            "num_texts": num_texts,
            "estimated_tokens": total_tokens,
            "estimated_cost_usd": cost_usd,
            "batches": (num_texts + self.batch_size - 1) // self.batch_size,
        }


# Singleton instance
_embedding_service: Optional[GeminiEmbeddingService] = None


def get_embedding_service() -> GeminiEmbeddingService:
    """Get or create embedding service singleton"""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = GeminiEmbeddingService()
    return _embedding_service


async def embed_texts(texts: List[str]) -> Tuple[List[List[float]], Dict]:
    """Convenience function to embed texts"""
    service = get_embedding_service()
    return await service.embed_texts(texts)


async def embed_single(text: str) -> List[float]:
    """Convenience function to embed single text"""
    service = get_embedding_service()
    return await service.embed_single(text)
