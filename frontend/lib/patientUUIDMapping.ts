/**
 * Utility functions for managing patient UUID mappings
 * Mappings are stored in localStorage and map patientUUID -> patientName
 */

const PATIENT_UUID_MAPPING_KEY = "healthsync_patient_uuid_mapping"

export interface PatientUUIDMapping {
  [patientUUID: string]: string // Maps patientUUID -> patientName
}

/**
 * Retrieve the patient UUID mapping from localStorage
 */
export function getPatientUUIDMapping(): PatientUUIDMapping {
  if (typeof window === "undefined") {
    return {}
  }
  try {
    const stored = localStorage.getItem(PATIENT_UUID_MAPPING_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.error("[PatientUUIDMapping] Error retrieving mapping:", error)
    return {}
  }
}

/**
 * Get the patient name for a given patient UUID
 */
export function getPatientNameByUUID(patientUUID: string): string | null {
  const mapping = getPatientUUIDMapping()
  return mapping[patientUUID] || null
}

/**
 * Store the patient UUID mapping in localStorage
 */
export function savePatientUUIDMapping(mapping: PatientUUIDMapping): void {
  if (typeof window === "undefined") {
    return
  }
  try {
    localStorage.setItem(PATIENT_UUID_MAPPING_KEY, JSON.stringify(mapping))
  } catch (error) {
    console.error("[PatientUUIDMapping] Error saving mapping:", error)
  }
}
