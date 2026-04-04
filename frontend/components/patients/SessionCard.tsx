"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate } from "@/lib/dateUtils"
import { Clock } from "lucide-react"

type Props = {
  timestamp: string
  chiefComplaint: string
  symptoms?: string
  diagnosis?: string
  onClick?: () => void
}

export default function SessionCard({ timestamp, chiefComplaint, symptoms, diagnosis, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left group"
      aria-label={`Open session ${chiefComplaint}`}
    >
      <Card className="border-border hover:shadow-md bg-card hover:bg-background transition-shadow duration-150">
        <CardContent className="py-4 px-4">
          {/* Timestamp with icon - visible but distinct style */}
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground font-medium">{formatDate(timestamp)}</span>
          </div>

          {/* Chief Complaint - Primary focus */}
          <div className="mb-3">
            <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {chiefComplaint}
            </div>
          </div>

          {/* Symptoms - Secondary information */}
          {symptoms && (
            <div className="mb-2">
              <div className="text-xs text-muted-foreground mb-1">Symptoms</div>
              <div className="text-sm text-muted-foreground line-clamp-2">{symptoms}</div>
            </div>
          )}

          {/* Diagnosis - Additional context */}
          {diagnosis && (
            <div className="pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground mb-1">Diagnosis</div>
              <div className="text-sm text-foreground line-clamp-1">{diagnosis}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </button>
  )
}

