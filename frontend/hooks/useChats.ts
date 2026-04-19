"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { toast } from "sonner"
import { ChatService, Chat } from "@/services/chat-service"
import { APIError } from "@/lib/api-client"

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
  createChat: (title?: string, patientId?: string) => Promise<ChatItem | null>
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

  // Load chats from backend API
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

        // Call backend via ChatService
        const backendChats = await ChatService.listChats()
        
        // Convert Chat to ChatItem
        const chatItems: ChatItem[] = backendChats.map(chat => ({
          id: chat.id,
          title: chat.title,
          created_at: chat.created_at,
          updated_at: chat.updated_at,
          query_count: chat.query_count,
          is_archived: chat.status === "archived",
        }))

        setChats(chatItems)
        cacheTimeRef.current = now
      } catch (err) {
        if (err instanceof APIError) {
          const message = err.message || "Failed to load chats"
          setError(message)
          toast.error(message)
        } else if (err instanceof Error) {
          setError(err.message)
          toast.error(err.message)
        } else {
          setError("Failed to load chats")
          toast.error("Failed to load chats")
        }
        console.error("Error loading chats:", err)
      } finally {
        setIsLoading(false)
      }
    },
    [chats.length]
  )

  // Create new chat
  const createChat = useCallback(
    async (title?: string, patientId?: string): Promise<ChatItem | null> => {
      try {
        if (!patientId) {
          toast.error("Patient ID is required to create a chat")
          return null
        }

        const backendChat = await ChatService.createChat({
          patient_id: patientId,
          title: title || "New Chat",
        })

        const newChat: ChatItem = {
          id: backendChat.id,
          title: backendChat.title,
          created_at: backendChat.created_at,
          updated_at: backendChat.updated_at,
          query_count: 0,
        }

        setChats((prev) => [newChat, ...prev])
        toast.success("New chat created")

        return newChat
      } catch (err) {
        let message = "Failed to create chat"
        if (err instanceof APIError) {
          message = err.message
        } else if (err instanceof Error) {
          message = err.message
        }
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
        await ChatService.deleteChat(chatId)

        setChats((prev) => prev.filter((c) => c.id !== chatId))
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

  // Archive chat
  const archiveChat = useCallback(
    async (chatId: string) => {
      try {
        await ChatService.archiveChat(chatId)

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
  }, [loadChats])

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
