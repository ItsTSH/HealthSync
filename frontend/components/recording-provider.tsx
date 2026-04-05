"use client"

import axios from "axios"
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Mic, Pause, Play, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { LiveWaveform } from "@/components/ui/live-waveform"
import { MicSelector } from "@/components/ui/mic-selector"
import { Separator } from "@/components/ui/separator"
import { MedicalMetadataForm } from "@/components/MedicalMetadataForm"
import {
  MedicalMetadata,
  emptyMedicalMetadata,
} from "@/lib/medicalMetadata"
import { createNote, processNoteWithAI } from "@/lib/supabase-services"
import { getAuthHeaders } from "@/lib/api-auth"

type RecordingState = "idle" | "loading" | "recording" | "recorded" | "playing" | "processing" | "metadata"

interface RecordProviderProps {
  onMetadataStateChange?: (isShowingMetadata: boolean) => void
}

export default function RecordProvider({ onMetadataStateChange }: RecordProviderProps) {
  const router = useRouter()
  const [selectedDevice, setSelectedDevice] = useState<string>("")
  const [isMuted, setIsMuted] = useState(false)
  const [state, setState] = useState<RecordingState>("idle")
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [metadata, setMetadata] = useState<MedicalMetadata>(emptyMedicalMetadata)
  const [isSubmittingMetadata, setIsSubmittingMetadata] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioElementRef = useRef<HTMLAudioElement | null>(null)

  const startRecording = useCallback(async () => {
    try {
      setState("loading")

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedDevice ? { deviceId: { exact: selectedDevice } } : true,
      })

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        setAudioBlob(blob)
        stream.getTracks().forEach((track) => track.stop())
        setState("recorded")
      }

      mediaRecorder.start()
      setState("recording")
    } catch (error) {
      console.error("Error starting recording:", error)
      setState("idle")
    }
  }, [selectedDevice])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === "recording") {
      mediaRecorderRef.current.stop()
    }
  }, [state])

  const playRecording = useCallback(() => {
    if (!audioBlob) return

    const audio = new Audio(URL.createObjectURL(audioBlob))
    audioElementRef.current = audio

    audio.onended = () => {
      setState("recorded")
    }

    audio.play()
    setState("playing")
  }, [audioBlob])

  const pausePlayback = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      setState("recorded")
    }
  }, [])

  const confirmRecording = useCallback(async () => {
    if (!audioBlob) {
      return
    }

    setIsUploading(true)
    setState("processing")

    try {
      const fileName = `recording-${Date.now()}.webm`
      const file = new File([audioBlob], fileName, {
        type: audioBlob.type || "audio/webm",
      })

      const formData = new FormData()
      formData.append("audio_file", file)

      // Get auth headers for protected endpoint
      const authHeaders = await getAuthHeaders()
      
      if (!authHeaders.Authorization) {
        console.error('[RecordingProvider] No authorization header - user may not be authenticated')
        throw new Error('User is not authenticated. Please log in first.')
      }

      console.log('[RecordingProvider] Sending authHeaders:', Object.keys(authHeaders))

      const response = await axios.post("http://localhost:8000/transcribe/", formData, {
        headers: {
          ...authHeaders,
          // DO NOT set Content-Type for FormData - let axios handle it
        },
      })

      console.log("Upload successful", response.data)
      
      // Extract metadata from response (nested in extractedMetadata)
      const responseData = response.data.extractedMetadata || response.data
      const extractedMetadata: MedicalMetadata = {
        patientName: responseData.patientName || "",
        age: responseData.age || "",
        gender: responseData.gender || "",
        chiefComplaint: responseData.chiefComplaint || "",
        symptoms: responseData.symptoms || "",
        previousDiagnosis: responseData.previousDiagnosis || "",
        previousMedications: responseData.previousMedications || "",
        bloodPressure: responseData.bloodPressure || "",
        heartRate: responseData.heartRate || "",
        temperature: responseData.temperature || "",
        allergies: responseData.allergies || "",
        medication: responseData.medication || "",
        diagnosis: responseData.diagnosis || "",
      }

      setMetadata(extractedMetadata)
      setState("metadata")
      onMetadataStateChange?.(true)
    } catch (error) {
      console.error("Failed to upload recording", error)
      
      // Better error logging
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          console.error('[RecordingProvider] Authentication failed (401):', error.response?.data)
          alert('Authentication failed. Please log in again.')
        } else if (error.response) {
          console.error(`[RecordingProvider] Server error (${error.response.status}):`, error.response.data)
          alert(`Error: ${error.response.data?.detail || 'Failed to upload recording'}`)
        } else if (error.request) {
          console.error('[RecordingProvider] No response from server:', error.request)
          alert('Failed to connect to server')
        }
      }
      
      setState("recorded")
    } finally {
      setIsUploading(false)
    }
  }, [audioBlob])

  const restart = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current = null
    }
    setAudioBlob(null)
    audioChunksRef.current = []
    setState("idle")
  }, [])

  const handleConfirmMetadata = useCallback(async (confirmedMetadata: MedicalMetadata) => {
    setIsSubmittingMetadata(true)

    try {
      // Convert MedicalMetadata to note data
      // Handle age conversion (could be string or number from form)
      const age = typeof confirmedMetadata.age === 'string' 
        ? parseInt(confirmedMetadata.age, 10) 
        : confirmedMetadata.age
      
      if (isNaN(age)) {
        throw new Error('Age must be a valid number')
      }

      // Helper function to convert string to number or null
      const toNumberOrNull = (value: string | number): number | null => {
        if (value === "" || value === null || value === undefined) return null
        const num = typeof value === 'string' ? parseInt(value, 10) : value
        return isNaN(num) ? null : num
      }

      const noteData = {
        patientName: confirmedMetadata.patientName,
        age: age,
        gender: confirmedMetadata.gender,
        chiefComplaint: confirmedMetadata.chiefComplaint,
        symptoms: confirmedMetadata.symptoms,
        previousDiagnosis: confirmedMetadata.previousDiagnosis || null,
        previousMedications: confirmedMetadata.previousMedications || null,
        bloodPressure: toNumberOrNull(confirmedMetadata.bloodPressure),
        heartRate: toNumberOrNull(confirmedMetadata.heartRate),
        temperature: toNumberOrNull(confirmedMetadata.temperature),
        allergies: confirmedMetadata.allergies || null,
        medication: confirmedMetadata.medication || null,
        diagnosis: confirmedMetadata.diagnosis || null,
      }

      console.log('[RecordingProvider] Creating note in Supabase:', noteData)

      // STEP 1: Create note in Supabase
      const createdNote = await createNote(noteData)
      console.log('[RecordingProvider] Note created with ID:', createdNote.id)

      // STEP 2: Call FastAPI for AI processing
      try {
        await processNoteWithAI(createdNote.id)
        console.log('[RecordingProvider] AI processing initiated for note:', createdNote.id)
      } catch (aiError) {
        console.error('[RecordingProvider] AI processing failed, but note was created:', aiError)
        // Continue - note is saved even if AI processing fails
      }

      // STEP 3: Reset state and redirect
      setState("idle")
      setAudioBlob(null)
      setMetadata(emptyMedicalMetadata)
      onMetadataStateChange?.(false)

      // Redirect to the newly created session
      router.push(`/sessions/${createdNote.id}`)
    } catch (error) {
      console.error('[RecordingProvider] Failed to confirm metadata:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to save metadata: ${errorMessage}`)
      setState("recorded")
    } finally {
      setIsSubmittingMetadata(false)
    }
  }, [onMetadataStateChange, router])

  const handleDeleteMetadata = useCallback(() => {
    // Go back to recording screen
    setState("recorded")
    setMetadata(emptyMedicalMetadata)
    onMetadataStateChange?.(false)
  }, [onMetadataStateChange])

  // Stop recording when muted
  useEffect(() => {
    if (isMuted && state === "recording") {
      stopRecording()
    }
  }, [isMuted, state, stopRecording])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop()
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause()
      }
    }
  }, [])

  const getHeaderText = (state: RecordingState) => {
  switch (state) {
    case "idle":
      return "Prepare to Record"
    case "loading":
      return "Initializing Microphone…"
    case "recording":
      return "Recording in Progress"
    case "recorded":
      return "Review Recording"
    case "playing":
      return "Playing Recording"
    case "processing":
      return "Processing Audio…"
    case "metadata":
      return "Review Recording"
    default:
      return "Recorder"
  }
}

  const showWaveform = state === "recording" && !isMuted
  const showProcessing = state === "loading" || state === "playing" || state === "processing"
  const showRecorded = state === "recorded"

  // If we're in metadata state, show the form instead of recording interface
  if (state === "metadata") {
    return (
      <MedicalMetadataForm
        data={metadata}
        onConfirm={handleConfirmMetadata}
        onDelete={handleDeleteMetadata}
        isSubmitting={isSubmittingMetadata}
      />
    )
  }

  return (
      <Card className="w-full border-border shadow-lg flex min-h-[200px] justify-center p-4">
        <CardHeader className="text-center justify-center py-5">
            <CardTitle className="text-3xl font-semibold">
                {getHeaderText(state)}
            </CardTitle>
            <CardDescription className="text-md text-muted-foreground">
                {state === "idle" && "Select a microphone and start when ready"}
                {state === "recording" && "Speak clearly — audio is being captured"}
                {state === "recorded" && "Play back or confirm the recording"}
                {state === "playing" && "Listening to the recorded audio"}
                {state === "processing" && "Extracting medical information from the recording…"}
            </CardDescription>
        </CardHeader>

        <div className="flex items-center justify-center gap-2 p-2 border-border shadow-md mb-3">
          <div className="flex-1 h-[50vh] w-[120px] min-w-0 md:h-[50vh] md:w-[900px]">
            <div
              className={cn(
                "flex h-full items-center gap-2 rounded-md py-1",
                "bg-foreground/5 text-foreground/70"
              )}
            >
              <div className="h-full flex-1">
                <div className="relative flex h-full shrink-0 items-center justify-center overflow-hidden rounded-sm">
                  <LiveWaveform
                    key={state}
                    active={showWaveform}
                    processing={showProcessing}
                    deviceId={selectedDevice}
                    barWidth={8}
                    barGap={4}
                    barRadius={4}
                    fadeEdges={true}
                    fadeWidth={24}
                    sensitivity={1.8}
                    smoothingTimeConstant={0.85}
                    //height={20}
                    mode="static"
                    className={cn(
                      "h-full transition-opacity duration-300 w-full",
                      state === "idle" && "opacity-0"
                    )}
                  />
                  {state === "idle" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-foreground/50 text-xl font-medium">
                        Start Recording
                      </span>
                    </div>
                  )}
                  {showRecorded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-foreground/50 text-xl font-medium">
                        Ready to Play
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-4 shrink-0 ml-2">
            {/* Mic Selector */}
            <MicSelector
                value={selectedDevice}
                onValueChange={setSelectedDevice}
                muted={isMuted}
                onMutedChange={setIsMuted}
                disabled={!!(state === "recording" || state === "loading")}
            />

            {/* Primary Controls */}
            <div className="flex items-center gap-3">
                {/* Record / Play / Pause */}
                {state === "idle" && (
                <Button
                    variant="outline"
                    onClick={startRecording}
                    disabled={!!isMuted}
                    className="flex items-center gap-2 border-border shadow-md"
                >
                    <Mic className="h-4 w-4" />
                    Record
                </Button>
                )}

                {(state === "loading" || state === "recording") && (
                <Button
                    variant="outline"
                    onClick={stopRecording}
                    disabled={!!(state === "loading")}
                    className="flex items-center gap-2 border-border shadow-md"
                >
                    <Pause className="h-4 w-4" />
                    Stop
                </Button>
                )}

                {showRecorded && (
                <Button
                    variant="outline"
                    onClick={playRecording}
                    className="flex items-center gap-2 border-border shadow-md"
                >
                    <Play className="h-4 w-4" />
                    Play
                </Button>
                )}

                {state === "playing" && (
                <Button
                    variant="outline"
                    onClick={pausePlayback}
                    className="flex items-center gap-2 border-border shadow-md"
                >
                    <Pause className="h-4 w-4" />
                    Pause
                </Button>
                )}

                {/* Trash */}
                <Button
                variant="outline"
                onClick={restart}
                disabled={!!(
                    state === "idle" || state === "loading" || state === "recording" || state === "processing"
                )}
                className="flex items-center gap-2 text-destructive border-destructive shadow-md hover:bg-destructive hover:text-destructive-foreground"
                >
                <Trash2 className="h-4 w-4" />
                Delete
                </Button>
            </div>

            {/* Confirm Button */}
            {showRecorded && (
                <Button
                variant="default"
                onClick={confirmRecording}
                disabled={!!isUploading}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                {isUploading ? "Uploading..." : "Confirm Recording"}
                </Button>
            )}
          </div>
        </div>
      </Card>
  )
}