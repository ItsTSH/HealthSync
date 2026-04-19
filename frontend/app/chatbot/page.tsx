"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/AuthContext"
import { useChats } from "@/hooks/useChats"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Plus, ChevronRight } from "lucide-react"

export default function ChatbotRouter() {
  const router = useRouter()
  const { session, loading } = useAuth()
  const { chats, isLoading, error, createChat } = useChats()
  const [isCreating, setIsCreating] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !session) {
      router.push("/login")
    }
  }, [session, loading, router])

  const handleCreateChat = async () => {
    try {
      setIsCreating(true)
      
      // Generate a proper UUID for the patient
      // In production, user would select from patient list
      const patientId = crypto.randomUUID()
      
      const newChat = await createChat("New Chat", patientId)
      if (newChat?.id) {
        router.push(`/chatbot/${newChat.id}`)
      }
    } catch (err) {
      console.error("Failed to create chat:", err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleSelectChat = (chatId: string) => {
    router.push(`/chatbot/${chatId}`)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-card p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold tracking-tight">Medical Chat</h1>
          <p className="text-muted-foreground mt-1">Select a chat or create a new one</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          {/* Create New Chat Button */}
          <div className="mb-8">
            <Button
              onClick={handleCreateChat}
              disabled={isCreating}
              size="lg"
              className="gap-2"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isCreating ? "Creating..." : "New Chat"}
            </Button>
          </div>

          {/* Chats Grid */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Recent Chats</h2>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <p className="text-sm text-destructive">{error}</p>
                </CardContent>
              </Card>
            ) : chats && chats.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {chats.map((chat) => (
                  <Card
                    key={chat.id}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSelectChat(chat.id)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="line-clamp-1 text-base">{chat.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Chat created {new Date(chat.created_at).toLocaleDateString()}</span>
                        <span className="text-xs">Queries: {chat.query_count || 0}/10</span>
                      </div>
                      <div className="mt-3 flex items-center justify-end text-primary">
                        <span className="text-xs mr-1">Open</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-12 text-center">
                  <p className="text-muted-foreground mb-4">No chats yet</p>
                  <Button onClick={handleCreateChat} variant="outline">
                    Create your first chat
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
