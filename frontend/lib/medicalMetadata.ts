export type MedicalMetadata = {
  patientName: string
  age: string
  gender: string
  chiefComplaint: string
  symptoms: string
  previousDiagnosis: string
  previousMedications: string
  otherInfo: string
}

export const emptyMedicalMetadata: MedicalMetadata = {
  patientName: "",
  age: "",
  gender: "",
  chiefComplaint: "",
  symptoms: "",
  previousDiagnosis: "",
  previousMedications: "",
  otherInfo: "",
}

export const medicalMetadataLabels: Record<keyof MedicalMetadata, string> = {
  patientName: "Patient Name",
  age: "Age",
  gender: "Gender",
  chiefComplaint: "Chief Complaint",
  symptoms: "Symptoms",
  previousDiagnosis: "Previous Diagnosis",
  previousMedications: "Previous Medications",
  otherInfo: "Other Information",
}

export const medicalMetadataDescriptions: Record<keyof MedicalMetadata, string> = {
  patientName: "Full name of the patient",
  age: "Patient's age",
  gender: "Patient's gender",
  chiefComplaint: "Primary reason for visit",
  symptoms: "Detailed symptoms reported by patient",
  previousDiagnosis: "Previous medical diagnoses",
  previousMedications: "Currently or previously used medications",
  otherInfo: "Additional relevant medical information",
}
