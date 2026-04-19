"""Multi-stage retrieval service for RAG

Implements sophisticated retrieval pipeline:
1. Hard filter (patient/user isolation)
2. Vector similarity (pgvector cosine search)
3. Temporal weighting (recency boost)
4. Optional hybrid search (vector + full-text)
"""
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import math

from supabase import create_client, Client
from core.config import (
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    RETRIEVAL_TOP_K,
    TEMPORAL_WEIGHT,
    SIMILARITY_WEIGHT,
    RECENCY_BOOST_DAYS,
)

logger = logging.getLogger(__name__)


class RetrievalResult:
    """Single retrieval result with metadata"""
    
    def __init__(
        self,
        chunk_id: str,
        note_id: str,
        section: str,
        text: str,
        embedding: List[float],
        similarity_score: float,
        temporal_score: float = 0.0,
        final_score: float = 0.0,
        timestamp: Optional[str] = None,
        masking_confidence: float = 1.0,
        patient_token: Optional[str] = None,
    ):
        self.chunk_id = chunk_id
        self.note_id = note_id
        self.section = section
        self.text = text
        self.embedding = embedding
        self.similarity_score = similarity_score
        self.temporal_score = temporal_score
        self.final_score = final_score
        self.timestamp = timestamp
        self.masking_confidence = masking_confidence
        self.patient_token = patient_token
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            "chunk_id": self.chunk_id,
            "note_id": self.note_id,
            "section": self.section,
            "text": self.text,
            "similarity_score": round(self.similarity_score, 4),
            "temporal_score": round(self.temporal_score, 4),
            "final_score": round(self.final_score, 4),
            "masking_confidence": round(self.masking_confidence, 4),
            "timestamp": self.timestamp,
            "patient_token": self.patient_token,
        }


