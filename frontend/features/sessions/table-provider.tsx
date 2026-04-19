"use client"

import { columns } from "./columns"
import type { Note } from "@/lib/supabase-types"
import { DataTable } from "./data-table"
import { useState, useEffect } from "react"
import { Skeleton } from "boneyard-js/react"
import { fetchAllNotes, subscribeToNoteUpdates } from "@/lib/supabase-services"
import { createClient } from "@/lib/supabase-browser"
import { Spinner } from "@/components/ui/spinner"

export default function DataTableProvider() {
  const supabase = createClient()
  const [data, setData] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        setError("Failed to get current user. Please log in.")
        setIsLoading(false)
        return
      }
      
      setUserId(user.id)
    }

    getCurrentUser()
  }, [supabase])

  useEffect(() => {
    if (!userId) return

    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const result = await fetchAllNotes(page, pageSize)
        setData(result.notes)
        setTotal(result.total)

        // Subscribe to real-time updates filtered by user_id
        const unsubscribe = subscribeToNoteUpdates(userId, (payload) => {
          console.log('[DataTableProvider] Note updated:', payload.new.noteID)
          setData((prev) =>
            prev.map((note) =>
              note.noteID === payload.new.noteID ? payload.new : note
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
  }, [userId, page, pageSize, supabase])

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
        <Skeleton name="sessions-data-table" loading={isLoading}>
          <DataTable columns={columns} data={data} />
        </Skeleton>
      )}
    </div>
  )
}