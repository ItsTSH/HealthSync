export type PatientData = {
  id: string
  patientID: string
  chiefComplaint: string
  room: number
  dateTime: Date
  status: "pending" | "completed"
  patientName: string
}

export const patientData: PatientData[] = [
  {
    id: "728ed52f",
    patientID: "PAT-001",
    patientName: "John Doe",
    chiefComplaint: "Persistent headache and dizziness",
    room: 100,
    dateTime: new Date("2025-12-15T09:30:00"),
    status: "pending",
  },
  {
    id: "489e1d42",
    patientID: "PAT-002",
    patientName: "Jane Smith",
    chiefComplaint: "Follow-up consultation for hypertension",
    room: 105,
    dateTime: new Date("2025-12-15T08:45:00"),
    status: "completed",
  },
  {
    id: "589e1d42",
    patientID: "PAT-003",
    patientName: "Mike Johnson",
    chiefComplaint: "Chest discomfort after physical exertion",
    room: 103,
    dateTime: new Date("2025-12-15T10:15:00"),
    status: "completed",
  },
  {
    id: "485e1d42",
    patientID: "PAT-004",
    patientName: "Biggus Dickus",
    chiefComplaint: "Can't stop laughing",
    room: 102,
    dateTime: new Date("2025-12-15T11:00:00"),
    status: "completed",
  },
  {
    id: "489e1d69",
    patientID: "PAT-005",
    patientName: "Mike Ock",
    chiefComplaint: "Acute groin pain",
    room: 103,
    dateTime: new Date("2025-12-15T11:30:00"),
    status: "completed",
  },
  {
    id: "279f1d42",
    patientID: "PAT-006",
    patientName: "Dill Doe",
    chiefComplaint: "Mild fever and general fatigue",
    room: 101,
    dateTime: new Date("2025-12-15T09:00:00"),
    status: "completed",
  },
  {
    id: "562i8f42",
    patientID: "PAT-007",
    patientName: "John Smith",
    chiefComplaint: "Routine annual health checkup",
    room: 104,
    dateTime: new Date("2025-12-15T12:00:00"),
    status: "completed",
  },
]

export type Record = {
  id: string
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
  status?: "pending" | "processing" | "completed" | "failed"
  error?: string | null
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
