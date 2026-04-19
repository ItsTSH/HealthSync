"use client"

import { useState } from "react"
import { Plus, MessageSquare, Trash2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export interface ChatItem {
  id: string
  title: string
  created_at: string
  updated_at?: string
  query_count: number
  is_full?: boolean
}

interface ChatSidebarProps {
  /**
   * List of chats to display
   */
  chats: ChatItem[]

  /**
   * Currently selected chat ID
   */
  selectedChatId?: string

  /**
   * Callback when user selects a chat
   */
  onSelectChat: (chatId: string) => void

  /**
   * Callback when user creates new chat
   */
  onCreateChat: () => void

  /**
   * Callback when user deletes a chat
   */
  onDeleteChat: (chatId: string) => void

  /**
   * Whether chats are loading
   */
  isLoading?: boolean

  /**
   * Search query for filtering chats
   */
  searchQuery?: string

  /**
   * Callback when search query changes
   */
  onSearchChange?: (query: string) => void

  /**
   * Whether to show search input
   */
  showSearch?: boolean

  /**
   * Optional custom empty state message
   */
  emptyMessage?: string
}

/**
 * ChatSidebar Component (v4.0+)
 *
 * Sidebar component displaying list of chats with:
 * - Chat selection with visual indicator
 * - Chat creation button
 * - Search/filter functionality
 * - Quick actions (delete)
 * - Query count indicator
 * - Timestamp display
 *
 * Features:
 * - Scrollable chat list
 * - Visual selection indicator
 * - Delete confirmation
 * - Recent chats sorting
 * - Loading state
 */
export function ChatSidebar({
  chats,
  selectedChatId,
  onSelectChat,
  onCreateChat,
  onDeleteChat,
  isLoading = false,
  searchQuery = "",
  onSearchChange,
  showSearch = true,
  emptyMessage = "No chats yet. Create one to get started!",
}: ChatSidebarProps) {
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Filter chats based on search query
  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Format date to readable string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    }

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {/* Header */}
      <div className="p-4 space-y-3 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Chats</h2>
          <Button
            onClick={onCreateChat}
            size="sm"
            className="gap-2"
            disabled={isLoading}
          >
            <Plus className="w-4 h-4" />
            New
          </Button>
        </div>

        {/* Search Input */}
        {showSearch && (
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="h-8"
            disabled={isLoading}
          />
        )}
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {isLoading ? (
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Loading chats...</p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-4 text-center">
              <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                onMouseEnter={() => setHoveredChatId(chat.id)}
                onMouseLeave={() => {
                  setHoveredChatId(null)
                  setConfirmDelete(null)
                }}
              >
                <Card
                  className={cn(
                    "p-3 cursor-pointer transition-all border",
                    selectedChatId === chat.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-accent border-transparent hover:border-border"
                  )}
                  onClick={() => onSelectChat(chat.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <p
                        className={cn(
                          "font-medium text-sm truncate",
                          selectedChatId === chat.id
                            ? "text-primary-foreground"
                            : "text-foreground"
                        )}
                      >
                        {chat.title}
                      </p>

                      {/* Metadata */}
                      <div
                        className={cn(
                          "flex items-center gap-2 mt-1 text-xs",
                          selectedChatId === chat.id
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground"
                        )}
                      >
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(chat.updated_at || chat.created_at)}</span>

                        {/* Query Count Badge */}
                        {chat.query_count > 0 && (
                          <>
                            <span>•</span>
                            <span>
                              {chat.query_count}/10 queries
                            </span>
                          </>
                        )}

                        {/* Full Indicator */}
                        {chat.is_full && (
                          <span className="ml-auto inline-block px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded text-xs">
                            Full
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete Button */}
                    {(hoveredChatId === chat.id || confirmDelete === chat.id) && (
                      <DropdownMenu
                        open={confirmDelete === chat.id}
                        onOpenChange={(open) => {
                          if (!open) setConfirmDelete(null)
                        }}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              setConfirmDelete(chat.id)
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteChat(chat.id)
                              setConfirmDelete(null)
                            }}
                          >
                            Delete chat
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Progress Indicator */}
                  {chat.query_count > 0 && (
                    <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          chat.is_full ? "bg-red-500" : "bg-green-500"
                        )}
                        style={{ width: `${(chat.query_count / 10) * 100}%` }}
                      />
                    </div>
                  )}
                </Card>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div
        className={cn(
          "p-3 border-t text-xs text-muted-foreground space-y-1",
          selectedChatId ? "block" : "hidden"
        )}
      >
        <p>
          <strong>Tip:</strong> Each chat allows 10 queries. When full, create a new one.
        </p>
      </div>
    </div>
  )
}

/**
 * Chat item component (for use in lists outside of sidebar)
 */
export function ChatListItem({
  chat,
  isSelected = false,
  onSelect,
  onDelete,
}: {
  chat: ChatItem
  isSelected?: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  return (
    <Card
      className={cn(
        "p-3 cursor-pointer transition-all",
        isSelected
          ? "bg-primary text-primary-foreground"
          : "hover:bg-accent"
      )}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-medium text-sm">{chat.title}</p>
          <p className="text-xs opacity-75 mt-1">
            {chat.query_count}/10 queries
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )
}
