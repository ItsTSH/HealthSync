"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import axios, { AxiosError } from "axios"
import { toast } from "sonner"

interface ChatItem {
  id: string
  title: string
  created_at: string
  updated_at?: string
  query_count: number
  is_archived?: boolean
}

interface UseChatsHook {
  // State
  chats: ChatItem[]
  isLoading: boolean
  error: string | null
  searchQuery: string

  // Actions
  loadChats: (forceRefresh?: boolean) => Promise<void>
  createChat: (title?: string) => Promise<ChatItem | null>
  deleteChat: (chatId: string) => Promise<void>
  archiveChat: (chatId: string) => Promise<void>
  searchChats: (query: string) => void

  // Computed
  filteredChats: () => ChatItem[]
  activeChatCount: () => number
  fullChatCount: () => number
}

/**
 * useChats Hook (v4.0+)
 *
 * Manages list of user's chats with caching and filtering.
 *
 * Handles:
 * - Fetching list of user's chats
 * - Creating new chats
 * - Deleting/archiving chats
 * - Search/filtering
 * - Caching and refresh logic
 *
 * Features:
 * - Automatic caching (avoid re-fetching)
 * - Error handling with user feedback
 * - Search/filter across chat titles
 * - Loading states
 * - Computed properties
 */
export function useChats(): UseChatsHook {
  const [chats, setChats] = useState<ChatItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const cacheTimeRef = useRef<number>(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Cache duration in milliseconds (5 minutes)
  const CACHE_DURATION = 5 * 60 * 1000

  // Load chats from API
  const loadChats = useCallback(
    async (forceRefresh = false) => {
      try {
        setIsLoading(true)
        setError(null)

        // Check cache
        const now = Date.now()
        if (!forceRefresh && chats.length > 0 && now - cacheTimeRef.current < CACHE_DURATION) {
          setIsLoading(false)
          return
        }

        // Cancel previous request if any
        abortControllerRef.current?.abort()
        abortControllerRef.current = new AbortController()

        const response = await axios.get("/api/chats", {
          signal: abortControllerRef.current.signal,
        })

        setChats(response.data.chats || [])
        cacheTimeRef.current = now
      } catch (err) {
        if (err instanceof AxiosError && err.code !== "ERR_CANCELED") {
          const message = err.response?.data?.detail || "Failed to load chats"
          setError(message)
          toast.error(message)
        }
      } finally {
        setIsLoading(false)
      }
    },
    [chats.length]
  )

  // Create new chat
  const createChat = useCallback(
    async (title?: string): Promise<ChatItem | null> => {
      try {
        const response = await axios.post("/api/chats", {
          title: title || undefined,
        })

        const newChat: ChatItem = {
          id: response.data.id,
          title: response.data.title,
          created_at: response.data.created_at,
          updated_at: response.data.updated_at,
          query_count: 0,
        }

        setChats((prev) => [newChat, ...prev])
        toast.success("New chat created")

        return newChat
      } catch (err) {
        const message =
          err instanceof AxiosError
            ? err.response?.data?.detail || "Failed to create chat"
            : "Unknown error"
        setError(message)
        toast.error(message)
        return null
      }
    },
    []
  )

  // Delete chat
  const deleteChat = useCallback(
    async (chatId: string) => {
      try {
        await axios.delete(`/api/chats/${chatId}`)

        setChats((prev) => prev.filter((c) => c.id !== chatId))
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

  // Archive chat
  const archiveChat = useCallback(
    async (chatId: string) => {
      try {
        await axios.patch(`/api/chats/${chatId}`, {
          is_archived: true,
        })

        setChats((prev) =>
          prev.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  is_archived: true,
                }
              : c
          )
        )
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
    []
  )

  // Search/filter chats
  const searchChats = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  // Computed: filtered chats based on search query
  const filteredChats = useCallback((): ChatItem[] => {
    return chats.filter((chat) =>
      chat.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [chats, searchQuery])

  // Computed: count active chats (not full)
  const activeChatCount = useCallback((): number => {
    return chats.filter((c) => c.query_count < 10).length
  }, [chats])

  // Computed: count full chats (10/10 queries)
  const fullChatCount = useCallback((): number => {
    return chats.filter((c) => c.query_count >= 10).length
  }, [chats])

  // Load chats on mount
  useEffect(() => {
    loadChats()
  }, []) // Only on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return {
    chats,
    isLoading,
    error,
    searchQuery,
    loadChats,
    createChat,
    deleteChat,
    archiveChat,
    searchChats,
    filteredChats,
    activeChatCount,
    fullChatCount,
  }
}
