"use client"

import { useParams } from "next/navigation"
import { ChatbotPage } from "@/components/chatbot/ChatbotPage"

export default function ChatDetailPage() {
  const params = useParams()
  const chatId = params?.chat_id as string

  if (!chatId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Invalid chat ID</p>
      </div>
    )
  }

  return <ChatbotPage initialChatId={chatId} />
}
