"""Chat management request/response schemas"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class ChatCreateRequest(BaseModel):
    """Request to create new chat"""
    title: Optional[str] = Field(None, max_length=255)


class ChatResponse(BaseModel):
    """Chat detail response"""
    id: str
    user_id: str
    title: str
    query_count: int = 0
    is_archived: bool = False
    created_at: str
    updated_at: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class ChatListResponse(BaseModel):
    """List of user's chats"""
    chats: List[ChatResponse]


class ChatMessageRequest(BaseModel):
    """Store chat message"""
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str
    cited_patients: Optional[List[str]] = None


class ChatMessageResponse(BaseModel):
    """Chat message response"""
    id: str
    chat_id: str
    role: str
    content: str
    cited_patients: Optional[List[str]] = None
    created_at: str
