/**
 * Supabase Services Layer
 * Handles all CRUD operations for notes and versions
 * Implements optimistic updates, versioning, and real-time subscriptions
 */

import { createClient } from "@/utils/supabase/client"
import { debug } from "@/utils/debug"
import type { Note, NoteFormData, NoteVersion, ProcessingStatus } from "./supabase-types"
import { createFetchHeaders } from "./api-auth"

export const supabase = createClient()

/**
 * ===== CREATE OPERATIONS =====
 */

/**
 * Create a new note (CREATE FLOW)
 * 1. Optimistically updates UI with temp ID
 * 2. Inserts into Supabase
 * 3. Replaces temp entry with real DB entry
 * 4. Calls FastAPI for processing
 *
 * @param formData Medical metadata to save
 * @returns Created note with real ID from DB
 */
export async function createNote(formData: NoteFormData): Promise<Note> {
  try {
    // Get current user for RLS policy
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('User not authenticated. Please log in first.')
    }

    // Prepare data for insertion (include user_id for RLS policy)
    const noteData = {
      user_id: user.id, // Required for RLS policy: auth.uid() = user_id
      patientName: formData.patientName,
      age: formData.age,
      chiefComplaint: formData.chiefComplaint,
      symptoms: formData.symptoms,
      previousDiagnosis: formData.previousDiagnosis || null,
      previousMedications: formData.previousMedications || null,
      bloodPressure: formData.bloodPressure || null,
      heartRate: formData.heartRate || null,
      temperature: formData.temperature || null,
      allergies: formData.allergies || null,
      medication: formData.medication || null,
      diagnosis: formData.diagnosis || null,
      status: 'pending', // New note starts in pending state
      error: null,
    }

    // Insert note into Supabase
    const { data, error } = await supabase
      .from('notes')
      .insert(noteData)
      .select()
      .single()

    if (error) {
      debug.error('createNote', 'Supabase error:', error)
      throw new Error(`Failed to create note: ${error.message}`)
    }

    if (!data) {
      throw new Error('No data returned from note creation')
    }

    debug.log('createNote', 'Note created successfully:', data)
    // Map noteID to id for consistency with Note type
    return { ...data, id: data.noteID } as Note
  } catch (error) {
    debug.error('createNote', 'Error:', error)
    throw error
  }
}

/**
 * ===== READ OPERATIONS =====
 */

/**
 * Fetch all notes with server-side pagination
 * Ordered by creation date (newest first)
 * Used by sessions table-provider
 *
 * @param page Page number (1-indexed, default: 1)
 * @param pageSize Number of items per page (default: 20)
 * @returns Object with notes array and total count
 */
export async function fetchAllNotes(
  page: number = 1,
  pageSize: number = 20
): Promise<{ notes: Note[]; total: number }> {
  try {
    // Calculate offset for this page
    const offset = (page - 1) * pageSize

    // Fetch paginated data with total count
    const { data, error, count } = await supabase
      .from('notes')
      .select('*', { count: 'exact' })
      .order('createdAt', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error) {
      debug.error('fetchAllNotes', 'Supabase error:', error)
      throw new Error(`Failed to fetch notes: ${error.message}`)
    }

    // Map noteID to id for consistency with Note type
    const mappedData = (data || []).map((note: any) => ({
      ...note,
      id: note.noteID,
    }))

    debug.log('fetchAllNotes', 'Fetched notes:', {
      page,
      pageSize,
      returned: mappedData?.length || 0,
      total: count || 0,
    })

    return {
      notes: mappedData as Note[],
      total: count || 0,
    }
  } catch (error) {
    debug.error('fetchAllNotes', 'Error:', error)
    throw error
  }
}

/**
 * Fetch a single note by ID
 * Used by session detail page
 * Validates and sanitizes data to prevent rendering issues
 *
 * @param id Note ID
 * @returns Note object or null if not found
 */
