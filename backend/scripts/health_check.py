#!/usr/bin/env python
"""
HealthSync RAG - Quick Health Check
Fast validation that all systems are operational
Usage: python scripts/health_check.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

async def main():
    print("\n🏥 HealthSync RAG - Health Check\n")
    
    checks = []
    
    # 1. Check config
    try:
        from core.config import settings
        assert settings.GEMINI_EMBEDDING_API_KEY, "GEMINI_EMBEDDING_API_KEY not set"
        assert settings.GROQ_API_KEY, "GROQ_API_KEY not set"
        checks.append(("✅", "Configuration loaded", True))
    except Exception as e:
        checks.append(("❌", "Configuration", False))
        print(f"Config error: {e}")
    
    # 2. Check database
    try:
        from db.base import get_db
        async with get_db() as db:
            await db.execute("SELECT 1")
        checks.append(("✅", "Database connection", True))
    except Exception as e:
        checks.append(("❌", "Database", False))
        print(f"DB error: {e}")
    
    # 3. Check Redis
    try:
        from core.redis import get_redis
        redis = await get_redis()
        await redis.ping()
        await redis.close()
        checks.append(("✅", "Redis connection", True))
    except Exception as e:
        checks.append(("❌", "Redis", False))
        print(f"Redis error: {e}")
    
    # 4. Check Gemini
    try:
        from services.gemini_embeddings import GeminiEmbeddingService
        service = GeminiEmbeddingService()
        emb = await service.embed_text("test")
        assert len(emb) == 768
        checks.append(("✅", "Gemini API", True))
    except Exception as e:
        checks.append(("❌", "Gemini API", False))
        print(f"Gemini error: {e}")
    
    # 5. Check Groq
    try:
        from services.llm import GroqLLMService
        service = GroqLLMService()
        response = await service.generate_response("test?", "test context")
        assert response.answer
        checks.append(("✅", "Groq LLM", True))
    except Exception as e:
        checks.append(("❌", "Groq LLM", False))
        print(f"Groq error: {e}")
    
    # Print results
    print("Status checks:")
    for icon, name, status in checks:
        print(f"  {icon} {name}")
    
    passed = sum(1 for _, _, s in checks if s)
    total = len(checks)
    
    print(f"\n{passed}/{total} systems operational\n")
    
    return 0 if passed == total else 1

if __name__ == "__main__":
    exit(asyncio.run(main()))
