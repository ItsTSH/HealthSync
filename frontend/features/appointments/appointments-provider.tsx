"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import type { Appointment } from "./types"
import {
  fetchAllAppointments,
  fetchAppointmentsByDate,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  subscribeToAppointments,
  subscribeToAppointmentsByDate,
} from "@/lib/supabase-services"
import type { AppointmentFormData } from "@/lib/supabase-types"

/* ============ Context ============ */

interface AppointmentsContextValue {
  appointments: Appointment[]
  selectedDate: string
  isLoading: boolean
  error: string | null

  // Actions
  setSelectedDate: (date: string) => void
  addAppointment: (appointment: AppointmentFormData) => Promise<Appointment>
  updateAppointmentData: (id: string, updates: Partial<Omit<Appointment, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => Promise<Appointment>
  deleteAppointmentData: (id: string) => Promise<void>
  refreshAppointments: () => Promise<void>
}

const AppointmentsContext = createContext<AppointmentsContextValue | null>(null)

/* ============ Provider ============ */

export function AppointmentsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null)

  // Initialize selected date to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setSelectedDate(today)
  }, [])

  // Load appointments on mount and when selected date changes
  useEffect(() => {
    const loadAppointments = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await fetchAllAppointments()
        setAppointments(data)
        console.log('[AppointmentsProvider] Loaded appointments:', data.length)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load appointments'
        console.error('[AppointmentsProvider] Error loading appointments:', err)
        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    loadAppointments()
  }, [])

  // Set up real-time subscription
  useEffect(() => {
    if (appointments.length === 0) return

    try {
      const unsubscribeFn = subscribeToAppointments((payload) => {
        console.log('[AppointmentsProvider] Received update:', payload.eventType)
        
        setAppointments((prevAppointments) => {
          if (payload.eventType === 'INSERT') {
            return [...prevAppointments, payload.new]
          } else if (payload.eventType === 'UPDATE') {
            return prevAppointments.map((app) =>
              app.id === payload.new.id ? payload.new : app
            )
          } else if (payload.eventType === 'DELETE') {
            return prevAppointments.filter((app) => app.id !== payload.old.id)
          }
          return prevAppointments
        })
      })

      setUnsubscribe(() => unsubscribeFn)

      return () => {
        unsubscribeFn()
      }
    } catch (err) {
      console.error('[AppointmentsProvider] Error setting up subscription:', err)
    }
  }, [])

  // Callback to add appointment
  const addAppointment = useCallback(async (formData: AppointmentFormData): Promise<Appointment> => {
    try {
      setError(null)
      const newAppointment = await createAppointment(formData)
      setAppointments((prev) => [...prev, newAppointment])
      console.log('[AppointmentsProvider] Appointment created:', newAppointment.id)
      return newAppointment
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create appointment'
      console.error('[AppointmentsProvider] Error creating appointment:', err)
      setError(errorMessage)
      throw err
    }
  }, [])

  // Callback to update appointment
  const updateAppointmentData = useCallback(
    async (id: string, updates: Partial<Omit<Appointment, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Appointment> => {
      try {
        setError(null)
        const updated = await updateAppointment(id, updates)
        setAppointments((prev) =>
          prev.map((app) => (app.id === id ? updated : app))
        )
        console.log('[AppointmentsProvider] Appointment updated:', id)
        return updated
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update appointment'
        console.error('[AppointmentsProvider] Error updating appointment:', err)
        setError(errorMessage)
        throw err
      }
    },
    []
  )

  // Callback to delete appointment
  const deleteAppointmentData = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null)
      await deleteAppointment(id)
      setAppointments((prev) => prev.filter((app) => app.id !== id))
      console.log('[AppointmentsProvider] Appointment deleted:', id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete appointment'
      console.error('[AppointmentsProvider] Error deleting appointment:', err)
      setError(errorMessage)
      throw err
    }
  }, [])

  // Callback to refresh appointments
  const refreshAppointments = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await fetchAllAppointments()
      setAppointments(data)
      console.log('[AppointmentsProvider] Appointments refreshed:', data.length)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh appointments'
      console.error('[AppointmentsProvider] Error refreshing appointments:', err)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return (
    <AppointmentsContext.Provider
      value={{
        appointments,
        selectedDate,
        isLoading,
        error,
        setSelectedDate,
        addAppointment,
        updateAppointmentData,
        deleteAppointmentData,
        refreshAppointments,
      }}
    >
      {children}
    </AppointmentsContext.Provider>
  )
}

/* ============ Hook ============ */

export function useAppointments() {
  const context = useContext(AppointmentsContext)
  if (!context) {
    throw new Error(
      "useAppointments must be used within AppointmentsProvider"
    )
  }
  return context
}