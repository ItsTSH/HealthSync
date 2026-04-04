"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useState } from "react"
import { useAppointments } from "./appointments-provider"
import type { AppointmentFormData } from "@/lib/supabase-types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

export function AddAppointmentButton() {
  const { addAppointment, selectedDate } = useAppointments()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<AppointmentFormData>({
    patient_name: "",
    appointment_date: selectedDate || new Date().toISOString().split('T')[0],
    appointment_time: "09:00",
    duration_minutes: 30,
    appointment_type: "Initial Consultation",
    room: "",
    status: "pending",
    notes: undefined,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      await addAppointment(formData)
      setIsOpen(false)
      // Reset form
      setFormData({
        patient_name: "",
        appointment_date: selectedDate || new Date().toISOString().split('T')[0],
        appointment_time: "09:00",
        duration_minutes: 30,
        appointment_type: "Initial Consultation",
        room: "",
        status: "pending",
        notes: undefined,
      })
    } catch (error) {
      console.error("Failed to create appointment:", error)
      alert("Failed to create appointment")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-lg shadow-md">
          <Plus className="mr-2 h-4 w-4" />
          New Appointment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Appointment</DialogTitle>
          <DialogDescription>
            Schedule a new appointment with a patient
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
              value={formData.patient_name}
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
              value={formData.appointment_date}
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
              value={formData.appointment_time}
              onChange={(e) =>
                setFormData({ ...formData, appointment_time: e.target.value })
              }
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Select
              value={formData.duration_minutes.toString()}
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
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Creating..." : "Create Appointment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}