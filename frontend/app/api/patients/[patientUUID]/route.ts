import { fetchRecords } from "@/lib/api"
import { v5 as uuidv5 } from "uuid"
import type { Session } from "@/lib/sessions"

const PATIENT_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"

/**
 * GET /api/patients/[patientUUID]
 * Fetches a specific patient and their sessions by patientUUID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ patientUUID: string }> }
) {
  try {
    const { patientUUID } = await params
    
    console.log(`[/api/patients/[patientUUID]] Received patientUUID: ${patientUUID}`)

    // Fetch all records from FastAPI backend
    const allRecords = await fetchRecords()
    console.log(`[/api/patients/[patientUUID]] Total records fetched: ${allRecords.length}`)

    // Find the patient with matching UUID
    // We do this by checking which patientName generates the matching UUID
    let targetPatientName: string | null = null

    // Group records by patient name and check UUIDs
    const patientNames = new Set<string>()
    allRecords.forEach((record) => {
      const name = (record as any).patientName || ""
      patientNames.add(name)
    })

    console.log(`[/api/patients/[patientUUID]] Unique patient names: ${Array.from(patientNames).join(", ")}`)

    // Find which patient name generates this UUID
    for (const name of patientNames) {
      const generatedUUID = uuidv5(name, PATIENT_NAMESPACE)
      console.log(`[/api/patients/[patientUUID]] Checking: "${name}" -> ${generatedUUID}`)
      if (generatedUUID === patientUUID) {
        targetPatientName = name
        console.log(`[/api/patients/[patientUUID]] MATCH FOUND: "${name}"`)
        break
      }
    }

    if (!targetPatientName) {
      console.log(`[/api/patients/[patientUUID]] No patient found matching UUID: ${patientUUID}`)
      return Response.json(
        {
          success: false,
          error: "Patient not found",
        },
        { status: 404 }
      )
    }

    // Filter records for this patient by patient name
    const patientRecords = allRecords.filter((record) => {
      const recordPatientName = (record as any).patientName || ""
      return recordPatientName === targetPatientName
    })

    console.log(`[/api/patients/[patientUUID]] Found ${patientRecords.length} records for patient: "${targetPatientName}"`)

    if (patientRecords.length === 0) {
      console.log(`[/api/patients/[patientUUID]] No records found for patient: "${targetPatientName}"`)
      return Response.json(
        {
          success: false,
          error: "No records found for this patient",
        },
        { status: 404 }
      )
    }

    // Sort records by createdAt (most recent first)
    const sortedRecords = [...patientRecords].sort((a, b) => {
      const dateA = new Date((a as any).createdAt).getTime()
      const dateB = new Date((b as any).createdAt).getTime()
      return dateB - dateA
    })

    const mostRecent = sortedRecords[0]
    const patientID = (mostRecent as any).patient_id || `PAT-${targetPatientName.replace(/\s+/g, "-")}`

    // Map backend records to session format for display
    const sessions: Session[] = sortedRecords.map((record) => ({
      id: (record as any).id || `session-unknown`, // Use id from notes table (UUID primary key)
      patientId: patientUUID,
      timestamp: new Date((record as any).createdAt).toISOString(),
      chiefComplaint: (record as any).chiefComplaint || "No complaint recorded",
      diagnosis: (record as any).diagnosis,
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

    console.log(`[/api/patients/[patientUUID]] Mapped ${sessions.length} sessions with UUIDs:`, sessions.map(s => s.id).join(", "))

    return Response.json({
      success: true,
      data: {
        patientUUID,
        patientName: targetPatientName,
        patientID,
        mostRecentDateTime: new Date((mostRecent as any).createdAt),
        sessions,
      },
    })
  } catch (error) {
    console.error("[/api/patients/[patientUUID]] Error:", error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch patient",
      },
      { status: 500 }
    )
  }
}
