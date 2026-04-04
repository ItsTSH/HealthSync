"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { fetchNoteById } from "@/lib/supabase-services"
import SessionDetailContent from "@/components/sessions/session-detail-content"
import { ErrorBoundary } from "@/components/error-boundary"
import { Spinner } from "@/components/ui/spinner"
import type { Note } from "@/lib/supabase-types"

type Props = {
  params: Promise<{ sessionID: string }>
}

export default function SessionPage({ params }: Props) {
  const router = useRouter()
  const [note, setNote] = useState<Note | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadNote = async () => {
      try {
        const { sessionID } = await params

        if (!sessionID) {
          setError("No session ID provided")
          setIsLoading(false)
          return
        }

        console.log(`[SessionPage] Fetching session with ID: ${sessionID}`)

        // Fetch the specific note from Supabase
        const fetchedNote = await fetchNoteById(sessionID)

        if (!fetchedNote) {
          console.log(`[SessionPage] Note not found for ID: ${sessionID}`)
          setError(`Note not found: ${sessionID}`)
          setIsLoading(false)
          return
        }

        console.log(`[SessionPage] Note found:`, JSON.stringify(fetchedNote, null, 2))
        setNote(fetchedNote)
        setIsLoading(false)
      } catch (err) {
        console.error("[SessionPage] Error loading session:", err)
        setError(err instanceof Error ? err.message : "Failed to load session")
        setIsLoading(false)
      }
    }

    loadNote()
  }, [params])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="size-12" />
      </div>
    )
  }

  if (error || !note) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-destructive text-lg font-semibold">Error loading session</p>
        <p className="text-muted-foreground">{error || "Session not found"}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Go Back
        </button>
      </div>
    )
  }

  // Wrap SessionDetailContent with ErrorBoundary to catch rendering errors
  return (
    <ErrorBoundary>
      <SessionDetailContent note={note} />
    </ErrorBoundary>
  )
}

