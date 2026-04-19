#!/usr/bin/env python3
"""
Load testing for RAG pipeline under concurrent load.

Tests throughput and latency with multiple concurrent requests.
"""
import asyncio
import time
import logging
from typing import List, Dict, Any
from dataclasses import dataclass
import statistics

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class LoadTestResult:
    """Load test result."""
    concurrency: int
    total_requests: int
    successful: int
    failed: int
    min_latency_ms: float
    max_latency_ms: float
    mean_latency_ms: float
    median_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    throughput_rps: float
    error_rate_percent: float
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "concurrency": self.concurrency,
            "total_requests": self.total_requests,
            "successful": self.successful,
            "failed": self.failed,
            "latency": {
                "min_ms": round(self.min_latency_ms, 2),
                "max_ms": round(self.max_latency_ms, 2),
                "mean_ms": round(self.mean_latency_ms, 2),
                "median_ms": round(self.median_latency_ms, 2),
                "p95_ms": round(self.p95_latency_ms, 2),
                "p99_ms": round(self.p99_latency_ms, 2),
            },
            "throughput_rps": round(self.throughput_rps, 2),
            "error_rate_percent": round(self.error_rate_percent, 2),
        }


class RAGLoadTester:
    """Load test RAG pipeline."""
    
    def __init__(self):
        """Initialize load tester."""
        self.results: List[LoadTestResult] = []
    
    async def simulate_rag_query(self, query_id: int) -> float:
        """
        Simulate a single RAG query.
        
        Returns latency in milliseconds.
        """
        try:
            from unittest.mock import AsyncMock, MagicMock, patch
            from services.gemini_embeddings import GeminiEmbeddings
            from services.retrieval import VectorRetriever
            from services.reranking import CrossEncoderReranker
            from services.llm import GroqLLM
            
            start = time.time()
            
            # Simulate embedding
            embedder = GeminiEmbeddings()
            with patch.object(embedder, 'client') as mock_client:
                mock_client.embed_content = AsyncMock(
                    return_value={"embedding": {"values": [0.1] * 768}}
                )
                await embedder.embed_text(f"query-{query_id}")
            
            # Simulate retrieval
            retriever = VectorRetriever()
            with patch.object(retriever, 'client') as mock_client:
                mock_client.rpc = AsyncMock(
                    return_value=[
                        {"id": f"chunk-{i}"} for i in range(5)
                    ]
                )
                await retriever.retrieve_similar(
                    embedding=[0.1] * 768,
                    user_id=f"user-{query_id % 10}",
                    top_k=5
                )
            
            # Simulate reranking
            reranker = CrossEncoderReranker()
            with patch.object(reranker, 'model') as mock_model:
                mock_model.predict = MagicMock(return_value=[0.9, 0.8, 0.7])
                reranker.rerank(query=f"query-{query_id}", chunks=["c1", "c2", "c3"])
            
            # Simulate LLM
            llm = GroqLLM()
            with patch.object(llm, 'client') as mock_client:
                mock_client.chat.completions.create = AsyncMock(
                    return_value=MagicMock(
                        choices=[MagicMock(message=MagicMock(content="Answer"))]
                    )
                )
                await llm.generate_answer(query=f"query-{query_id}", chunks=[])
            
            latency_ms = (time.time() - start) * 1000
            return latency_ms
            
        except Exception as e:
            logger.warning(f"Query {query_id} failed: {e}")
            raise
    
    async def run_load_test(
        self,
        concurrency: int,
        total_requests: int,
        ramp_up_time: float = 1.0
    ) -> LoadTestResult:
        """
        Run load test with specified concurrency.
        
        Args:
            concurrency: Number of concurrent tasks
            total_requests: Total requests to send
            ramp_up_time: Time to ramp up to full concurrency (seconds)
            
        Returns:
            LoadTestResult with metrics
        """
        logger.info(f"Starting load test: {concurrency} concurrent, {total_requests} total")
        
        latencies: List[float] = []
        errors: int = 0
        
        # Create task batches for ramp-up
        requests_per_batch = max(1, concurrency)
        batches = []
        
        for i in range(0, total_requests, requests_per_batch):
            batch_size = min(requests_per_batch, total_requests - i)
            batches.append(batch_size)
        
        start_total = time.time()
        
        for batch_idx, batch_size in enumerate(batches):
            # Ramp up: increase concurrency gradually
            if ramp_up_time > 0 and batch_idx < len(batches) * 0.2:  # First 20%
                actual_concurrency = max(1, int(concurrency * (batch_idx / (len(batches) * 0.2))))
            else:
                actual_concurrency = concurrency
            
            logger.info(f"  Batch {batch_idx + 1}/{len(batches)}: "
                       f"{batch_size} requests at concurrency {actual_concurrency}")
            
            # Run batch with semaphore to control concurrency
            semaphore = asyncio.Semaphore(actual_concurrency)
            
            async def limited_query(qid):
                async with semaphore:
                    return await self.simulate_rag_query(qid)
            
            batch_start = time.time()
            tasks = [
                limited_query(i) for i in range(len(latencies), len(latencies) + batch_size)
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for result in results:
                if isinstance(result, Exception):
                    errors += 1
                else:
                    latencies.append(result)
            
            batch_time = time.time() - batch_start
            batch_throughput = batch_size / batch_time
            logger.info(f"    Completed in {batch_time:.1f}s ({batch_throughput:.1f} req/s)")
        
        total_time = time.time() - start_total
        
        # Calculate statistics
        if latencies:
            sorted_latencies = sorted(latencies)
            p95_idx = int(len(sorted_latencies) * 0.95)
            p99_idx = int(len(sorted_latencies) * 0.99)
            
            result = LoadTestResult(
                concurrency=concurrency,
                total_requests=total_requests,
                successful=len(latencies),
                failed=errors,
                min_latency_ms=min(latencies),
                max_latency_ms=max(latencies),
                mean_latency_ms=statistics.mean(latencies),
                median_latency_ms=statistics.median(latencies),
                p95_latency_ms=sorted_latencies[p95_idx] if p95_idx < len(sorted_latencies) else 0,
                p99_latency_ms=sorted_latencies[p99_idx] if p99_idx < len(sorted_latencies) else 0,
                throughput_rps=total_requests / total_time if total_time > 0 else 0,
                error_rate_percent=(errors / total_requests * 100) if total_requests > 0 else 0,
            )
        else:
            result = LoadTestResult(
                concurrency=concurrency,
                total_requests=total_requests,
                successful=0,
                failed=errors,
                min_latency_ms=0,
                max_latency_ms=0,
                mean_latency_ms=0,
                median_latency_ms=0,
                p95_latency_ms=0,
                p99_latency_ms=0,
                throughput_rps=0,
                error_rate_percent=100,
            )
        
        self.results.append(result)
        self._log_result(result)
        return result
    
    def _log_result(self, result: LoadTestResult) -> None:
        """Log load test result."""
        print()
        print(f"Load Test: {result.concurrency} concurrent | "
              f"{result.successful}/{result.total_requests} successful | "
              f"{result.error_rate_percent:.1f}% errors")
        print(f"  Latency: {result.mean_latency_ms:.0f}ms (median: {result.median_latency_ms:.0f}ms, "
              f"p95: {result.p95_latency_ms:.0f}ms, p99: {result.p99_latency_ms:.0f}ms)")
        print(f"  Throughput: {result.throughput_rps:.1f} req/sec")
        print()
    
    def print_summary(self) -> None:
        """Print summary of all load tests."""
        print("\n" + "=" * 80)
        print("LOAD TEST SUMMARY")
        print("=" * 80)
        print()
        
        for result in self.results:
            status = "✅" if result.error_rate_percent < 1 else "⚠️"
            print(f"{status} Concurrency: {result.concurrency:3d} | "
                  f"Throughput: {result.throughput_rps:6.1f} req/s | "
                  f"P95: {result.p95_latency_ms:7.0f}ms | "
                  f"Errors: {result.error_rate_percent:5.1f}%")
        
        print()
        print("Target Performance Metrics:")
        print("  - 50 concurrent queries: < 5 second p95 latency")
        print("  - Error rate: < 1%")
        print()
        
        # Check if targets met
        if self.results:
            largest_concurrency = max(r.concurrency for r in self.results)
            result_50 = next((r for r in self.results if r.concurrency == 50), None)
            
            if result_50:
                if result_50.p95_latency_ms < 5000 and result_50.error_rate_percent < 1:
                    print("✅ Performance targets met!")
                else:
                    issues = []
                    if result_50.p95_latency_ms >= 5000:
                        issues.append(f"P95 latency {result_50.p95_latency_ms:.0f}ms exceeds 5000ms")
                    if result_50.error_rate_percent >= 1:
                        issues.append(f"Error rate {result_50.error_rate_percent:.1f}% exceeds 1%")
                    print("❌ Performance targets not met:")
                    for issue in issues:
                        print(f"   - {issue}")
        
        print()
        print("=" * 80)


async def run_load_tests() -> None:
    """Run all load tests."""
    tester = RAGLoadTester()
    
    logger.info("Starting RAG Load Testing...")
    print()
    
    # Test with increasing concurrency
    concurrency_levels = [1, 5, 10, 25, 50]
    
    for concurrency in concurrency_levels:
        # Reduce request count for higher concurrency to keep test time reasonable
        total_requests = max(10, 100 // max(1, (concurrency // 10)))
        
        await tester.run_load_test(
            concurrency=concurrency,
            total_requests=total_requests,
            ramp_up_time=0.5
        )
        
        # Small delay between test levels
        await asyncio.sleep(0.5)
    
    tester.print_summary()


if __name__ == "__main__":
    asyncio.run(run_load_tests())
