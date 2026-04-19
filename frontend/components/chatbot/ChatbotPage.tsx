"use client"

import { useState, useRef, useEffect } from "react"
import {
  ChatInput,
  ChatMessage,
  MessageContent,
  MessageGroup,
  ChatBubble,
} from "@llamaindex/chat-ui"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/AuthContext"
import { usePatientContext } from "@/components/patients/PatientContext"
import { toast } from "sonner"
import { Loader2, AlertCircle, Check, Copy, RefreshCw } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import axios from "axios"
import {
  ErrorType,
  parseAPIError,
  isRetryableError,
  getErrorMessage,
} from "@/lib/errorHandling"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: Citation[]
  confidence?: number
  timestamp: Date
}

interface Citation {
  chunk_id: string
  note_id: string
  section: string
  timestamp: string
  score: number
}

interface StreamEvent {
  type: "metadata" | "token" | "completion" | "error"
  token?: string
  citations?: Citation[]
  retrieval_count?: number
  answer?: string
  confidence?: number
  tokens_used?: number
  processing_time_ms?: number
  error?: string
  message?: string
}

export function ChatbotPage() {
  const { session } = useAuth()
  const { patients } = usePatientContext()
  const [selectedPatient, setSelectedPatient] = useState<any>(patients[0] || null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentStreamAnswer, setCurrentStreamAnswer] = useState("")
  const [currentCitations, setCurrentCitations] = useState<Citation[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [canRetry, setCanRetry] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null)
  const [currentConfidence, setCurrentConfidence] = useState(0)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight
    }
  }

  // Update selectedPatient when patients change
  useEffect(() => {
    if (patients.length > 0 && !selectedPatient) {
      setSelectedPatient(patients[0])
    }
  }, [patients, selectedPatient])

  useEffect(() => {
    scrollTimeoutRef.current = setTimeout(scrollToBottom, 100)
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [messages, currentStreamAnswer])

  const handleSendMessage = async (text: string, _retryCount = 0) => {
    if (!text.trim() || !selectedPatient) {
      toast.error("Please select a patient and enter a message")
      return
    }

    // Max 2 retries
    if (_retryCount > 1) {
      const errorMsg =
        "Failed to get response after multiple attempts. Please try again later."
      setError(errorMsg)
      toast.error(errorMsg)
      setCanRetry(false)
      return
    }

    // Add user message (only on first attempt)
    if (_retryCount === 0) {
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setLastFailedMessage(text)
    }

    setInputValue("")
    setIsLoading(true)
    setError(null)
    setCanRetry(false)
    setRetryCount(_retryCount)
    setCurrentStreamAnswer("")
    setCurrentCitations([])
    setCurrentConfidence(0)

    try {
      // Validate API URL
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      if (!session?.access_token) {
        throw new Error(
          "Authentication token not available. Please log in again."
        )
      }

      // Make API request with proper error handling
      let response: Response
      try {
        response = await fetch(`${apiUrl}/search/rag-stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            query: text,
            patient_id: selectedPatient.id,
            top_k: 5,
          }),
          signal: AbortSignal.timeout(60000), // 60 second timeout
        })
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === "AbortError") {
            throw new Error("Request timed out. Please try again.")
          }
          if (err.message.includes("fetch")) {
            throw new Error(
              "Network error. Please check your connection and try again."
            )
          }
        }
        throw err
      }

      if (!response.ok) {
        let errorData: any
        try {
          errorData = await response.json()
        } catch {
          errorData = { detail: `HTTP ${response.status} error` }
        }

        const appError = parseAPIError(response, errorData)
        const errorMsg = appError.details || appError.message

        if (isRetryableError(appError) && _retryCount < 1) {
          setCanRetry(true)
          setError(`${errorMsg}. Retrying...`)
          toast.loading("Retrying request...")
          setTimeout(() => {
            handleSendMessage(text, _retryCount + 1)
          }, 1000)
          return
        }

        throw new Error(errorMsg)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let streamAssistantMessage: Message | null = null
      let hasError = false
      let errorOccurred: Error | null = null

      if (!reader) {
        throw new Error("Response body is not readable")
      }

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")

          // Process all complete lines
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim()
            if (!line) continue

            try {
              const event: StreamEvent = JSON.parse(line)

              switch (event.type) {
                case "metadata":
                  setCurrentCitations(event.citations || [])
                  break

                case "token":
                  setCurrentStreamAnswer((prev) => prev + (event.token || ""))
                  break

                case "completion":
                  if (!streamAssistantMessage) {
                    streamAssistantMessage = {
                      id: `msg-${Date.now()}-assistant`,
                      role: "assistant",
                      content: event.answer || currentStreamAnswer,
                      citations: currentCitations,
                      confidence: event.confidence,
                      timestamp: new Date(),
                    }
                    setMessages((prev) => [...prev, streamAssistantMessage!])
                  } else {
                    streamAssistantMessage.content =
                      event.answer || currentStreamAnswer
                    streamAssistantMessage.confidence = event.confidence
                    setMessages((prev) => [...prev])
                  }
                  setCurrentConfidence(event.confidence || 0)

                  // Save chat to recent chats
                  saveRecentChat(text, event.answer || currentStreamAnswer)
                  break

                case "error":
                  hasError = true
                  errorOccurred = new Error(
                    event.message || `${event.error}: An error occurred`
                  )
                  break
              }
            } catch (parseError) {
              if (parseError instanceof SyntaxError) {
                console.warn("Failed to parse JSON:", line)
              } else {
                throw parseError
              }
            }
          }

          // Keep incomplete line in buffer
          buffer = lines[lines.length - 1]
        }

        // Check if error occurred during streaming
        if (hasError && errorOccurred) {
          throw errorOccurred
        }
      } catch (streamError) {
        reader.cancel()
        throw streamError
      }

      // Add final assistant message if not already added
      if (!streamAssistantMessage && currentStreamAnswer) {
        const assistantMessage: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content: currentStreamAnswer,
          citations: currentCitations,
          confidence: currentConfidence,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])

        // Save chat to recent chats
        saveRecentChat(text, currentStreamAnswer)
      }

      toast.success("Response received successfully")
      setLastFailedMessage(null)
    } catch (err) {
      const errorMessage = getErrorMessage(err)
      setError(errorMessage)
      
      // Determine if we can retry
      if (
        errorMessage.includes("timeout") ||
        errorMessage.includes("network")
      ) {
        setCanRetry(_retryCount < 1)
      }

      toast.error(errorMessage)
      console.error("Chat error:", err)
    } finally {
      setIsLoading(false)
      setCurrentStreamAnswer("")
    }
  }

  const handleRetry = () => {
    if (lastFailedMessage) {
      handleSendMessage(lastFailedMessage, retryCount + 1)
    }
  }

  const saveRecentChat = (query: string, response: string) => {
    try {
      const chatTitle = query.substring(0, 40) + (query.length > 40 ? "..." : "")
      const chatId = `chat-${Date.now()}`
      
      const newChat = {
        id: chatId,
        title: chatTitle,
        query: query,
        patientId: selectedPatient?.id,
        patientName: selectedPatient?.name,
        timestamp: new Date().toISOString(),
      }

      const stored = localStorage.getItem("recent_chats")
      const chats = stored ? JSON.parse(stored) : []
      
      // Add new chat to the beginning
      const updated = [newChat, ...chats].slice(0, 10) // Keep last 10 chats
      localStorage.setItem("recent_chats", JSON.stringify(updated))
    } catch (error) {
      console.error("Error saving recent chat:", error)
    }
  }

  if (!selectedPatient) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md border-border shadow-md">
          <div className="p-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              No Patient Selected
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Please select a patient from the sidebar to start the conversation.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] w-full max-w-6xl mx-auto gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Medical Assistant
          </h1>
          <p className="text-sm text-muted-foreground">
            Ask questions about {selectedPatient.name}'s medical records
          </p>
        </div>
      </div>

      {/* Messages Container */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto space-y-4 pb-4 px-2"
      >
        {messages.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-4">💬</div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Start a conversation
            </h2>
            <p className="text-muted-foreground max-w-sm">
              Ask questions about medical history, diagnoses, medications, and
              more. The AI will search through medical records to provide
              accurate answers with citations.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-lg rounded-lg p-4 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground border border-border"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>

              {/* Citations */}
              {message.citations && message.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs font-semibold mb-2 opacity-70">
                    Sources:
                  </p>
                  <div className="space-y-1">
                    {message.citations.map((citation, idx) => (
                      <div
                        key={`${citation.chunk_id}-${idx}`}
                        className="text-xs p-2 bg-background/50 rounded border border-border/30"
                      >
                        <div className="font-medium">{citation.section}</div>
                        <div className="opacity-70">
                          Note: {citation.note_id}
                        </div>
                        {citation.score && (
                          <div className="opacity-50 text-xs mt-1">
                            Relevance: {(citation.score * 100).toFixed(0)}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence & Metadata */}
              {message.role === "assistant" && message.confidence && (
                <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
                  <Check className="h-3 w-3" />
                  Confidence: {(message.confidence * 100).toFixed(0)}%
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming response in progress */}
        {isLoading && currentStreamAnswer && (
          <div className="flex justify-start">
            <div className="max-w-lg rounded-lg p-4 bg-secondary text-foreground border border-border">
              <p className="text-sm whitespace-pre-wrap">{currentStreamAnswer}</p>
              <Loader2 className="h-4 w-4 animate-spin mt-2" />
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && !currentStreamAnswer && (
          <div className="flex justify-start">
            <div className="max-w-lg rounded-lg p-4 bg-secondary text-foreground border border-dashed border-border">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-sm">Searching medical records...</p>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex justify-start mb-4">
            <div className="max-w-lg rounded-lg p-4 bg-destructive/10 text-destructive border border-destructive/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">Error</p>
                  <p className="text-sm mt-1">{error}</p>
                  {canRetry && (
                    <Button
                      onClick={handleRetry}
                      variant="outline"
                      size="sm"
                      className="mt-2 gap-2"
                      disabled={isLoading}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border pt-4 px-2">
        <div className="flex gap-2">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !isLoading) {
                e.preventDefault()
                handleSendMessage(inputValue)
              }
            }}
            placeholder="Ask about medical records... (Shift+Enter for new line)"
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button
            onClick={() => handleSendMessage(inputValue)}
            disabled={isLoading || !inputValue.trim()}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Send"
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
