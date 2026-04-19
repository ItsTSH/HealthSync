/**
 * Error handling utilities for chat and API operations
 */

export enum ErrorType {
  // Client errors
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  
  // Server errors
  EMBEDDING_ERROR = "EMBEDDING_ERROR",
  RETRIEVAL_ERROR = "RETRIEVAL_ERROR",
  RERANKING_ERROR = "RERANKING_ERROR",
  LLM_ERROR = "LLM_ERROR",
  
  // Auth errors
  AUTH_ERROR = "AUTH_ERROR",
  PERMISSION_ERROR = "PERMISSION_ERROR",
  
  // Resource errors
  NOT_FOUND_ERROR = "NOT_FOUND_ERROR",
  
  // Unknown
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface AppError {
  type: ErrorType
  message: string
  details?: string
  statusCode?: number
  originalError?: Error
}

export const errorMessages: Record<ErrorType, string> = {
  [ErrorType.VALIDATION_ERROR]:
    "Invalid input. Please check your query and try again.",
  [ErrorType.NETWORK_ERROR]:
    "Network error. Please check your connection and try again.",
  [ErrorType.TIMEOUT_ERROR]:
    "Request timed out. The server took too long to respond. Please try again.",
  [ErrorType.EMBEDDING_ERROR]:
    "Failed to process your query. Please try again later.",
  [ErrorType.RETRIEVAL_ERROR]:
    "Failed to search medical records. Please try again later.",
  [ErrorType.RERANKING_ERROR]:
    "Failed to rank results. Please try again later.",
  [ErrorType.LLM_ERROR]:
    "Failed to generate response. Please try again later.",
  [ErrorType.AUTH_ERROR]: "Authentication failed. Please log in again.",
  [ErrorType.PERMISSION_ERROR]:
    "You don't have permission to access this patient's records.",
  [ErrorType.NOT_FOUND_ERROR]:
    "The patient or resource was not found. Please check and try again.",
  [ErrorType.UNKNOWN_ERROR]:
    "An unexpected error occurred. Please try again later.",
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === "string") {
    return error
  }
  
  if (typeof error === "object" && error !== null) {
    const err = error as any
    if (err.message) return err.message
    if (err.detail) return err.detail
    if (err.error) return err.error
  }
  
  return errorMessages[ErrorType.UNKNOWN_ERROR]
}

export function parseAPIError(response: Response, body: any): AppError {
  const statusCode = response.status
  const detail = body?.detail || body?.message || "Unknown error"
  
  let errorType = ErrorType.UNKNOWN_ERROR
  
  if (statusCode === 400) {
    errorType = ErrorType.VALIDATION_ERROR
  } else if (statusCode === 401 || statusCode === 403) {
    errorType = statusCode === 401 ? ErrorType.AUTH_ERROR : ErrorType.PERMISSION_ERROR
  } else if (statusCode === 404) {
    errorType = ErrorType.NOT_FOUND_ERROR
  } else if (statusCode === 408 || statusCode === 504) {
    errorType = ErrorType.TIMEOUT_ERROR
  } else if (statusCode >= 500) {
    // Determine specific server error from detail message
    if (detail.includes("embedding")) {
      errorType = ErrorType.EMBEDDING_ERROR
    } else if (detail.includes("retriev")) {
      errorType = ErrorType.RETRIEVAL_ERROR
    } else if (detail.includes("rerank")) {
      errorType = ErrorType.RERANKING_ERROR
    } else if (detail.includes("LLM") || detail.includes("response")) {
      errorType = ErrorType.LLM_ERROR
    }
  }
  
  return {
    type: errorType,
    message: errorMessages[errorType],
    details: detail,
    statusCode,
  }
}

export function isRetryableError(error: AppError): boolean {
  // Network and timeout errors are retryable
  const retryableTypes = [
    ErrorType.NETWORK_ERROR,
    ErrorType.TIMEOUT_ERROR,
    ErrorType.EMBEDDING_ERROR,
    ErrorType.RETRIEVAL_ERROR,
    ErrorType.RERANKING_ERROR,
    ErrorType.LLM_ERROR,
  ]
  
  return retryableTypes.includes(error.type)
}

export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  onError?: (error: AppError) => void
): Promise<T | null> {
  try {
    return await fn()
  } catch (err) {
    const appError: AppError = {
      type: ErrorType.UNKNOWN_ERROR,
      message: getErrorMessage(err),
      originalError: err instanceof Error ? err : undefined,
    }
    
    if (err instanceof Error) {
      appError.originalError = err
      
      if (err.message.includes("network") || err.message.includes("fetch")) {
        appError.type = ErrorType.NETWORK_ERROR
      } else if (err.message.includes("timeout")) {
        appError.type = ErrorType.TIMEOUT_ERROR
      }
    }
    
    appError.message = errorMessages[appError.type]
    
    if (onError) {
      onError(appError)
    }
    
    console.error("Error:", appError)
    return null
  }
}
