"""Audit logging service for RAG compliance

Logs all RAG operations to Supabase audit table for:
- HIPAA compliance
- Query tracking
- Performance monitoring
- Debugging and troubleshooting
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime
import json
import uuid

from supabase import create_client, Client
from core.config import (
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    ENABLE_AUDIT_LOGGING,
    AUDIT_LOG_TABLE,
)

logger = logging.getLogger(__name__)


class AuditLogger:
    """
    Logs all RAG operations to append-only audit table.
    
    Records:
    - User ID and patient ID (for compliance)
    - Query text
    - Retrieved chunks (count and metadata)
    - Reranking results
    - LLM input and output
    - Performance metrics
    - Confidence scores and citations
    """
    
    def __init__(
        self,
        supabase_url: str = SUPABASE_URL,
        service_role_key: str = SUPABASE_SERVICE_ROLE_KEY,
        table_name: str = AUDIT_LOG_TABLE,
        enabled: bool = ENABLE_AUDIT_LOGGING,
    ):
        """Initialize audit logger"""
        self.enabled = enabled
        if not enabled:
            logger.info("Audit logging is disabled")
            return
        
        self.supabase: Client = create_client(supabase_url, service_role_key)
        self.table_name = table_name
        logger.info(f"Initialized AuditLogger (table: {table_name})")
    
    async def log_rag_query(
        self,
        user_id: str,
        patient_id: str,
        query_text: str,
        retrieval_data: Dict,
        reranking_data: Dict,
        llm_data: Dict,
        response_data: Dict,
    ) -> Optional[str]:
        """
        Log complete RAG pipeline execution.
        
        Args:
            user_id: User executing query
            patient_id: Patient being queried about
            query_text: Original query
            retrieval_data: Retrieved chunks info
            reranking_data: Reranking results
            llm_data: LLM input and output
            response_data: Final response
            
        Returns:
            Audit log ID (UUID) or None if logging disabled
        """
        if not self.enabled:
            return None
        
        try:
            audit_id = str(uuid.uuid4())
            
            log_entry = {
                "id": audit_id,
                "user_id": user_id,
                "patient_id": patient_id,
                "query_text": query_text,
                
                # Retrieval phase
                "retrieved_chunks_count": retrieval_data.get("count", 0),
                "retrieval_duration_ms": retrieval_data.get("duration_ms", 0),
                
                # Reranking phase
                "reranked_chunks_count": reranking_data.get("count", 0),
                "reranking_duration_ms": reranking_data.get("duration_ms", 0),
                "reranked_chunks": json.dumps(reranking_data.get("chunks", [])),
                
                # LLM phase
                "llm_prompt": llm_data.get("prompt", ""),
                "llm_response": llm_data.get("response", ""),
                "llm_model": llm_data.get("model", ""),
                "llm_duration_ms": llm_data.get("duration_ms", 0),
                "tokens_used": llm_data.get("tokens_used", 0),
                
                # Results
                "confidence_score": response_data.get("confidence", 0.0),
                "citations": json.dumps(response_data.get("citations", [])),
                
                # Metadata
                "api_version": "rag-v1",
                "created_at": datetime.utcnow().isoformat(),
            }
            
            # Insert into audit table
            response = self.supabase.table(self.table_name).insert(log_entry).execute()
            
            logger.info(f"✅ Audited RAG query: {audit_id}")
            return audit_id
            
        except Exception as e:
            logger.error(f"Failed to log audit: {str(e)}")
            # Don't raise - logging failure shouldn't break RAG
            return None
    
    async def log_retrieval(
        self,
        user_id: str,
        patient_id: str,
        query_embedding: List[float],
        retrieved_chunks: List[Dict],
        duration_ms: int,
    ) -> None:
        """Log retrieval phase results"""
        if not self.enabled:
            return
        
        try:
            logger.debug(
                f"Retrieval logged: user={user_id}, patient={patient_id}, "
                f"chunks={len(retrieved_chunks)}, duration={duration_ms}ms"
            )
        except Exception as e:
            logger.warning(f"Error logging retrieval: {e}")
    
    async def log_reranking(
        self,
        audit_id: str,
        reranked_chunks: List[Dict],
        duration_ms: int,
    ) -> None:
        """Log reranking phase results"""
        if not self.enabled:
            return
        
        try:
            logger.debug(
                f"Reranking logged: audit={audit_id}, "
                f"chunks={len(reranked_chunks)}, duration={duration_ms}ms"
            )
        except Exception as e:
            logger.warning(f"Error logging reranking: {e}")
    
    async def log_llm_call(
        self,
        audit_id: str,
        prompt: str,
        response: str,
        model: str,
        tokens_used: int,
        duration_ms: int,
    ) -> None:
        """Log LLM generation phase"""
        if not self.enabled:
            return
        
        try:
            logger.debug(
                f"LLM logged: audit={audit_id}, model={model}, "
                f"tokens={tokens_used}, duration={duration_ms}ms"
            )
        except Exception as e:
            logger.warning(f"Error logging LLM: {e}")
    
    async def get_query_history(
        self,
        user_id: str,
        patient_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict]:
        """
        Retrieve audit history for user.
        
        Useful for compliance audits and analytics.
        """
        if not self.enabled:
            return []
        
        try:
            query = self.supabase.table(self.table_name).select(
                "id, query_text, confidence_score, created_at, tokens_used"
            ).eq("user_id", user_id)
            
            if patient_id:
                query = query.eq("patient_id", patient_id)
            
            response = query.order("created_at", desc=True).limit(limit).execute()
            
            return response.data or []
            
        except Exception as e:
            logger.error(f"Error retrieving query history: {e}")
            return []
    
    async def get_usage_stats(
        self,
        user_id: str,
        patient_id: Optional[str] = None,
    ) -> Dict:
        """Get usage statistics for a user/patient"""
        if not self.enabled:
            return {}
        
        try:
            history = await self.get_query_history(user_id, patient_id, limit=1000)
            
            if not history:
                return {
                    "total_queries": 0,
                    "avg_confidence": 0.0,
                    "total_tokens": 0,
                }
            
            avg_confidence = sum(h.get("confidence_score", 0) for h in history) / len(history)
            total_tokens = sum(h.get("tokens_used", 0) for h in history)
            
            return {
                "total_queries": len(history),
                "avg_confidence": round(avg_confidence, 3),
                "total_tokens": total_tokens,
                "first_query": history[-1].get("created_at"),
                "last_query": history[0].get("created_at"),
            }
            
        except Exception as e:
            logger.error(f"Error computing usage stats: {e}")
            return {}


# Singleton instance
_audit_logger: Optional[AuditLogger] = None


def get_audit_logger() -> AuditLogger:
    """Get or create audit logger singleton"""
    global _audit_logger
    if _audit_logger is None:
        _audit_logger = AuditLogger()
    return _audit_logger


async def log_rag_query(
    user_id: str,
    patient_id: str,
    query_text: str,
    retrieval_data: Dict,
    reranking_data: Dict,
    llm_data: Dict,
    response_data: Dict,
) -> Optional[str]:
    """Convenience function to log RAG query"""
    logger = get_audit_logger()
    return await logger.log_rag_query(
        user_id, patient_id, query_text,
        retrieval_data, reranking_data,
        llm_data, response_data
    )
