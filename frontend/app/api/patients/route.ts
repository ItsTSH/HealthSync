import { fetchAllNotes } from "@/lib/supabase-services"
import { groupNotesByPatient } from "@/lib/api"
import { v5 as uuidv5 } from "uuid"

// Namespace UUID for generating deterministic patient UUIDs
const PATIENT_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"

/**
 * GET /api/patients
 * Returns all patients grouped by patientName with assigned UUIDs
 * Uses UUID v5 for deterministic generation - same patientName always gets same UUID
 */
export async function GET() {
  try {
    console.log("[/api/patients] Fetching all patients...")
    
    // Fetch all records from Supabase
    const result = await fetchAllNotes()
    const records = result.notes
    console.log(`[/api/patients] Fetched ${records.length} records from backend`)

    // Group records by patient name
    const groupedPatients = groupNotesByPatient(records)
    console.log(`[/api/patients] Grouped into ${groupedPatients.length} unique patients`)

    // Assign deterministic UUIDs to each patient group
    // UUID v5 ensures: same patientName = same patientUUID (across requests)
    const patientsWithUuids = groupedPatients.map((patient) => {
      const patientUUID = uuidv5(patient.patientName, PATIENT_NAMESPACE)
      console.log(`[/api/patients] "${patient.patientName}" -> ${patientUUID}`)
      return {
        ...patient,
        patientUUID,
      }
    })

    console.log(`[/api/patients] Returning ${patientsWithUuids.length} patients with UUIDs`)

    return Response.json({
      success: true,
      data: patientsWithUuids,
    })
  } catch (error) {
    console.error("[/api/patients] Error:", error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch patients",
      },
      { status: 500 }
    )
  }
}
