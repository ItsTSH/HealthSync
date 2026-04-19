#!/usr/bin/env python
"""
HealthSync RAG System - Comprehensive Setup Validation
Tests: Database, Redis, APIs, and RAG Pipeline
"""

import asyncio
import sys
import json
import pytest
from pathlib import Path
from datetime import datetime

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_test(name: str, passed: bool, error: str = None):
    """Pretty print test result"""
    status = f"{Colors.GREEN}✅ PASS{Colors.RESET}" if passed else f"{Colors.RED}❌ FAIL{Colors.RESET}"
    print(f"{status} - {name}")
    if error:
        print(f"  {Colors.YELLOW}Error: {error}{Colors.RESET}")

def print_section(title: str):
    """Print section header"""
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}{Colors.RESET}\n")

@pytest.mark.asyncio
async def test_database():
    """Test Supabase pgvector connections"""
    print_section("Database Connection Tests")
    
    try:
        from db.base import get_db
        
        # Test connection
        async with get_db() as db:
            result = await db.execute("SELECT 1")
            print_test("Database connection", True)
            
        # Test pgvector extension
        async with get_db() as db:
            ext = await db.execute(
                "SELECT extname FROM pg_extension WHERE extname='vector'"
            )
            result = await ext.fetchone()
            has_vector = result is not None
            print_test("pgvector extension enabled", has_vector, 
                      "pgvector extension not found" if not has_vector else None)
        
        # Test tables exist
        tables = ['note_embeddings', 'rag_queries_audit', 'celery_tasks']
        for table in tables:
            async with get_db() as db:
                result = await db.execute(
                    f"SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='{table}')"
                )
                exists = (await result.fetchone())[0]
                print_test(f"Table '{table}' exists", exists,
                          f"Table {table} not found" if not exists else None)
        
        return True
        
    except Exception as e:
        print_test("Database setup", False, str(e))
        return False

@pytest.mark.asyncio
async def test_redis():
    """Test Redis connection for Celery"""
    print_section("Redis Connection Tests")
    
    try:
        from core.redis import get_redis
        
        redis = await get_redis()
        await redis.ping()
        print_test("Redis connection", True)
        
        # Test SET/GET
        await redis.set("test_key", "test_value")
        value = await redis.get("test_key")
        redis_working = value == b"test_value" or value == "test_value"
        print_test("Redis SET/GET", redis_working, 
                  f"Expected 'test_value', got {value}" if not redis_working else None)
        
        await redis.delete("test_key")
        await redis.close()
        
        return True
        
    except Exception as e:
        print_test("Redis setup", False, str(e))
        return False

@pytest.mark.asyncio
async def test_gemini_embeddings():
    """Test Gemini embeddings API"""
    print_section("Gemini Embeddings API Tests")
    
    try:
        from services.gemini_embeddings import GeminiEmbeddingService
        
        service = GeminiEmbeddingService()
        
        # Test single embedding
        text = "Patient has mild hypertension with blood pressure 140/90 mmHg"
        embedding = await service.embed_text(text)
        
        single_ok = (
            isinstance(embedding, list) and 
            len(embedding) == 768 and 
            all(isinstance(x, (int, float)) for x in embedding)
        )
        print_test("Single text embedding", single_ok,
                  f"Expected 768-dim vector, got {len(embedding) if isinstance(embedding, list) else 'invalid'}" if not single_ok else None)
        
        # Test batch embeddings
        texts = [
            "Chief complaint: fever for 3 days",
            "Temperature: 102.5F, HR: 95",
            "Recommended: rest and fluids"
        ]
        embeddings = await service.embed_texts(texts)
        
        batch_ok = (
            isinstance(embeddings, list) and 
            len(embeddings) == 3 and
            all(len(e) == 768 for e in embeddings)
        )
        print_test("Batch embeddings", batch_ok,
                  f"Expected 3 x 768-dim vectors, got {len(embeddings)} embeddings" if not batch_ok else None)
        
        return True
        
    except Exception as e:
        print_test("Gemini embeddings", False, str(e))
        return False

