"use client"

import { createContext, useContext, useEffect, useState } from "react"

interface CalendarContextValue {
  selectedDate: string // YYYY-MM-DD format
  setSelectedDate: (date: string) => void
}

const CalendarContext = createContext<CalendarContextValue | null>(null)

export function CalendarProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [selectedDate, setSelectedDate] = useState<string>("")

  // Set date ONLY on client after mount to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setSelectedDate(today)
  }, [])

  return (
    <CalendarContext.Provider
      value={{ selectedDate, setSelectedDate }}
    >
      {children}
    </CalendarContext.Provider>
  )
}

export function useCalendar() {
  const context = useContext(CalendarContext)
  if (!context) {
    throw new Error(
      "useCalendar must be used within CalendarProvider"
    )
  }
  return context
}
