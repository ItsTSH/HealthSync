/**
 * Medical Metadata Schema
 * Unified configuration for all medical fields used in note creation and editing.
 * Single source of truth for field definitions, labels, and descriptions.
 */

export type MedicalMetadata = {
  patientName: string
  age: string | number
  gender: string
  chiefComplaint: string
  symptoms: string
  previousDiagnosis: string
  previousMedications: string
  bloodPressure: string | number
  heartRate: string | number
  temperature: string | number
  allergies: string
  medication: string
  diagnosis: string
}

/**
 * Field configuration type - defines all metadata for a single medical field
 */
export type FieldConfig = {
  fieldName: keyof MedicalMetadata
  label: string
  description: string
  type: "string" | "number" | "date"
  required: boolean
  placeholder?: string
}

/**
 * Unified medical fields schema - single source of truth
 * Contains all configuration for each medical field including:
 * - Display labels
 * - Field descriptions
 * - Data types
 * - Required/optional status
 * - Placeholder text
 */
export const MEDICAL_FIELDS: Record<keyof MedicalMetadata, FieldConfig> = {
  patientName: {
    fieldName: "patientName",
    label: "Patient Name",
    description: "Full name of the patient",
    type: "string",
    required: true,
    placeholder: "John Doe",
  },
  age: {
    fieldName: "age",
    label: "Age",
    description: "Patient's age in years",
    type: "number",
    required: true,
    placeholder: "45",
  },
  gender: {
    fieldName: "gender",
    label: "Gender",
    description: "Patient's gender",
    type: "string",
    required: true,
  },
  chiefComplaint: {
    fieldName: "chiefComplaint",
    label: "Chief Complaint",
    description: "Primary reason for visit",
    type: "string",
    required: true,
    placeholder: "Persistent headache",
  },
  symptoms: {
    fieldName: "symptoms",
    label: "Symptoms",
    description: "Detailed symptoms reported by patient",
    type: "string",
    required: true,
    placeholder: "Describe symptoms...",
  },
  previousDiagnosis: {
    fieldName: "previousDiagnosis",
    label: "Previous Diagnosis",
    description: "Previous medical diagnoses",
    type: "string",
    required: false,
  },
  previousMedications: {
    fieldName: "previousMedications",
    label: "Previous Medications",
    description: "Previously used medications",
    type: "string",
    required: false,
  },
  bloodPressure: {
    fieldName: "bloodPressure",
    label: "Blood Pressure (mmHg)",
    description: "Systolic blood pressure reading",
    type: "string",
    required: false,
    placeholder: "120/80",
  },
  heartRate: {
    fieldName: "heartRate",
    label: "Heart Rate (bpm)",
    description: "Heart rate in beats per minute",
    type: "number",
    required: false,
    placeholder: "72",
  },
  temperature: {
    fieldName: "temperature",
    label: "Temperature (°C)",
    description: "Body temperature in Celsius",
    type: "number",
    required: false,
    placeholder: "37.0",
  },
  allergies: {
    fieldName: "allergies",
    label: "Allergies",
    description: "Known allergies",
    type: "string",
    required: false,
    placeholder: "Penicillin, NSAIDs",
  },
  medication: {
    fieldName: "medication",
    label: "Current Medications",
    description: "Currently prescribed or used medications",
    type: "string",
    required: false,
  },
  diagnosis: {
    fieldName: "diagnosis",
    label: "Diagnosis",
    description: "Preliminary or confirmed diagnosis",
    type: "string",
    required: false,
  },
}

/**
 * Empty medical metadata object with all fields initialized to empty values
 * Used for form initialization
 */
export const emptyMedicalMetadata: MedicalMetadata = {
  patientName: "",
  age: "",
  gender: "",
  chiefComplaint: "",
  symptoms: "",
  previousDiagnosis: "",
  previousMedications: "",
  bloodPressure: "",
  heartRate: "",
  temperature: "",
  allergies: "",
  medication: "",
  diagnosis: "",
}

/**
 * Derived labels from unified schema
 * Automatically generated from MEDICAL_FIELDS - no manual updates needed
 */
export const medicalMetadataLabels: Record<keyof MedicalMetadata, string> = Object.fromEntries(
  Object.values(MEDICAL_FIELDS).map((field) => [field.fieldName, field.label])
) as Record<keyof MedicalMetadata, string>

/**
 * Derived descriptions from unified schema
 * Automatically generated from MEDICAL_FIELDS - no manual updates needed
 */
export const medicalMetadataDescriptions: Record<keyof MedicalMetadata, string> = Object.fromEntries(
  Object.values(MEDICAL_FIELDS).map((field) => [field.fieldName, field.description])
) as Record<keyof MedicalMetadata, string>
