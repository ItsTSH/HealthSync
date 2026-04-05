"use client"

import React, { useEffect, useState } from "react"
import { Skeleton } from "boneyard-js/react"
import { useParams, useRouter } from "next/navigation"
import SessionTimeline from "@/components/patients/SessionTimeline"
import { Spinner } from "@/components/ui/spinner"
import { fetchAllNotes } from "@/lib/supabase-services"
import { getPatientNameByUUID } from "@/lib/patientUUIDMapping"
import { parseDate, toISOString, getDaysAgoText } from "@/lib/dateUtils"
import type { Session } from "@/lib/sessions"

export default function PatientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const patientUUID = params.id as string

  const [patientName, setPatientName] = useState<string | null>(null)
  const [patientID, setPatientID] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPatientSessions = async () => {
      try {
        setIsLoading(true)
        setError(null)

        console.log(`[PatientDetailPage] Received patientUUID: ${patientUUID}`)

        // Get patient name from UUID mapping stored in localStorage
        const name = getPatientNameByUUID(patientUUID)
        console.log(`[PatientDetailPage] Retrieved patientName from mapping: "${name}"`)

        if (!name) {
          throw new Error(
            "Patient not found. The UUID mapping may have expired. Please return to the patient list and try again."
          )
        }

        setPatientName(name)

        // Fetch all records from Supabase
        console.log("[PatientDetailPage] Fetching all records from Supabase...")
        const result = await fetchAllNotes()
        const allRecords = result.notes
        console.log(`[PatientDetailPage] Fetched ${allRecords.length} records from backend`)

        // Filter records for this patient by patient name
        const patientRecords = allRecords.filter((record) => {
          const recordPatientName = (record as any).patientName || ""
          return recordPatientName === name
        })

        console.log(`[PatientDetailPage] Found ${patientRecords.length} records for patient: "${name}"`)

        if (patientRecords.length === 0) {
          throw new Error(`No records found for patient: ${name}`)
        }

        // Sort records by createdAt (most recent first)
        const sortedRecords = [...patientRecords].sort((a, b) => {
          const dateA = parseDate((a as any).createdAt).getTime()
          const dateB = parseDate((b as any).createdAt).getTime()
          return dateB - dateA
        })

        const mostRecent = sortedRecords[0]
        const patId = (mostRecent as any).patient_id || `PAT-${name.replace(/\s+/g, "-")}`
        setPatientID(patId)

        // Map backend records to session format for display
        const mappedSessions: Session[] = sortedRecords.map((record) => ({
          id: (record as any).id || `session-unknown`, // Use id from notes table (UUID primary key)
          patientId: patientUUID, // Use patientUUID internally
          timestamp: toISOString((record as any).createdAt),
          chiefComplaint: (record as any).chiefComplaint || "No complaint recorded",
          diagnosis: (record as any).diagnosis,
          symptoms: (record as any).symptoms,
          notes: (record as any).notes,
          clinicianName: (record as any).clinicianName,
          vitals: (record as any).vitals
            ? {
                bloodPressure: (record as any).vitals.blood_pressure,
                heartRate: (record as any).vitals.heart_rate,
                temperature: (record as any).vitals.temperature,
                respiratoryRate: (record as any).vitals.respiratory_rate,
                oxygenSaturation: (record as any).vitals.oxygen_saturation,
              }
            : undefined,
        }))

        console.log(
          `[PatientDetailPage] Mapped ${mappedSessions.length} sessions with UUIDs:`,
          mappedSessions.map((s) => s.id).join(", ")
        )

        setSessions(mappedSessions)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load patient data"
        console.error("[PatientDetailPage] Error:", errorMessage)
        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    loadPatientSessions()
  }, [patientUUID])

  if (isLoading) {
    return (
      <Skeleton name="patient-detail-loading" loading={true}>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="w-full max-w-4xl space-y-4 p-4">
            <div className="h-12 bg-muted rounded animate-pulse" />
            <div className="h-8 bg-muted rounded animate-pulse" />
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </Skeleton>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <p className="text-destructive text-lg font-semibold mb-2">Failed to Load Patient</p>
        <p className="text-muted-foreground text-sm mb-4">{error}</p>
        <button
          onClick={() => router.push("/patients")}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Return to Patients
        </button>
      </div>
    )
  }

  if (!patientName) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <p className="text-destructive text-lg font-semibold">Patient Not Found</p>
        <p className="text-muted-foreground text-sm mt-2">
          Unable to retrieve patient information. Please return to the patient list.
        </p>
        <button
          onClick={() => router.push("/patients")}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Return to Patients
        </button>
      </div>
    )
  }

  return (
    <div className="py-5 w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">{patientName}</h1>
        {sessions.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Last visit: {getDaysAgoText(sessions[0].timestamp)}
          </div>
        )}
      </div>

      <section>
        <h2 className="text-lg font-medium mb-4">Session History</h2>
        {sessions.length === 0 ? (
          <div className="text-sm text-muted-foreground">No sessions found for this patient.</div>
        ) : (
          <SessionTimeline sessions={sessions} patientId={patientUUID} />
        )}
      </section>
    </div>
  )
}
