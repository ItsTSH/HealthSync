"use client"

import { Calendar } from "@/components/ui/calendar"
import { useCalendar } from "./calendar-provider"
import { useAppointments } from "@/features/appointments/appointments-provider"
import { useEffect, useState } from "react"
import { Skeleton } from "boneyard-js/react"

export function CalendarView() {
  const { selectedDate: calendarSelectedDate, setSelectedDate: setCalendarSelectedDate } = useCalendar()
  const { appointments, setSelectedDate: setAppointmentsSelectedDate, isLoading } = useAppointments()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync calendar selection with appointments provider
  useEffect(() => {
    if (calendarSelectedDate) {
      setAppointmentsSelectedDate(calendarSelectedDate)
    }
  }, [calendarSelectedDate, setAppointmentsSelectedDate])

  // Get all appointment dates as a Set for efficient lookup
  const appointmentDatesSet = new Set(
    appointments.map((a) => a.appointment_date)
  )

  // Convert YYYY-MM-DD string to Date for calendar (using midnight local time)
  const selectedDateObj = calendarSelectedDate
    ? (() => {
        const [year, month, day] = calendarSelectedDate.split('-').map(Number)
        return new Date(year, month - 1, day)
      })()
    : new Date()

  return (
    <div className="w-full items-center justify-center">
      <Skeleton name="calendar-view" loading={!mounted || isLoading}>
        <div className="rounded-lg border border-border bg-card p-6 shadow-md items-center justify-center">
          <Calendar
            mode="single"
            selected={selectedDateObj}
            onSelect={(date) => {
              if (date) {
                // Format date as YYYY-MM-DD using local timezone
                const year = date.getFullYear()
                const month = String(date.getMonth() + 1).padStart(2, '0')
                const day = String(date.getDate()).padStart(2, '0')
                const dateStr = `${year}-${month}-${day}`
                setCalendarSelectedDate(dateStr)
              }
            }}
            disabled={(date) => {
              // Optionally disable past dates if needed
              // return date < new Date()
              return false
            }}
            modifiers={{
              hasAppointment: (date) => {
                // Format the calendar date as YYYY-MM-DD using local timezone
                const year = date.getFullYear()
                const month = String(date.getMonth() + 1).padStart(2, '0')
                const day = String(date.getDate()).padStart(2, '0')
                const dateStr = `${year}-${month}-${day}`
                return appointmentDatesSet.has(dateStr)
              },
            }}
            modifiersClassNames={{
              hasAppointment: "bg-primary/20 font-semibold text-primary hover:bg-primary/30",
            }}
            classNames={{
              months: "flex flex-col space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-lg font-semibold",
              nav: "space-x-1 flex justify-between",
              nav_button: "h-10 w-10 bg-transparent p-0 opacity-50 hover:opacity-100",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell:
                "text-muted-foreground rounded-md w-12 font-normal text-[0.9rem]",
              row: "flex w-full mt-2",
              cell: "h-12 w-12 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              day: "h-12 w-12 p-0 font-normal aria-selected:opacity-100",
              day_selected:
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground",
              day_outside:
                "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
              day_disabled: "text-muted-foreground opacity-50",
              day_range_middle:
                "aria-selected:bg-accent aria-selected:text-accent-foreground",
              day_hidden: "invisible",
            }}
          />
        </div>
      </Skeleton>
    </div>
  )
}
