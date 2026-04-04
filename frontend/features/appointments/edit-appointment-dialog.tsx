"use client"

import { useState } from "react"
import { useAppointments } from "./appointments-provider"
import type { Appointment } from "./types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

interface EditAppointmentDialogProps {
  appointment: Appointment | null
  onClose: () => void
  onSave: () => void
}

export function EditAppointmentDialog({
  appointment,
  onClose,
  onSave,
}: EditAppointmentDialogProps) {
  const { updateAppointmentData } = useAppointments()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState(appointment || {})

  if (!appointment) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      await updateAppointmentData(appointment.id, {
        patient_name: formData.patient_name,
        appointment_date: formData.appointment_date,
        appointment_time: formData.appointment_time,
        duration_minutes: formData.duration_minutes,
        appointment_type: formData.appointment_type,
        room: formData.room,
        status: formData.status,
        notes: formData.notes,
      })
      onSave()
      onClose()
    } catch (error) {
      console.error("Failed to update appointment:", error)
      alert("Failed to update appointment")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={!!appointment} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Appointment</DialogTitle>
          <DialogDescription>
            Update appointment details
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient Name */}
          <div className="space-y-2">
            <Label htmlFor="patient-name">Patient Name *</Label>
            <Input
              id="patient-name"
              placeholder="Enter patient name"
              required
              value={formData.patient_name || ""}
              onChange={(e) =>
                setFormData({ ...formData, patient_name: e.target.value })
              }
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Appointment Date *</Label>
            <Input
              id="date"
              type="date"
              required
              value={formData.appointment_date || ""}
              onChange={(e) =>
                setFormData({ ...formData, appointment_date: e.target.value })
              }
            />
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label htmlFor="time">Time *</Label>
            <Input
              id="time"
              type="time"
              required
              value={formData.appointment_time || ""}
              onChange={(e) =>
                setFormData({ ...formData, appointment_time: e.target.value })
              }
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Select
              value={(formData.duration_minutes || 30).toString()}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  duration_minutes: parseInt(value, 10),
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 min</SelectItem>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="45">45 min</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Appointment Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Appointment Type</Label>
            <Select
              value={formData.appointment_type || "Initial Consultation"}
              onValueChange={(value) =>
                setFormData({ ...formData, appointment_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Initial Consultation">Initial Consultation</SelectItem>
                <SelectItem value="Follow-up">Follow-up</SelectItem>
                <SelectItem value="Check-up">Check-up</SelectItem>
                <SelectItem value="Treatment">Treatment</SelectItem>
                <SelectItem value="Routine Examination">Routine Examination</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Room */}
          <div className="space-y-2">
            <Label htmlFor="room">Room/Location</Label>
            <Input
              id="room"
              placeholder="e.g., Room 101"
              value={formData.room || ""}
              onChange={(e) =>
                setFormData({ ...formData, room: e.target.value || undefined })
              }
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status || "confirmed"}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  status: value as Appointment["status"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="rescheduled">Rescheduled</SelectItem>
                <SelectItem value="no-show">No Show</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes for this appointment"
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value || undefined })
              }
              className="resize-none h-20"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
