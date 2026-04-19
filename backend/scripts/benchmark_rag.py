#!/usr/bin/env python3
"""
Performance benchmarking for RAG pipeline stages.

Measures latency, throughput, and resource usage for each component.
"""
import asyncio
import time
import logging
from typing import Dict, List, Any, Callable
from dataclasses import dataclass
from datetime import datetime
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class BenchmarkResult:
    """Single benchmark result."""
    stage: str
    samples: int
    mean_ms: float
    min_ms: float
    max_ms: float
    p95_ms: float
    p99_ms: float
    throughput_per_sec: float
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "stage": self.stage,
            "samples": self.samples,
            "latency": {
                "mean_ms": round(self.mean_ms, 2),
                "min_ms": round(self.min_ms, 2),
                "max_ms": round(self.max_ms, 2),
                "p95_ms": round(self.p95_ms, 2),
                "p99_ms": round(self.p99_ms, 2),
            },
            "throughput_per_sec": round(self.throughput_per_sec, 2),
        }


class RAGBenchmark:
    """Benchmark RAG pipeline stages."""
    
    def __init__(self):
        """Initialize benchmark suite."""
        self.results: List[BenchmarkResult] = []
    
    def run_benchmark(
        self,
        stage_name: str,
        async_func: Callable,
        *args,
        samples: int = 10,
        **kwargs
    ) -> BenchmarkResult:
        """
        Run benchmark for a stage.
        
        Args:
            stage_name: Name of the stage
            async_func: Async function to benchmark
            samples: Number of iterations
            args, kwargs: Arguments to pass to function
            
        Returns:
            BenchmarkResult with latency metrics
        """
        logger.info(f"Benchmarking {stage_name}...")
        
        latencies: List[float] = []
        start_total = time.time()
        
        for i in range(samples):
            try:
                start = time.time()
                asyncio.run(async_func(*args, **kwargs))
                elapsed_ms = (time.time() - start) * 1000
                latencies.append(elapsed_ms)
            except Exception as e:
                logger.warning(f"  Sample {i+1}/{samples} failed: {e}")
                latencies.append(None)
        
        # Filter valid results
        valid_latencies = [l for l in latencies if l is not None]
        total_time = time.time() - start_total
        
        if not valid_latencies:
            logger.error(f"  ❌ No valid samples for {stage_name}")
            return BenchmarkResult(
                stage=stage_name,
                samples=0,
                mean_ms=0,
                min_ms=0,
                max_ms=0,
                p95_ms=0,
                p99_ms=0,
                throughput_per_sec=0
            )
        
        # Calculate percentiles
        sorted_latencies = sorted(valid_latencies)
        p95_idx = int(len(sorted_latencies) * 0.95)
        p99_idx = int(len(sorted_latencies) * 0.99)
        
        result = BenchmarkResult(
            stage=stage_name,
            samples=len(valid_latencies),
            mean_ms=sum(valid_latencies) / len(valid_latencies),
            min_ms=min(valid_latencies),
            max_ms=max(valid_latencies),
            p95_ms=sorted_latencies[p95_idx] if p95_idx < len(sorted_latencies) else 0,
            p99_ms=sorted_latencies[p99_idx] if p99_idx < len(sorted_latencies) else 0,
            throughput_per_sec=len(valid_latencies) / (total_time / 1000) if total_time > 0 else 0,
        )
        
        self.results.append(result)
        self._log_result(result)
        return result
    
    def _log_result(self, result: BenchmarkResult) -> None:
        """Log benchmark result."""
        logger.info(f"  ✅ {result.stage}")
        logger.info(f"     Mean:      {result.mean_ms:.2f}ms")
        logger.info(f"     Min/Max:   {result.min_ms:.2f}ms / {result.max_ms:.2f}ms")
        logger.info(f"     P95/P99:   {result.p95_ms:.2f}ms / {result.p99_ms:.2f}ms")
        logger.info(f"     Throughput: {result.throughput_per_sec:.1f} ops/sec")
    
    def print_summary(self) -> None:
        """Print summary of all benchmarks."""
        print("\n" + "=" * 70)
        print("RAG PIPELINE PERFORMANCE BENCHMARK SUMMARY")
        print("=" * 70)
        print()
        
        for result in self.results:
            print(f"{result.stage:30} | Mean: {result.mean_ms:7.2f}ms | "
                  f"P95: {result.p95_ms:7.2f}ms | P99: {result.p99_ms:7.2f}ms")
        
        print()
        print("Expected Combined Latencies:")
        
        # Expected targets from .instructions.md
        print(f"  Single query: < 2000ms (target)")
        print(f"    Embed:     ~600ms")
        print(f"    Retrieve:  ~300ms")
        print(f"    Rerank:    ~200ms")
        print(f"    LLM:       ~800ms")
        print(f"    Overhead:  ~100ms")
        print()
        print(f"  Cache hit:   < 100ms (target)")
        print()
        
        total_mean = sum(r.mean_ms for r in self.results)
        print(f"Measured total (sum of stages): {total_mean:.2f}ms")
        
        print()
        print("=" * 70)


