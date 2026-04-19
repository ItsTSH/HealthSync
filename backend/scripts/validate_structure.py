#!/usr/bin/env python
"""
HealthSync RAG - Structure Validation
Verifies all required files exist and system is properly configured
"""

import sys
from pathlib import Path

def check_file_exists(path: Path, label: str) -> bool:
    """Check if file exists and print status"""
    exists = path.exists()
    icon = "✅" if exists else "❌"
    print(f"  {icon} {label}: {path.name}")
    return exists

def main():
    print("\n" + "="*70)
    print("  HealthSync RAG - Structure Validation")
    print("="*70 + "\n")
    
    # Define expected structure
    backend_path = Path(__file__).parent.parent
    
    checks = {
        "Configuration": [
            (backend_path / "core" / "config.py", "Config"),
            (backend_path / "core" / "celery_app.py", "Celery App"),
        ],
        "Database": [
            (backend_path / "db" / "base.py", "DB Base"),
            (backend_path / "migrations" / "001_create_pgvector_tables.sql", "Migration SQL"),
        ],
        "Services": [
            (backend_path / "services" / "chunking.py", "Chunking"),
            (backend_path / "services" / "pii_masking.py", "PII Masking"),
            (backend_path / "services" / "gemini_embeddings.py", "Gemini Embeddings"),
            (backend_path / "services" / "retrieval.py", "Retrieval"),
            (backend_path / "services" / "reranking.py", "Reranking"),
            (backend_path / "services" / "llm.py", "LLM"),
            (backend_path / "services" / "audit.py", "Audit"),
        ],
        "API & Schema": [
            (backend_path / "routers" / "ragRoutes.py", "RAG Routes"),
            (backend_path / "schema" / "ragSchema.py", "RAG Schema"),
        ],
        "Tasks": [
            (backend_path / "tasks" / "embedding_tasks.py", "Embedding Tasks"),
            (backend_path / "celery_worker.py", "Celery Worker"),
        ],
        "Entry Points": [
            (backend_path / "main.py", "Main App"),
            (backend_path / "requirements.txt", "Requirements"),
        ],
    }
    
    all_ok = True
    
    for category, files in checks.items():
        print(f"{category}:")
        category_ok = True
        for filepath, label in files:
            ok = check_file_exists(filepath, label)
            category_ok = category_ok and ok
            all_ok = all_ok and ok
        
        status = "✅ PASS" if category_ok else "❌ FAIL"
        print(f"  {status}\n")
    
    # Check environment
    print("Environment:")
    env_file = backend_path / ".env"
    if env_file.exists():
        print(f"  ✅ .env file exists")
        
        # Check for critical keys
        critical_keys = [
            "GEMINI_EMBEDDING_API_KEY",
            "GROQ_API_KEY",
            "SUPABASE_URL",
            "SUPABASE_ANON_KEY",
            "SUPABASE_SERVICE_ROLE_KEY",
            "REDIS_URL",
        ]
        
        try:
            with open(env_file) as f:
                env_content = f.read()
            
            print("  Critical keys:")
            for key in critical_keys:
                if key in env_content:
                    # Check if populated
                    if f"{key}=" in env_content:
                        line = [l for l in env_content.split('\n') if l.startswith(key)][0]
                        if "=" in line:
                            value = line.split("=", 1)[1].strip()
                            has_value = value and value != ""
                            icon = "✅" if has_value else "⚠️"
                            print(f"    {icon} {key}")
                            if not has_value:
                                all_ok = False
                else:
                    print(f"    ❌ {key} (missing)")
                    all_ok = False
        except Exception as e:
            print(f"  ⚠️  Could not read .env: {e}")
            all_ok = False
    else:
        print(f"  ❌ .env file not found")
        print(f"     Create one by copying .env.example and filling in values")
        all_ok = False
    
    print()
    
    # Summary
    if all_ok:
        print("="*70)
        print("✅ ALL CHECKS PASSED - System structure is valid")
        print("="*70 + "\n")
        print("Next steps:")
        print("  1. Start Redis:        redis-server")
        print("  2. Run health check:   python scripts/health_check.py")
        print("  3. Run pipeline test:  python scripts/test_rag_pipeline.py")
        print("  4. Start Celery:       celery -A core.celery_app worker --loglevel=info")
        print("  5. Start API:          uvicorn main:app --reload\n")
        return 0
    else:
        print("="*70)
        print("❌ SOME CHECKS FAILED - Fix issues above")
        print("="*70 + "\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())
