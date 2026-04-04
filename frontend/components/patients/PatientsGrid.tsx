"use client"

import * as React from "react"
import { useMemo, useState, useEffect } from "react"
import { Search, ChevronDown } from "lucide-react"
import { v4 as uuidv4 } from "uuid"

import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import PatientCard from "./PatientCard"
import type { GroupedPatientData } from "@/lib/types"
import { fetchRecords, groupNotesByPatient } from "@/lib/api"
import { savePatientUUIDMapping } from "@/lib/patientUUIDMapping"
import { usePatientContext } from "./PatientContext"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/animate-ui/components/radix/dropdown-menu"

interface PatientWithUUID extends GroupedPatientData {
  patientUUID: string
}

interface PatientUUIDMapping {
  [patientUUID: string]: string // Maps patientUUID -> patientName
}

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50]

export default function PatientsGrid() {
  const [q, setQ] = useState("")
  const [allPatients, setAllPatients] = useState<PatientWithUUID[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [uuidMapping, setUUIDMapping] = useState<PatientUUIDMapping>({})
  const { setPatients, setRecordsMap } = usePatientContext()

  // Fetch and group records on mount
  useEffect(() => {
    let isMounted = true
    const abortController = new AbortController()

    const loadPatients = async () => {
      try {
        setIsLoading(true)
        setError(null)

        console.log("[PatientsGrid] Fetching records from backend...")

        // Fetch all records from backend
        const records = await fetchRecords()
        console.log(`[PatientsGrid] Fetched ${records.length} records from backend`)

        // Group records by patient name
        const grouped = groupNotesByPatient(records)
        console.log(`[PatientsGrid] Grouped into ${grouped.length} unique patients`)

        // Generate random patientUUID for each patient and create mapping
        const newUUIDMapping: PatientUUIDMapping = {}
        const patientsWithNewUUIDs: PatientWithUUID[] = grouped.map((patient) => {
          const patientUUID = uuidv4() // Generate new random UUID each time
          newUUIDMapping[patientUUID] = patient.patientName
          console.log(
            `[PatientsGrid] Generated patientUUID for "${patient.patientName}": ${patientUUID}`
          )
          return {
            ...patient,
            patientUUID,
          }
        })

        // Store mapping in localStorage for persistence across navigation
        savePatientUUIDMapping(newUUIDMapping)
        console.log("[PatientsGrid] UUID Mapping saved to localStorage:", newUUIDMapping)

        if (isMounted) {
          setAllPatients(patientsWithNewUUIDs)
          setUUIDMapping(newUUIDMapping)
          setPatients(patientsWithNewUUIDs)

          // Create map of patient name to records
          const recordsMap = new Map<string, typeof records>()
          records.forEach((record) => {
            const patientName = (record as any).patientName || "Unknown Patient"
            if (!recordsMap.has(patientName)) {
              recordsMap.set(patientName, [])
            }
            recordsMap.get(patientName)!.push(record)
          })
          setRecordsMap(recordsMap)

          setCurrentPage(1)
        }
      } catch (err) {
        if (isMounted && !(err instanceof Error && err.name === "AbortError")) {
          const errorMessage = err instanceof Error ? err.message : "Failed to load patients"
          setError(errorMessage)
          console.error("Error loading patients:", err)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadPatients()

    // Cleanup function
    return () => {
      isMounted = false
      abortController.abort()
    }
  }, [])

  // Memoized filtered patients (prevents re-filtering on theme changes)
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return allPatients

    return allPatients.filter(
      (p: PatientWithUUID) =>
        p.patientName.toLowerCase().includes(term) || p.patientID.toLowerCase().includes(term)
    )
  }, [q, allPatients])

  // Calculate pagination values
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedPatients = filtered.slice(startIndex, endIndex)

  // Reset to page 1 when items per page changes
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value))
    setCurrentPage(1)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96">
        <Spinner className="size-12 mb-4" />
        <p className="text-muted-foreground">Loading patients from backend...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 text-center">
        <p className="text-destructive text-lg font-semibold mb-2">Failed to Load Patients</p>
        <p className="text-muted-foreground text-sm mb-4">{error}</p>
        <p className="text-muted-foreground text-xs">
          Ensure the backend is running on http://localhost:8000
        </p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Search and Filter Controls */}
      <div className="space-y-4">
        <div className="max-w-lg">
          <label className="mb-2 block text-sm font-medium text-muted-foreground">
            Search patients
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setCurrentPage(1) // Reset to page 1 when searching
              }}
              placeholder="Search by name or patient ID"
              className="pl-9"
            />
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">Items per page:</label>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm bg-background hover:bg-accent transition-colors">
                {itemsPerPage}
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {ITEMS_PER_PAGE_OPTIONS.map((count) => (
                  <DropdownMenuItem
                    key={count}
                    onClick={() => handleItemsPerPageChange(count.toString())}
                    className={itemsPerPage === count ? "bg-accent" : ""}
                  >
                    {count}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {filtered.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, filtered.length)} of {filtered.length}
              {allPatients.length > filtered.length &&
                ` (${allPatients.length} unique patients total)`}
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex items-center justify-center min-h-96 text-center">
          <div>
            <p className="text-muted-foreground text-lg font-semibold mb-2">No patients found</p>
            {allPatients.length === 0 ? (
              <p className="text-muted-foreground text-sm">No patient records available</p>
            ) : (
              <p className="text-muted-foreground text-sm">Try adjusting your search filters</p>
            )}
          </div>
        </div>
      )}

      {/* Patient Cards Grid */}
      {paginatedPatients.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paginatedPatients.map((p) => (
              <PatientCard key={p.id} patient={p} />
            ))}
          </div>

          {/* Pagination Buttons */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium rounded-md border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
              >
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                      currentPage === page
                        ? "bg-primary text-primary-foreground"
                        : "border border-border hover:bg-accent"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium rounded-md border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

