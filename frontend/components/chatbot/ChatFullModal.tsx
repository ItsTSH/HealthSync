"use client"

import { AlertTriangle, Plus, Archive } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface ChatFullModalProps {
  /**
   * Whether modal is open
   */
  isOpen: boolean

  /**
   * Callback to create new chat
   */
  onNewChat: () => void

  /**
   * Whether chat is near full (8+ queries)
   */
  near_full?: boolean

  /**
   * Optional callback when modal is closed
   */
  onClose?: () => void
}

/**
 * ChatFullModal Component (v4.0+)
 *
 * Modal displayed when user reaches 10/10 queries in a chat.
 * Prompted to either:
 * - Create a new chat to continue asking questions
 * - Review current chat before starting new one
 *
 * Features:
 * - Clear explanation of 10-query limit
 * - Quick action buttons for next steps
 * - ChatNearFullWarning variant for early notification (8+ queries)
 */
export function ChatFullModal({
  isOpen,
  onNewChat,
  near_full = false,
  onClose,
}: ChatFullModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          onClose?.()
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <DialogTitle>
              {near_full ? "Chat Limit Approaching" : "Chat Limit Reached"}
            </DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {near_full
              ? "You have used 8 or more queries in this chat. Consider creating a new chat soon."
              : "This chat has reached its maximum of 10 queries."}
          </DialogDescription>
        </DialogHeader>

        {/* Info Card */}
        <Card className="p-4 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-900 dark:text-red-100">
              Why the 10-query limit?
            </p>
            <ul className="text-xs text-red-800 dark:text-red-200 space-y-1">
              <li>✓ Keeps conversations focused and concise</li>
              <li>✓ Encourages you to review and start fresh with new context</li>
              <li>✓ Improves response quality and relevance</li>
              <li>✓ Better resource usage for all users</li>
            </ul>
          </div>
        </Card>

        {/* What You Can Do */}
        <div className="space-y-2">
          <p className="text-sm font-medium">What you can do now:</p>
          <div className="space-y-2">
            <Card className="p-3 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-900 dark:text-blue-100">
                💡 <strong>Review this chat:</strong> Scroll up to see all questions and answers
                to find any information you missed.
              </p>
            </Card>
            <Card className="p-3 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-900 dark:text-blue-100">
                📋 <strong>Start a new chat:</strong> Begin a new conversation with fresh context
                and 10 new queries available.
              </p>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 gap-2"
          >
            <Archive className="w-4 h-4" />
            {near_full ? "Dismiss" : "Keep Reviewing"}
          </Button>
          <Button onClick={onNewChat} className="flex-1 gap-2">
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>

        {/* Helpful Info */}
        <div className="text-xs text-muted-foreground text-center pt-2 space-y-1">
          <p>You can return to this chat anytime to review the conversation.</p>
          <p>Chats older than 30 days may be automatically archived.</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
