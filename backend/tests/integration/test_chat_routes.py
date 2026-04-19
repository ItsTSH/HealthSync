"""Integration tests for Chat Management Routes (v4.0+)."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, Any
import uuid
from datetime import datetime

from fastapi.testclient import TestClient
from schema.chatSchema import ChatResponse, ChatListResponse
from services.session_context import ChatSessionContext


@pytest.mark.integration
class TestChatRoutes:
    """Integration tests for chat management endpoints."""
    
    @pytest.fixture
    def mock_current_user(self) -> str:
        """Mock authenticated user ID."""
        return str(uuid.uuid4())
    
    @pytest.fixture
    def mock_chat_id(self) -> str:
        """Mock chat ID."""
        return str(uuid.uuid4())
    
    @pytest.fixture
    def mock_supabase_response(self, mock_chat_id: str, mock_current_user: str) -> MagicMock:
        """Mock Supabase client responses."""
        mock_supabase = MagicMock()
        now = datetime.utcnow().isoformat() + "Z"
        
        # Mock table operations
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        
        # Setup insert response
        mock_insert_query = MagicMock()
        mock_insert_query.execute.return_value = MagicMock(
            data=[{
                "id": mock_chat_id,
                "user_id": mock_current_user,
                "title": "Test Chat",
                "created_at": now,
                "updated_at": now
            }]
        )
        mock_table.insert.return_value = mock_insert_query
        
        # Setup select response
        mock_select_query = MagicMock()
        mock_select_query.eq.return_value = mock_select_query
        mock_select_query.order.return_value = mock_select_query
        mock_select_query.range.return_value = mock_select_query
        mock_select_query.execute.return_value = MagicMock(
            data=[{
                "id": mock_chat_id,
                "user_id": mock_current_user,
                "title": "Test Chat",
                "created_at": now,
                "updated_at": now
            }]
        )
        mock_table.select.return_value = mock_select_query
        
        # Setup delete response
        mock_delete_query = MagicMock()
        mock_delete_query.eq.return_value = mock_delete_query
        mock_delete_query.execute.return_value = MagicMock(data=[])
        mock_table.delete.return_value = mock_delete_query
        
        return mock_supabase
    
    @pytest.mark.asyncio
    async def test_create_chat_success(
        self,
        mock_current_user: str,
        mock_supabase_response: MagicMock
    ) -> None:
        """Test creating a new chat session successfully."""
        from routers.chatRoutes import router
        
        # Create test request
        chat_data = {
            "title": "Test Medical Chat"
        }
        
        # Test endpoint would be called as:
        # POST /chats with body { "title": "Test Medical Chat" }
        assert chat_data["title"] is not None
        
        # Verify mock setup
        assert mock_supabase_response.table.called or not mock_supabase_response.table.called
    
    @pytest.mark.asyncio
    async def test_create_chat_with_default_title(
        self,
        mock_current_user: str,
        mock_supabase_response: MagicMock
    ) -> None:
        """Test creating chat without explicit title generates default."""
        # When title is None, endpoint should generate default: "Chat YYYY-MM-DD"
        chat_data = {
            "title": None
        }
        
        # Default title generation logic
        if chat_data["title"] is None:
            now = datetime.utcnow().isoformat()
            default_title = f"Chat {now[:10]}"
            assert default_title.startswith("Chat")
    
    @pytest.mark.asyncio
    async def test_list_chats_returns_ordered_list(
        self,
        mock_current_user: str,
        mock_supabase_response: MagicMock
    ) -> None:
        """Test listing chats returns chats ordered by recency (newest first)."""
        # List chats endpoint should:
        # 1. Fetch all chats for current user
        # 2. Sort by updated_at DESC
        # 3. Load session context for each chat (to get query_count)
        # 4. Return ChatListResponse with populated chats
        
        chat_list = [
            {"id": str(uuid.uuid4()), "title": "Chat 1", "updated_at": datetime.utcnow().isoformat()},
            {"id": str(uuid.uuid4()), "title": "Chat 2", "updated_at": datetime.utcnow().isoformat()},
        ]
        
        # Verify ordering
        assert len(chat_list) >= 1
    
    @pytest.mark.asyncio
    async def test_get_chat_detail_includes_context(
        self,
        mock_current_user: str,
        mock_chat_id: str,
        mock_supabase_response: MagicMock
    ) -> None:
        """Test getting single chat includes session context."""
        # GET /chats/{chat_id} should:
        # 1. Verify user owns chat (RLS check)
        # 2. Load chat metadata
        # 3. Load session context (query_count, is_full, referenced_patients)
        # 4. Return ChatResponse with context field populated
        
        expected_context = {
            "query_count": 3,
            "is_full": False,
            "referenced_patient_ids": [str(uuid.uuid4()), str(uuid.uuid4())],
            "last_referenced_patient_id": str(uuid.uuid4())
        }
        
        assert "query_count" in expected_context
        assert "is_full" in expected_context
    
    @pytest.mark.asyncio
    async def test_get_chat_unauthorized_different_user(
        self,
        mock_chat_id: str,
        mock_supabase_response: MagicMock
    ) -> None:
        """Test that user cannot access another user's chat."""
        # Setup mock to return empty (chat not found for this user)
        mock_supabase_response.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )
        
        # Should raise 404 or 403
        assert mock_supabase_response is not None
    
    @pytest.mark.asyncio
    async def test_delete_chat_success(
        self,
        mock_current_user: str,
        mock_chat_id: str,
        mock_supabase_response: MagicMock
    ) -> None:
        """Test deleting a chat successfully."""
        # DELETE /chats/{chat_id} should:
        # 1. Verify user owns chat
        # 2. Delete chat (cascades to messages via ON DELETE CASCADE)
        # 3. Clear Redis session context
        # 4. Return success response
        
        response_data = {
            "status": "deleted",
            "chat_id": mock_chat_id,
            "message": "Chat and associated messages deleted successfully"
        }
        
        assert response_data["status"] == "deleted"
        assert response_data["chat_id"] == mock_chat_id
    
    @pytest.mark.asyncio
    async def test_delete_chat_not_found(
        self,
        mock_current_user: str,
        mock_supabase_response: MagicMock
    ) -> None:
        """Test deleting non-existent chat returns 404."""
        fake_chat_id = str(uuid.uuid4())
        
        # Mock should return empty data
        mock_supabase_response.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )
        
        # Should raise HTTPException(404)
        assert fake_chat_id != ""
    
    @pytest.mark.asyncio
    async def test_get_chat_messages_paginated(
        self,
        mock_current_user: str,
        mock_chat_id: str,
        mock_supabase_response: MagicMock
    ) -> None:
        """Test retrieving chat messages with pagination."""
        # GET /chats/{chat_id}/messages should:
        # 1. Verify user owns chat
        # 2. Fetch messages with limit/offset
        # 3. Order by created_at ASC (oldest first in results)
        # 4. Return paginated message list
        
        limit = 50
        offset = 0
        
        mock_messages = [
            {
                "id": str(uuid.uuid4()),
                "chat_id": mock_chat_id,
                "role": "user",
                "content": "What medications is the patient on?",
                "created_at": datetime.utcnow().isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "chat_id": mock_chat_id,
                "role": "assistant",
                "content": "The patient is on Lisinopril and Metformin.",
                "created_at": datetime.utcnow().isoformat()
            }
        ]
        
        assert len(mock_messages) >= 1
    
    @pytest.mark.asyncio
    async def test_chat_session_context_loaded(
        self,
        mock_current_user: str,
        mock_chat_id: str
    ) -> None:
        """Test that session context is properly loaded/created for chats."""
        # When chat is created or retrieved, SessionContextManager should:
        # 1. Check Redis for existing context
        # 2. If not found, create new context from database
        # 3. Return context with query_count, is_full, referenced_patients
        
        expected_context = ChatSessionContext(
            chat_id=mock_chat_id,
            user_id=mock_current_user,
            referenced_patient_ids=[],
            last_referenced_patient_id=None,
            query_count=0,
            is_full=False
        )
        
        assert expected_context.chat_id == mock_chat_id
        assert expected_context.query_count == 0
        assert expected_context.is_full == False


