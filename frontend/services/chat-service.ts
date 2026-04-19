/**
 * Chat Service - Example usage of API Client
 * 
 * Shows how to call the backend /chats endpoints
 */

import { apiGet, apiPost, apiDelete, APIError } from "@/lib/api-client";

export interface Chat {
  id: string;
  user_id: string;
  patient_id: string;
  title: string;
  description?: string;
  query_count: number;
  status: "active" | "archived" | "closed";
  created_at: string;
  updated_at: string;
}

export interface ChatCreateRequest {
  patient_id: string;
  title: string;
  description?: string;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, any>;
  tokens_used?: number;
  confidence?: number;
  citations?: any[];
  created_at: string;
}

export class ChatService {
  /**
   * List all chats for current user
   */
  static async listChats(): Promise<Chat[]> {
    try {
      const response = await apiGet<{ chats: Chat[] }>("/chats");
      return response.chats;
    } catch (error) {
      if (error instanceof APIError && error.status === 401) {
        throw new Error("Authentication required. Please log in.");
      }
      throw error;
    }
  }

  /**
   * Get specific chat with details
   */
  static async getChat(chatId: string): Promise<Chat> {
    try {
      return await apiGet<Chat>(`/chats/${chatId}`);
    } catch (error) {
      if (error instanceof APIError && error.status === 404) {
        throw new Error("Chat not found.");
      }
      throw error;
    }
  }

  /**
   * Create new chat for a patient
   */
  static async createChat(request: ChatCreateRequest): Promise<Chat> {
    try {
      return await apiPost<Chat>("/chats", request);
    } catch (error) {
      if (error instanceof APIError && error.status === 400) {
        throw new Error("Invalid chat creation data. Check patient_id exists.");
      }
      throw error;
    }
  }

  /**
   * Get chat messages
   */
  static async getChatMessages(chatId: string): Promise<ChatMessage[]> {
    try {
      return await apiGet<ChatMessage[]>(`/chats/${chatId}/messages`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send message to chat (with RAG)
   */
  static async sendMessage(
    chatId: string,
    message: string,
    onToken?: (token: string) => void
  ): Promise<ChatMessage> {
    try {
      // For streaming responses, use fetch directly
      const token = localStorage.getItem("sb-access-token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/chats/${chatId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({ content: message }),
        }
      );

      if (!response.ok) {
        throw new APIError(response.status, "Failed to send message");
      }

      // Handle streaming NDJSON response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullResponse = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const data = JSON.parse(line);

              if (data.type === "token" && onToken) {
                onToken(data.token);
                fullResponse += data.token;
              } else if (data.type === "completion") {
                return data as ChatMessage;
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      throw new Error("Stream ended without completion");
    } catch (error) {
      throw error;
    }
  }

  /**
   * Archive chat
   */
  static async archiveChat(chatId: string): Promise<Chat> {
    try {
      return await apiPost<Chat>(`/chats/${chatId}/archive`, { status: "archived" });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete chat
   */
  static async deleteChat(chatId: string): Promise<void> {
    try {
      await apiDelete(`/chats/${chatId}`);
    } catch (error) {
      throw error;
    }
  }
}
