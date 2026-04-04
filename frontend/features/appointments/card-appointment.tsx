"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, MapPin, Trash2, Edit2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Appointment } from "./types"
import { useState } from "react"
import { useAppointments } from "./appointments-provider"

export function AppointmentCard({
  appointment,
  onEdit,
}: {
  appointment: Appointment
  onEdit?: (appointment: Appointment) => void
}) {
  const { deleteAppointmentData } = useAppointments()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (confirm("Are you sure?")) {
      try {
        setIsDeleting(true)
        await deleteAppointmentData(appointment.id)
      } catch (error) {
        console.error("Failed to delete appointment:", error)
        alert("Failed to delete appointment")
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "confirmed":
        return "default"
      case "completed":
        return "secondary"
      case "cancelled":
        return "destructive"
      case "no-show":
        return "destructive"
      case "rescheduled":
        return "outline"
      default:
        return "secondary"
    }
  }

  return (
    <Card className="border-border shadow-md hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        {/* Header with time and status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {appointment.appointment_time}
              </p>
              <p className="text-xs text-muted-foreground">
                {appointment.duration_minutes} minutes
              </p>
            </div>
          </div>
          <Badge variant={getStatusColor(appointment.status)} className="capitalize">
            {appointment.status}
          </Badge>
        </div>

        {/* Patient name and type */}
        <div className="mb-3">
          <p className="font-semibold text-foreground mb-1">
            {appointment.patient_name}
          </p>
          {appointment.appointment_type && (
            <p className="text-xs text-muted-foreground">{appointment.appointment_type}</p>
          )}
        </div>

        {/* Room and other details */}
        <div className="flex flex-col gap-2 mb-3 text-xs text-muted-foreground">
          {appointment.room && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3" />
              <span>{appointment.room}</span>
            </div>
          )}
          {appointment.notes && (
            <div className="text-xs italic text-muted-foreground">
              {appointment.notes}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => onEdit?.(appointment)}
          >
            <Edit2 className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}