export async function fetchNoteById(id: string): Promise<Note | null> {
  try {
    debug.log('fetchNoteById', 'Starting fetch for ID:', id)
    
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('noteID', id)
      .single()

    if (error && error.code === 'PGRST116') {
      // Not found is not an error
      console.log('[fetchNoteById] Note not found:', id)
      return null
    }

    if (error) {
      console.error('[fetchNoteById] Supabase error:', error)
      throw new Error(`Failed to fetch note: ${error.message}`)
    }

    if (!data) {
      console.log('[fetchNoteById] No data returned')
      return null
    }

    console.log('[fetchNoteById] Raw data received:', data)
    console.log('[fetchNoteById] Data type:', typeof data)
    console.log('[fetchNoteById] Data keys:', Object.keys(data || {}))

    // Validate and sanitize data structure to prevent React rendering issues
    try {
      const sanitized = {
        id: data.noteID || id,
        noteID: data.noteID,
        user_id: data.user_id || '',
        patientName: String(data.patientName || ''),
        age: data.age ? Number(data.age) : undefined,
        chiefComplaint: String(data.chiefComplaint || ''),
        symptoms: String(data.symptoms || ''),
        previousDiagnosis: data.previousDiagnosis ? String(data.previousDiagnosis) : null,
        previousMedications: data.previousMedications ? String(data.previousMedications) : null,
        bloodPressure: data.bloodPressure ? Number(data.bloodPressure) : null,
        heartRate: data.heartRate ? Number(data.heartRate) : null,
        temperature: data.temperature ? Number(data.temperature) : null,
        allergies: data.allergies ? String(data.allergies) : null,
        medication: data.medication ? String(data.medication) : null,
        diagnosis: data.diagnosis ? String(data.diagnosis) : null,
        status: (data.status || 'pending') as 'pending' | 'processing' | 'completed' | 'failed',
        error: data.error ? String(data.error) : null,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      }

      console.log('[fetchNoteById] Sanitized note:', sanitized)
      console.log('[fetchNoteById] Note fetched successfully:', id)
      return sanitized as Note
    } catch (sanitizeError) {
      console.error('[fetchNoteById] Error sanitizing data:', sanitizeError)
      console.error('[fetchNoteById] Data structure:', JSON.stringify(data, null, 2))
      throw new Error(`Failed to parse note data: ${sanitizeError instanceof Error ? sanitizeError.message : String(sanitizeError)}`)
    }
  } catch (error) {
    console.error('[fetchNoteById] Error:', error)
    console.error('[fetchNoteById] Error type:', error instanceof Error ? error.constructor.name : typeof error)
    throw error
  }
}

/**
 * Fetch all notes for a specific patient (grouped by name)
 * Used by patients tab
 *
 * @param patientName Patient name to filter by
 * @returns Array of notes for that patient
 */
export async function fetchNotesByPatientName(patientName: string): Promise<Note[]> {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('patientName', patientName)
      .order('createdAt', { ascending: false })

    if (error) {
      console.error('[fetchNotesByPatientName] Supabase error:', error)
      throw new Error(`Failed to fetch patient notes: ${error.message}`)
    }

    // Map noteID to id for consistency with Note type
    const mappedData = (data || []).map((note: any) => ({
      ...note,
      id: note.noteID,
    }))

    console.log('[fetchNotesByPatientName] Fetched notes for patient:', patientName)
    return mappedData as Note[]
  } catch (error) {
    console.error('[fetchNotesByPatientName] Error:', error)
    throw error
  }
}

/**
 * ===== UPDATE OPERATIONS =====
 */

/**
 * Update a note (UPDATE FLOW)
 * MANDATORY: Save version BEFORE updating
 * 1. Save current note state to note_versions
 * 2. Update note in database
 * 3. Reset status to 'pending' (triggers re-processing)
 *
 * @param id Note ID to update
 * @param updates Partial note data to update
 * @returns Updated note
 */
export async function updateNote(
  id: string,
  updates: Partial<Omit<Note, 'id' | 'createdAt'>>
): Promise<Note> {
  try {
    // STEP 1: Fetch current note to save as version
    const currentNote = await fetchNoteById(id)
    if (!currentNote) {
      throw new Error(`Note with ID ${id} not found`)
    }

    // STEP 2: Save version before updating
    await createNoteVersion(id, currentNote)

    // STEP 3: Update the note, always reset status to pending for re-processing
    const { data, error } = await supabase
      .from('notes')
      .update({
        ...updates,
        status: 'pending', // Reset to pending on edit to trigger re-processing
        error: null, // Clear any previous errors
      })
      .eq('noteID', id)
      .select()
      .single()

    if (error) {
      console.error('[updateNote] Supabase error:', error)
      throw new Error(`Failed to update note: ${error.message}`)
    }

    if (!data) {
      throw new Error('No data returned from note update')
    }

    console.log('[updateNote] Note updated successfully:', id)
    // Map noteID to id for consistency with Note type
    return { ...data, id: data.noteID } as Note
  } catch (error) {
    console.error('[updateNote] Error:', error)
    throw error
  }
}

