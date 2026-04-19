/**
 * Example: Using ChatService in a component
 * 
 * This shows how to:
 * 1. Load chats when component mounts
 * 2. Handle loading/error states
 * 3. Use the API client in React hooks
 */

"use client";

import { useEffect, useState } from "react";
import { ChatService, Chat } from "@/services/chat-service";
import { APIError } from "@/lib/api-client";

export default function ChatsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load chats on mount
  useEffect(() => {
    loadChats();
  }, []);

  async function loadChats() {
    try {
      setLoading(true);
      setError(null);
      const data = await ChatService.listChats();
      setChats(data);
    } catch (err) {
      if (err instanceof APIError) {
        setError(`Error: ${err.message}`);
      } else {
        setError("Failed to load chats");
      }
      console.error("Failed to load chats:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-4">Loading chats...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  if (chats.length === 0) {
    return <div className="p-4">No chats yet. Create one to get started!</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Your Chats</h1>
      <div className="space-y-2">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className="p-3 border rounded hover:bg-gray-50 cursor-pointer"
          >
            <h3 className="font-semibold">{chat.title}</h3>
            <p className="text-sm text-gray-600">
              {chat.query_count} queries • {new Date(chat.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
