"use client"

import { Progress } from "@/components/ui/progress"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2 } from "lucide-react"

interface QueryCounterProps {
  /**
   * Current query count (0-10)
   */
  queryCount: number

  /**
   * Whether chat is full (queryCount >= 10)
   */
  isFull: boolean

  /**
   * Optional custom label
   */
  label?: string

  /**
   * Whether to show verbose details
   */
  verbose?: boolean
}

/**
 * QueryCounter Component (v4.0+)
 *
 * Displays visual progress indicator for query count (0-10).
 * Shows warning when approaching limit, error state when full.
 *
 * Features:
 * - Progress bar (visual 0-100%)
 * - Query count badge (X/10)
 * - State-based coloring (green → yellow → red)
 * - Detailed information in verbose mode
 */
export function QueryCounter({
  queryCount,
  isFull,
  label = "Queries",
  verbose = false,
}: QueryCounterProps) {
  const percentage = (queryCount / 10) * 100
  const remainingQueries = Math.max(0, 10 - queryCount)

  // Determine color based on query count
  const getColorState = () => {
    if (isFull) return "destructive" // Red
    if (queryCount >= 8) return "secondary" // Orange/Yellow
    return "default" // Green/blue
  }

  const getProgressColor = () => {
    if (isFull) return "bg-red-500"
    if (queryCount >= 8) return "bg-yellow-500"
    return "bg-green-500"
  }

  const colorState = getColorState()
  const progressColor = getProgressColor()

  return (
    <Card className="p-4 space-y-3 border-l-4 border-l-primary">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">
          {label}
        </span>
        <Badge variant={colorState}>
          {queryCount} / 10
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress value={percentage} className="h-2.5" />
        <div className="text-xs text-muted-foreground text-right">
          {remainingQueries} {remainingQueries === 1 ? "query" : "queries"} remaining
        </div>
      </div>

      {/* Status Messages */}
      {verbose && (
        <div className="space-y-2 pt-2 border-t">
          {isFull ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span>Chat limit reached. Start a new chat to continue.</span>
            </div>
          ) : queryCount >= 8 ? (
            <div className="flex items-center gap-2 text-sm text-yellow-600">
              <AlertCircle className="w-4 h-4" />
              <span>Approaching limit ({remainingQueries} queries left)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              <span>Chat ready ({remainingQueries} queries available)</span>
            </div>
          )}
        </div>
      )}

      {/* Info text */}
      {verbose && (
        <p className="text-xs text-muted-foreground pt-1">
          Each conversation (chat) allows up to 10 queries. After reaching the limit,
          create a new chat to continue asking questions.
        </p>
      )}
    </Card>
  )
}
