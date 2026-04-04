"use client"

import { columns } from "./columns"
import type { Note } from "@/lib/supabase-types"
import { DataTable } from "./data-table"
import { useState, useEffect } from "react"
import { fetchAllNotes, subscribeToNoteUpdates } from "@/lib/supabase-services"
import { Spinner } from "@/components/ui/spinner"

export default function DataTableProvider() {
  const [data, setData] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const notes = await fetchAllNotes()
        setData(notes)

        // Subscribe to real-time updates
        const unsubscribe = subscribeToNoteUpdates((payload) => {
          console.log('[DataTableProvider] Note updated:', payload.new.id)
          setData((prev) =>
            prev.map((note) =>
              note.id === payload.new.id ? payload.new : note
            )
          )
        })

        // Cleanup subscription on unmount
        return unsubscribe
      } catch (err) {
        console.error("Failed to fetch notes:", err)
        setError("Failed to load session notes. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    const cleanup = loadData()
    return () => {
      cleanup?.then((unsubscribe: any) => unsubscribe?.())
    }
  }, [])

  return (
    <div className="container mx-auto py-10">
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <Spinner className="size-12" />
            <p className="text-muted-foreground">Loading session notes...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-destructive text-lg font-semibold">{error}</p>
            <p className="text-muted-foreground mt-2 text-sm">
              Check your Supabase connection and try again
            </p>
          </div>
        </div>
      ) : (
        <DataTable columns={columns} data={data} />
      )}
    </div>
  )
}