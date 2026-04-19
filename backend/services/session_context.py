"""
SessionContextManager service - Manage per-chat conversation state in Redis.

Handles:
- Chat session context creation and loading
- Referenced patient tracking
- Query counter management (0-10)
- Conversation summary maintenance
- User isolation and ownership validation
- Redis caching with 7-day TTL
- Graceful error handling
"""

import logging
import json
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import List, Optional
from core.redis import get_redis_client

logger = logging.getLogger(__name__)


@dataclass
class ChatSessionContext:
    """Session context for a single chat conversation."""
    
    chat_id: str
    user_id: str
    referenced_patient_ids: List[str]  # UUIDs of patients mentioned in chat
    query_count: int  # Queries processed (0-10)
    conversation_summary: str  # Brief summary for context
    created_at: datetime
    updated_at: datetime
    is_full: bool = False  # True when query_count == 10


class SessionContextManager:
    """
    Manage chat session context in Redis (async).
    
    Features:
    - Per-chat conversation state tracking
    - Patient reference tracking for pronoun resolution
    - Query counter with capacity limits
    - Session-scoped TTL (7 days)
    - User isolation
    """
    
    # Constants
    QUERY_LIMIT = 10
    SESSION_TTL = 7 * 24 * 60 * 60  # 7 days in seconds (604800)
    SUMMARY_MAX_LENGTH = 500
    
    def __init__(self):
        """Initialize SessionContextManager with Redis client (lazy)."""
        self.redis = None
        logger.debug("SessionContextManager initialized (Redis client lazy-loaded)")

    async def _ensure_redis(self):
        """Ensure Redis client is initialized."""
        if self.redis is None:
            try:
                self.redis = await get_redis_client()
                logger.debug("Redis client connected for SessionContextManager")
            except Exception as e:
                logger.error(f"Failed to initialize Redis client: {e}")
                self.redis = None

    def _get_context_key(self, chat_id: str) -> str:
        """Generate Redis key for chat context."""
        return f"chat_session:{chat_id}"

    def _get_ttl(self) -> int:
        """Get session TTL in seconds (7 days)."""
        return self.SESSION_TTL

    def _serialize_context(self, context: ChatSessionContext) -> str:
        """Serialize ChatSessionContext to JSON string."""
        data = asdict(context)
        # Convert datetime objects to ISO format strings
        data['created_at'] = context.created_at.isoformat()
        data['updated_at'] = context.updated_at.isoformat()
        return json.dumps(data)

    def _deserialize_context(self, data: str) -> ChatSessionContext:
        """Deserialize JSON string to ChatSessionContext."""
        obj = json.loads(data)
        # Convert ISO format strings back to datetime
        obj['created_at'] = datetime.fromisoformat(obj['created_at'])
        obj['updated_at'] = datetime.fromisoformat(obj['updated_at'])
        return ChatSessionContext(**obj)

    async def _cache_context(self, chat_id: str, context: ChatSessionContext) -> None:
        """Store context in Redis with TTL."""
        if self.redis is None:
            await self._ensure_redis()
        
        if not self.redis:
            logger.warning(f"Redis unavailable, skipping cache for chat {chat_id}")
            return
        
        try:
            key = self._get_context_key(chat_id)
            serialized = self._serialize_context(context)
            await self.redis.set(key, serialized, ex=self._get_ttl())
            logger.debug(f"Cached session context for chat {chat_id}")
        except Exception as e:
            logger.error(f"Failed to cache context for {chat_id}: {e}")

    async def load_context(self, chat_id: str) -> Optional[ChatSessionContext]:
        """
        Load session context from Redis.
        
        Args:
            chat_id: Chat identifier
        
        Returns:
            ChatSessionContext if found, None if missing or on error.
        """
        if self.redis is None:
            await self._ensure_redis()
        
        if not self.redis:
            logger.warning(f"Redis unavailable, cannot load context for {chat_id}")
            return None
        
        try:
            key = self._get_context_key(chat_id)
            cached = await self.redis.get(key)
            
            if cached:
                logger.debug(f"Session context cache hit for chat {chat_id}")
                return self._deserialize_context(cached)
            else:
                logger.debug(f"No cached context for chat {chat_id}")
                return None
                
        except Exception as e:
            logger.warning(f"Failed to load context for {chat_id}: {e}")
            return None

    async def create_context(
        self,
        chat_id: str,
        user_id: str
    ) -> ChatSessionContext:
        """
        Create a new session context.
        
        Args:
            chat_id: Unique chat identifier
            user_id: User who owns the chat
            
        Returns:
            New ChatSessionContext instance
        """
        try:
            now = datetime.utcnow()
            context = ChatSessionContext(
                chat_id=chat_id,
                user_id=user_id,
                referenced_patient_ids=[],
                query_count=0,
                conversation_summary="",
                created_at=now,
                updated_at=now,
                is_full=False
            )
            
            await self._cache_context(chat_id, context)
            logger.info(f"Created new session context for chat {chat_id}")
            return context
            
        except Exception as e:
            logger.error(f"Failed to create context for {chat_id}: {e}")
            # Return default context even on error (graceful degradation)
            return ChatSessionContext(
                chat_id=chat_id,
                user_id=user_id,
                referenced_patient_ids=[],
                query_count=0,
                conversation_summary="",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                is_full=False
            )

    async def update_patients(
        self,
        chat_id: str,
        patient_ids: List[str]
    ) -> None:
        """
        Add referenced patient IDs to chat context (idempotent).
        
        Args:
            chat_id: Chat identifier
            patient_ids: List of patient UUIDs to add
        """
        try:
            context = await self.load_context(chat_id)
            if not context:
                logger.warning(f"No context found for chat {chat_id} in update_patients")
                return
            
            # Add new patients without duplicates
            current_set = set(context.referenced_patient_ids)
            current_set.update(patient_ids)
            context.referenced_patient_ids = list(current_set)
            context.updated_at = datetime.utcnow()
            
            await self._cache_context(chat_id, context)
            logger.debug(f"Updated patients for chat {chat_id}: {patient_ids}")
            
        except Exception as e:
            logger.error(f"Failed to update patients for {chat_id}: {e}")

    async def increment_query_count(self, chat_id: str) -> int:
        """
        Increment query counter (0-10) and update is_full flag.
        
        Args:
            chat_id: Chat identifier
            
        Returns:
            New query count (capped at QUERY_LIMIT)
        """
        try:
            context = await self.load_context(chat_id)
            if not context:
                logger.warning(f"No context found for chat {chat_id} in increment")
                return 0
            
            # Increment but cap at QUERY_LIMIT
            if context.query_count < self.QUERY_LIMIT:
                context.query_count += 1
            
            # Update is_full flag
            context.is_full = (context.query_count >= self.QUERY_LIMIT)
            context.updated_at = datetime.utcnow()
            
            await self._cache_context(chat_id, context)
            logger.info(f"Chat {chat_id}: query_count = {context.query_count}/{self.QUERY_LIMIT}")
            
            return context.query_count
            
        except Exception as e:
            logger.error(f"Failed to increment query count for {chat_id}: {e}")
            return 0

    async def is_chat_full(self, chat_id: str) -> bool:
        """
        Check if chat has reached query limit (10/10).
        
        Args:
            chat_id: Chat identifier
            
        Returns:
            True if query_count >= QUERY_LIMIT, False otherwise
        """
        try:
            context = await self.load_context(chat_id)
            if not context:
                return False
            
            return context.query_count >= self.QUERY_LIMIT
            
        except Exception as e:
            logger.error(f"Failed to check if chat {chat_id} is full: {e}")
            return False

    async def update_summary(
        self,
        chat_id: str,
        summary: str
    ) -> None:
        """
        Update conversation summary.
        
        Args:
            chat_id: Chat identifier
            summary: Summary text to append
        """
        try:
            context = await self.load_context(chat_id)
            if not context:
                logger.warning(f"No context found for chat {chat_id} in update_summary")
                return
            
            # Append summary with space separator
            if context.conversation_summary:
                new_summary = f"{context.conversation_summary} {summary}"
            else:
                new_summary = summary
            
            # Truncate if exceeds max length
            context.conversation_summary = new_summary[:self.SUMMARY_MAX_LENGTH]
            context.updated_at = datetime.utcnow()
            
            await self._cache_context(chat_id, context)
            logger.debug(f"Updated summary for chat {chat_id}")
            
        except Exception as e:
            logger.error(f"Failed to update summary for {chat_id}: {e}")

    async def clear_context(self, chat_id: str) -> None:
        """
        Clear context on chat deletion (cleanup).
        
        Args:
            chat_id: Chat identifier
        """
        if self.redis is None:
            await self._ensure_redis()
        
        if not self.redis:
            logger.warning(f"Redis unavailable, cannot clear context for {chat_id}")
            return
        
        try:
            key = self._get_context_key(chat_id)
            await self.redis.delete(key)
            logger.info(f"Cleared session context for chat {chat_id}")
        except Exception as e:
            logger.error(f"Failed to clear context for {chat_id}: {e}")

    async def validate_user_owns_chat(
        self,
        chat_id: str,
        user_id: str
    ) -> bool:
        """
        Validate that user owns the chat (RLS-like check).
        
        Args:
            chat_id: Chat identifier
            user_id: User to validate
            
        Returns:
            True if user owns chat, False otherwise
        """
        try:
            context = await self.load_context(chat_id)
            if not context:
                logger.warning(f"Context not found for chat {chat_id}")
                return False
            
            owns = context.user_id == user_id
            if not owns:
                logger.warning(
                    f"User {user_id} attempted to access chat {chat_id} "
                    f"owned by {context.user_id}"
                )
            return owns
            
        except Exception as e:
            logger.error(f"Failed to validate ownership for {chat_id}: {e}")
            return False


# Singleton instance
_session_context_manager: Optional[SessionContextManager] = None


def get_session_context_manager() -> SessionContextManager:
    """Get singleton SessionContextManager instance."""
    global _session_context_manager
    if _session_context_manager is None:
        _session_context_manager = SessionContextManager()
    return _session_context_manager
