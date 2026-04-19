"""Shared pytest fixtures and configuration for HealthSync testing."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, Any, AsyncGenerator
import asyncio
import os

# Enable pytest-asyncio plugin with auto mode
pytest_plugins = ("pytest_asyncio",)

# Configure pytest with asyncio auto mode
def pytest_configure(config):
    """Configure pytest with asyncio auto mode and markers."""
    config.option.asyncio_mode = "auto"
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
    config.addinivalue_line(
        "markers", "asyncio: mark test as async"
    )


# ============================================================================
# Configuration Fixtures
# ============================================================================

@pytest.fixture
def mock_config() -> Dict[str, Any]:
    """Mock configuration for testing."""
    return {
        "GEMINI_EMBEDDING_API_KEY": "test-gemini-key",
        "GROQ_API_KEY": "test-groq-key",
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "test-service-key",
        "SUPABASE_ANON_KEY": "test-anon-key",
        "REDIS_URL": "redis://localhost:6379",
        # RAG Config
        "CHUNK_SIZE": 500,
        "CHUNK_OVERLAP": 100,
        "MIN_CHUNK_SIZE": 100,
        "MAX_CHUNKS_PER_NOTE": 50,
        "EMBEDDING_MODEL": "text-embedding-004",
        "EMBEDDING_DIMENSION": 768,
        "EMBEDDING_BATCH_SIZE": 20,
        "RETRIEVAL_TOP_K": 5,
        "RERANKING_TOP_K": 5,
        "SIMILARITY_THRESHOLD": 0.6,
        "LLM_MODEL": "mixtral-8x7b-32768",
        "LLM_TEMPERATURE": 0.7,
        "LLM_MAX_TOKENS": 1024,
        "LLM_TIMEOUT": 10.0,
        "CACHE_TTL": 3600,
        "AUDIT_RETENTION_DAYS": 90,
    }


# ============================================================================
# Database & ORM Fixtures
# ============================================================================

@pytest.fixture
def mock_supabase_client() -> MagicMock:
    """Mock Supabase client."""
    client = MagicMock()
    client.table = MagicMock(return_value=MagicMock())
    client.postgrest = MagicMock()
    client.auth = MagicMock()
    return client


@pytest.fixture
def mock_db_session() -> AsyncMock:
    """Mock SQLAlchemy async session."""
    session = AsyncMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.close = AsyncMock()
    return session


# ============================================================================
# Cache & Redis Fixtures
# ============================================================================

@pytest.fixture
def mock_redis_client() -> AsyncMock:
    """Mock Redis async client."""
    client = AsyncMock()
    client.get = AsyncMock(return_value=None)
    client.set = AsyncMock(return_value=True)
    client.delete = AsyncMock(return_value=1)
    client.exists = AsyncMock(return_value=0)
    client.expire = AsyncMock(return_value=1)
    return client


@pytest.fixture
def mock_cache_manager(mock_redis_client: AsyncMock) -> MagicMock:
    """Mock cache manager."""
    manager = MagicMock()
    manager.get = AsyncMock(return_value=None)
    manager.set = AsyncMock(return_value=True)
    manager.delete = AsyncMock(return_value=True)
    manager.clear = AsyncMock(return_value=True)
    return manager


# ============================================================================
# API Client Fixtures
# ============================================================================

@pytest.fixture
def mock_gemini_client() -> AsyncMock:
    """Mock Gemini embedding API client."""
    client = AsyncMock()
    
    # Mock embedding response
    def mock_embed_content(*args, **kwargs):
        return {
            "embedding": {
                "values": [0.1] * 768  # 768-dimensional vector
            }
        }
    
    client.embed_content = MagicMock(side_effect=mock_embed_content)
    client.embed_content_async = AsyncMock(
        return_value={"embedding": {"values": [0.1] * 768}}
    )
    return client


@pytest.fixture
def mock_groq_client() -> AsyncMock:
    """Mock Groq LLM API client."""
    client = AsyncMock()
    
    async def mock_create(*args, **kwargs):
        return AsyncMock(
            choices=[AsyncMock(message=AsyncMock(content="This is a test medical summary."))]
        )
    
    client.chat.completions.create = mock_create
    return client


# ============================================================================
# Sample Data Fixtures
# ============================================================================

@pytest.fixture
def sample_medical_note() -> str:
    """Sample medical note for testing."""
    return """
    Patient: John Doe
    DOB: 01/15/1980
    Date: 2024-04-10
    
    Chief Complaint: Persistent cough for 2 weeks
    
    History of Present Illness:
    Patient presents with a persistent dry cough that started 2 weeks ago. 
    Associated with mild fever (101°F) and fatigue. No dyspnea or chest pain.
    Patient denies recent travel or sick contacts.
    
    Vital Signs:
    BP: 120/80 mmHg
    HR: 72 bpm
    RR: 16/min
    Temp: 99.5°F
    
    Physical Examination:
    General: Patient appears well, in no acute distress
    Lungs: Clear to auscultation bilaterally
    Heart: Regular rate and rhythm
    
    Assessment & Plan:
    1. Viral upper respiratory infection - Supportive care, fluids
    2. Monitor symptoms, follow-up in 1 week if not improved
    
    Medications:
    - Acetaminophen 500mg BID PRN
    - Honey-based cough drops
    """


@pytest.fixture
def sample_pii_texts() -> Dict[str, str]:
    """Texts containing various PII for testing masking."""
    return {
        "name": "John Doe had an appointment on Monday.",
        "phone": "Patient's phone number is 555-123-4567.",
        "email": "Contact patient at john.doe@email.com for updates.",
        "ssn": "SSN: 123-45-6789 verified in records.",
        "address": "Patient lives at 123 Main St, Springfield, IL 62701.",
        "mixed": "John Smith (SSN: 987-65-4321) at 555-987-6543 or johnsmith@example.com, 456 Oak Ave.",
    }


@pytest.fixture
def sample_chunks() -> list:
    """Sample text chunks for testing."""
    return [
        "This is the first chunk about patient history.",
        "This is the second chunk about vital signs and examination.",
        "This is the third chunk about assessment and diagnosis.",
        "This is the fourth chunk about treatment plan.",
        "This is the fifth chunk about follow-up care.",
    ]


@pytest.fixture
def sample_embeddings() -> list:
    """Sample embedding vectors (768-dimensional)."""
    # Generate simple test vectors with different patterns
    return [
        [0.1 + (i * 0.01) for i in range(768)] for _ in range(5)
    ]


@pytest.fixture
def sample_search_results() -> list:
    """Sample vector search results from pgvector."""
    return [
        {
            "id": "chunk-1",
            "note_id": "note-001",
            "content": "Vital signs: BP 120/80, HR 72",
            "similarity_score": 0.95,
            "created_at": "2024-04-10T10:00:00Z",
        },
        {
            "id": "chunk-2",
            "note_id": "note-001",
            "content": "Patient presents with cough",
            "similarity_score": 0.87,
            "created_at": "2024-04-10T10:05:00Z",
        },
        {
            "id": "chunk-3",
            "note_id": "note-002",
            "content": "Treatment plan: Supportive care",
            "similarity_score": 0.78,
            "created_at": "2024-04-10T10:10:00Z",
        },
    ]


# ============================================================================
# Async Test Support
# ============================================================================

@pytest.fixture
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def async_client(mock_supabase_client: MagicMock):
    """Async client for testing."""
    client = AsyncMock()
    client.db = mock_supabase_client
    return client


# ============================================================================
# Autouse Fixtures
# ============================================================================

@pytest.fixture(autouse=True)
def reset_mocks():
    """Reset all mocks before each test."""
    yield
    # Cleanup can be added here if needed


# ============================================================================
# Service Compatibility Fixtures
# ============================================================================
# These fixtures provide pre-configured mocks for services that match actual APIs

@pytest.fixture
def mock_gemini_service() -> MagicMock:
    """Mock GeminiEmbeddingService with correct attributes."""
    service = MagicMock()
    service.model = "text-embedding-004"
    service.batch_size = 20
    service.max_retries = 3
    service.timeout = 30
    service.embeddings_model = MagicMock()
    service.embeddings_model.embed_documents = MagicMock(
        return_value=[[0.1] * 768 for _ in range(5)]
    )
    # Mock the async methods
    service.embed_texts = AsyncMock(return_value=([[0.1] * 768], {"status": "ok"}))
    service.embed_single = AsyncMock(return_value=[0.1] * 768)
    return service


@pytest.fixture
def mock_groq_service() -> MagicMock:
    """Mock GroqLLMService with correct attributes."""
    service = MagicMock()
    service.model = "mixtral-8x7b-32768"
    service.max_tokens = 1024
    service.temperature = 0.7
    service.timeout = 10
    service.llm = MagicMock()
    service.generate_response = AsyncMock(
        return_value=MagicMock(answer="Test response", confidence=0.85)
    )
    return service


@pytest.fixture
def mock_retrieval_service() -> MagicMock:
    """Mock RetrievalService with correct attributes."""
    service = MagicMock()
    service.supabase = MagicMock()
    service.top_k = 5
    service.retrieve = AsyncMock(return_value=[])
    return service


@pytest.fixture
def mock_reranking_service() -> MagicMock:
    """Mock RerankingService with correct attributes."""
    service = MagicMock()
    service.model = MagicMock()
    service.top_k = 5
    service.rerank = AsyncMock(return_value=[])
    return service


@pytest.fixture
def mock_audit_logger() -> MagicMock:
    """Mock AuditLogger with correct attributes."""
    service = MagicMock()
    service.supabase = MagicMock()
    service.enabled = True
    service.table_name = "rag_queries_audit"
    service.log_rag_query = AsyncMock(return_value="audit-id-123")
    return service


# ============================================================================
# Pytest Hooks for Test Compatibility
# ============================================================================

def pytest_runtest_setup(item):
    """Configure tests before they run."""
    # Auto-mark integration tests in integration/ directory
    if "integration" in str(item.fspath):
        item.add_marker(pytest.mark.integration)
    # Auto-mark unit tests in unit/ directory  
    elif "unit" in str(item.fspath):
        item.add_marker(pytest.mark.unit)
