"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"
import type { GroupedPatientData, Record } from "@/lib/types"

interface PatientContextType {
  patients: GroupedPatientData[]
  setPatients: (patients: GroupedPatientData[]) => void
  recordsMap: Map<string, Record[]> // Map of patient name to their records
  setRecordsMap: (map: Map<string, Record[]>) => void
}

const PatientContext = createContext<PatientContextType | undefined>(undefined)

export function PatientProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<GroupedPatientData[]>([])
  const [recordsMap, setRecordsMap] = useState<Map<string, Record[]>>(new Map())

  return (
    <PatientContext.Provider value={{ patients, setPatients, recordsMap, setRecordsMap }}>
      {children}
    </PatientContext.Provider>
  )
}

export function usePatientContext() {
  const context = useContext(PatientContext)
  if (!context) {
    throw new Error("usePatientContext must be used within PatientProvider")
  }
  return context
}
