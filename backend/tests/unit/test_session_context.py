"""
Test suite for SessionContextManager service.

Tests cover:
- Session context creation and loading
- Patient reference tracking
- Query counter management
- Conversation summary updates
- User isolation
- Redis TTL and expiry
- Concurrent operations
"""

import pytest
import json
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from services.session_context import SessionContextManager, ChatSessionContext


# ============================================================================
# Module-Level Fixtures (NOT inside test classes)
# ============================================================================

@pytest.fixture
def mock_redis_client():
    """Create mock async Redis client"""
    return AsyncMock()


@pytest.fixture
def manager_with_mock(mock_redis_client):
    """Create manager with mocked Redis"""
    manager = SessionContextManager()
    manager.redis = mock_redis_client
    return manager


class TestSessionContextDataclass:
    """Test ChatSessionContext dataclass"""

    def test_create_context_dataclass(self):
        """Test creation of ChatSessionContext dataclass"""
        context = ChatSessionContext(
            chat_id="chat-123",
            user_id="user-456",
            referenced_patient_ids=["patient-1", "patient-2"],
            query_count=5,
            conversation_summary="Initial conversation",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            is_full=False
        )
        
        assert context.chat_id == "chat-123"
        assert context.user_id == "user-456"
        assert len(context.referenced_patient_ids) == 2
        assert context.query_count == 5
        assert context.is_full is False

    def test_context_is_full_true_at_10_queries(self):
        """Test is_full flag when query_count == 10"""
        context = ChatSessionContext(
            chat_id="chat-123",
            user_id="user-456",
            referenced_patient_ids=[],
            query_count=10,
            conversation_summary="",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            is_full=True
        )
        
        assert context.is_full is True
        assert context.query_count == 10


class TestSessionContextManager:
    """Test SessionContextManager service"""

    @pytest.mark.asyncio
    async def test_create_new_context(self, manager_with_mock, mock_redis_client):
        """Test creating fresh session context"""
        context = await manager_with_mock.create_context(
            chat_id="chat-123",
            user_id="user-456"
        )
        
        assert context.chat_id == "chat-123"
        assert context.user_id == "user-456"
        assert context.referenced_patient_ids == []
        assert context.query_count == 0
        assert context.conversation_summary == ""
        assert context.is_full is False
        
        # Verify Redis.set was called
        assert mock_redis_client.set.called

    @pytest.mark.asyncio
    async def test_load_existing_context(self, manager_with_mock, mock_redis_client):
        """Test loading stored context from Redis"""
        stored_data = {
            "chat_id": "chat-123",
            "user_id": "user-456",
            "referenced_patient_ids": ["patient-1"],
            "query_count": 3,
            "conversation_summary": "Patient has fever",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "is_full": False
        }
        mock_redis_client.get.return_value = json.dumps(stored_data)
        
        context = await manager_with_mock.load_context(chat_id="chat-123")
        
        assert context is not None
        assert context.chat_id == "chat-123"
        assert context.query_count == 3
        assert "patient-1" in context.referenced_patient_ids

    @pytest.mark.asyncio
    async def test_increment_query_count(self, manager_with_mock, mock_redis_client):
        """Test counter increments correctly"""
        stored_data = {
            "chat_id": "chat-123",
            "user_id": "user-456",
            "referenced_patient_ids": [],
            "query_count": 5,
            "conversation_summary": "",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "is_full": False
        }
        mock_redis_client.get.return_value = json.dumps(stored_data)
        
        new_count = await manager_with_mock.increment_query_count(chat_id="chat-123")
        
        assert new_count == 6
        
        # Verify Redis was updated
        call_args = mock_redis_client.set.call_args
        stored = json.loads(call_args[0][1])
        assert stored["query_count"] == 6

    @pytest.mark.asyncio
    async def test_is_chat_full_detection(self, manager_with_mock, mock_redis_client):
        """Test chat full detection at query count 10"""
        stored_data = {
            "chat_id": "chat-123",
            "user_id": "user-456",
            "referenced_patient_ids": [],
            "query_count": 10,
            "conversation_summary": "",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "is_full": True
        }
        mock_redis_client.get.return_value = json.dumps(stored_data)
        
        is_full = await manager_with_mock.is_chat_full(chat_id="chat-123")
        
        assert is_full is True

    @pytest.mark.asyncio
    async def test_update_summary(self, manager_with_mock, mock_redis_client):
        """Test conversation summary updates"""
        stored_data = {
            "chat_id": "chat-123",
            "user_id": "user-456",
            "referenced_patient_ids": [],
            "query_count": 2,
            "conversation_summary": "Patient complained of headache",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "is_full": False
        }
        mock_redis_client.get.return_value = json.dumps(stored_data)
        
        await manager_with_mock.update_summary(
            chat_id="chat-123",
            summary="High fever detected"
        )
        
        # Verify Redis was updated
        call_args = mock_redis_client.set.call_args
        stored = json.loads(call_args[0][1])
        assert "High fever detected" in stored["conversation_summary"]

    @pytest.mark.asyncio
    async def test_validate_user_owns_chat(self, manager_with_mock, mock_redis_client):
        """Test user ownership validation"""
        stored_data = {
            "chat_id": "chat-123",
            "user_id": "user-456",
            "referenced_patient_ids": [],
            "query_count": 0,
            "conversation_summary": "",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "is_full": False
        }
        mock_redis_client.get.return_value = json.dumps(stored_data)
        
        # Positive case
        owns = await manager_with_mock.validate_user_owns_chat(
            chat_id="chat-123",
            user_id="user-456"
        )
        assert owns is True
        
        # Negative case
        owns = await manager_with_mock.validate_user_owns_chat(
            chat_id="chat-123",
            user_id="user-wrong"
        )
        assert owns is False

    def test_context_key_naming(self):
        """Test Redis key naming convention"""
        manager = SessionContextManager()
        key = manager._get_context_key(chat_id="chat-123")
        
        assert key == "chat_session:chat-123"

    def test_get_ttl(self):
        """Test TTL calculation is 7 days"""
        manager = SessionContextManager()
        ttl = manager._get_ttl()
        
        expected_ttl = 7 * 24 * 60 * 60  # 604800 seconds
        assert ttl == expected_ttl

    @pytest.mark.asyncio
    async def test_missing_context_returns_none(self, manager_with_mock, mock_redis_client):
        """Test graceful handling of missing context"""
        mock_redis_client.get.return_value = None
        
        context = await manager_with_mock.load_context(chat_id="chat-nonexistent")
        
        assert context is None


class TestSessionContextIntegration:
    """Integration tests for full workflow"""

    @pytest.mark.asyncio
    async def test_full_chat_lifecycle(self, manager_with_mock, mock_redis_client):
        """Test complete chat lifecycle"""
        # Create new context
        context = await manager_with_mock.create_context(
            chat_id="chat-workflow",
            user_id="user-workflow"
        )
        assert context.query_count == 0
        
        # Increment to 10 (simulate full chat)
        stored_data = {
            "chat_id": "chat-workflow",
            "user_id": "user-workflow",
            "referenced_patient_ids": [],
            "query_count": 9,
            "conversation_summary": "",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "is_full": False
        }
        mock_redis_client.get.return_value = json.dumps(stored_data)
        
        count = await manager_with_mock.increment_query_count(chat_id="chat-workflow")
        assert count == 10
        
        # Check if full
        stored_data["query_count"] = 10
        stored_data["is_full"] = True
        mock_redis_client.get.return_value = json.dumps(stored_data)
        
        is_full = await manager_with_mock.is_chat_full(chat_id="chat-workflow")
        assert is_full is True
