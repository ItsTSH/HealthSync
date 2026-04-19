"""Metrics collection and monitoring utilities."""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import json
from enum import Enum

logger = logging.getLogger(__name__)


class MetricType(Enum):
    """Types of metrics."""
    COUNTER = "counter"          # Incrementing counter
    GAUGE = "gauge"              # Point-in-time value
    HISTOGRAM = "histogram"      # Distribution of values
    TIMER = "timer"              # Latency measurement


@dataclass
class Metric:
    """Single metric data point."""
    name: str
    type: MetricType
    value: Any
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    labels: Dict[str, str] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "name": self.name,
            "type": self.type.value,
            "value": self.value,
            "timestamp": self.timestamp,
            "labels": self.labels,
        }


class MetricRegistry:
    """Registry of metrics."""
    
    def __init__(self):
        """Initialize metrics registry."""
        self.metrics: Dict[str, Metric] = {}
        self.metric_history: Dict[str, List[Metric]] = {}
    
    def register_counter(
        self,
        name: str,
        initial_value: int = 0,
        description: str = "",
    ) -> None:
        """Register a counter metric."""
        metric = Metric(
            name=name,
            type=MetricType.COUNTER,
            value=initial_value,
        )
        self.metrics[name] = metric
        logger.debug(f"Registered counter: {name}")
    
    def register_gauge(
        self,
        name: str,
        initial_value: float = 0.0,
        description: str = "",
    ) -> None:
        """Register a gauge metric."""
        metric = Metric(
            name=name,
            type=MetricType.GAUGE,
            value=initial_value,
        )
        self.metrics[name] = metric
        logger.debug(f"Registered gauge: {name}")
    
    def register_histogram(
        self,
        name: str,
        buckets: Optional[List[float]] = None,
    ) -> None:
        """Register a histogram metric."""
        if buckets is None:
            # Default buckets for latency: 10ms, 50ms, 100ms, 500ms, 1000ms, 5000ms
            buckets = [10, 50, 100, 500, 1000, 5000]
        
        metric = Metric(
            name=name,
            type=MetricType.HISTOGRAM,
            value={"buckets": {str(b): 0 for b in buckets}},
        )
        self.metrics[name] = metric
        logger.debug(f"Registered histogram: {name}")
    
    def increment_counter(self, name: str, amount: int = 1) -> None:
        """Increment a counter."""
        if name not in self.metrics:
            self.register_counter(name)
        
        metric = self.metrics[name]
        if metric.type == MetricType.COUNTER:
            metric.value += amount
            self._record_history(metric)
    
    def set_gauge(self, name: str, value: float) -> None:
        """Set a gauge value."""
        if name not in self.metrics:
            self.register_gauge(name)
        
        metric = self.metrics[name]
        if metric.type == MetricType.GAUGE:
            metric.value = value
            self._record_history(metric)
    
    def record_histogram_value(
        self,
        name: str,
        value: float,
        labels: Optional[Dict[str, str]] = None,
    ) -> None:
        """Record a value in histogram."""
        if name not in self.metrics:
            self.register_histogram(name)
        
        metric = self.metrics[name]
        if metric.type == MetricType.HISTOGRAM:
            # Find appropriate bucket
            buckets = metric.value["buckets"]
            bucket_keys = sorted([float(k) for k in buckets.keys()])
            
            for bucket_key in bucket_keys:
                if value <= bucket_key:
                    buckets[str(bucket_key)] += 1
                    break
            else:
                # Value exceeds largest bucket
                buckets[str(bucket_keys[-1])] += 1
            
            if labels:
                metric.labels.update(labels)
            
            self._record_history(metric)
    
    def get_metric(self, name: str) -> Optional[Metric]:
        """Get a metric."""
        return self.metrics.get(name)
    
    def get_all_metrics(self) -> Dict[str, Metric]:
        """Get all metrics."""
        return self.metrics.copy()
    
    def _record_history(self, metric: Metric) -> None:
        """Record metric in history."""
        if metric.name not in self.metric_history:
            self.metric_history[metric.name] = []
        
        self.metric_history[metric.name].append(metric)
    
    def export_metrics(self) -> Dict[str, Any]:
        """Export all metrics."""
        return {
            name: metric.to_dict()
            for name, metric in self.metrics.items()
        }


