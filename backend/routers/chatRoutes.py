"""
Chat Management API v4.0+

Endpoints for multi-chat system:
- Create new chat
- List user's chats
- Get chat details + session context
- Archive/delete chat
"""
import logging
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Body, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from schema.chatSchema import (
    ChatCreateRequest, ChatResponse, ChatListResponse, ChatMessageRequest, ChatMessageResponse
)
from core.auth import get_current_user, get_current_user_token
from core.dependencies import get_supabase
from services.session_context import SessionContextManager
from core.redis import get_redis_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chats", tags=["Chats"])
context_manager = SessionContextManager()
limiter = Limiter(key_func=get_remote_address)


# ============================================================================
# CRUD ENDPOINTS
# ============================================================================

@router.post("/", response_model=ChatResponse, tags=["Chat Management"])
@limiter.limit("20/minute")
async def create_chat(
    request: Request,
    chat_request: ChatCreateRequest,
    current_user: str = Depends(get_current_user),
    user_token: str = Depends(get_current_user_token),
    supabase=Depends(lambda token=Depends(get_current_user_token): get_supabase(token))
):
    """
    Create new chat session
    
    Returns newly created chat with empty context
    
    Rate Limit: 20/minute per user
    """
    try:
        chat_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat() + "Z"
        
        # Insert chat into database
        response = supabase.table("chats").insert({
            "id": chat_id,
            "user_id": current_user,
            "patient_id": chat_request.patient_id,
            "title": chat_request.title or f"Chat {now[:10]}",
            "created_at": now,
            "updated_at": now
        }).execute()
        
        if not response.data:
            logger.error(f"Failed to create chat for user {current_user}")
            raise HTTPException(status_code=500, detail="Failed to create chat")
        
        # Create session context in Redis
        await context_manager.create_context(
            chat_id=chat_id,
            user_id=current_user
        )
        
        logger.info(f"Created chat {chat_id} for user {current_user}, patient {chat_request.patient_id}")
        
        return ChatResponse(
            id=chat_id,
            user_id=current_user,
            patient_id=chat_request.patient_id,
            title=chat_request.title or f"Chat {now[:10]}",
            query_count=0,
            is_archived=False,
            created_at=now,
            updated_at=now
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating chat: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/", response_model=ChatListResponse, tags=["Chat Management"])
@limiter.limit("30/minute")
async def list_chats(
    request: Request,
    current_user: str = Depends(get_current_user),
    supabase=Depends(get_supabase)
):
    """
    List user's chats (sorted by recency, newest first)
    
    Rate Limit: 30/minute per user
    """
    try:
        # Fetch chats for current user, sorted by updated_at descending
        response = supabase.table("chats").select("*").eq(
            "user_id", current_user
        ).order("updated_at", desc=True).execute()
        
        chats = []
        for chat_data in (response.data or []):
            # Load session context to get query_count
            context = await context_manager.load_context(
                chat_id=chat_data["id"]
            )
            
            # Use context if available, otherwise use defaults
            query_count = context.query_count if context else 0
            
            chats.append(ChatResponse(
                id=chat_data["id"],
                user_id=chat_data["user_id"],
                patient_id=chat_data.get("patient_id", ""),
                title=chat_data.get("title", "Untitled Chat"),
                query_count=query_count,
                is_archived=False,
                created_at=chat_data["created_at"],
                updated_at=chat_data["updated_at"]
            ))
        
        logger.info(f"Listed {len(chats)} chats for user {current_user}")
        
        return ChatListResponse(chats=chats)
    
    except Exception as e:
        logger.error(f"Error listing chats: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{chat_id}", response_model=ChatResponse, tags=["Chat Management"])
@limiter.limit("30/minute")
async def get_chat(
    request: Request,
    chat_id: str,
    current_user: str = Depends(get_current_user),
    supabase=Depends(get_supabase)
):
    """
    Get chat details + session context
    
    Returns:
    - Chat metadata (title, created_at, etc)
    - Session context (query_count, referenced_patients, is_full)
    
    Rate Limit: 30/minute per user
    """
    try:
        # Fetch chat and verify ownership
        response = supabase.table("chats").select("*").eq(
            "id", chat_id
        ).eq("user_id", current_user).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        chat_data = response.data[0]
        
        # Load session context (create if doesn't exist)
        context = await context_manager.load_context(chat_id=chat_id)
        if not context:
            context = await context_manager.create_context(
                chat_id=chat_id,
                user_id=current_user
            )
        
        logger.info(f"Retrieved chat {chat_id} for user {current_user}")
        
        return ChatResponse(
            id=chat_data["id"],
            user_id=chat_data["user_id"],
            title=chat_data.get("title", "Untitled Chat"),
            query_count=context.query_count,
            is_archived=False,
            created_at=chat_data["created_at"],
            updated_at=chat_data["updated_at"],
            context={
                "query_count": context.query_count,
                "is_full": context.is_full,
                "referenced_patient_ids": [str(p) for p in (context.referenced_patient_ids or [])],
                "last_referenced_patient_id": str(context.last_referenced_patient_id) if context.last_referenced_patient_id else None
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving chat {chat_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{chat_id}", tags=["Chat Management"])
@limiter.limit("10/minute")
async def delete_chat(
    request: Request,
    chat_id: str,
    current_user: str = Depends(get_current_user),
    supabase=Depends(get_supabase)
):
    """
    Archive/delete chat and associated messages
    
    - Marks chat as archived (soft delete)
    - Clears Redis session context
    - Keeps messages for audit trail
    
    Rate Limit: 10/minute per user
    """
    try:
        # Verify chat ownership
        response = supabase.table("chats").select("id").eq(
            "id", chat_id
        ).eq("user_id", current_user).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        # Delete chat (cascades to chat_messages and chat_sessions via ON DELETE CASCADE)
        delete_response = supabase.table("chats").delete().eq(
            "id", chat_id
        ).execute()
        
        # Clear Redis session context
        redis = get_redis_client()
        await redis.delete(f"chat_session:{chat_id}")
        
        logger.info(f"Deleted chat {chat_id} for user {current_user}")
        
        return {
            "status": "deleted",
            "chat_id": chat_id,
            "message": "Chat and associated messages deleted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting chat {chat_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# MESSAGE ENDPOINTS (Supplementary)
# ============================================================================

@router.get("/{chat_id}/messages", tags=["Chat Messages"])
@limiter.limit("30/minute")
async def get_chat_messages(
    request: Request,
    chat_id: str,
    limit: int = 50,
    offset: int = 0,
    current_user: str = Depends(get_current_user),
    supabase=Depends(get_supabase)
):
    """
    Get paginated chat messages
    
    Parameters:
    - limit: Max messages per page (default 50)
    - offset: Pagination offset (default 0)
    
    Rate Limit: 30/minute per user
    """
    try:
        # Verify chat ownership
        chat_response = supabase.table("chats").select("id").eq(
            "id", chat_id
        ).eq("user_id", current_user).execute()
        
        if not chat_response.data:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        # Fetch messages, ordered by creation time (newest first)
        messages_response = supabase.table("chat_messages").select("*").eq(
            "chat_id", chat_id
        ).order("created_at", desc=False).range(
            offset, offset + limit - 1
        ).execute()
        
        messages = []
        for msg in (messages_response.data or []):
            messages.append(ChatMessageResponse(
                id=msg["id"],
                chat_id=msg["chat_id"],
                role=msg["role"],
                content=msg["content"],
                cited_patients=msg.get("cited_patients"),
                created_at=msg["created_at"]
            ))
        
        logger.info(f"Retrieved {len(messages)} messages from chat {chat_id}")
        
        return {
            "chat_id": chat_id,
            "messages": messages,
            "limit": limit,
            "offset": offset,
            "total": len(messages_response.data or [])
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving messages for chat {chat_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/health/ready", tags=["Health"])
async def chat_routes_ready():
    """Health check for chat routes service"""
    return {
        "status": "ready",
        "service": "chat-management-api",
        "version": "v4.0"
    }
