"use client"

import { AlertCircle, CheckCircle2, Loader2, Info, Lightbulb } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type FeedbackType = "info" | "success" | "warning" | "error" | "loading" | "tip"

interface SystemFeedbackProps {
  /**
   * Type of feedback to display
   */
  type: FeedbackType

  /**
   * Main feedback message
   */
  message: string

  /**
   * Optional secondary message or details
   */
  details?: string

  /**
   * Optional callback when message is dismissed
   */
  onDismiss?: () => void

  /**
   * Whether to show dismiss button
   */
  dismissible?: boolean
}

/**
 * SystemFeedback Component (v4.0+)
 *
 * Displays contextual feedback messages for:
 * - Loading states (processing query)
 * - Errors (embedding failed, etc.)
 * - Success messages (query processed)
 * - Information (patient extracted, etc.)
 * - Tips and hints
 *
 * Features:
 * - Type-based styling (info, success, warning, error, loading)
 * - Optional dismiss button
 * - Icons matching feedback type
 * - Compact design for integration into chat interface
 */
export function SystemFeedback({
  type,
  message,
  details,
  onDismiss,
  dismissible = true,
}: SystemFeedbackProps) {
  const getFeedbackConfig = () => {
    switch (type) {
      case "success":
        return {
          bg: "bg-green-50 dark:bg-green-950",
          border: "border-green-200 dark:border-green-800",
          title: "text-green-900 dark:text-green-100",
          text: "text-green-800 dark:text-green-200",
          icon: <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />,
        }
      case "error":
        return {
          bg: "bg-red-50 dark:bg-red-950",
          border: "border-red-200 dark:border-red-800",
          title: "text-red-900 dark:text-red-100",
          text: "text-red-800 dark:text-red-200",
          icon: <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />,
        }
      case "warning":
        return {
          bg: "bg-yellow-50 dark:bg-yellow-950",
          border: "border-yellow-200 dark:border-yellow-800",
          title: "text-yellow-900 dark:text-yellow-100",
          text: "text-yellow-800 dark:text-yellow-200",
          icon: <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />,
        }
      case "loading":
        return {
          bg: "bg-blue-50 dark:bg-blue-950",
          border: "border-blue-200 dark:border-blue-800",
          title: "text-blue-900 dark:text-blue-100",
          text: "text-blue-800 dark:text-blue-200",
          icon: <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />,
        }
      case "tip":
        return {
          bg: "bg-purple-50 dark:bg-purple-950",
          border: "border-purple-200 dark:border-purple-800",
          title: "text-purple-900 dark:text-purple-100",
          text: "text-purple-800 dark:text-purple-200",
          icon: <Lightbulb className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
        }
      case "info":
      default:
        return {
          bg: "bg-blue-50 dark:bg-blue-950",
          border: "border-blue-200 dark:border-blue-800",
          title: "text-blue-900 dark:text-blue-100",
          text: "text-blue-800 dark:text-blue-200",
          icon: <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
        }
    }
  }

  const config = getFeedbackConfig()

  return (
    <Card
      className={cn(
        "border rounded-lg p-3 flex gap-3",
        config.bg,
        config.border,
        "border-l-4"
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0 pt-0.5">
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", config.title)}>
          {message}
        </p>
        {details && (
          <p className={cn("text-xs mt-1", config.text)}>
            {details}
          </p>
        )}
      </div>

      {/* Dismiss Button */}
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className={cn(
            "flex-shrink-0 text-lg leading-none opacity-50 hover:opacity-100 transition-opacity",
            config.title
          )}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </Card>
  )
}

/**
 * List of system feedback messages
 * Useful for displaying multiple feedback items stacked
 */
export function SystemFeedbackList({
  items,
  onDismiss,
}: {
  items: Array<SystemFeedbackProps & { id: string }>
  onDismiss?: (id: string) => void
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <SystemFeedback
          key={item.id}
          {...item}
          onDismiss={() => onDismiss?.(item.id)}
          dismissible={!!onDismiss}
        />
      ))}
    </div>
  )
}
