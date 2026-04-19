"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/AuthContext"
import { toast } from "sonner"
import { Loader2, AlertCircle, Plus, Menu, X, RefreshCw } from "lucide-react"
import { Card } from "@/components/ui/card"
import {
  ErrorType,
  parseAPIError,
  isRetryableError,
  getErrorMessage,
} from "@/lib/errorHandling"

// Import new v4.0 components and hooks
import { useChats } from "@/hooks/useChats"
import { useChat } from "@/hooks/useChat"
import { ChatSidebar } from "./ChatSidebar"
import { QueryCounter } from "./QueryCounter"
import { SystemFeedback } from "./SystemFeedback"
import { AmbiguityResolver } from "./AmbiguityResolver"
import { ChatFullModal } from "./ChatFullModal"

// Interfaces
interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: Citation[]
  confidence?: number
  queried_patients?: QueriedPatient[]
  timestamp: Date
}

interface Citation {
  chunk_id: string
  note_id: string
  section: string
  timestamp: string
  score: number
}

interface QueriedPatient {
  name: string
  patient_id: string
  confidence: number
  match_type: "exact" | "fuzzy" | "pronoun_resolution"
}

interface StreamEvent {
  type:
    | "metadata"
    | "token"
    | "completion"
    | "error"
    | "ambiguity"
    | "chat_full"
  token?: string
  citations?: Citation[]
  retrieval_count?: number
  reranked_count?: number
  query_type?: string
  is_multi_patient?: boolean
  queried_patients?: QueriedPatient[]
  match_type?: string
  matches?: QueriedPatient[]
  chat_status?: {
    query_count: number
    is_full: boolean
    referenced_patient_ids: string[]
  }
  patient_context?: {
    patient_id: string
    confidence: number
  }
  answer?: string
  confidence?: number
  tokens_used?: number
  processing_time_ms?: number
  error?: string
  message?: string
}

interface ChatbotPageProps {
  initialChatId?: string
}

