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

export const medicalMetadataLabels: Record<keyof MedicalMetadata, string> = {
  patientName: "Patient Name",
  age: "Age",
  gender: "Gender",
  chiefComplaint: "Chief Complaint",
  symptoms: "Symptoms",
  previousDiagnosis: "Previous Diagnosis",
  previousMedications: "Previous Medications",
  bloodPressure: "Blood Pressure (mmHg)",
  heartRate: "Heart Rate (bpm)",
  temperature: "Temperature (°C)",
  allergies: "Allergies",
  medication: "Current Medications",
  diagnosis: "Diagnosis",
}

export const medicalMetadataDescriptions: Record<keyof MedicalMetadata, string> = {
  patientName: "Full name of the patient",
  age: "Patient's age in years",
  gender: "Patient's gender",
  chiefComplaint: "Primary reason for visit",
  symptoms: "Detailed symptoms reported by patient",
  previousDiagnosis: "Previous medical diagnoses",
  previousMedications: "Previously used medications",
  bloodPressure: "Systolic blood pressure reading",
  heartRate: "Heart rate in beats per minute",
  temperature: "Body temperature in Celsius",
  allergies: "Known allergies",
  medication: "Currently prescribed or used medications",
  diagnosis: "Preliminary or confirmed diagnosis",
}
