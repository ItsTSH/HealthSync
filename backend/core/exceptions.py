"""
Error handling utilities for API responses
"""
import logging
from typing import Any, Dict
from fastapi import HTTPException

logger = logging.getLogger(__name__)


class RAGException(Exception):
    """Base exception for RAG operations"""
    
    def __init__(
        self,
        message: str,
        error_code: str = "UNKNOWN_ERROR",
        status_code: int = 500,
        details: Dict[str, Any] | None = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(RAGException):
    """Raised when input validation fails"""
    
    def __init__(self, message: str, details: Dict[str, Any] | None = None):
        super().__init__(
            message,
            error_code="VALIDATION_ERROR",
            status_code=400,
            details=details,
        )


class EmbeddingError(RAGException):
    """Raised when embedding generation fails"""
    
    def __init__(self, message: str, details: Dict[str, Any] | None = None):
        super().__init__(
            message,
            error_code="EMBEDDING_ERROR",
            status_code=500,
            details=details,
        )


class RetrievalError(RAGException):
    """Raised when document retrieval fails"""
    
    def __init__(self, message: str, details: Dict[str, Any] | None = None):
        super().__init__(
            message,
            error_code="RETRIEVAL_ERROR",
            status_code=500,
            details=details,
        )


class RerankingError(RAGException):
    """Raised when reranking fails"""
    
    def __init__(self, message: str, details: Dict[str, Any] | None = None):
        super().__init__(
            message,
            error_code="RERANKING_ERROR",
            status_code=500,
            details=details,
        )


class LLMError(RAGException):
    """Raised when LLM generation fails"""
    
    def __init__(self, message: str, details: Dict[str, Any] | None = None):
        super().__init__(
            message,
            error_code="LLM_ERROR",
            status_code=500,
            details=details,
        )


class AuthorizationError(RAGException):
    """Raised when user is not authorized to access resource"""
    
    def __init__(self, message: str = "Access denied"):
        super().__init__(
            message,
            error_code="AUTHORIZATION_ERROR",
            status_code=403,
        )


class NotFoundError(RAGException):
    """Raised when resource is not found"""
    
    def __init__(self, message: str):
        super().__init__(
            message,
            error_code="NOT_FOUND_ERROR",
            status_code=404,
        )


def rag_exception_to_http_exception(exc: RAGException) -> HTTPException:
    """Convert RAGException to FastAPI HTTPException"""
    return HTTPException(
        status_code=exc.status_code,
        detail=exc.message,
    )


def handle_rag_exception(exc: RAGException) -> None:
    """Log and handle RAG exceptions"""
    log_level = logging.WARNING if exc.status_code < 500 else logging.ERROR
    logger.log(
        log_level,
        f"{exc.error_code}: {exc.message}",
        extra={"details": exc.details},
    )
