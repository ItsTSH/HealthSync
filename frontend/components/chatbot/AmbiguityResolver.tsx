"use client"

import { useState } from "react"
import { Users, AlertCircle, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface QueriedPatient {
  name: string
  patient_id: string
  confidence: number // 0.0-1.0
  match_type: "exact" | "fuzzy" | "pronoun_resolution"
}

interface AmbiguityResolverProps {
  /**
   * Whether modal is open
   */
  isOpen: boolean

  /**
   * List of matching patients to choose from
   */
  matches: QueriedPatient[]

  /**
   * Optional message explaining the ambiguity
   */
  message?: string

  /**
   * Callback when user selects a patient (receives patient_id string)
   */
  onSelect: (patientId: string) => void

  /**
   * Callback when user cancels
   */
  onCancel: () => void

  /**
   * Whether to allow cancellation (default: false for required selection)
   */
  cancellable?: boolean
}

/**
 * AmbiguityResolver Component (v4.0+)
 *
 * Modal dialog for patient disambiguation when:
 * - Multiple patients match the query
 * - Confidence is < 0.85 (not high enough to auto-select)
 *
 * Features:
 * - Displays all matching patients with confidence scores
 * - Visual indicators for match type (exact, fuzzy, pronoun)
 * - Sorted by confidence (highest first)
 * - Clear selection UI
 *
 * Triggered by: NDJSON "ambiguity" event from RAG pipeline
 */
export function AmbiguityResolver({
  isOpen,
  matches,
  message = "Multiple patients found. Please select which patient this query refers to.",
  onSelect,
  onCancel,
  cancellable = false,
}: AmbiguityResolverProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Sort by confidence (highest first)
  const sortedMatches = [...matches].sort((a, b) => b.confidence - a.confidence)

  const getMatchTypeLabel = (type: string) => {
    switch (type) {
      case "exact":
        return "Exact match"
      case "fuzzy":
        return "Fuzzy match"
      case "pronoun_resolution":
        return "Pronoun resolution"
      default:
        return "Match"
    }
  }

  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence >= 0.9) return "default" // Green
    if (confidence >= 0.75) return "secondary" // Blue
    return "outline" // Gray
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "text-green-600"
    if (confidence >= 0.75) return "text-blue-600"
    return "text-gray-600"
  }

  const handleSelect = () => {
    if (selectedId) {
      onSelect(selectedId)
      setSelectedId(null) // Reset for next disambiguation
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(newOpen) => {
      if (!newOpen && cancellable) {
        onCancel()
      }
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <DialogTitle>Which patient?</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {message}
          </DialogDescription>
        </DialogHeader>

        {/* Patient Options */}
        <div className="space-y-2 py-4">
          {sortedMatches.map((patient) => (
            <Card
              key={patient.patient_id}
              className={cn(
                "p-3 cursor-pointer transition-all border-2",
                selectedId === patient.patient_id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "border-transparent hover:border-gray-300 dark:hover:border-gray-700"
              )}
              onClick={() => setSelectedId(patient.patient_id)}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Patient Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <p className="font-medium text-sm truncate">
                      {patient.name}
                    </p>
                  </div>

                  {/* Match Type Badge */}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {getMatchTypeLabel(patient.match_type)}
                    </Badge>
                  </div>
                </div>

                {/* Selection & Confidence */}
                <div className="flex-shrink-0 text-right">
                  {/* Confidence Score */}
                  <div className={cn(
                    "text-xs font-semibold",
                    getConfidenceColor(patient.confidence)
                  )}>
                    {(patient.confidence * 100).toFixed(0)}%
                  </div>

                  {/* Radio Button */}
                  <div className="mt-1">
                    {selectedId === patient.patient_id ? (
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    ) : (
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                    )}
                  </div>
                </div>
              </div>

              {/* Confidence Bar */}
              <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${patient.confidence * 100}%` }}
                />
              </div>
            </Card>
          ))}
        </div>

        {/* Confidence Scale Info */}
        <div className="text-xs text-muted-foreground space-y-1 py-2 px-3 bg-gray-50 dark:bg-gray-900 rounded">
          <p className="font-medium">Confidence levels:</p>
          <p>
            <span className="inline-block w-2 h-2 rounded-full bg-green-600 mr-1"></span>
            90%+ = Exact match
          </p>
          <p>
            <span className="inline-block w-2 h-2 rounded-full bg-blue-600 mr-1"></span>
            75-89% = Probable match
          </p>
          <p>
            <span className="inline-block w-2 h-2 rounded-full bg-gray-600 mr-1"></span>
            &lt;75% = Low confidence
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          {cancellable && (
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSelect}
            disabled={!selectedId}
            className="flex-1"
          >
            Select Patient
          </Button>
        </div>

        {/* Help Text */}
        <p className="text-xs text-muted-foreground text-center pt-2">
          Selected patient will be used for this and subsequent queries in this chat.
        </p>
      </DialogContent>
    </Dialog>
  )
}
