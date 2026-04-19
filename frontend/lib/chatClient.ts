/**
 * HealthSync Chat - API Client
 * 
 * Handles all API communication with the backend for chat operations.
 * Supports both streaming and non-streaming requests.
 */

import { StreamEvent, SendMessageRequest, ChatResponse } from '@/types/chat';

/**
 * Configuration for API client
 */
interface ChatClientConfig {
  /** Base URL for API (default: http://localhost:8000) */
  apiBaseUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Chat API Client
 * 
 * Provides methods for sending messages with streaming support,
 * managing chat history, and handling API errors gracefully.
 */
export class ChatClient {
  private apiBaseUrl: string;
  private timeout: number;
  private debug: boolean;
  private authToken: string | null = null;

  constructor(config: ChatClientConfig = {}) {
    this.apiBaseUrl = config.apiBaseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    this.timeout = config.timeout || 30000;
    this.debug = config.debug || false;
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Set authorization token for API requests
   * 
   * @param token - JWT token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Clear authorization token
   */
  clearAuthToken(): void {
    this.authToken = null;
  }

  /**
   * Send message with streaming response
   * 
   * Sends a query to the backend and receives a streaming NDJSON response.
   * Each line is a JSON object representing a streaming event:
   * - metadata: Initial event with citations
   * - token: Individual tokens of the response
   * - completion: Final completion event
   * - error: Error event if something goes wrong
   * 
   * @param query - User's message/query
   * @param patientId - Patient ID to scope query
   * @param topK - Number of top results to retrieve (default: 5)
   * @returns Async iterable of streaming events
   * 
   * @throws Error if network fails, timeout occurs, or auth fails
   * 
   * @example
   * for await (const event of client.sendMessageStream("What medications?", "patient-123")) {
   *   if (event.type === "token") {
   *     console.log(event.token);
   *   }
   * }
   */
  async *sendMessageStream(
    query: string,
    patientId: string,
    topK?: number,
  ): AsyncIterable<StreamEvent> {
    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    if (!patientId || patientId.trim().length === 0) {
      throw new Error('Patient ID is required');
    }

    const requestBody: SendMessageRequest = {
      query: query.trim(),
      patientId,
      topK: topK || 5,
    };

    this.debug && console.log('[ChatClient] Sending stream request:', requestBody);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.apiBaseUrl}/search/rag-stream`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        throw new Error(`API Error: ${response.status} - ${errorData.error || response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is empty');
      }

      // Read streaming response line by line
      yield* this.parseStreamingResponse(response.body);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      throw error;
    }
  }

  /**
   * Send message without streaming (non-streaming endpoint)
   * Used as fallback or for batch operations
   * 
   * @param query - User's message/query
   * @param patientId - Patient ID to scope query
   * @param topK - Number of top results to retrieve
   * @returns Chat response object
   */
  async sendMessage(
    query: string,
    patientId: string,
    topK?: number,
  ): Promise<ChatResponse> {
    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    const requestBody: SendMessageRequest = {
      query: query.trim(),
      patientId,
      topK: topK || 5,
    };

    this.debug && console.log('[ChatClient] Sending non-streaming request:', requestBody);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.apiBaseUrl}/search/rag`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        throw new Error(`API Error: ${response.status} - ${errorData.error}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      throw error;
    }
  }

  /**
   * Load existing chat by ID
   * 
   * @param chatId - Chat ID to load
   * @returns Chat object with messages
   */
  async loadChat(chatId: string): Promise<any> {
    this.debug && console.log('[ChatClient] Loading chat:', chatId);

    try {
      const response = await fetch(`${this.apiBaseUrl}/chats/${chatId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to load chat: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.debug && console.error('[ChatClient] Error loading chat:', error);
      throw error;
    }
  }

  /**
   * Get recent chats for current user
   * 
   * @param limit - Number of recent chats to fetch (default: 5)
   * @returns Array of recent chats
   */
  async getRecentChats(limit: number = 5): Promise<any[]> {
    this.debug && console.log('[ChatClient] Fetching recent chats');

    try {
      const response = await fetch(`${this.apiBaseUrl}/chats/recent?limit=${limit}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch recent chats: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.debug && console.error('[ChatClient] Error fetching recent chats:', error);
      return []; // Return empty array as fallback
    }
  }

  /**
   * Create a new chat
   * 
   * @param patientId - Patient ID for the chat
   * @param title - Chat title (optional)
   * @returns Created chat object
   */
  async createChat(patientId: string, title?: string): Promise<any> {
    this.debug && console.log('[ChatClient] Creating new chat for patient:', patientId);

    try {
      const response = await fetch(`${this.apiBaseUrl}/chats`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          patientId,
          title: title || `Chat - ${new Date().toLocaleDateString()}`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create chat: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.debug && console.error('[ChatClient] Error creating chat:', error);
      throw error;
    }
  }

  /**
   * Delete a chat
   * 
   * @param chatId - Chat ID to delete
   */
  async deleteChat(chatId: string): Promise<void> {
    this.debug && console.log('[ChatClient] Deleting chat:', chatId);

    try {
      const response = await fetch(`${this.apiBaseUrl}/chats/${chatId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete chat: ${response.statusText}`);
      }
    } catch (error) {
      this.debug && console.error('[ChatClient] Error deleting chat:', error);
      throw error;
    }
  }

  /**
   * Parse streaming NDJSON response line by line
   * 
   * NDJSON format: Each line is a JSON object followed by newline
   * Supports both text and binary streams
   * 
   * @param body - ReadableStream from fetch response
   * @yields StreamEvent objects parsed from each line
   * @throws Error if JSON parsing fails
   */
  private async *parseStreamingResponse(body: ReadableStream<Uint8Array>): AsyncIterable<StreamEvent> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim().length === 0) continue; // Skip empty lines

          try {
            const event = JSON.parse(line) as StreamEvent;
            this.debug && console.log('[ChatClient] Received event:', event.type);
            yield event;
          } catch (error) {
            this.debug && console.error('[ChatClient] Failed to parse JSON line:', line, error);
            // Continue processing other lines
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim().length > 0) {
        try {
          const event = JSON.parse(buffer) as StreamEvent;
          this.debug && console.log('[ChatClient] Received final event:', event.type);
          yield event;
        } catch (error) {
          this.debug && console.error('[ChatClient] Failed to parse final buffer:', buffer, error);
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Parse error response from API
   * 
   * @param response - Fetch response object
   * @returns Parsed error data
   */
  private async parseErrorResponse(response: Response): Promise<Record<string, any>> {
    try {
      return await response.json();
    } catch {
      return { error: response.statusText };
    }
  }

  /**
   * Health check to verify API connectivity
   * 
   * @returns true if API is reachable
   */
  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Singleton instance of ChatClient
 * Usage: import { chatClient } from '@/lib/chatClient'
 */
export const chatClient = new ChatClient({
  debug: process.env.NODE_ENV === 'development',
});
