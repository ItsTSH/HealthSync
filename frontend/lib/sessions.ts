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
    return data?.[0] || null
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
    return true
  } catch (error) {
    console.error("[deleteSession] Error deleting session:", error)
    throw error
  }
}