class RAGMetrics:
    """Specialized metrics for RAG pipeline."""
    
    def __init__(self):
        """Initialize RAG metrics."""
        self.registry = MetricRegistry()
        
        # Initialize standard RAG metrics
        self._init_metrics()
    
    def _init_metrics(self) -> None:
        """Initialize all RAG metrics."""
        # Counters
        self.registry.register_counter("rag_queries_total", 0)
        self.registry.register_counter("rag_queries_success", 0)
        self.registry.register_counter("rag_queries_error", 0)
        self.registry.register_counter("embeddings_created", 0)
        self.registry.register_counter("chunks_retrieved", 0)
        self.registry.register_counter("cache_hits", 0)
        self.registry.register_counter("cache_misses", 0)
        
        # Gauges
        self.registry.register_gauge("cache_hit_rate", 0.0)
        self.registry.register_gauge("error_rate", 0.0)
        
        # Histograms for latencies
        self.registry.register_histogram("embed_latency_ms")
        self.registry.register_histogram("retrieve_latency_ms")
        self.registry.register_histogram("rerank_latency_ms")
        self.registry.register_histogram("llm_latency_ms")
        self.registry.register_histogram("total_latency_ms")
    
    def record_query_success(self) -> None:
        """Record a successful query."""
        self.registry.increment_counter("rag_queries_total")
        self.registry.increment_counter("rag_queries_success")
    
    def record_query_error(self) -> None:
        """Record a failed query."""
        self.registry.increment_counter("rag_queries_total")
        self.registry.increment_counter("rag_queries_error")
    
    def record_embeddings_created(self, count: int) -> None:
        """Record embeddings created."""
        self.registry.increment_counter("embeddings_created", count)
    
    def record_chunks_retrieved(self, count: int) -> None:
        """Record chunks retrieved."""
        self.registry.increment_counter("chunks_retrieved", count)
    
    def record_cache_hit(self) -> None:
        """Record a cache hit."""
        self.registry.increment_counter("cache_hits")
    
    def record_cache_miss(self) -> None:
        """Record a cache miss."""
        self.registry.increment_counter("cache_misses")
    
    def update_cache_hit_rate(self) -> None:
        """Update cache hit rate gauge."""
        cache_hits = self.registry.get_metric("cache_hits").value
        cache_misses = self.registry.get_metric("cache_misses").value
        
        total = cache_hits + cache_misses
        if total > 0:
            hit_rate = (cache_hits / total) * 100
            self.registry.set_gauge("cache_hit_rate", hit_rate)
    
    def update_error_rate(self) -> None:
        """Update error rate gauge."""
        total_queries = self.registry.get_metric("rag_queries_total").value
        error_queries = self.registry.get_metric("rag_queries_error").value
        
        if total_queries > 0:
            error_rate = (error_queries / total_queries) * 100
            self.registry.set_gauge("error_rate", error_rate)
    
    def record_stage_latency(
        self,
        stage: str,
        latency_ms: float,
    ) -> None:
        """Record stage latency."""
        metric_name = f"{stage}_latency_ms"
        if metric_name in self.registry.metrics:
            self.registry.record_histogram_value(metric_name, latency_ms)
    
    def record_total_latency(self, latency_ms: float) -> None:
        """Record total query latency."""
        self.registry.record_histogram_value("total_latency_ms", latency_ms)
    
    def get_summary(self) -> Dict[str, Any]:
        """Get metrics summary."""
        self.update_cache_hit_rate()
        self.update_error_rate()
        
        all_metrics = self.registry.export_metrics()
        
        summary = {
            "queries": {
                "total": all_metrics.get("rag_queries_total", {}).get("value", 0),
                "successful": all_metrics.get("rag_queries_success", {}).get("value", 0),
                "errors": all_metrics.get("rag_queries_error", {}).get("value", 0),
            },
            "cache": {
                "hits": all_metrics.get("cache_hits", {}).get("value", 0),
                "misses": all_metrics.get("cache_misses", {}).get("value", 0),
                "hit_rate": all_metrics.get("cache_hit_rate", {}).get("value", 0),
            },
            "embeddings": {
                "created": all_metrics.get("embeddings_created", {}).get("value", 0),
            },
            "retrieval": {
                "chunks": all_metrics.get("chunks_retrieved", {}).get("value", 0),
            },
            "error_rate": all_metrics.get("error_rate", {}).get("value", 0),
        }
        
        return summary
    
    def export_prometheus(self) -> str:
        """Export metrics in Prometheus format."""
        lines = []
        
        for name, metric in self.registry.get_all_metrics().items():
            metric_type = metric.type.value
            lines.append(f"# HELP {name}")
            lines.append(f"# TYPE {name} {metric_type}")
            
            if metric_type == "counter":
                lines.append(f"{name} {metric.value}")
            elif metric_type == "gauge":
                lines.append(f"{name} {metric.value}")
            elif metric_type == "histogram":
                # Export histogram buckets
                for bucket, count in metric.value["buckets"].items():
                    lines.append(f'{name}_bucket{{le="{bucket}"}} {count}')
        
        return "\n".join(lines)


# Global metrics instance
_global_metrics: Optional[RAGMetrics] = None


def get_metrics() -> RAGMetrics:
    """Get global metrics instance."""
    global _global_metrics
    if _global_metrics is None:
        _global_metrics = RAGMetrics()
    return _global_metrics


def record_query_metrics(
    stage: str,
    latency_ms: float,
    success: bool = True,
) -> None:
    """Record query stage metrics."""
    metrics = get_metrics()
    
    if success:
        metrics.record_query_success()
    else:
        metrics.record_query_error()
    
    if stage and latency_ms > 0:
        metrics.record_stage_latency(stage, latency_ms)