/**
 * ===== DELETE OPERATIONS =====
 */

/**
 * Delete a note and its version history
 * Cascade delete removes all versions
 *
 * @param id Note ID to delete
 * @returns true if deleted successfully
 */
export async function deleteNote(id: string): Promise<boolean> {
  try {
    // Delete the note (versions should cascade delete if configured)
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('noteID', id)

    if (error) {
      console.error('[deleteNote] Supabase error:', error)
      throw new Error(`Failed to delete note: ${error.message}`)
    }

    console.log('[deleteNote] Note deleted successfully:', id)
    return true
  } catch (error) {
    console.error('[deleteNote] Error:', error)
    throw error
  }
}

/**
 * ===== VERSIONING OPERATIONS =====
 */

/**
 * Create a version snapshot BEFORE updating
 * Stores the complete note data as it was
 *
 * @param noteId Note ID this version belongs to
 * @param snapshot Complete note data before update
 * @returns Created version record
 */
export async function createNoteVersion(
  noteId: string,
  snapshot: Note
): Promise<NoteVersion> {
  try {
    const { data, error } = await supabase
      .from('note_versions')
      .insert({
        note_id: noteId,
        snapshot: snapshot,
      })
      .select()
      .single()

    if (error) {
      console.error('[createNoteVersion] Supabase error:', error)
      throw new Error(`Failed to create version: ${error.message}`)
    }

    if (!data) {
      throw new Error('No data returned from version creation')
    }

    console.log('[createNoteVersion] Version created for note:', noteId)
    return data as NoteVersion
  } catch (error) {
    console.error('[createNoteVersion] Error:', error)
    throw error
  }
}

/**
 * Fetch all versions for a note (edit history)
 * Ordered newest first
 *
 * @param noteId Note ID to fetch versions for
 * @returns Array of version records
 */
export async function fetchNoteVersions(noteId: string): Promise<NoteVersion[]> {
  try {
    const { data, error } = await supabase
      .from('note_versions')
      .select('*')
      .eq('note_id', noteId)
      .order('edited_at', { ascending: false })

    if (error) {
      console.error('[fetchNoteVersions] Supabase error:', error)
      throw new Error(`Failed to fetch versions: ${error.message}`)
    }

    // Transform snake_case database columns to camelCase for TypeScript
    const versions = (data || []).map((row: any) => ({
      id: row.id,
      note_id: row.note_id,
      snapshot: row.snapshot,
      editedAt: row.edited_at, // Map edited_at → editedAt
      createdAt: row.created_at, // Also include created_at for reference
    })) as NoteVersion[]

    console.log('[fetchNoteVersions] Fetched versions for note:', noteId)
    return versions
  } catch (error) {
    console.error('[fetchNoteVersions] Error:', error)
    throw error
  }
}

/**
 * ===== AI PROCESSING =====
 */

/**
 * Call FastAPI to process note after creation or update
 * Backend will update status to 'processing', 'completed', or 'failed'
 *
 * @param noteId Note ID to process
 * @throws Error if FastAPI call fails
 */
export async function processNoteWithAI(noteId: string): Promise<void> {
  try {
    const headers = await createFetchHeaders('application/json')
    
    const response = await fetch('http://localhost:8000/process/note', {
      method: 'POST',
      headers,
      body: JSON.stringify({ note_id: noteId }),
    })

    if (!response.ok) {
      throw new Error(`FastAPI error: ${response.status}`)
    }

    console.log('[processNoteWithAI] Processing started for note:', noteId)
  } catch (error) {
    console.error('[processNoteWithAI] Error:', error)
    throw error
  }
}

