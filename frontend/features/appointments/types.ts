export type AppointmentStatus = "confirmed" | "cancelled" | "rescheduled" | "completed" | "no-show" | "pending"

export interface Appointment {
  id: string // UUID
  user_id: string // UUID
  patient_id?: string // UUID, optional
  patient_name: string
  appointment_date: string // YYYY-MM-DD
  appointment_time: string // HH:MM
  duration_minutes: number
  appointment_type?: string
  room?: string
  status: AppointmentStatus
  notes?: string | null
  reminder_sent: boolean
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}
