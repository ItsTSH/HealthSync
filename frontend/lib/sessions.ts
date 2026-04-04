export type Session = {
  id: string
  patientId: string
  timestamp: string // ISO
  chiefComplaint: string
  diagnosis?: string
  symptoms?: string
  vitals?: {
    bloodPressure?: string // e.g., "120/80"
    heartRate?: number
    temperature?: number
    respiratoryRate?: number
    oxygenSaturation?: number
  }
  medications?: string[]
  allergies?: string[]
  notes?: string
  assessment?: string
  treatmentPlan?: string
  referrals?: string
  clinicianName?: string
}

export const sessions: Session[] = [
  {
    id: "s-1",
    patientId: "728ed52f",
    timestamp: new Date("2025-12-15T09:00:00").toISOString(),
    chiefComplaint: "Headache and dizziness",
    diagnosis: "Migraine",
    vitals: {
      bloodPressure: "130/85",
      heartRate: 72,
      temperature: 37.2,
      respiratoryRate: 16,
      oxygenSaturation: 98,
    },
    medications: ["Ibuprofen 400mg", "Metoprolol 25mg"],
    allergies: ["Penicillin", "Sulfonamides"],
    notes: "Patient reports onset of symptoms this morning. Pain worsened after screen time.",
    assessment: "Primary migraine with typical presentation",
    treatmentPlan: "Rest in dark room, hydration, and analgesics. Follow-up in 1 week.",
    clinicianName: "Dr. Sarah Johnson",
  },
  {
    id: "s-2",
    patientId: "728ed52f",
    timestamp: new Date("2025-11-10T10:30:00").toISOString(),
    chiefComplaint: "Follow-up: medication review",
    diagnosis: "Tension headache",
    vitals: {
      bloodPressure: "128/82",
      heartRate: 70,
      temperature: 36.8,
      respiratoryRate: 16,
      oxygenSaturation: 99,
    },
    medications: ["Amitriptyline 25mg daily"],
    allergies: ["Penicillin"],
    notes: "Follow-up after 4 weeks. Patient reports improved symptoms with current medication.",
    assessment: "Stable tension headache, well-controlled",
    treatmentPlan: "Continue current medication regimen",
    clinicianName: "Dr. Michael Chen",
  },
  {
    id: "s-3",
    patientId: "489e1d42",
    timestamp: new Date("2025-12-15T08:30:00").toISOString(),
    chiefComplaint: "Hypertension follow-up",
    diagnosis: "Stable",
    vitals: {
      bloodPressure: "135/88",
      heartRate: 68,
      temperature: 37.0,
      respiratoryRate: 16,
      oxygenSaturation: 98,
    },
    medications: ["Lisinopril 10mg", "Amlodipine 5mg"],
    allergies: [],
    notes: "BP readings slightly elevated. Advised on diet and exercise.",
    assessment: "Hypertension, adequately controlled with current therapy",
    treatmentPlan: "Continue medications, recheck BP in 2 weeks.",
    clinicianName: "Dr. Patricia Williams",
  },
  {
    id: "s-4",
    patientId: "589e1d42",
    timestamp: new Date("2025-12-15T10:00:00").toISOString(),
    chiefComplaint: "Chest discomfort",
    diagnosis: "Angina - refer",
    vitals: {
      bloodPressure: "145/92",
      heartRate: 88,
      temperature: 37.1,
      respiratoryRate: 18,
      oxygenSaturation: 97,
    },
    medications: ["Aspirin 100mg", "Atorvastatin 20mg"],
    allergies: ["NSAIDs"],
    notes: "Sharp chest pain radiating to left arm. Occurred during stress.",
    assessment: "Angina pectoris, requires cardiology consult",
    treatmentPlan: "Refer to cardiology. Start nitrates as needed.",
    referrals: "Cardiology - Urgent",
    clinicianName: "Dr. James Anderson",
  },
]

export function getSessionsForPatient(patientId: string) {
  return sessions.filter((s) => s.patientId === patientId)
}

export function getSessionById(id: string) {
  return sessions.find((s) => s.id === id)
}

// Simple encryption placeholder - can be enhanced later
export function encryptValues(value: string | null | undefined): string {
  if (!value) return ""
  // TODO: Implement actual encryption
  return value
}

export async function updateSession(
  id: string,
  updates: Partial<Session>,
  patientName?: string
) {
  try {
    console.log("[updateSession] Called with ID:", id)
    console.log("[updateSession] Updates:", updates)
    
    // Import Supabase client for direct database updates
    const { supabase } = await import('./supabase-services')
    
    // Prepare data for Supabase in the notes table format
    const supabaseData = {
      chiefComplaint: updates.chiefComplaint || "",
      symptoms: updates.symptoms || "",
      previousDiagnosis: updates.diagnosis || "",
      medication: Array.isArray(updates.medications)
        ? updates.medications.join(", ")
        : updates.medications || "",
      otherInfo: updates.notes || "",
      patientName: patientName || "",
      // Reset processing status when note is updated (will be re-processed)
      status: "pending",
      error: null,
    }

    console.log("[updateSession] Prepared Supabase data:", supabaseData)
    
    // Update note in Supabase
    const { data, error } = await supabase
      .from('notes')
      .update(supabaseData)
      .eq('noteID', id)
      .select()

    if (error) {
      console.error(`[updateSession] Supabase Error:`, error)
      throw new Error(`Failed to update session: ${error.message}`)
    }

    console.log("[updateSession] Supabase response:", data)

    // Update local state as well
    const index = sessions.findIndex((s) => s.id === id)
    if (index !== -1) {
      sessions[index] = { ...sessions[index], ...updates }
      return sessions[index]
    }

    return null
  } catch (error) {
    console.error("[updateSession] Error updating session:", error)
    throw error
  }
}

export async function deleteSession(id: string) {
  try {
    console.log("[deleteSession] Called with ID:", id)
    
    // Import Supabase client for direct database deletion
    const { supabase } = await import('./supabase-services')
    
    console.log("[deleteSession] Deleting from Supabase note with ID:", id)
    
    // Delete note from Supabase
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('noteID', id)

    if (error) {
      console.error(`[deleteSession] Supabase Error:`, error)
      throw new Error(`Failed to delete session: ${error.message}`)
    }

    console.log("[deleteSession] Successfully deleted from Supabase")

    // Remove from local state
    const index = sessions.findIndex((s) => s.id === id)
    if (index !== -1) {
      sessions.splice(index, 1)
      console.log("[deleteSession] Session deleted from local state")
      return true
    }

    console.log("[deleteSession] Session not found in local state")
    return false
  } catch (error) {
    console.error("[deleteSession] Error deleting session:", error)
    throw error
  }
}