/**
 * Mark a note as completed (backend sets this on successful processing)
 * This is kept for internal use but prefer using status field directly
 *
 * @param noteId Note ID to mark as completed
 */
export async function markNoteAsCompleted(noteId: string): Promise<Note | null> {
  try {
    const { data, error } = await supabase
      .from('notes')
      .update({ status: 'completed' })
      .eq('noteID', noteId)
      .select()
      .single()

    if (error) {
      console.error('[markNoteAsCompleted] Supabase error:', error)
      throw new Error(`Failed to mark note as completed: ${error.message}`)
    }

    console.log('[markNoteAsCompleted] Note marked as completed:', noteId)
    return (data || null) as Note | null
  } catch (error) {
    console.error('[markNoteAsCompleted] Error:', error)
    throw error
  }
}

/**
 * Retry processing a failed note
 * Resets status to 'pending' and clears error
 *
 * @param noteId Note ID to retry
 * @returns Updated note
 */
export async function retryNoteProcessing(noteId: string): Promise<Note> {
  try {
    const { data, error } = await supabase
      .from('notes')
      .update({ status: 'pending', error: null })
      .eq('id', noteId)
      .select()
      .single()

    if (error) {
      console.error('[retryNoteProcessing] Supabase error:', error)
      throw new Error(`Failed to retry note processing: ${error.message}`)
    }

    if (!data) {
      throw new Error('No data returned from retry')
    }

    console.log('[retryNoteProcessing] Note retry initiated:', noteId)
    
    // Trigger processing
    await processNoteWithAI(noteId)
    
    return (data || null) as Note
  } catch (error) {
    console.error('[retryNoteProcessing] Error:', error)
    throw error
  }
}

/**
 * ===== REAL-TIME SUBSCRIPTIONS =====
 */

/**
 * Subscribe to note updates in real-time
 * Useful for keeping UI in sync when notes are updated from other sources
 *
 * @param noteId Note ID to subscribe to (optional, if omitted subscribes to all)
 * @param onUpdate Callback function when note is updated
 * @returns Unsubscribe function
 */
/**
 * Subscribe to note updates filtered by user_id and optional noteId
 * Filters real-time events to only show current user's changes
 *
 * @param userId Current user's UUID
 * @param onUpdate Callback function for updates
 * @param noteId Optional specific note ID to monitor
 * @returns Unsubscribe function
 */
export function subscribeToNoteUpdates(
  userId: string,
  onUpdate: (payload: { new: Note; old: Note }) => void,
  noteId?: string
) {
  let channel = supabase.channel(`notes-changes-${userId}`)

  if (noteId) {
    // Subscribe to specific note updates for this user
    channel = channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notes',
        filter: `id=eq.${noteId},user_id=eq.${userId}`,
      },
      (payload: any) => {
        console.log('[subscribeToNoteUpdates] Note updated:', payload.new.id)
        onUpdate(payload)
      }
    )
  } else {
    // Subscribe to all note updates for this user
    channel = channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notes',
        filter: `user_id=eq.${userId}`,
      },
      (payload: any) => {
        console.log('[subscribeToNoteUpdates] Note updated:', payload.new.id)
        onUpdate(payload)
      }
    )
  }

  channel.subscribe((status) => {
    console.log('[subscribeToNoteUpdates] Subscription status:', status)
  })

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to processing status changes
 * Monitors for any changes to status or error fields
 *
 * @param onStatusChange Callback with processing status
 * @returns Unsubscribe function
 */
export function subscribeToProcessingStatus(
  onStatusChange: (payload: { noteId: string; status: string; error: string | null }) => void
) {
  const channel = supabase.channel('processing-status')

  channel.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'notes',
    },
    (payload: any) => {
      // Only emit if status or error changed
      if (payload.new.status !== payload.old?.status || payload.new.error !== payload.old?.error) {
        console.log('[subscribeToProcessingStatus] Status updated:', {
          id: payload.new.id,
          status: payload.new.status,
          error: payload.new.error,
        })
        onStatusChange({
          noteId: payload.new.id,
          status: payload.new.status,
          error: payload.new.error,
        })
      }
    }
  )

  channel.subscribe((status) => {
    console.log('[subscribeToProcessingStatus] Subscription status:', status)
  })

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Get display text for a processing status
 * 
 * @param status Current processing status
 * @returns Formatted display text
 */