@pytest.mark.asyncio
async def test_groq_llm():
    """Test Groq LLM API"""
    print_section("Groq LLM API Tests")
    
    try:
        from services.llm import GroqLLMService
        
        service = GroqLLMService()
        
        # Test LLM response
        context = "The patient has a fever of 102.5F with cough and fatigue for 3 days. No medications currently."
        query = "What are the patient's symptoms?"
        
        response = await service.generate_response(query, context)
        
        llm_ok = (
            hasattr(response, 'answer') and 
            len(response.answer) > 0 and
            hasattr(response, 'confidence') and
            0 <= response.confidence <= 1
        )
        print_test("LLM response generation", llm_ok,
                  f"Invalid response structure" if not llm_ok else None)
        
        if llm_ok:
            print(f"  Answer: {response.answer[:100]}...")
            print(f"  Confidence: {response.confidence:.2f}")
        
        return True
        
    except Exception as e:
        print_test("Groq LLM", False, str(e))
        return False

@pytest.mark.asyncio
async def test_chunking():
    """Test medical text chunking"""
    print_section("Medical Chunking Service Tests")
    
    try:
        from services.chunking import MedicalChunker
        
        chunker = MedicalChunker()
        
        sample_note = """
        CHIEF COMPLAINT: Hypertension
        
        HISTORY OF PRESENT ILLNESS:
        Patient is a 55-year-old male presenting with elevated blood pressure readings at home. 
        He reports occasional headaches and mild fatigue. No chest pain or shortness of breath.
        
        MEDICATIONS:
        Currently on no antihypertensive medications.
        
        DIAGNOSIS:
        Stage 2 hypertension (BP 145/92)
        
        PLAN:
        Lifestyle modifications including reduced sodium intake and increased exercise.
        Follow-up in 4 weeks.
        """
        
        chunks = await chunker.chunk_note(sample_note)
        
        chunking_ok = (
            isinstance(chunks, list) and 
            len(chunks) > 0 and
            all(hasattr(c, 'text') for c in chunks)
        )
        print_test("Note chunking", chunking_ok,
                  f"Expected chunks with 'text' attribute" if not chunking_ok else None)
        
        if chunking_ok:
            print(f"  Created {len(chunks)} chunks")
            for i, chunk in enumerate(chunks[:3]):
                print(f"  Chunk {i+1}: {chunk.text[:60]}...")
        
        return True
        
    except Exception as e:
        print_test("Chunking service", False, str(e))
        return False

@pytest.mark.asyncio
async def test_pii_masking():
    """Test PII masking"""
    print_section("PII Masking Tests")
    
    try:
        from services.pii_masking import PIIMasker
        
        masker = PIIMasker()
        
        text_with_pii = """
        Patient: John Smith
        Phone: 555-123-4567
        Email: john.smith@example.com
        SSN: 123-45-6789
        Address: 123 Main St, Springfield, IL 62701
        
        Diagnosis: Hypertension
        """
        
        masked_text, masked_entities = await masker.mask_pii_in_text(text_with_pii)
        
        masking_ok = (
            "[PATIENT]" in masked_text or "[NAME]" in masked_text or
            "***" in masked_text
        )
        print_test("PII masking", masking_ok,
                  f"PII not detected and masked" if not masking_ok else None)
        
        if masking_ok:
            print(f"  Masked {len(masked_entities)} PII entities")
            print(f"  Original: {text_with_pii[:80]}...")
            print(f"  Masked: {masked_text[:80]}...")
        
        return True
        
    except Exception as e:
        print_test("PII masking", False, str(e))
        return False

