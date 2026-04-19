"use client"

import React, { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Trash2, Edit, Save, X, History } from "lucide-react"

import { updateNote, deleteNote, processNoteWithAI, fetchNoteVersions, retryNoteProcessing, getStatusDisplay } from "@/lib/supabase-services"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { Note } from "@/lib/supabase-types"

function MedicalField({
  label,
  value,
  isEditing = false,
  onChange,
}: {
  label: string
  value: string | number | undefined | null
  isEditing?: boolean
  onChange?: (value: string) => void
}) {
  try {
    const displayValue = value ?? "N/A"

    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </label>
        {isEditing && onChange ? (
          <Input
            value={displayValue === "N/A" ? "" : displayValue}
            onChange={(e) => onChange(e.target.value)}
            className="bg-input"
            placeholder={label}
          />
        ) : (
          <div className="text-sm font-medium text-foreground">
            {displayValue}
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error(`[MedicalField] Error rendering field "${label}":`, error)
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </label>
        <div className="text-sm font-medium text-red-500">
          Error rendering field
        </div>
      </div>
    )
  }
}

export default function SessionDetailContent({ note }: { note: Note }) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<Note>>(note)
  const [isLoading, setIsLoading] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [versions, setVersions] = useState<any[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)

  // Format date/time for display
  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleString()
    } catch {
      return isoString
    }
  }

  const handleEdit = () => {
    console.log("[SessionDetailContent] Entering edit mode")
    setIsEditing(true)
    setSaveMessage(null)
    setRenderError(null)
  }

  const handleConfirmSave = useCallback(async () => {
    console.log("[handleConfirmSave] Starting save operation")
    
    try {
      if (!editData || editData.id === undefined) {
        console.error("[handleConfirmSave] Missing note ID")
        alert("Error: Note ID is missing")
        return
      }

      const prevNote = note
      const noteId = editData.id as string

      console.log("[handleConfirmSave] Saving note:", noteId)
      console.log("[handleConfirmSave] Edit Data:", editData)

      setIsLoading(true)
      setSaveMessage(null)
      setRenderError(null)

      try {
        console.log("[handleConfirmSave] Step 1: Calling updateNote API")
        const updatedNote = await updateNote(noteId, {
          patientName: editData.patientName || note.patientName,
          age: editData.age !== undefined ? editData.age : note.age,
          chiefComplaint: editData.chiefComplaint || note.chiefComplaint,
          symptoms: editData.symptoms || note.symptoms,
          previousDiagnosis: editData.previousDiagnosis || note.previousDiagnosis,
          previousMedications: editData.previousMedications || note.previousMedications,
          bloodPressure: editData.bloodPressure || note.bloodPressure,
          heartRate: editData.heartRate || note.heartRate,
          temperature: editData.temperature || note.temperature,
          allergies: editData.allergies || note.allergies,
          medication: editData.medication || note.medication,
          diagnosis: editData.diagnosis || note.diagnosis,
        })

        console.log("[handleConfirmSave] Update successful:", updatedNote)

        console.log("[handleConfirmSave] Step 2: Calling processNoteWithAI")
        try {
          await processNoteWithAI(noteId)
          console.log("[handleConfirmSave] AI processing initiated for note:", noteId)
        } catch (aiError) {
          console.error("[handleConfirmSave] AI processing failed:", aiError)
          // Continue - note is saved even if AI processing fails
        }

        console.log("[handleConfirmSave] Update completed successfully")
        setSaveMessage("Changes saved successfully! Processing initiated.")
        setIsEditing(false)
        setEditData(updatedNote)
      } catch (error) {
        console.error("[handleConfirmSave] Update failed:", error)
        console.error("[handleConfirmSave] Error type:", error instanceof Error ? error.constructor.name : typeof error)
        console.error("[handleConfirmSave] Error message:", error instanceof Error ? error.message : String(error))
        
        setEditData(prevNote)
        setSaveMessage(null)

        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        setRenderError(`Failed to save: ${errorMessage}`)
        alert(`Failed to save changes: ${errorMessage}`)
      }
    } catch (error) {
      console.error("[handleConfirmSave] Unexpected error:", error)
      setRenderError(String(error))
    } finally {
      setIsLoading(false)
    }
  }, [editData, note])

  const handleCancel = () => {
    console.log("[SessionDetailContent] Canceling edit mode")
    setEditData(note)
    setIsEditing(false)
    setSaveMessage(null)
    setRenderError(null)
  }

  const handleConfirmDelete = useCallback(async () => {
    if (!note.noteID) {
      console.error("[handleConfirmDelete] Missing note ID")
      alert("Error: Note ID is missing")
      return
    }

    console.log("[handleConfirmDelete] Starting delete for note:", note.noteID)

    setIsLoading(true)
    try {
      await deleteNote(note.noteID)
      console.log("[handleConfirmDelete] Delete successful")
      alert("Session deleted successfully!")
      router.push("/sessions")
    } catch (error) {
      console.error("[handleConfirmDelete] Failed to delete note:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      setRenderError(`Delete failed: ${errorMessage}`)
      alert(`Failed to delete session: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }, [note.noteID, router])

  const handleFieldChange = (field: string, value: string) => {
    console.log(`[SessionDetailContent] Field changed: ${field} = ${value.substring(0, 50)}...`)
    try {
      setEditData((prev) => {
        if (field === "age") {
          return { ...prev, [field]: value ? parseInt(value, 10) : (prev.age || 0) }
        }
        return { ...prev, [field]: value === "" ? undefined : value }
      })
    } catch (error) {
      console.error(`[handleFieldChange] Error updating field ${field}:`, error)
      setRenderError(`Error updating field: ${field}`)
    }
  }

  const loadVersionHistory = useCallback(async () => {
    if (!note.id || loadingVersions) return

    console.log("[loadVersionHistory] Loading versions for note:", note.id)
    setLoadingVersions(true)

    try {
      const fetchedVersions = await fetchNoteVersions(note.id)
      console.log("[loadVersionHistory] Versions fetched:", fetchedVersions)
      setVersions(fetchedVersions)
    } catch (error) {
      console.error("[loadVersionHistory] Failed to load versions:", error)
      setRenderError(`Failed to load versions: ${error instanceof Error ? error.message : String(error)}`)
      alert("Failed to load version history")
    } finally {
      setLoadingVersions(false)
    }
  }, [note.noteID, loadingVersions])

  const displayValue = (value: any) => value ?? "N/A"

  // Render with error handling
  try {
    return (
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        {renderError && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
            <p className="font-semibold">Render Error:</p>
            <p className="text-sm mt-1">{renderError}</p>
          </div>
        )}

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/sessions">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Medical Note</h1>
              <p className="text-sm text-muted-foreground">
                Note ID: {note.noteID} • {note.status === 'failed' ? (
                  <Badge variant="destructive">{getStatusDisplay(note.status)}</Badge>
                ) : note.status === 'completed' ? (
                  <Badge variant="default">{getStatusDisplay(note.status)}</Badge>
                ) : (
                  <Badge variant="secondary">{getStatusDisplay(note.status)}</Badge>
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className={cn("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 has-[>svg]:px-3", !!isLoading && "pointer-events-none opacity-50")} disabled={!!isLoading}>
                      <span className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        Save
                      </span>
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-border shadow-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Save Changes</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogDescription>
                      Changes will be versioned, and the note will be re-processed by the AI system.
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                      <AlertDialogCancel className = "border-destructive text-destructive-foreground"disabled={!!isLoading}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleConfirmSave} disabled={!!isLoading}>
                        {isLoading ? "Saving..." : "Save"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="outline" onClick={handleCancel} className="gap-2" disabled={!!isLoading}>
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleEdit}
                  className="gap-2 border-border drop-shadow"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log("[SessionDetailContent] Toggling version history")
                    setShowVersionHistory(!showVersionHistory)
                    if (!showVersionHistory) {
                      loadVersionHistory()
                    }
                  }}
                  className="gap-2 border-border drop-shadow"
                >
                  <History className="h-4 w-4" />
                  History
                </Button>
                {note.status === 'failed' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      console.log("[SessionDetailContent] Retrying note processing")
                      setIsLoading(true)
                      retryNoteProcessing(note.id)
                        .then(() => {
                          setSaveMessage('Retry initiated. Processing will begin shortly.')
                        })
                        .catch((err) => {
                          console.error('Retry failed:', err)
                          setSaveMessage(`Retry failed: ${err.message}`)
                        })
                        .finally(() => setIsLoading(false))
                    }}
                    className="gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
                    disabled={!!isLoading}
                  >
                    🔄 Retry
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className={cn("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 h-9 px-4 py-2 has-[>svg]:px-3")}>
                      <span className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </span>
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className = "border-border shadow-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Medical Note</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogDescription>
                      This action cannot be undone. Are you sure you want to delete this medical note?
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                      <AlertDialogCancel className = "border-destructive-background text-destructive-foreground border-border" disabled={!!isLoading}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleConfirmDelete}
                        disabled={!!isLoading}
                        className="bg-destructive text-white hover:bg-destructive/90"
                      >
                        {isLoading ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
            {saveMessage}
          </div>
        )}

        {/* Error Message */}
        {note.status === 'failed' && note.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
            <p className="font-semibold">Processing Failed</p>
            <p className="text-sm mt-1">{note.error}</p>
          </div>
        )}

        {/* Version History Section */}
        {showVersionHistory && (
          <Card className="mb-6 bg-card border-border drop-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Edit History</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingVersions ? (
                <div className="flex items-center gap-2">
                  <Spinner className="size-4" />
                  <p className="text-muted-foreground">Loading versions...</p>
                </div>
              ) : versions.length === 0 ? (
                <p className="text-muted-foreground">No previous versions</p>
              ) : (
                <div className="space-y-4">
                  {versions.map((version, idx) => (
                    <div key={version.id} className="border-l-2 border-border pl-4 pb-4">
                      <p className="text-sm font-semibold text-foreground">
                        Version {versions.length - idx}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Edited: {formatDateTime(version.editedAt)}
                      </p>
                      <details className="mt-2 text-xs">
                        <summary className="cursor-pointer font-medium">View snapshot</summary>
                        <pre className="mt-2 bg-muted p-2 rounded overflow-auto max-h-48">
                          {JSON.stringify(version.snapshot, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="space-y-6 max-w-4xl">
          {/* Patient and Session Info */}
          <Card className="bg-card border-border drop-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Session Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MedicalField
                label="Patient Name"
                value={isEditing ? editData.patientName : note.patientName}
                isEditing={isEditing}
                onChange={(value) => handleFieldChange("patientName", value)}
              />
              <MedicalField
                label="Age"
                value={isEditing ? editData.age : note.age}
                isEditing={isEditing}
                onChange={(value) => handleFieldChange("age", value)}
              />
              <MedicalField
                label="Created"
                value={formatDateTime(note.createdAt)}
                isEditing={false}
              />
              <MedicalField
                label="Status"
                value={getStatusDisplay(note.status)}
                isEditing={false}
              />
            </CardContent>
          </Card>

          {/* Chief Complaint and Diagnosis */}
          <Card className="bg-card border-border drop-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Chief Complaint
                </label>
                {isEditing ? (
                  <Input
                    value={editData.chiefComplaint || ""}
                    onChange={(e) => handleFieldChange("chiefComplaint", e.target.value)}
                    className="bg-input"
                    placeholder="Chief Complaint"
                  />
                ) : (
                  <div className="text-sm font-medium text-foreground">{note.chiefComplaint}</div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Symptoms
                </label>
                {isEditing ? (
                  <textarea
                    value={editData.symptoms || ""}
                    onChange={(e) => handleFieldChange("symptoms", e.target.value)}
                    placeholder="Describe symptoms"
                    className="w-full min-h-24 p-3 bg-input border border-input rounded-md text-sm font-medium text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                ) : (
                  <div className="text-sm font-medium text-foreground whitespace-pre-wrap">
                    {note.symptoms}
                  </div>
                )}
              </div>
              <MedicalField
                label="Diagnosis"
                value={isEditing ? editData.diagnosis : note.diagnosis}
                isEditing={isEditing}
                onChange={(value) => handleFieldChange("diagnosis", value)}
              />
            </CardContent>
          </Card>

          {/* Medical History */}
          <Card className="bg-card border-border drop-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Medical History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Previous Diagnosis
                </label>
                {isEditing ? (
                  <Input
                    value={editData.previousDiagnosis || ""}
                    onChange={(e) => handleFieldChange("previousDiagnosis", e.target.value)}
                    className="bg-input"
                    placeholder="Previous diagnosis"
                  />
                ) : (
                  <div className="text-sm font-medium text-foreground">
                    {displayValue(note.previousDiagnosis)}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Previous Medications
                </label>
                {isEditing ? (
                  <Input
                    value={editData.previousMedications || ""}
                    onChange={(e) => handleFieldChange("previousMedications", e.target.value)}
                    className="bg-input"
                    placeholder="Previous medications"
                  />
                ) : (
                  <div className="text-sm font-medium text-foreground">
                    {displayValue(note.previousMedications)}
                  </div>
                )}
              </div>
              <MedicalField
                label="Allergies"
                value={isEditing ? editData.allergies : note.allergies}
                isEditing={isEditing}
                onChange={(value) => handleFieldChange("allergies", value)}
              />
            </CardContent>
          </Card>

          {/* Vital Signs */}
          <Card className="bg-card border-border drop-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Vital Signs</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <MedicalField
                label="Blood Pressure (mmHg)"
                value={isEditing ? editData.bloodPressure : note.bloodPressure}
                isEditing={isEditing}
                onChange={(value) => handleFieldChange("bloodPressure", value)}
              />
              <MedicalField
                label="Heart Rate (bpm)"
                value={isEditing ? editData.heartRate : note.heartRate}
                isEditing={isEditing}
                onChange={(value) => handleFieldChange("heartRate", value)}
              />
              <MedicalField
                label="Temperature (°C)"
                value={isEditing ? editData.temperature : note.temperature}
                isEditing={isEditing}
                onChange={(value) => handleFieldChange("temperature", value)}
              />
            </CardContent>
          </Card>

          {/* Current Medications */}
          <Card className="bg-card border-border drop-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Current Medications</CardTitle>
            </CardHeader>
            <CardContent>
              <MedicalField
                label="Medications"
                value={isEditing ? editData.medication : note.medication}
                isEditing={isEditing}
                onChange={(value) => handleFieldChange("medication", value)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  } catch (error) {
    console.error("[SessionDetailContent] Render error:", error)
    console.error("[SessionDetailContent] Error stack:", error instanceof Error ? error.stack : "No stack")
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Rendering Error
          </h1>
          <div className="bg-red-100 border border-red-300 rounded p-4 mb-6">
            <p className="text-sm font-semibold text-red-800 mb-2">
              {error instanceof Error ? error.message : String(error)}
            </p>
            {error instanceof Error && error.stack && (
              <pre className="text-xs text-red-700 overflow-auto max-h-40">
                {error.stack}
              </pre>
            )}
          </div>
          <Link href="/sessions">
            <Button className="w-full">Go Back</Button>
          </Link>
        </div>
      </div>
    )
  }
}

