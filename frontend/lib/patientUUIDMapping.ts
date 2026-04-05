/**
 * Utility functions for managing patient UUID mappings
 * Mappings are stored in localStorage and map patientUUID -> patientName
 */

import { v4 as uuidv4 } from "uuid"

const PATIENT_UUID_MAPPING_KEY = "healthsync_patient_uuid_mapping"
const PATIENT_NAME_TO_UUID_KEY = "healthsync_patient_name_to_uuid" // Reverse mapping for lookups

export interface PatientUUIDMapping {
  [patientUUID: string]: string // Maps patientUUID -> patientName
}

interface PatientNameToUUIDMapping {
  [patientName: string]: string // Maps patientName -> patientUUID
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
 * Retrieve the reverse mapping (patientName -> patientUUID)
 */
function getPatientNameToUUIDMapping(): PatientNameToUUIDMapping {
  if (typeof window === "undefined") {
    return {}
  }
  try {
    const stored = localStorage.getItem(PATIENT_NAME_TO_UUID_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.error("[PatientUUIDMapping] Error retrieving reverse mapping:", error)
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
 * Get the UUID for a patient name, or create one if it doesn't exist
 */
export function getOrCreatePatientUUID(patientName: string): string {
  const nameToUUID = getPatientNameToUUIDMapping()
  
  // If UUID already exists for this patient name, return it
  if (nameToUUID[patientName]) {
    return nameToUUID[patientName]
  }
  
  // Generate new UUID and store both mappings
  const newUUID = uuidv4()
  const uuidToName = getPatientUUIDMapping()
  
  // Update both directions of the mapping
  uuidToName[newUUID] = patientName
  nameToUUID[patientName] = newUUID
  
  // Save both mappings to localStorage
  savePatientUUIDMapping(uuidToName)
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(PATIENT_NAME_TO_UUID_KEY, JSON.stringify(nameToUUID))
    } catch (error) {
      console.error("[PatientUUIDMapping] Error saving reverse mapping:", error)
    }
  }
  
  console.log(`[PatientUUIDMapping] Generated new UUID for "${patientName}": ${newUUID}`)
  return newUUID
}

/**
 * Initialize UUIDs for a list of patient names
 * Only creates new UUIDs for patients that don't already have them
 * Returns map of patientName -> patientUUID
 */
export function initializePatientUUIDs(
  patientNames: string[]
): { [patientName: string]: string } {
  const result: { [patientName: string]: string } = {}
  
  for (const patientName of patientNames) {
    result[patientName] = getOrCreatePatientUUID(patientName)
  }
  
  return result
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
