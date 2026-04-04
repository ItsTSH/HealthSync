import type { Note } from "./supabase-types"
import { fetchAllNotes, fetchNoteById, fetchNotesByPatientName } from "./supabase-services"

/**
 * Fetch all notes from Supabase
 * @returns Array of all notes
 * @throws Error if the Supabase call fails
 */
export async function fetchRecords(): Promise<Note[]> {
  try {
    console.log("[fetchRecords] Fetching all notes from Supabase")
    const notes = await fetchAllNotes()
    console.log("[fetchRecords] Notes fetched successfully:", notes.length)
    return notes
  } catch (error) {
    console.error("[fetchRecords] Error:", error)
    throw error
  }
}

/**
 * Groups notes by patient name and returns aggregated patient data
 * Used for the Patients tab to show one entry per unique patient
 *
 * @param notes Array of notes from Supabase
 * @returns Grouped patient data, sorted by most recent date
 */
export function groupNotesByPatient(notes: Note[]) {
  if (!Array.isArray(notes) || notes.length === 0) {
    return []
  }

  // Group notes by patient name
  const groupMap = new Map<string, Note[]>()

  notes.forEach((note) => {
    const patientName = note.patientName || "Unknown Patient"

    if (!groupMap.has(patientName)) {
      groupMap.set(patientName, [])
    }

    groupMap.get(patientName)!.push(note)
  })

  // Convert groups to patient data, extracting most recent note
  const groupedPatients = Array.from(groupMap.entries()).map(
    ([patientName, patientNotes]) => {
      // Sort by createdAt to get most recent
      const sorted = [...patientNotes].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA // Most recent first
      })

      const mostRecent = sorted[0]

      return {
        id: mostRecent.id, // Use note ID as unique identifier
        patientName,
        patientID: patientName, // Display patient name as ID
        dateTime: new Date(mostRecent.createdAt),
        chiefComplaint: mostRecent.chiefComplaint || "No complaint recorded",
        diagnosis: mostRecent.diagnosis || "",
        status: mostRecent.status || "pending",
        recordCount: patientNotes.length,
      }
    }
  )

  // Sort by most recent date
  return groupedPatients.sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime())
}

/**
 * Fetch all notes for a specific patient by name
 * @param patientName The patient name to filter by
 * @returns Array of notes for that patient
 * @throws Error if the Supabase call fails
 */
export async function fetchPatientRecords(patientName: string): Promise<Note[]> {
  try {
    console.log("[fetchPatientRecords] Fetching notes for patient:", patientName)
    const notes = await fetchNotesByPatientName(patientName)
    console.log("[fetchPatientRecords] Notes fetched:", notes.length)
    return notes
  } catch (error) {
    console.error("[fetchPatientRecords] Error:", error)
    throw error
  }
}

/**
 * Fetch a single note by ID
 * @param noteId The UUID of the note
 * @returns The note object, or null if not found
 */
export async function fetchRecordByUuid(noteId: string): Promise<Note | null> {
  try {
    console.log("[fetchRecordByUuid] Fetching note with ID:", noteId)
    const note = await fetchNoteById(noteId)
    console.log("[fetchRecordByUuid] Note fetched:", noteId)
    return note
  } catch (error) {
    console.error("[fetchRecordByUuid] Error:", error)
    return null
  }
}