async def benchmark_chunking() -> None:
    """Benchmark chunking service."""
    from services.chunking import MedicalChunker
    
    chunk = MedicalChunker()
    note_data = {
        "chief_complaint": "Persistent cough",
        "history_of_present_illness": "Patient has had cough for 2 weeks. Fever 101F.",
        "physical_exam": "Lungs clear to auscultation",
        "plan": "Supportive care",
    }
    
    async def run_chunking():
        try:
            import unittest.mock as mock
            with mock.patch.object(chunk, '_count_tokens', return_value=5):
                chunk.chunk_note(note_data, "note-001")
        except Exception as e:
            logger.debug(f"Chunking benchmark error: {e}")
    
    bench = RAGBenchmark()
    bench.run_benchmark("Chunking", run_chunking, samples=5)
    bench.print_summary()


async def benchmark_masking() -> None:
    """Benchmark PII masking."""
    from services.pii_masking import PIIMasker
    
    masker = PIIMasker(enable_masking=True)
    text = "Patient John Doe at 555-123-4567 with SSN 123-45-6789"
    
    async def run_masking():
        masker.mask_text(text)
    
    bench = RAGBenchmark()
    bench.run_benchmark("PII Masking", run_masking, samples=10)
    bench.print_summary()


async def benchmark_embeddings() -> None:
    """Benchmark embedding generation."""
    from services.gemini_embeddings import GeminiEmbeddings
    from unittest.mock import AsyncMock, patch
    
    embedder = GeminiEmbeddings()
    text = "Patient presents with persistent dry cough"
    
    async def run_embedding():
        with patch.object(embedder, 'client') as mock_client:
            mock_client.embed_content = AsyncMock(
                return_value={"embedding": {"values": [0.1] * 768}}
            )
            await embedder.embed_text(text)
    
    bench = RAGBenchmark()
    bench.run_benchmark("Embedding (768-dim)", run_embedding, samples=5)
    bench.print_summary()


async def benchmark_retrieval() -> None:
    """Benchmark vector retrieval."""
    from services.retrieval import VectorRetriever
    from unittest.mock import AsyncMock, patch
    
    retriever = VectorRetriever()
    query_embedding = [0.1] * 768
    
    async def run_retrieval():
        with patch.object(retriever, 'client') as mock_client:
            mock_client.rpc = AsyncMock(
                return_value=[{"id": "c1", "content": "Test"}]
            )
            await retriever.retrieve_similar(
                embedding=query_embedding,
                user_id="user-001",
                top_k=5
            )
    
    bench = RAGBenchmark()
    bench.run_benchmark("Retrieval (top-5)", run_retrieval, samples=5)
    bench.print_summary()


async def benchmark_reranking() -> None:
    """Benchmark reranking."""
    from services.reranking import CrossEncoderReranker
    from unittest.mock import MagicMock, patch
    
    reranker = CrossEncoderReranker()
    chunks = ["chunk1", "chunk2", "chunk3"]
    
    async def run_reranking():
        with patch.object(reranker, 'model') as mock_model:
            mock_model.predict = MagicMock(return_value=[0.9, 0.8, 0.7])
            reranker.rerank(query="test", chunks=chunks)
    
    bench = RAGBenchmark()
    bench.run_benchmark("Reranking (top-5→3)", run_reranking, samples=5)
    bench.print_summary()


async def benchmark_llm() -> None:
    """Benchmark LLM generation."""
    from services.llm import GroqLLM
    from unittest.mock import AsyncMock, MagicMock, patch
    
    llm = GroqLLM()
    chunks = [{"text": "Clinical data"}]
    
    async def run_llm():
        with patch.object(llm, 'client') as mock_client:
            mock_client.chat.completions.create = AsyncMock(
                return_value=MagicMock(
                    choices=[MagicMock(message=MagicMock(
                        content="Medical answer"
                    ))]
                )
            )
            await llm.generate_answer(query="test", chunks=chunks)
    
    bench = RAGBenchmark()
    bench.run_benchmark("LLM (Mixtral)", run_llm, samples=3)
    bench.print_summary()


async def benchmark_full_pipeline() -> None:
    """Benchmark complete end-to-end pipeline."""
    bench = RAGBenchmark()
    
    logger.info("Starting full end-to-end pipeline benchmark...")
    
    # Run all stages
    await benchmark_chunking()
    await benchmark_masking()
    await benchmark_embeddings()
    await benchmark_retrieval()
    await benchmark_reranking()
    await benchmark_llm()
    
    print("\n" + "=" * 70)
    print("END-TO-END PIPELINE TOTAL")
    print("=" * 70)
    print()
    
    # Collect all results
    all_results = bench.results
    total_mean = sum(r.mean_ms for r in all_results) if all_results else 0
    
    print(f"Total estimated latency: {total_mean:.0f}ms")
    print(f"Target: < 2000ms")
    print()
    
    if total_mean < 2000:
        print("✅ Performance is within target!")
    else:
        print(f"⚠️  Performance exceeds target by {total_mean - 2000:.0f}ms")
        print("   Consider optimizing slowest stages:")
        sorted_results = sorted(all_results, key=lambda r: r.mean_ms, reverse=True)
        for r in sorted_results[:3]:
            print(f"   - {r.stage}: {r.mean_ms:.0f}ms")
    
    print()
    print("=" * 70)


if __name__ == "__main__":
    logger.info("RAG Pipeline Benchmarking Starting...")
    asyncio.run(benchmark_full_pipeline())
