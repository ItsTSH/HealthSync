import type { Note } from "./supabase-types"

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


