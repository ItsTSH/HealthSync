"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import SessionCard from "./SessionCard"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { parseDate } from "@/lib/dateUtils"
import type { Session } from "@/lib/sessions"

type Props = {
  sessions: Session[]
  patientId?: string
}

export default function SessionTimeline({ sessions, patientId }: Props) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc")

  // Filter sessions based on search query
  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const query = searchQuery.toLowerCase()
      return (
        session.chiefComplaint.toLowerCase().includes(query) ||
        (session.diagnosis?.toLowerCase().includes(query) ?? false)
      )
    })
  }, [sessions, searchQuery])

  // Sort sessions based on sort order
  const sortedSessions = useMemo(() => {
    const sorted = [...filteredSessions].sort((a, b) => {
      const timeA = parseDate(a.timestamp).getTime()
      const timeB = parseDate(b.timestamp).getTime()
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB
    })
    return sorted
  }, [filteredSessions, sortOrder])

  const handleSessionClick = (sessionId: string) => {
    router.push(`/sessions/${sessionId}`)
  }

  const toggleSort = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
  }

  return (
    <div className="w-full">
      {/* Search and Sort Controls */}
      <div className="flex gap-3 mb-6">
        <Input
          placeholder="Search sessions by complaint or diagnosis..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 border-border drop-shadow-sm"
        />
        <Button
          onClick={toggleSort}
          variant="outline"
          size="default"
          className="whitespace-nowrap border-border drop-shadow"
        >
          {sortOrder === "desc" ? "↓ Newest" : "↑ Oldest"}
        </Button>
      </div>

      {/* Timeline */}
      {sortedSessions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No sessions found matching your search.
        </div>
      ) : (
        <div className="relative">
          {/* Vertical Timeline Line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-800 via-blue-400 to-transparent"/>

          {/* Session Cards */}
          <div className="space-y-6">
            {sortedSessions.map((session, idx) => (
              <div
                key={session.id}
                className="relative pl-16"
              >
                {/* Timeline Dot */}
                <div className="absolute left-0 top-5 w-9 h-9 rounded-full bg-white dark:bg-black border-4 border-blue-500 flex items-center justify-center shadow-md">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                </div>

                {/* Session Card */}
                <div
                  onClick={() => handleSessionClick(session.id)}
                  className="cursor-pointer"
                >
                  <SessionCard
                    timestamp={session.timestamp}
                    chiefComplaint={session.chiefComplaint}
                    symptoms={session.symptoms}
                    diagnosis={session.diagnosis}
                    onClick={() => handleSessionClick(session.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