export function ChatbotPage({ initialChatId }: ChatbotPageProps = {}) {
  const { session } = useAuth()

  // Multi-chat state
  const { chats, isLoading: chatsLoading, createChat, deleteChat } = useChats()
  const [currentChatId, setCurrentChatId] = useState<string | null>(initialChatId || null)
  const { chat: currentChat, isLoading: chatLoading, loadChat } = useChat()

  // Messages & streaming
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentStreamAnswer, setCurrentStreamAnswer] = useState("")
  const [currentCitations, setCurrentCitations] = useState<Citation[]>([])
  const [currentQueriedPatients, setCurrentQueriedPatients] = useState<
    QueriedPatient[]
  >([])
  const [currentConfidence, setCurrentConfidence] = useState(0)
  const [systemStatus, setSystemStatus] = useState<string>("idle")

  // v4.0+ states
  const [queryCount, setQueryCount] = useState(0)
  const [showChatFullModal, setShowChatFullModal] = useState(false)
  const [showAmbiguityModal, setShowAmbiguityModal] = useState(false)
  const [ambiguousMatches, setAmbiguousMatches] = useState<QueriedPatient[]>([])
  const [selectedPatientForDisambiguation, setSelectedPatientForDisambiguation] =
    useState<string | null>(null)

  // Error & retry
  const [error, setError] = useState<string | null>(null)
  const [canRetry, setCanRetry] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(
    null
  )

  // UI
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollTimeoutRef.current = setTimeout(scrollToBottom, 100)
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [messages, currentStreamAnswer, scrollToBottom])

  // Load chat when currentChatId changes
  useEffect(() => {
    if (currentChatId) {
      loadChat(currentChatId)
      setMessages([])
      setCurrentStreamAnswer("")
      setCurrentCitations([])
      setCurrentQueriedPatients([])
      setSystemStatus("idle")
    }
  }, [currentChatId, loadChat])

  // Create new chat
  const handleNewChat = async () => {
    const newChat = await createChat("New Chat")
    if (newChat) {
      setCurrentChatId(newChat.id)
      setMessages([])
      setQueryCount(0)
    }
  }

  // Handle ambiguity resolution
  const handleResolveAmbiguity = (patientId: string) => {
    setSelectedPatientForDisambiguation(patientId)
    setShowAmbiguityModal(false)
  }

  // Main send message handler
  const handleSendMessage = async (text: string, _retryCount = 0) => {
    if (!text.trim()) {
      toast.error("Please enter a message")
      return
    }

    if (!currentChatId) {
      const newChat = await createChat()
      if (newChat) {
        setCurrentChatId(newChat.id)
      } else {
        toast.error("Failed to create chat")
        return
      }
    }

    if (queryCount >= 10) {
      setShowChatFullModal(true)
      toast.error("This chat has reached its 10-query limit")
      return
    }

    if (_retryCount > 1) {
      const errorMsg =
        "Failed to get response after multiple attempts. Please try again later."
      setError(errorMsg)
      toast.error(errorMsg)
      setCanRetry(false)
      return
    }

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
    setIsStreaming(true)
    setError(null)
    setCanRetry(false)
    setRetryCount(_retryCount)
    setCurrentStreamAnswer("")
    setCurrentCitations([])
    setCurrentQueriedPatients([])
    setCurrentConfidence(0)
    setSystemStatus("analyzing")

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

      if (!session?.access_token) {
        throw new Error(
          "Authentication token not available. Please log in again."
        )
      }

      let response: Response
      try {
        response = await fetch(`${apiUrl}/search/rag-stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            chat_id: currentChatId,
            query: text,
            patient_id: selectedPatientForDisambiguation || undefined,
            top_k: 5,
          }),
          signal: AbortSignal.timeout(60000),
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

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let streamAssistantMessage: Message | null = null
      let hasError = false
      let errorOccurred: Error | null = null

      if (!reader) {
        throw new Error("Response body is not readable")
      }

      setSystemStatus("retrieving")

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")

          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim()
            if (!line) continue

            try {
              const event: StreamEvent = JSON.parse(line)

              switch (event.type) {
                case "metadata":
                  setSystemStatus("generating")
                  if (event.chat_status) {
                    setQueryCount(event.chat_status.query_count)
                    if (event.chat_status.is_full) {
                      setShowChatFullModal(true)
                    }
                  }
                  setCurrentCitations(event.citations || [])
                  if (event.queried_patients) {
                    setCurrentQueriedPatients(event.queried_patients)
                  }
                  break

                case "ambiguity":
                  setAmbiguousMatches(event.matches || [])
                  setShowAmbiguityModal(true)
                  reader.cancel()
                  setSystemStatus("awaiting_user")
                  toast.info("Please select which patient you meant")
                  return

                case "token":
                  setCurrentStreamAnswer((prev) => prev + (event.token || ""))
                  setSystemStatus("generating")
                  break

                case "completion":
                  setSystemStatus("complete")
                  if (!streamAssistantMessage) {
                    streamAssistantMessage = {
                      id: `msg-${Date.now()}-assistant`,
                      role: "assistant",
                      content: event.answer || currentStreamAnswer,
                      citations: currentCitations,
                      confidence: event.confidence,
                      queried_patients: currentQueriedPatients,
                      timestamp: new Date(),
                    }
                    setMessages((prev) => [...prev, streamAssistantMessage!])
                  } else {
                    streamAssistantMessage.content =
                      event.answer || currentStreamAnswer
                    streamAssistantMessage.confidence = event.confidence
                    streamAssistantMessage.queried_patients =
                      currentQueriedPatients
                    setMessages((prev) => [...prev])
                  }

                  if (event.chat_status) {
                    setQueryCount(event.chat_status.query_count)
                    if (event.chat_status.is_full) {
                      setShowChatFullModal(true)
                    }
                  }
                  setCurrentConfidence(event.confidence || 0)
                  break

                case "chat_full":
                  setShowChatFullModal(true)
                  break

                case "error":
                  if (event.error === "CHAT_FULL") {
                    setShowChatFullModal(true)
                  } else {
                    hasError = true
                    errorOccurred = new Error(
                      event.message || `${event.error}: An error occurred`
                    )
                  }
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

          buffer = lines[lines.length - 1]
        }

        if (hasError && errorOccurred) {
          throw errorOccurred
        }
      } catch (streamError) {
        reader.cancel()
        throw streamError
      }

      if (!streamAssistantMessage && currentStreamAnswer) {
        const assistantMessage: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content: currentStreamAnswer,
          citations: currentCitations,
          confidence: currentConfidence,
          queried_patients: currentQueriedPatients,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      }

      toast.success("Response received successfully")
      setLastFailedMessage(null)
      setSystemStatus("idle")
    } catch (err) {
      const errorMessage = getErrorMessage(err)
      setError(errorMessage)

      if (
        errorMessage.includes("timeout") ||
        errorMessage.includes("network")
      ) {
        setCanRetry(_retryCount < 1)
      }

      toast.error(errorMessage)
      console.error("Chat error:", err)
      setSystemStatus("error")
    } finally {
      setIsStreaming(false)
      setCurrentStreamAnswer("")
    }
  }

  const handleRetry = () => {
    if (lastFailedMessage) {
      handleSendMessage(lastFailedMessage, retryCount + 1)
    }
  }

  if (!currentChatId) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center gap-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Welcome to HealthSync</h2>
          <p className="text-muted-foreground mb-6">
            Create a new chat to get started
          </p>
          <Button size="lg" onClick={handleNewChat} disabled={chatsLoading}>
            <Plus className="w-4 h-4 mr-2" />
            Create New Chat
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full gap-0 overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } transition-all duration-300 border-r border-border flex-shrink-0 overflow-hidden`}
      >
        <ChatSidebar
          chats={chats}
          selectedChatId={currentChatId}
          onSelectChat={setCurrentChatId}
          onDeleteChat={deleteChat}
          isLoading={chatsLoading}
          onCreateChat={handleNewChat}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border p-4 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden"
            >
              {sidebarOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </Button>
            <div>
              <h1 className="font-semibold text-foreground">
                {currentChat?.title || "Chat"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {currentChat?.title || "Loading..."}
              </p>
            </div>
          </div>

          {/* Query Counter */}
          <div className="flex items-center gap-4">
            <QueryCounter queryCount={queryCount} isFull={queryCount >= 10} verbose={false} />
          </div>
        </div>

        {/* Messages Container */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto space-y-4 p-4 bg-background"
        >
          {messages.length === 0 && !error && systemStatus === "idle" && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-4xl mb-4">💬</div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Start a conversation
              </h2>
              <p className="text-muted-foreground max-w-sm">
                Ask questions about medical records, diagnoses, medications, and
                more
              </p>
            </div>
          )}

          {/* System Feedback */}
          {systemStatus !== "idle" && systemStatus !== "complete" && (
            <SystemFeedback
              type="loading"
              message={`${systemStatus.charAt(0).toUpperCase()}${systemStatus.slice(1).replace(/_/g, " ")}...`}
            />
          )}

          {error && (
            <SystemFeedback
              type="error"
              message={error}
              onDismiss={() => setError(null)}
            />
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-2">
              {msg.role === "user" ? (
                <div className="flex justify-end w-full">
                  <Card className="max-w-xl bg-primary text-primary-foreground rounded-lg">
                    <div className="p-3">{msg.content}</div>
                  </Card>
                </div>
              ) : (
                <div className="flex justify-start w-full">
                  <div className="max-w-xl">
                    <Card className="bg-muted rounded-lg">
                      <div className="p-3">{msg.content}</div>
                    </Card>

                    {/* Citations */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground space-y-1 ml-2">
                        <div className="font-semibold">Sources:</div>
                        {msg.citations.map((cite, i) => (
                          <div key={i} className="truncate">
                            • {cite.section} (confidence: {(cite.score * 100).toFixed(0)}%)
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Queried Patients */}
                    {msg.queried_patients && msg.queried_patients.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground ml-2">
                        <div className="font-semibold">Patients:</div>
                        {msg.queried_patients.map((p, i) => (
                          <div key={i} className="truncate">
                            • {p.name} ({(p.confidence * 100).toFixed(0)}%)
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Confidence */}
                    {msg.confidence !== undefined && (
                      <div className="mt-2 text-xs text-muted-foreground ml-2">
                        Confidence: {(msg.confidence * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Current streaming answer */}
          {isStreaming && currentStreamAnswer && (
            <div className="flex justify-start w-full">
              <div className="max-w-xl">
                <Card className="bg-muted rounded-lg animate-pulse">
                  <div className="p-3">{currentStreamAnswer}</div>
                </Card>
              </div>
            </div>
          )}

          {isStreaming && !currentStreamAnswer && (
            <div className="flex justify-start gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {systemStatus === "analyzing"
                  ? "Analyzing your question..."
                  : systemStatus === "retrieving"
                    ? "Retrieving relevant information..."
                    : systemStatus === "generating"
                      ? "Generating response..."
                      : "Processing..."}
              </p>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-border p-4 bg-background">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  handleSendMessage(inputValue)
                }
              }}
              placeholder="Ask a question about medical records..."
              disabled={isStreaming || queryCount >= 10}
              className="flex-1 px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              onClick={() => handleSendMessage(inputValue)}
              disabled={isStreaming || !inputValue.trim() || queryCount >= 10}
              size="sm"
            >
              {isStreaming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send"
              )}
            </Button>

            {canRetry && (
              <Button
                onClick={handleRetry}
                disabled={isStreaming}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>

          {queryCount >= 10 && (
            <div className="mt-2 p-2 bg-destructive/10 text-destructive text-sm rounded">
              This chat has reached its 10-query limit. Create a new chat to continue.
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AmbiguityResolver
        isOpen={showAmbiguityModal}
        matches={ambiguousMatches}
        onSelect={handleResolveAmbiguity}
        onCancel={() => {
          setShowAmbiguityModal(false)
          setSystemStatus("idle")
        }}
      />

      <ChatFullModal
        isOpen={showChatFullModal}
        onClose={() => setShowChatFullModal(false)}
        onNewChat={handleNewChat}
        near_full={queryCount >= 8 && queryCount < 10}
      />
    </div>
  )
}