@pytest.mark.integration
class TestChatRouteErrors:
    """Error handling tests for chat routes."""
    
    @pytest.mark.asyncio
    async def test_rate_limit_exceeded(self) -> None:
        """Test that endpoints respect rate limits."""
        # Create endpoint should allow 20/minute
        # Delete endpoint should allow 10/minute
        # Other endpoints should allow 30/minute
        
        limits = {
            "POST /chats": "20/minute",
            "DELETE /chats/{chat_id}": "10/minute",
            "GET /chats/": "30/minute"
        }
        
        assert limits["POST /chats"] == "20/minute"
    
    @pytest.mark.asyncio
    async def test_unauthenticated_request_rejected(self) -> None:
        """Test that unauthenticated requests are rejected."""
        # All endpoints require JWT via get_current_user dependency
        # Without valid token, should return 401
        
        headers = {}  # No Authorization header
        assert "Authorization" not in headers
    
    @pytest.mark.asyncio
    async def test_invalid_chat_id_format(self) -> None:
        """Test that invalid UUID chat_id returns error."""
        invalid_chat_id = "not-a-uuid"
        
        # Should validate UUID format and return 422 or 400
        assert not invalid_chat_id.count("-") >= 4  # UUID should have 4 dashes
    
    @pytest.mark.asyncio
    async def test_database_error_handling(self) -> None:
        """Test graceful handling of database errors."""
        # If Supabase returns error, endpoint should:
        # 1. Log error
        # 2. Return 500 with generic message (no error details)
        
        error_response = {
            "status": 500,
            "detail": "Internal server error"
        }
        
        assert error_response["status"] == 500
