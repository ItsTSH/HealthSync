"""
Confidence Calibration Service for v3.1 RAG.

Multi-factor confidence scoring combining:
- Similarity scores (chunk relevance)
- Reranker scores (cross-encoder ranking)
- Chunk agreement (multiple sources agreeing)
- Masking confidence (PII masking quality)

Produces calibrated confidence score 0.0-1.0 for final response.
"""
import logging
from typing import List, Dict, Optional
from statistics import mean, stdev

logger = logging.getLogger(__name__)


class ConfidenceCalibrator:
    """Calibrate multi-factor confidence scores"""
    
    # Weights for each factor (must sum to 1.0)
    WEIGHTS = {
        "similarity": 0.35,
        "reranker": 0.25,
        "masking": 0.20,
        "agreement": 0.20,
    }
    
    def __init__(
        self,
        similarity_weight: float = 0.35,
        reranker_weight: float = 0.25,
        masking_weight: float = 0.20,
        agreement_weight: float = 0.20,
    ):
        """
        Initialize confidence calibrator with custom weights.
        
        Args:
            similarity_weight: Weight for chunk similarity scores
            reranker_weight: Weight for reranker scores
            masking_weight: Weight for masking confidence
            agreement_weight: Weight for cross-source agreement
        """
        self.weights = {
            "similarity": similarity_weight,
            "reranker": reranker_weight,
            "masking": masking_weight,
            "agreement": agreement_weight,
        }
        
        # Validate weights sum to 1.0
        total = sum(self.weights.values())
        if abs(total - 1.0) > 0.01:
            logger.warning(f"Weights sum to {total}, normalizing...")
            for key in self.weights:
                self.weights[key] /= total
    
    def calibrate(
        self,
        retrieved_chunks: List[Dict],
        avg_similarity_score: Optional[float] = None,
        avg_reranker_score: Optional[float] = None,
    ) -> Dict:
        """
        Calibrate multi-factor confidence score.
        
        Args:
            retrieved_chunks: List of retrieved chunk dicts with scores
            avg_similarity_score: Optional override for average similarity
            avg_reranker_score: Optional override for average reranker score
        
        Returns:
            Dict with calibrated_confidence and individual factor scores
        """
        if not retrieved_chunks:
            return {
                "calibrated_confidence": 0.0,
                "factors": {
                    "avg_similarity": 0.0,
                    "avg_reranker": 0.0,
                    "avg_masking": 0.0,
                    "chunk_agreement": 0.0,
                }
            }
        
        # Factor 1: Average similarity score (0-1)
        if avg_similarity_score is not None:
            factor_similarity = avg_similarity_score
        else:
            similarity_scores = [c.get("similarity_score", 0.0) for c in retrieved_chunks]
            factor_similarity = mean(similarity_scores) if similarity_scores else 0.0
        
        # Factor 2: Average reranker score (0-1)
        if avg_reranker_score is not None:
            factor_reranker = avg_reranker_score
        else:
            reranker_scores = [c.get("reranker_score", c.get("combined_score", 0.0)) for c in retrieved_chunks]
            factor_reranker = mean(reranker_scores) if reranker_scores else 0.0
        
        # Factor 3: Average masking confidence (0-1)
        masking_scores = [c.get("masking_confidence", 1.0) for c in retrieved_chunks]
        factor_masking = mean(masking_scores) if masking_scores else 1.0
        
        # Factor 4: Chunk agreement (do multiple chunks agree?)
        factor_agreement = self._calculate_chunk_agreement(retrieved_chunks)
        
        # Combine factors using weights
        calibrated = (
            self.weights["similarity"] * factor_similarity +
            self.weights["reranker"] * factor_reranker +
            self.weights["masking"] * factor_masking +
            self.weights["agreement"] * factor_agreement
        )
        
        # Clamp to 0-1
        calibrated = max(0.0, min(1.0, calibrated))
        
        logger.debug(
            f"Confidence calibration: "
            f"similarity={factor_similarity:.3f}, "
            f"reranker={factor_reranker:.3f}, "
            f"masking={factor_masking:.3f}, "
            f"agreement={factor_agreement:.3f} "
            f"→ final={calibrated:.3f}"
        )
        
        return {
            "calibrated_confidence": calibrated,
            "factors": {
                "avg_similarity": round(factor_similarity, 3),
                "avg_reranker": round(factor_reranker, 3),
                "avg_masking": round(factor_masking, 3),
                "chunk_agreement": round(factor_agreement, 3),
            }
        }
    
    def _calculate_chunk_agreement(self, chunks: List[Dict]) -> float:
        """
        Calculate agreement score based on:
        - Multiple sections mentioned (signals comprehensive coverage)
        - Similarity score variance (low variance = high agreement)
        - Number of unique notes
        
        Returns: 0.0-1.0 agreement score
        """
        if not chunks:
            return 0.0
        
        # Factor 1: Section diversity (unique sections)
        sections = set(c.get("section", "unknown") for c in chunks)
        section_score = min(1.0, len(sections) / 3.0)  # Max 3 sections
        
        # Factor 2: Similarity consistency (low variance = good agreement)
        similarity_scores = [c.get("similarity_score", 0.0) for c in chunks]
        if len(similarity_scores) > 1:
            var = stdev(similarity_scores) if stdev(similarity_scores) > 0 else 0.0
            # Lower variance = higher score (inverse relationship)
            consistency_score = 1.0 / (1.0 + var)
        else:
            consistency_score = 1.0 if similarity_scores else 0.0
        
        # Factor 3: Number of unique notes
        notes = set(c.get("note_id", "unknown") for c in chunks)
        note_score = min(1.0, len(notes) / 2.0)  # Max 2 notes
        
        # Combine factors
        agreement = (section_score * 0.4) + (consistency_score * 0.4) + (note_score * 0.2)
        
        return min(1.0, agreement)


# Global instance
_calibrator = ConfidenceCalibrator()


def calibrate_confidence(
    retrieved_chunks: List[Dict],
    avg_similarity_score: Optional[float] = None,
    avg_reranker_score: Optional[float] = None,
) -> Dict:
    """
    Convenience function to calibrate confidence using global instance.
    
    Args:
        retrieved_chunks: List of chunk dicts
        avg_similarity_score: Optional override
        avg_reranker_score: Optional override
    
    Returns:
        Dict with calibrated_confidence and factors
    """
    return _calibrator.calibrate(
        retrieved_chunks,
        avg_similarity_score,
        avg_reranker_score
    )
