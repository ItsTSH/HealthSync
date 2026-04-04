"use client"

import { useAppointments } from "./appointments-provider"
import { AppointmentCard } from "./card-appointment"
import { AddAppointmentButton } from "./add-appointments"
import { Spinner } from "@/components/ui/spinner"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useState } from "react"
import { EditAppointmentDialog } from "./edit-appointment-dialog"
import type { Appointment } from "./types"

export function AppointmentsPanel() {
  const { appointments, selectedDate, isLoading, error } = useAppointments()
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)

  // Filter appointments by selected date
  const appointmentsForDate = appointments.filter(
    (apt) => apt.appointment_date === selectedDate
  )

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr + "T00:00:00")
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {formatDate(selectedDate)}
          </h2>
          <p className="text-sm text-muted-foreground">
            {appointmentsForDate.length} appointment
            {appointmentsForDate.length !== 1 ? "s" : ""}
          </p>
        </div>

        <AddAppointmentButton />
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      )}

      {/* Appointments List */}
      {!isLoading && (
        <div className="flex flex-col gap-3">
          {appointmentsForDate.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No appointments scheduled for this day</p>
            </div>
          ) : (
            appointmentsForDate.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onEdit={setEditingAppointment}
              />
            ))
          )}
        </div>
      )}

      {/* Edit Dialog */}
      {editingAppointment && (
        <EditAppointmentDialog
          appointment={editingAppointment}
          onClose={() => setEditingAppointment(null)}
          onSave={() => setEditingAppointment(null)}
        />
      )}
    </div>
  )
}