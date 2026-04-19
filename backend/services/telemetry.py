"""Telemetry and metrics tracking for RAG system."""
import logging
import time
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import asyncio

logger = logging.getLogger(__name__)


@dataclass
class StageMetrics:
    """Metrics for a single pipeline stage."""
    stage_name: str
    latency_ms: float
    success: bool = True
    error_message: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class QueryMetrics:
    """Metrics for a complete RAG query."""
    query_id: str
    user_id: str
    query: str
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    total_latency_ms: float = 0
    stage_metrics: List[StageMetrics] = field(default_factory=list)
    chunks_retrieved: int = 0
    response_length: int = 0
    success: bool = True
    error_message: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for logging."""
        return {
            "query_id": self.query_id,
            "user_id": self.user_id,
            "timestamp": self.timestamp,
            "latency_ms": self.total_latency_ms,
            "stages": [
                {
                    "name": m.stage_name,
                    "latency_ms": m.latency_ms,
                    "success": m.success,
                } for m in self.stage_metrics
            ],
            "chunks_retrieved": self.chunks_retrieved,
            "response_length": self.response_length,
            "success": self.success,
        }


class Telemetry:
    """Telemetry collection for RAG pipeline."""
    
    def __init__(self):
        """Initialize telemetry."""
        self.query_metrics: Dict[str, QueryMetrics] = {}
        self.stage_counters: Dict[str, int] = {}
        self.cache_hits: int = 0
        self.cache_misses: int = 0
        self.errors: int = 0
    
    def start_query(self, query_id: str, user_id: str, query: str) -> QueryMetrics:
        """
        Start tracking a query.
        
        Args:
            query_id: Unique query identifier
            user_id: User making the query
            query: The query text
            
        Returns:
            QueryMetrics object to track query progress
        """
        metrics = QueryMetrics(
            query_id=query_id,
            user_id=user_id,
            query=query,
        )
        self.query_metrics[query_id] = metrics
        logger.debug(f"Started telemetry for query {query_id}")
        return metrics
    
    def record_stage(
        self,
        query_id: str,
        stage_name: str,
        latency_ms: float,
        success: bool = True,
        error_message: Optional[str] = None,
    ) -> None:
        """
        Record metrics for a pipeline stage.
        
        Args:
            query_id: Query identifier
            stage_name: Name of the stage (embedding, retrieval, reranking, llm)
            latency_ms: Stage latency in milliseconds
            success: Whether stage succeeded
            error_message: Error message if failed
        """
        if query_id not in self.query_metrics:
            logger.warning(f"Query {query_id} not found in metrics")
            return
        
        metrics = self.query_metrics[query_id]
        stage_metric = StageMetrics(
            stage_name=stage_name,
            latency_ms=latency_ms,
            success=success,
            error_message=error_message,
        )
        metrics.stage_metrics.append(stage_metric)
        
        # Update counter
        self.stage_counters[stage_name] = self.stage_counters.get(stage_name, 0) + 1
        
        logger.debug(f"Recorded {stage_name}: {latency_ms:.0f}ms")
    
    def end_query(
        self,
        query_id: str,
        total_latency_ms: float,
        chunks_retrieved: int = 0,
        response_length: int = 0,
        success: bool = True,
        error_message: Optional[str] = None,
    ) -> QueryMetrics:
        """
        End query tracking.
        
        Args:
            query_id: Query identifier
            total_latency_ms: Total query latency
            chunks_retrieved: Number of chunks retrieved
            response_length: Length of response
            success: Whether query succeeded
            error_message: Error message if failed
            
        Returns:
            Final QueryMetrics
        """
        if query_id not in self.query_metrics:
            logger.warning(f"Query {query_id} not found")
            return None
        
        metrics = self.query_metrics[query_id]
        metrics.total_latency_ms = total_latency_ms
        metrics.chunks_retrieved = chunks_retrieved
        metrics.response_length = response_length
        metrics.success = success
        metrics.error_message = error_message
        
        if not success:
            self.errors += 1
        
        logger.info(
            f"Query {query_id} completed: {total_latency_ms:.0f}ms, "
            f"{chunks_retrieved} chunks, success={success}"
        )
        
        return metrics
    
    def record_cache_hit(self) -> None:
        """Record a cache hit."""
        self.cache_hits += 1
        logger.debug(f"Cache hit (total: {self.cache_hits})")
    
    def record_cache_miss(self) -> None:
        """Record a cache miss."""
        self.cache_misses += 1
        logger.debug(f"Cache miss (total: {self.cache_misses})")
    
    def get_cache_hit_rate(self) -> float:
        """
        Get cache hit rate percentage.
        
        Returns:
            Hit rate as percentage (0-100)
        """
        total = self.cache_hits + self.cache_misses
        if total == 0:
            return 0
        return (self.cache_hits / total) * 100
    
    def get_stage_stats(self, stage_name: str) -> Dict[str, Any]:
        """
        Get statistics for a specific stage.
        
        Args:
            stage_name: Name of the stage
            
        Returns:
            Dict with count, avg latency, error rate
        """
        stage_metrics = []
        for qm in self.query_metrics.values():
            for sm in qm.stage_metrics:
                if sm.stage_name == stage_name:
                    stage_metrics.append(sm)
        
        if not stage_metrics:
            return {"count": 0}
        
        latencies = [m.latency_ms for m in stage_metrics]
        errors = sum(1 for m in stage_metrics if not m.success)
        
        return {
            "count": len(stage_metrics),
            "avg_latency_ms": sum(latencies) / len(latencies),
            "min_latency_ms": min(latencies),
            "max_latency_ms": max(latencies),
            "error_rate": (errors / len(stage_metrics) * 100) if stage_metrics else 0,
        }
    
    def get_summary(self) -> Dict[str, Any]:
        """
        Get overall telemetry summary.
        
        Returns:
            Dict with system-wide metrics
        """
        total_queries = len(self.query_metrics)
        successful_queries = sum(1 for m in self.query_metrics.values() if m.success)
        
        all_latencies = []
        for qm in self.query_metrics.values():
            if qm.total_latency_ms > 0:
                all_latencies.append(qm.total_latency_ms)
        
        avg_latency = sum(all_latencies) / len(all_latencies) if all_latencies else 0
        
        return {
            "total_queries": total_queries,
            "successful_queries": successful_queries,
            "error_count": self.errors,
            "error_rate": (self.errors / total_queries * 100) if total_queries > 0 else 0,
            "avg_latency_ms": round(avg_latency, 2),
            "cache_hit_rate": round(self.get_cache_hit_rate(), 2),
            "stage_counts": self.stage_counters,
        }


class MetricsExporter:
    """Export metrics to monitoring system."""
    
    def __init__(self, telemetry: Telemetry):
        """
        Initialize metrics exporter.
        
        Args:
            telemetry: Telemetry instance to export from
        """
        self.telemetry = telemetry
    
    async def export_to_logging(self) -> None:
        """Export metrics to structured logging."""
        summary = self.telemetry.get_summary()
        
        logger.info("RAG METRICS SUMMARY")
        logger.info("=" * 50)
        logger.info(f"Total Queries: {summary['total_queries']}")
        logger.info(f"Successful: {summary['successful_queries']}")
        logger.info(f"Errors: {summary['error_count']} ({summary['error_rate']:.1f}%)")
        logger.info(f"Avg Latency: {summary['avg_latency_ms']:.0f}ms")
        logger.info(f"Cache Hit Rate: {summary['cache_hit_rate']:.1f}%")
        logger.info("=" * 50)
    
    def export_to_dict(self) -> Dict[str, Any]:
        """Export metrics as dictionary."""
        return self.telemetry.get_summary()


class QueryContext:
    """Context manager for tracking query metrics."""
    
    def __init__(
        self,
        telemetry: Telemetry,
        query_id: str,
        user_id: str,
        query: str
    ):
        """
        Initialize query context.
        
        Args:
            telemetry: Telemetry instance
            query_id: Unique query ID
            user_id: User ID
            query: Query text
        """
        self.telemetry = telemetry
        self.query_id = query_id
        self.user_id = user_id
        self.query = query
        self.metrics: Optional[QueryMetrics] = None
        self.start_time: Optional[float] = None
        self.chunks_retrieved: int = 0
        self.response_length: int = 0
    
    def __enter__(self) -> "QueryContext":
        """Enter context."""
        self.start_time = time.time()
        self.metrics = self.telemetry.start_query(
            self.query_id,
            self.user_id,
            self.query
        )
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        """Exit context."""
        total_latency_ms = (time.time() - self.start_time) * 1000
        success = exc_type is None
        error_message = str(exc_val) if exc_val else None
        
        self.telemetry.end_query(
            self.query_id,
            total_latency_ms,
            chunks_retrieved=self.chunks_retrieved,
            response_length=self.response_length,
            success=success,
            error_message=error_message,
        )
    
    def record_stage(
        self,
        stage_name: str,
        latency_ms: float,
        success: bool = True,
        error_message: Optional[str] = None,
    ) -> None:
        """Record stage metrics."""
        self.telemetry.record_stage(
            self.query_id,
            stage_name,
            latency_ms,
            success,
            error_message,
        )


class StageTimer:
    """Context manager for timing a pipeline stage."""
    
    def __init__(
        self,
        telemetry: Telemetry,
        query_id: str,
        stage_name: str
    ):
        """
        Initialize stage timer.
        
        Args:
            telemetry: Telemetry instance
            query_id: Query ID
            stage_name: Stage name
        """
        self.telemetry = telemetry
        self.query_id = query_id
        self.stage_name = stage_name
        self.start_time: Optional[float] = None
    
    async def __aenter__(self) -> "StageTimer":
        """Enter async context."""
        self.start_time = time.time()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Exit async context."""
        latency_ms = (time.time() - self.start_time) * 1000
        success = exc_type is None
        error_message = str(exc_val) if exc_val else None
        
        self.telemetry.record_stage(
            self.query_id,
            self.stage_name,
            latency_ms,
            success,
            error_message,
        )
