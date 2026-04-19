#!/usr/bin/env python
"""Fix import errors in test files."""

import os
from pathlib import Path

backend_dir = Path(__file__).parent
test_files = {
    'tests/unit/test_services.py': [
        ('VectorRetriever()', 'RetrievalService()'),
        ('CrossEncoderReranker()', 'RerankingService()'),
        ('GroqLLM(', 'GroqLLMService('),
    ],
    'tests/unit/test_gemini_embeddings.py': [
        ('GeminiEmbeddings(', 'GeminiEmbeddingService('),
    ],
    'tests/integration/test_rag_pipeline.py': [
        ('VectorRetriever', 'RetrievalService'),
        ('GeminiEmbeddings', 'GeminiEmbeddingService'),
        ('CrossEncoderReranker', 'RerankingService'),
        ('GroqLLM', 'GroqLLMService'),
    ],
    'tests/integration/test_error_handling.py': [
        ('VectorRetriever', 'RetrievalService'),
        ('GeminiEmbeddings', 'GeminiEmbeddingService'),
        ('CrossEncoderReranker', 'RerankingService'),
        ('GroqLLM', 'GroqLLMService'),
    ],
}

for test_file, replacements in test_files.items():
    filepath = backend_dir / test_file
    if not filepath.exists():
        print(f"⚠️  {test_file} not found")
        continue
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    original_content = content
    for old, new in replacements:
        content = content.replace(old, new)
    
    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"✅ Fixed {test_file}")
    else:
        print(f"⏭️  No changes needed in {test_file}")

print("\nAll test files processed!")
