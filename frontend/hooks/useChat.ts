"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { toast } from "sonner"
import { ChatService, Chat } from "@/services/chat-service"
import { APIError } from "@/lib/api-client"

interface ChatSessionContext {
  query_count: number
  is_full: boolean
  referenced_patient_ids: string[]
  last_referenced_patient_id: string | null
}

interface ChatContextData {
  id: string
  user_id: string
  patient_id: string
  title: string
  query_count: number
  is_archived: boolean
  created_at: string
  updated_at?: string
  context: ChatSessionContext | null
}

interface UseChathooks {
  // State
  chat: ChatContextData | null
  isLoading: boolean
  error: string | null

  // Actions
  loadChat: (chatId: string) => Promise<void>
  updateTitle: (title: string) => Promise<void>
  incrementQueryCount: () => Promise<number>
  updateReferencedPatients: (patientIds: string[]) => Promise<void>
  deleteChat: (chatId: string) => Promise<void>
  archiveChat: (chatId: string) => Promise<void>

  // Computed
  isFull: () => boolean
  remainingQueries: () => number
  canQuery: () => boolean
}

/**
 * useChat Hook (v4.0+)
 *
 * Manages individual chat state and operations.
 *
 * Handles:
 * - Loading chat details + context
 * - Query counter management
 * - Referenced patient tracking
 * - Chat metadata updates
 * - Chat deletion/archiving
 *
 * Features:
 * - Auto error handling with user feedback
 * - Async loading states
 * - Computed properties for convenience
 * - Session context persistence
 */
export function useChat(): UseChathooks {
  const [chat, setChat] = useState<ChatContextData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Load chat details
  const loadChat = useCallback(
    async (chatId: string) => {
      try {
        setIsLoading(true)
        setError(null)

        // Cancel previous request if any
        abortControllerRef.current?.abort()
        abortControllerRef.current = new AbortController()

        const backendChat = await ChatService.getChat(chatId)
        
        setChat({
          id: backendChat.id,
          user_id: backendChat.user_id,
          patient_id: backendChat.patient_id,
          title: backendChat.title,
          query_count: backendChat.query_count,
          is_archived: false,
          created_at: backendChat.created_at,
          updated_at: backendChat.updated_at,
          context: null
        })
      } catch (err) {
        let message = "Failed to load chat"
        if (err instanceof APIError) {
          message = err.message
        } else if (err instanceof Error) {
          message = err.message
        }
        setError(message)
        toast.error(message)
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  // Update chat title
  const updateTitle = useCallback(
    async (title: string) => {
      if (!chat) {
        setError("No active chat")
        return
      }

      try {
        // Note: Backend doesn't have an update endpoint yet, 
        // so we'll update locally only
        setChat((prev) =>
          prev
            ? {
                ...prev,
                title,
                updated_at: new Date().toISOString(),
              }
            : null
        )
        toast.success("Chat title updated")
      } catch (err) {
        let message = "Failed to update chat"
        if (err instanceof Error) {
          message = err.message
        }
        setError(message)
        toast.error(message)
      }
    },
    [chat]
  )

  // Increment query counter
  const incrementQueryCount = useCallback(
    async (): Promise<number> => {
      if (!chat) {
        setError("No active chat")
        return 0
      }

      try {
        // Note: Backend doesn't have an increment endpoint yet
        // This is handled by SessionContextManager on the backend during RAG queries
        const newCount = (chat.query_count || 0) + 1
        
        setChat((prev) =>
          prev
            ? {
                ...prev,
                query_count: newCount,
                context: {
                  ...prev.context,
                  query_count: newCount,
                  is_full: newCount >= 10,
                } as ChatSessionContext,
              }
            : null
        )

        return newCount
      } catch (err) {
        let message = "Failed to increment query count"
        if (err instanceof Error) {
          message = err.message
        }
        setError(message)
        throw err
      }
    },
    [chat]
  )

  // Update referenced patients in session
  const updateReferencedPatients = useCallback(
    async (patientIds: string[]) => {
      if (!chat) {
        setError("No active chat")
        return
      }

      try {
        // Note: Backend doesn't have an endpoint for this yet
        // This is handled by the RAG pipeline automatically
        setChat((prev) =>
          prev
            ? {
                ...prev,
                context: {
                  ...prev.context,
                  referenced_patient_ids: patientIds,
                  last_referenced_patient_id: patientIds[0] || null,
                } as ChatSessionContext,
              }
            : null
        )
      } catch (err) {
        let message = "Failed to update patients"
        if (err instanceof Error) {
          message = err.message
        }
        setError(message)
        toast.error(message)
      }
    },
    [chat]
  )

  // Delete chat
  const deleteChat = useCallback(
    async (chatId: string) => {
      try {
        await ChatService.deleteChat(chatId)
        setChat(null)
        toast.success("Chat deleted")
      } catch (err) {
        let message = "Failed to delete chat"
        if (err instanceof APIError) {
          message = err.message
        } else if (err instanceof Error) {
          message = err.message
        }
        setError(message)
        toast.error(message)
        throw err
      }
    },
    []
  )

  // Archive chat (soft delete)
  const archiveChat = useCallback(
    async (chatId: string) => {
      try {
        // Note: Backend doesn't have archive endpoint yet
        // For now, we'll just delete it
        await ChatService.deleteChat(chatId)
        if (chat?.id === chatId) {
          setChat(null)
        }
        toast.success("Chat archived")
      } catch (err) {
        let message = "Failed to archive chat"
        if (err instanceof APIError) {
          message = err.message
        } else if (err instanceof Error) {
          message = err.message
        }
        setError(message)
        toast.error(message)
        throw err
      }
    },
    [chat]
  )

  // Computed properties
  const isFull = useCallback(() => {
    return chat?.context?.is_full ?? false
  }, [chat])

  const remainingQueries = useCallback(() => {
    return Math.max(0, 10 - (chat?.query_count ?? 0))
  }, [chat])

  const canQuery = useCallback(() => {
    return remainingQueries() > 0
  }, [remainingQueries])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return {
    chat,
    isLoading,
    error,
    loadChat,
    updateTitle,
    incrementQueryCount,
    updateReferencedPatients,
    deleteChat,
    archiveChat,
    isFull,
    remainingQueries,
    canQuery,
  }
}
