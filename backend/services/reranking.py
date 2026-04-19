"""
BGE Reranker Integration v3.1
Enhanced reranking service with CrossEncoder model, fallback mechanisms, async support, and monitoring.
"""

import asyncio
import logging
import numpy as np
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import time

try:
    from sentence_transformers import CrossEncoder
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False
    logging.warning("sentence-transformers not installed. Using fallback ranking.")

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)


@dataclass
class RankingResult:
    """Container for reranking results"""
    chunk_id: str
    content: str
    reranker_score: float
    similarity_score: float
    combined_score: float
    rank: int
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RerankingMetrics:
    """Metrics for monitoring reranking performance"""
    total_requests: int = 0
    successful_requests: int = 0
    fallback_used: int = 0
    avg_processing_time: float = 0.0
    model_available: bool = False
    last_updated: datetime = field(default_factory=datetime.now)


class RerankingService:
    """
    Service for reranking document chunks using BGE CrossEncoder model.
    Provides fallback to similarity-based ranking if model unavailable.
    """
    
    def __init__(self, model_name: str = "BAAI/bge-reranker-v2-m3", device: str = "cpu"):
        """
        Initialize the RerankingService.
        
        Args:
            model_name: Hugging Face model identifier for CrossEncoder
            device: Device to run the model on ('cpu' or 'cuda')
        """
        self.model_name = model_name
        self.device = device
        self.model = None
        self.metrics = RerankingMetrics()
        self._executor = ThreadPoolExecutor(max_workers=2)
        self._load_model()
    
    def _load_model(self) -> bool:
        """
        Load the CrossEncoder model.
        
        Returns:
            bool: True if model loaded successfully, False otherwise
        """
        if not HAS_SENTENCE_TRANSFORMERS:
            logger.warning("sentence-transformers not available. Fallback ranking will be used.")
            self.metrics.model_available = False
            return False
        
        try:
            logger.info(f"Loading CrossEncoder model: {self.model_name}")
            self.model = CrossEncoder(self.model_name, device=self.device, max_length=512)
            self.metrics.model_available = True
            logger.info("CrossEncoder model loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to load CrossEncoder model: {str(e)}")
            self.metrics.model_available = False
            self.model = None
            return False
    
    def _calculate_similarity_score(self, query: str, chunk: str) -> float:
        """
        Calculate similarity-based score as fallback when reranker unavailable.
        Uses simple keyword matching and character overlap.
        
        Args:
            query: Query text
            chunk: Document chunk text
            
        Returns:
            float: Similarity score between 0 and 1
        """
        try:
            query_lower = query.lower()
            chunk_lower = chunk.lower()
            
            # Keyword matching score
            query_words = set(query_lower.split())
            chunk_words = set(chunk_lower.split())
            
            if not query_words:
                return 0.0
            
            # Jaccard similarity
            intersection = len(query_words & chunk_words)
            union = len(query_words | chunk_words)
            keyword_score = intersection / union if union > 0 else 0.0
            
            # Character-level overlap
            common_chars = sum(1 for c in query_lower if c in chunk_lower)
            char_score = common_chars / len(query_lower) if query_lower else 0.0
            
            # Weighted combination
            similarity_score = 0.7 * keyword_score + 0.3 * char_score
            return min(max(similarity_score, 0.0), 1.0)
        
        except Exception as e:
            logger.warning(f"Error calculating similarity score: {str(e)}")
            return 0.0
    
    def _rerank_cpu_bound(self, query: str, chunks: List[str]) -> List[float]:
        """
        CPU-bound reranking operation.
        
        Args:
            query: Query text
            chunks: List of document chunks
            
        Returns:
            List of reranker scores
        """
        try:
            if not self.model or not HAS_SENTENCE_TRANSFORMERS:
                raise RuntimeError("Model not available for reranking")
            
            # Prepare pairs for CrossEncoder
            pairs = [[query, chunk] for chunk in chunks]
            
            # Get scores
            scores = self.model.predict(pairs, convert_to_numpy=True)
            
            # Normalize scores to 0-1 range using sigmoid
            normalized_scores = 1 / (1 + np.exp(-scores))
            
            return normalized_scores.tolist()
        
        except Exception as e:
            logger.error(f"Error during reranking: {str(e)}")
            raise
    
    async def rerank_chunks(
        self,
        query: str,
        chunks: List[Dict[str, Any]],
        similarity_scores: Optional[List[float]] = None,
        top_k: Optional[int] = None
    ) -> List[RankingResult]:
        """
        Rerank document chunks using hybrid scoring (reranker + similarity fallback).
        
        Args:
            query: Query text
            chunks: List of chunk dictionaries with 'id' and 'content' keys
            similarity_scores: Pre-calculated similarity scores
            top_k: Return only top k results (None for all)
            
        Returns:
            List of RankingResult objects sorted by combined score
        """
        start_time = time.time()
        self.metrics.total_requests += 1
        
        try:
            if not chunks:
                logger.warning("No chunks provided for reranking")
                return []
            
            chunk_contents = [chunk.get('content', '') for chunk in chunks]
            
            # Try to get reranker scores
            reranker_scores = None
            if self.model and HAS_SENTENCE_TRANSFORMERS:
                try:
                    loop = asyncio.get_event_loop()
                    reranker_scores = await loop.run_in_executor(
                        self._executor,
                        self._rerank_cpu_bound,
                        query,
                        chunk_contents
                    )
                    logger.info(f"Reranker scores obtained for {len(chunks)} chunks")
                
                except Exception as e:
                    logger.warning(f"Reranker failed, using fallback: {str(e)}")
                    self.metrics.fallback_used += 1
                    reranker_scores = None
            else:
                logger.info("Model not available, using fallback ranking")
                self.metrics.fallback_used += 1
            
            # Fallback: calculate similarity scores if needed
            if reranker_scores is None:
                reranker_scores = [
                    self._calculate_similarity_score(query, content)
                    for content in chunk_contents
                ]
            
            # Use provided similarity scores or default
            if similarity_scores is None:
                similarity_scores = [
                    self._calculate_similarity_score(query, content)
                    for content in chunk_contents
                ]
            
            # Combine scores: 0.6 * reranker_score + 0.4 * similarity_score
            combined_scores = [
                0.6 * r_score + 0.4 * s_score
                for r_score, s_score in zip(reranker_scores, similarity_scores)
            ]
            
            # Create ranking results
            results = []
            for idx, (chunk, reranker_score, similarity_score, combined_score) in enumerate(
                zip(chunks, reranker_scores, similarity_scores, combined_scores)
            ):
                result = RankingResult(
                    chunk_id=chunk.get('id', f'chunk_{idx}'),
                    content=chunk.get('content', ''),
                    reranker_score=float(reranker_score),
                    similarity_score=float(similarity_score),
                    combined_score=float(combined_score),
                    rank=0,  # Will be set after sorting
                    metadata=chunk.get('metadata', {})
                )
                results.append(result)
            
            # Sort by combined score (descending)
            results.sort(key=lambda x: x.combined_score, reverse=True)
            
            # Set ranks
            for rank, result in enumerate(results, 1):
                result.rank = rank
            
            # Apply top_k filter if specified
            if top_k:
                results = results[:top_k]
            
            self.metrics.successful_requests += 1
            processing_time = time.time() - start_time
            self.metrics.avg_processing_time = (
                (self.metrics.avg_processing_time * (self.metrics.successful_requests - 1) + processing_time)
                / self.metrics.successful_requests
            )
            
            logger.info(
                f"Reranking completed for {len(chunks)} chunks in {processing_time:.3f}s. "
                f"Top result score: {results[0].combined_score:.4f}" if results else "No results"
            )
            
            return results
        
        except Exception as e:
            logger.error(f"Unexpected error during reranking: {str(e)}")
            self.metrics.total_requests -= 1  # Undo increment due to failure
            raise
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get performance metrics"""
        return {
            'total_requests': self.metrics.total_requests,
            'successful_requests': self.metrics.successful_requests,
            'fallback_used': self.metrics.fallback_used,
            'success_rate': (
                self.metrics.successful_requests / self.metrics.total_requests
                if self.metrics.total_requests > 0 else 0.0
            ),
            'avg_processing_time_ms': round(self.metrics.avg_processing_time * 1000, 2),
            'model_available': self.metrics.model_available,
            'last_updated': self.metrics.last_updated.isoformat()
        }
    
    def __del__(self):
        """Cleanup resources"""
        if hasattr(self, '_executor'):
            self._executor.shutdown(wait=False)


class RerankingPipeline:
    """
    Pipeline for managing reranking with caching and monitoring capabilities.
    Handles batch processing and maintains performance metrics.
    """
    
    def __init__(self, service: Optional[RerankingService] = None, cache_size: int = 100):
        """
        Initialize the RerankingPipeline.
        
        Args:
            service: RerankingService instance (creates new if None)
            cache_size: Maximum number of cached results
        """
        self.service = service or RerankingService()
        self.cache_size = cache_size
        self._cache: Dict[str, List[RankingResult]] = {}
        self._cache_hits = 0
        self._cache_misses = 0
        logger.info("RerankingPipeline initialized")
    
    def _get_cache_key(self, query: str, chunk_ids: Tuple[str, ...]) -> str:
        """Generate cache key from query and chunk IDs"""
        import hashlib
        key_str = f"{query}:{','.join(chunk_ids)}"
        return hashlib.md5(key_str.encode()).hexdigest()
    
    async def rerank_batch(
        self,
        query: str,
        chunks: List[Dict[str, Any]],
        use_cache: bool = True,
        top_k: Optional[int] = None
    ) -> List[RankingResult]:
        """
        Rerank a batch of chunks with optional caching.
        
        Args:
            query: Query text
            chunks: List of chunks to rerank
            use_cache: Whether to use caching
            top_k: Return only top k results
            
        Returns:
            List of reranked results
        """
        chunk_ids = tuple(chunk.get('id', f"chunk_{idx}") for idx, chunk in enumerate(chunks))
        cache_key = self._get_cache_key(query, chunk_ids)
        
        # Check cache
        if use_cache and cache_key in self._cache:
            self._cache_hits += 1
            logger.info(f"Cache hit for query (key: {cache_key[:8]}...)")
            results = self._cache[cache_key]
            return results[:top_k] if top_k else results
        
        self._cache_misses += 1
        
        # Perform reranking
        results = await self.service.rerank_chunks(query, chunks, top_k=top_k)
        
        # Update cache
        if use_cache and len(self._cache) < self.cache_size:
            self._cache[cache_key] = results
            logger.info(f"Results cached (cache size: {len(self._cache)})")
        elif use_cache and len(self._cache) >= self.cache_size:
            # Remove oldest entry (simple FIFO)
            oldest_key = next(iter(self._cache))
            del self._cache[oldest_key]
            self._cache[cache_key] = results
            logger.info("Cache limit reached, oldest entry removed")
        
        return results
    
    def clear_cache(self):
        """Clear the cache"""
        self._cache.clear()
        logger.info("Cache cleared")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_lookups = self._cache_hits + self._cache_misses
        hit_rate = (
            self._cache_hits / total_lookups if total_lookups > 0 else 0.0
        )
        return {
            'cache_hits': self._cache_hits,
            'cache_misses': self._cache_misses,
            'hit_rate': round(hit_rate, 4),
            'cached_queries': len(self._cache),
            'cache_size_limit': self.cache_size
        }
    
    def get_pipeline_stats(self) -> Dict[str, Any]:
        """Get comprehensive pipeline statistics"""
        return {
            'service_metrics': self.service.get_metrics(),
            'cache_stats': self.get_cache_stats()
        }


# Convenience functions for direct usage
async def rerank(
    query: str,
    chunks: List[Dict[str, Any]],
    top_k: Optional[int] = None
) -> List[RankingResult]:
    """
    Convenience function for reranking chunks.
    
    Args:
        query: Query text
        chunks: List of chunks to rerank
        top_k: Return only top k results
        
    Returns:
        List of reranked results
    """
    service = RerankingService()
    return await service.rerank_chunks(query, chunks, top_k=top_k)


if __name__ == "__main__":
    # Example usage
    import asyncio
    
    async def main():
        # Initialize service
        service = RerankingService()
        
        # Sample data
        query = "What are the treatment options for diabetes?"
        chunks = [
            {
                'id': 'chunk_1',
                'content': 'Insulin therapy is a primary treatment for type 1 diabetes management.'
            },
            {
                'id': 'chunk_2',
                'content': 'Metformin is commonly used as a first-line medication for type 2 diabetes.'
            },
            {
                'id': 'chunk_3',
                'content': 'Diet and exercise are fundamental components of diabetes management.'
            },
            {
                'id': 'chunk_4',
                'content': 'The weather today is sunny and warm across most regions.'
            }
        ]
        
        # Perform reranking
        results = await service.rerank_chunks(query, chunks, top_k=3)
        
        # Display results
        print("\nReranking Results:")
        print("-" * 80)
        for result in results:
            print(f"Rank: {result.rank}")
            print(f"ID: {result.chunk_id}")
            print(f"Content: {result.content[:60]}...")
            print(f"Combined Score: {result.combined_score:.4f}")
            print(f"  Reranker Score: {result.reranker_score:.4f}")
            print(f"  Similarity Score: {result.similarity_score:.4f}")
            print("-" * 80)
        
        # Display metrics
        print("\nService Metrics:")
        print(service.get_metrics())
    
    asyncio.run(main())