export function getStatusDisplay(status: 'pending' | 'processing' | 'completed' | 'failed'): string {
  const statusMap: Record<string, string> = {
    pending: 'Waiting',
    processing: 'Processing...',
    completed: 'Completed',
    failed: 'Failed',
  }
  return statusMap[status] || status
}

/**
 * ===== APPOINTMENTS CRUD OPERATIONS =====
 */

/**
 * Import Appointment type at the top of the file
 */
import type { Appointment, AppointmentFormData } from './supabase-types'

/**
 * Fetch all appointments for the current user
 * Ordered by date (ascending - soonest first)
 *
 * @returns Array of appointments
 */
export async function fetchAllAppointments(): Promise<Appointment[]> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('User not authenticated. Please log in first.')
    }

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', user.id)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })

    if (error) {
      console.error('[fetchAllAppointments] Supabase error:', error)
      throw new Error(`Failed to fetch appointments: ${error.message}`)
    }

    console.log('[fetchAllAppointments] Fetched appointments:', data?.length || 0)
    return (data || []) as Appointment[]
  } catch (error) {
    console.error('[fetchAllAppointments] Error:', error)
    throw error
  }
}

/**
 * Fetch appointments for a specific date
 *
 * @param date Date string in YYYY-MM-DD format
 * @returns Array of appointments for that date
 */
export async function fetchAppointmentsByDate(date: string): Promise<Appointment[]> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('User not authenticated. Please log in first.')
    }

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', user.id)
      .eq('appointment_date', date)
      .order('appointment_time', { ascending: true })

    if (error) {
      console.error('[fetchAppointmentsByDate] Supabase error:', error)
      throw new Error(`Failed to fetch appointments: ${error.message}`)
    }

    console.log('[fetchAppointmentsByDate] Fetched appointments for date:', date, 'Count:', data?.length || 0)
    return (data || []) as Appointment[]
  } catch (error) {
    console.error('[fetchAppointmentsByDate] Error:', error)
    throw error
  }
}

/**
 * Fetch appointments in a date range
 *
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 * @returns Array of appointments in the range
 */
export async function fetchAppointmentsByDateRange(startDate: string, endDate: string): Promise<Appointment[]> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('User not authenticated. Please log in first.')
    }

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', user.id)
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })

    if (error) {
      console.error('[fetchAppointmentsByDateRange] Supabase error:', error)
      throw new Error(`Failed to fetch appointments: ${error.message}`)
    }

    console.log('[fetchAppointmentsByDateRange] Fetched appointments:', data?.length || 0)
    return (data || []) as Appointment[]
  } catch (error) {
    console.error('[fetchAppointmentsByDateRange] Error:', error)
    throw error
  }
}

/**
 * Fetch a single appointment by ID
 *
 * @param id Appointment ID
 * @returns Appointment or null if not found
 */
export async function fetchAppointmentById(id: string): Promise<Appointment | null> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('User not authenticated. Please log in first.')
    }

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error && error.code === 'PGRST116') {
      console.log('[fetchAppointmentById] Appointment not found:', id)
      return null
    }

    if (error) {
      console.error('[fetchAppointmentById] Supabase error:', error)
      throw new Error(`Failed to fetch appointment: ${error.message}`)
    }

    console.log('[fetchAppointmentById] Appointment fetched successfully:', id)
    return (data || null) as Appointment | null
  } catch (error) {
    console.error('[fetchAppointmentById] Error:', error)
    throw error
  }
}

/**
 * Create a new appointment
 *
 * @param formData Appointment data to save
 * @returns Created appointment
 */
export async function createAppointment(formData: AppointmentFormData): Promise<Appointment> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('User not authenticated. Please log in first.')
    }

    const appointmentData = {
      user_id: user.id,
      patient_name: formData.patient_name,
      appointment_date: formData.appointment_date,
      appointment_time: formData.appointment_time,
      duration_minutes: formData.duration_minutes,
      appointment_type: formData.appointment_type || null,
      room: formData.room || null,
      status: formData.status || 'pending',
      notes: formData.notes || null,
      reminder_sent: false,
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert(appointmentData)
      .select()
      .single()

    if (error) {
      console.error('[createAppointment] Supabase error:', error)
      throw new Error(`Failed to create appointment: ${error.message}`)
    }

    if (!data) {
      throw new Error('No data returned from appointment creation')
    }

    console.log('[createAppointment] Appointment created successfully:', data.id)
    return data as Appointment
  } catch (error) {
    console.error('[createAppointment] Error:', error)
    throw error
  }
}