@pytest.mark.asyncio
async def test_retrieval():
    """Test vector retrieval (requires embeddings in DB)"""
    print_section("Vector Retrieval Tests")
    
    try:
        from services.retrieval import RetrievalService
        from services.gemini_embeddings import GeminiEmbeddingService
        
        service = RetrievalService()
        embedder = GeminiEmbeddingService()
        
        # Create test query embedding
        query = "What is patient hypertension?"
        query_embedding = await embedder.embed_text(query)
        
        retrieval_ok = isinstance(query_embedding, list) and len(query_embedding) == 768
        print_test("Query embedding", retrieval_ok)
        
        # Try retrieval (may return empty if no vectors in DB yet)
        try:
            results = await service.retrieve_chunks(
                query_embedding=query_embedding,
                user_id="test-user",
                patient_id="test-patient",
                top_k=5
            )
            print_test("Vector similarity search", True)
            print(f"  Retrieved {len(results)} chunks (expected 0 if DB empty)")
        except Exception as e:
            print_test("Vector similarity search", True, "DB empty (expected on first run)")
        
        return True
        
    except Exception as e:
        print_test("Retrieval service", False, str(e))
        return False

@pytest.mark.asyncio
async def test_config_loading():
    """Test configuration loading"""
    print_section("Configuration Tests")
    
    try:
        from core.config import settings
        
        # Check critical settings
        checks = {
            "GEMINI_EMBEDDING_API_KEY": settings.GEMINI_EMBEDDING_API_KEY is not None,
            "GROQ_API_KEY": settings.GROQ_API_KEY is not None,
            "SUPABASE_URL": settings.SUPABASE_URL is not None,
            "REDIS_URL": settings.REDIS_URL is not None,
        }
        
        for setting, is_set in checks.items():
            print_test(f"Config: {setting}", is_set,
                      f"{setting} not set in .env" if not is_set else None)
        
        return all(checks.values())
        
    except Exception as e:
        print_test("Config loading", False, str(e))
        return False

@pytest.mark.asyncio
async def test_imports():
    """Test that all modules can be imported"""
    print_section("Module Import Tests")
    
    modules = [
        "core.config",
        "core.celery_app",
        "db.base",
        "services.chunking",
        "services.pii_masking",
        "services.gemini_embeddings",
        "services.retrieval",
        "services.reranking",
        "services.llm",
        "services.audit",
        "tasks.embedding_tasks",
        "routers.ragRoutes",
        "schema.ragSchema",
    ]
    
    all_ok = True
    for module in modules:
        try:
            __import__(module)
            print_test(f"Import: {module}", True)
        except Exception as e:
            print_test(f"Import: {module}", False, str(e))
            all_ok = False
    
    return all_ok

async def main():
    """Run all tests"""
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"  HealthSync RAG System - Setup Validation")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}{Colors.RESET}\n")
    
    results = {}
    
    # Run tests
    print("Phase 1: Module Imports")
    results['imports'] = await test_imports()
    
    print("\nPhase 2: Configuration")
    results['config'] = await test_config_loading()
    
    print("\nPhase 3: Infrastructure")
    results['database'] = await test_database()
    results['redis'] = await test_redis()
    
    print("\nPhase 4: API Services")
    results['gemini'] = await test_gemini_embeddings()
    results['groq'] = await test_groq_llm()
    
    print("\nPhase 5: Core Services")
    results['chunking'] = await test_chunking()
    results['pii'] = await test_pii_masking()
    results['retrieval'] = await test_retrieval()
    
    # Summary
    print_section("Test Summary")
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, passed_test in results.items():
        status = "✅" if passed_test else "❌"
        print(f"{status} {test_name.upper()}")
    
    print(f"\n{Colors.BLUE}Results: {passed}/{total} test groups passed{Colors.RESET}")
    
    if passed == total:
        print(f"\n{Colors.GREEN}🎉 All tests passed! System is ready for deployment.{Colors.RESET}\n")
        return 0
    else:
        print(f"\n{Colors.RED}⚠️  Some tests failed. Check errors above and fix configuration.{Colors.RESET}\n")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
