/**
 * Supabase Database Types
 * Maps to the 'notes' and 'note_versions' tables in Supabase
 */

/**
 * Note type - represents a medical note/session
 * Maps directly to 'notes' table columns
 */
export type Note = {
  noteID: string // uuid, primary key from database (gen_random_uuid())
  createdAt: string // timestamp ISO string
  patientName: string // text, required
  age: number // smallint, required
  chiefComplaint: string // text, required
  symptoms: string // text, required
  previousDiagnosis: string | null // text, nullable
  previousMedications: string | null // text, nullable
  bloodPressure: number | null // smallint, nullable
  heartRate: number | null // smallint, nullable
  temperature: number | null // smallint, nullable
  allergies: string | null // text, nullable
  medication: string | null // text, nullable
  diagnosis: string | null // text, nullable
  user_id: string // uuid, required for RLS policy
  status: 'pending' | 'processing' | 'completed' | 'failed' // text, default 'pending'
  error: string | null // text, nullable - stores error message if status is 'failed'
  gender?: string | null // optional gender field
  chunking_version?: string | null
  retrieval_version?: string | null
  embedding_count?: number | null
  pii_masked_at?: string | null
  chat_id?: string | null
}

/**
 * NoteVersion type - represents a version snapshot of a note
 * Maps to 'note_versions' table
 */
export type NoteVersion = {
  id: string // uuid, primary key
  note_id: string // foreign key → notes.noteID (uuid)
  snapshot: Note // jsonb - full note data before update
  editedAt: string // timestamp ISO string (mapped from edited_at)
  createdAt?: string // timestamp ISO string (mapped from created_at)
}

/**
 * Form data for creating/updating notes
 * Used when submitting from the frontend
 */
export type NoteFormData = Omit<Note, 'noteID' | 'createdAt' | 'status' | 'error' | 'user_id' | 'chunking_version' | 'retrieval_version' | 'embedding_count' | 'pii_masked_at' | 'chat_id'>

/**
 * Temporary note for optimistic UI updates
 * Uses string IDs prefixed with "temp-" until confirmed by DB
 */
export type TemporaryNote = Omit<Note, 'id'> & {
  id: string // "temp-" + timestamp
}

/**
 * Type for processing status updates
 * When AI processing completes, status changes and error may be populated
 */
export type ProcessingStatus = {
  noteId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error: string | null
}

/**
 * Appointment type - represents a scheduled appointment
 * Maps directly to 'appointments' table columns
 */
export type Appointment = {
  id: string // uuid, auto-generated primary key
  user_id: string // uuid, foreign key to auth.users
  patient_id?: string // uuid, optional link to patient record
  patient_name: string // varchar(255)
  appointment_date: string // DATE (YYYY-MM-DD format)
  appointment_time: string // TIME (HH:MM format)
  duration_minutes: number // integer, in minutes
  appointment_type?: string // varchar(100) - e.g., "Initial Consultation", "Follow-up"
  room?: string // varchar(50)
  status: 'confirmed' | 'cancelled' | 'rescheduled' | 'completed' | 'no-show' | 'pending'
  notes?: string | null // text, optional appointment notes
  reminder_sent: boolean
  created_at: string // timestamp ISO string
  updated_at: string // timestamp ISO string
}

/**
 * Form data for creating/updating appointments
 * Used when submitting from the frontend
 */
export type AppointmentFormData = Omit<Appointment, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'reminder_sent'>

/**
 * Appointment with computed properties for UI
 * Used for display purposes
 */
export type AppointmentWithComputed = Appointment & {
  dateTime: Date // Combined date and time as Date object
  displayTime: string // Formatted time string (e.g., "09:00 AM")
  displayDate: string // Formatted date string
  durationLabel: string // Duration formatted (e.g., "30 min")
}