/**
 * Update an appointment
 *
 * @param id Appointment ID to update
 * @param updates Partial appointment data to update
 * @returns Updated appointment
 */
export async function updateAppointment(
  id: string,
  updates: Partial<Omit<Appointment, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Appointment> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('User not authenticated. Please log in first.')
    }

    // Verify ownership
    const existing = await fetchAppointmentById(id)
    if (!existing) {
      throw new Error('Appointment not found or you do not have permission to update it')
    }

    const { data, error } = await supabase
      .from('appointments')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('[updateAppointment] Supabase error:', error)
      throw new Error(`Failed to update appointment: ${error.message}`)
    }

    if (!data) {
      throw new Error('No data returned from appointment update')
    }

    console.log('[updateAppointment] Appointment updated successfully:', id)
    return data as Appointment
  } catch (error) {
    console.error('[updateAppointment] Error:', error)
    throw error
  }
}

/**
 * Delete an appointment
 *
 * @param id Appointment ID to delete
 * @returns true if deleted successfully
 */
export async function deleteAppointment(id: string): Promise<boolean> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('User not authenticated. Please log in first.')
    }

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[deleteAppointment] Supabase error:', error)
      throw new Error(`Failed to delete appointment: ${error.message}`)
    }

    console.log('[deleteAppointment] Appointment deleted successfully:', id)
    return true
  } catch (error) {
    console.error('[deleteAppointment] Error:', error)
    throw error
  }
}

/**
 * Update appointment status
 *
 * @param id Appointment ID
 * @param status New status
 * @returns Updated appointment
 */
export async function updateAppointmentStatus(
  id: string,
  status: 'confirmed' | 'cancelled' | 'rescheduled' | 'completed' | 'no-show' | 'pending'
): Promise<Appointment> {
  try {
    return await updateAppointment(id, { status })
  } catch (error) {
    console.error('[updateAppointmentStatus] Error:', error)
    throw error
  }
}

/**
 * ===== APPOINTMENT SUBSCRIPTIONS =====
 */

/**
 * Subscribe to all appointment changes for the current user in real-time
 *
 * @param onUpdate Callback function when appointments change
 * @returns Unsubscribe function
 */
export function subscribeToAppointments(
  onUpdate: (payload: { new: Appointment; old: Appointment; eventType: 'INSERT' | 'UPDATE' | 'DELETE' }) => void
) {
  const channel = supabase.channel('appointments-changes')

  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'appointments',
      },
      (payload: any) => {
        console.log('[subscribeToAppointments] Appointment changed:', payload.eventType, payload.new?.id)
        onUpdate({
          new: payload.new as Appointment,
          old: payload.old as Appointment,
          eventType: payload.eventType,
        })
      }
    )
    .subscribe((status) => {
      console.log('[subscribeToAppointments] Subscription status:', status)
    })

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to appointments for a specific date
 *
 * @param date Date in YYYY-MM-DD format
 * @param onUpdate Callback function when appointments for this date change
 * @returns Unsubscribe function
 */
export function subscribeToAppointmentsByDate(
  date: string,
  onUpdate: (payload: { new: Appointment; old: Appointment; eventType: 'INSERT' | 'UPDATE' | 'DELETE' }) => void
) {
  const channel = supabase.channel(`appointments-${date}`)

  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `appointment_date=eq.${date}`,
      },
      (payload: any) => {
        console.log('[subscribeToAppointmentsByDate] Appointment changed on', date)
        onUpdate({
          new: payload.new as Appointment,
          old: payload.old as Appointment,
          eventType: payload.eventType,
        })
      }
    )
    .subscribe((status) => {
      console.log('[subscribeToAppointmentsByDate] Subscription status:', status)
    })

  return () => {
    supabase.removeChannel(channel)
  }
}
