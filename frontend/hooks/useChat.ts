"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import axios, { AxiosError } from "axios"
import { toast } from "sonner"

interface ChatSessionContext {
  query_count: number
  is_full: boolean
  referenced_patient_ids: string[]
  last_referenced_patient_id: string | null
}

interface ChatContextData {
  id: string
  user_id: string
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

        const response = await axios.get(`/api/chats/${chatId}`, {
          signal: abortControllerRef.current.signal,
        })

        setChat(response.data)
      } catch (err) {
        if (err instanceof AxiosError && err.code !== "ERR_CANCELED") {
          const message = err.response?.data?.detail || "Failed to load chat"
          setError(message)
          toast.error(message)
        }
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
        const response = await axios.patch(`/api/chats/${chat.id}`, {
          title,
        })

        setChat((prev) =>
          prev
            ? {
                ...prev,
                title: response.data.title,
                updated_at: response.data.updated_at,
              }
            : null
        )
        toast.success("Chat title updated")
      } catch (err) {
        const message =
          err instanceof AxiosError
            ? err.response?.data?.detail || "Failed to update chat"
            : "Unknown error"
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
        const response = await axios.post(`/api/chats/${chat.id}/increment-query`)

        setChat((prev) =>
          prev
            ? {
                ...prev,
                query_count: response.data.query_count,
                context: {
                  ...prev.context,
                  query_count: response.data.query_count,
                  is_full: response.data.is_full,
                } as ChatSessionContext,
              }
            : null
        )

        return response.data.query_count
      } catch (err) {
        const message =
          err instanceof AxiosError
            ? err.response?.data?.detail || "Failed to increment query count"
            : "Unknown error"
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
        const response = await axios.post(
          `/api/chats/${chat.id}/update-patients`,
          { patient_ids: patientIds }
        )

        setChat((prev) =>
          prev
            ? {
                ...prev,
                context: {
                  ...prev.context,
                  referenced_patient_ids: response.data.referenced_patient_ids,
                  last_referenced_patient_id:
                    response.data.last_referenced_patient_id,
                } as ChatSessionContext,
              }
            : null
        )
      } catch (err) {
        const message =
          err instanceof AxiosError
            ? err.response?.data?.detail || "Failed to update patients"
            : "Unknown error"
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
        await axios.delete(`/api/chats/${chatId}`)
        setChat(null)
        toast.success("Chat deleted")
      } catch (err) {
        const message =
          err instanceof AxiosError
            ? err.response?.data?.detail || "Failed to delete chat"
            : "Unknown error"
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
        await axios.patch(`/api/chats/${chatId}`, {
          is_archived: true,
        })
        if (chat?.id === chatId) {
          setChat((prev) =>
            prev
              ? {
                  ...prev,
                  is_archived: true,
                }
              : null
          )
        }
        toast.success("Chat archived")
      } catch (err) {
        const message =
          err instanceof AxiosError
            ? err.response?.data?.detail || "Failed to archive chat"
            : "Unknown error"
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
