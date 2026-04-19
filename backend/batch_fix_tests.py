#!/usr/bin/env python
"""Batch fix common test issues to match current service APIs."""

import re
from pathlib import Path

def fix_test_files():
    """Apply systematic fixes to test files."""
    
    test_dir = Path("tests")
    test_files = list(test_dir.glob("**/*.py"))
    test_files = [f for f in test_files if "conftest" not in f.name and "__pycache__" not in str(f)]
    
    replacements = [
        # Method name fixes
        (r"\.embed_text\(", ".embed_single("),
        (r"\.embed_batch\(", ".embed_texts("),
        (r"\.generate_answer\(", ".generate_response("),
        (r"\.retrieve_similar\(", ".retrieve("),
        
        # Constructor parameter fixes
        (r"retry_attempts\s*=", "max_retries="),
        (r",\s*enable_cache\s*=[^,)]*([,)])", r"\1"),
        (r",\s*retry_delay\s*=[^,)]*([,)])", r"\1"),
        
        # Method existence fixes
        (r"\.embed_batch(?!\()", ".embed_texts("),
        (r"genai\.Client", "GoogleGenerativeAIEmbeddings"),
        
        # Attribute access fixes - these need context so we do simpler ones
        (r"hasattr\((\w+),\s*'embed_batch'\)", r"hasattr(\1, 'embed_texts')"),
        (r"hasattr\((\w+),\s*'dimension'\)", r"hasattr(\1, 'model')"),
    ]
    
    fixed_count = 0
    
    for test_file in test_files:
        if test_file.name in ['test_rag_setup.py', 'conftest.py']:
            continue  # Skip already working files
            
        try:
            content = test_file.read_text(encoding='utf-8')
            original = content
            
            for pattern, replacement in replacements:
                content = re.sub(pattern, replacement, content)
            
            if content != original:
                test_file.write_text(content, encoding='utf-8')
                print(f"✅ Fixed: {test_file.name}")
                fixed_count += 1
                
        except Exception as e:
            print(f"⚠️  Error processing {test_file.name}: {e}")
    
    print(f"\n✨ Fixed {fixed_count} test files")

if __name__ == "__main__":
    # Run from backend directory
    import os
    os.chdir(Path(__file__).parent)
    fix_test_files()