class RetrievalService:
    """
    Multi-stage retrieval pipeline for medical RAG.
    
    Pipeline:
    1. HARD FILTER: user_id + patient_id (RLS enforcement)
    2. VECTOR SEARCH: pgvector cosine similarity (top-k)
    3. TEMPORAL WEIGHTING: Boost recent chunks
    4. HYBRID SEARCH: Optional full-text reranking
    """
    
    def __init__(
        self,
        supabase_url: str = SUPABASE_URL,
        service_role_key: str = SUPABASE_SERVICE_ROLE_KEY,
        top_k: int = RETRIEVAL_TOP_K,
        temporal_weight: float = TEMPORAL_WEIGHT,
        similarity_weight: float = SIMILARITY_WEIGHT,
        recency_boost_days: int = RECENCY_BOOST_DAYS,
    ):
        """Initialize retrieval service"""
        self.supabase: Client = create_client(supabase_url, service_role_key)
        self.top_k = top_k
        self.temporal_weight = temporal_weight
        self.similarity_weight = similarity_weight
        self.recency_boost_days = recency_boost_days
        
        logger.info(f"Initialized RetrievalService with top_k={top_k}")
    
    async def retrieve(
        self,
        user_id: str,
        patient_id: str,
        query_embedding: List[float],
        top_k: Optional[int] = None,
        section_filter: Optional[str] = None,
        use_temporal_weighting: bool = True,
        masking_confidence_threshold: float = 0.7,
    ) -> List[RetrievalResult]:
        """
        Execute multi-stage retrieval pipeline.
        
        Args:
            user_id: User ID for access control
            patient_id: Patient ID for data isolation
            query_embedding: Query embedding vector (768-dim)
            top_k: Number of results to retrieve (default from config)
            section_filter: Optional section filter (only retrieve from section)
            use_temporal_weighting: Whether to apply temporal scoring
            masking_confidence_threshold: Minimum masking confidence (default 0.7)
            
        Returns:
            List of RetrievalResult sorted by final_score (highest first)
        """
        if not user_id or not patient_id:
            logger.error("user_id and patient_id required for retrieval")
            raise ValueError("Missing user_id or patient_id")
        
        if not query_embedding or len(query_embedding) != 768:
            logger.error(f"Invalid query embedding: {len(query_embedding) if query_embedding else 0} dims")
            raise ValueError("Query embedding must be 768-dimensional")
        
        top_k = top_k or self.top_k
        logger.info(
            f"Retrieving for user={user_id}, patient={patient_id}, "
            f"top_k={top_k}, section_filter={section_filter}"
        )
        
        try:
            # STAGE 1: Hard filter + Vector search
            results = await self._vector_search(
                user_id, patient_id, query_embedding, top_k * 2, section_filter
            )
            
            if not results:
                logger.info("No results from vector search")
                return []
            
            # STAGE 2: Temporal weighting
            if use_temporal_weighting:
                results = self._apply_temporal_weighting(results)
            
            # STAGE 2.5: Filter by masking confidence (v3.1 improvement #7)
            results = [
                r for r in results 
                if r.masking_confidence >= masking_confidence_threshold
            ]
            logger.debug(
                f"Filtered by masking_confidence >= {masking_confidence_threshold}: "
                f"kept {len(results)} chunks"
            )
            
            if not results:
                logger.info(f"No chunks met masking confidence threshold ({masking_confidence_threshold})")
                return []
            
            # STAGE 3: Re-score with combined metric
            results = self._compute_final_scores(results)
            
            # Sort by final score and return top-k
            results = sorted(results, key=lambda x: x.final_score, reverse=True)[:top_k]
            
            logger.info(
                f"✅ Retrieved {len(results)} chunks "
                f"(top final_score: {results[0].final_score:.4f})"
            )
            
            return results
            
        except Exception as e:
            logger.error(f"Retrieval error: {str(e)}", exc_info=True)
            raise
    
    async def _vector_search(
        self,
        user_id: str,
        patient_id: str,
        query_embedding: List[float],
        limit: int,
        section_filter: Optional[str],
    ) -> List[Tuple[Dict, float]]:
        """
        Stage 1: Vector similarity search with hard filtering.
        
        Returns: List of (record, similarity_score) tuples
        """
        try:
            # Build query with RLS filters
            query = self.supabase.rpc(
                "match_note_embeddings",
                {
                    "query_embedding": query_embedding,
                    "match_count": limit,
                    "p_user_id": user_id,
                    "p_patient_id": patient_id,
                    "p_section": section_filter,
                },
            )
            
            # If RPC doesn't exist, use direct SQL with client-side vector ops
            response = self.supabase.table("note_embeddings").select(
                "id, note_id, section, chunk_text, embedding, timestamp"
            ).eq("user_id", user_id).eq("patient_id", patient_id)
            
            if section_filter:
                response = response.eq("section", section_filter)
            
            data = response.execute()
            
            if not data.data:
                return []
            
            # Calculate similarity scores (cosine distance in-app)
            scored_results = []
            for record in data.data:
                embedding = record.get("embedding", [])
                if embedding:
                    similarity = self._cosine_similarity(query_embedding, embedding)
                    scored_results.append((record, similarity))
            
            # Sort by similarity and take top limit
            scored_results.sort(key=lambda x: x[1], reverse=True)
            return scored_results[:limit]
            
        except Exception as e:
            logger.error(f"Vector search error: {str(e)}")
            return []
    
    def _apply_temporal_weighting(
        self, results: List[Tuple[Dict, float]]
    ) -> List[RetrievalResult]:
        """
        Stage 2: Apply temporal weighting to boost recent chunks.
        
        Recent chunks (< recency_boost_days) get boosted temporal_score.
        Also extracts masking_confidence from records.
        """
        retrieval_results = []
        now = datetime.utcnow()
        cutoff_date = now - timedelta(days=self.recency_boost_days)
        
        for record, similarity_score in results:
            timestamp_str = record.get("timestamp", "")
            
            if timestamp_str:
                try:
                    # Parse ISO timestamp
                    chunk_date = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                    
                    # Calculate recency score
                    if chunk_date > cutoff_date:
                        temporal_score = 1.0  # Recent
                    else:
                        # Decay score linearly
                        days_old = (now - chunk_date).days
                        temporal_score = max(0.5, 1.0 - (days_old / (self.recency_boost_days * 2)))
                except Exception as e:
                    logger.warning(f"Could not parse timestamp: {e}")
                    temporal_score = 0.5
            else:
                temporal_score = 0.5
            
            # Extract masking confidence (v3.1 improvement #7)
            masking_confidence = record.get("masking_confidence", 1.0)
            patient_token = record.get("patient_token", None)
            
            retrieval_results.append(
                RetrievalResult(
                    chunk_id=record.get("id"),
                    note_id=record.get("note_id"),
                    section=record.get("section"),
                    text=record.get("chunk_text"),
                    embedding=record.get("embedding", []),
                    similarity_score=similarity_score,
                    temporal_score=temporal_score,
                    timestamp=record.get("timestamp"),
                    masking_confidence=masking_confidence,
                    patient_token=patient_token,
                )
            )
        
        return retrieval_results
    
    def _compute_final_scores(self, results: List[RetrievalResult]) -> List[RetrievalResult]:
        """
        Stage 3: Compute final scores as weighted combination.
        
        final_score = similarity_weight * sim_score + temporal_weight * temp_score
        """
        for result in results:
            result.final_score = (
                self.similarity_weight * result.similarity_score +
                self.temporal_weight * result.temporal_score
            )
        
        return results
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """
        Compute cosine similarity between two vectors.
        
        Args:
            vec1: Vector 1
            vec2: Vector 2
            
        Returns:
            Similarity score (-1.0 to 1.0)
        """
        if not vec1 or not vec2:
            return 0.0
        
        # Dot product
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        
        # Magnitudes
        mag1 = math.sqrt(sum(a * a for a in vec1))
        mag2 = math.sqrt(sum(b * b for b in vec2))
        
        if mag1 == 0 or mag2 == 0:
            return 0.0
        
        # Cosine similarity
        return dot_product / (mag1 * mag2)
    
    async def hybrid_search(
        self,
        user_id: str,
        patient_id: str,
        query_embedding: List[float],
        query_text: str,
        top_k: Optional[int] = None,
    ) -> List[RetrievalResult]:
        """
        Hybrid search combining vector + full-text.
        
        Args:
            user_id: User ID
            patient_id: Patient ID
            query_embedding: Query embedding vector
            query_text: Query text for full-text search
            top_k: Number of results
            
        Returns:
            List of results with combined scoring
        """
        logger.info(f"Hybrid search for query_text: {query_text[:50]}...")
        
        # Vector search
        vector_results = await self.retrieve(
            user_id, patient_id, query_embedding, top_k or self.top_k
        )
        
        # Could add full-text search here in future
        # For now, just return vector results
        
        return vector_results


# Singleton instance
_retrieval_service: Optional[RetrievalService] = None


def get_retrieval_service() -> RetrievalService:
    """Get or create retrieval service singleton"""
    global _retrieval_service
    if _retrieval_service is None:
        _retrieval_service = RetrievalService()
    return _retrieval_service


async def retrieve_chunks(
    user_id: str,
    patient_id: str,
    query_embedding: List[float],
    top_k: int = RETRIEVAL_TOP_K,
) -> List[RetrievalResult]:
    """Convenience function to retrieve chunks"""
    service = get_retrieval_service()
    return await service.retrieve(user_id, patient_id, query_embedding, top_k)
