export type PatientData = {
  id: string
  patientID: string
  chiefComplaint: string
  room: number
  dateTime: Date
  status: "pending" | "completed"
  patientName: string
}

export type Record = {
  noteID: string // UUID primary key from database
  createdAt: string
  patientName: string
  age: number
  chiefComplaint: string
  symptoms: string
  previousDiagnosis: string | null
  previousMedications: string | null
  bloodPressure: number | null
  heartRate: number | null
  temperature: number | null
  allergies: string | null
  medication: string | null
  diagnosis: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error: string | null
  user_id: string
  gender?: string | null
  chunking_version?: string | null
  retrieval_version?: string | null
  embedding_count?: number | null
  pii_masked_at?: string | null
  chat_id?: string | null
}

// Grouped patient data from backend records
export type GroupedPatientData = {
  id: string // Unique ID based on patient_name hash for safe navigation
  patientName: string // patient_name from most recent record
  patientID: string // patient_id from most recent record (if available)
  dateTime: Date // Most recent date_time
  chiefComplaint: string // Most recent chief_complaint
  diagnosis?: string // Most recent diagnosis (if available)
  room?: number // Most recent room (if available)
  status?: "pending" | "processing" | "completed" | "failed" // Most recent status
  recordCount: number // Total number of records for this patient
}
