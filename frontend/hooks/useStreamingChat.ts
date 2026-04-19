/**
 * HealthSync Chat - useStreamingChat Hook
 * 
 * Hook for managing chat message streaming, sending, and display.
 * Works in conjunction with useChat hook for session management.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Message, Citation, StreamEvent } from '@/types/chat';
import { chatClient } from '@/lib/chatClient';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

interface UseStreamingChatState {
  // Message state
  messages: Message[];
  streamingText: string;
  streamingCitations: Citation[];
  
  // UI state
  isLoading: boolean;
  error: Error | null;
  
  // Refs for streaming
  streamingMessageId: string | null;
}

interface UseStreamingChatActions {
  // Message operations
  sendMessage: (content: string, patientId: string, chatId: string) => Promise<void>;
  regenerateMessage: (messageId: string, userQuery: string, patientId: string, chatId: string) => Promise<void>;
  deleteMessage: (messageId: string) => void;
  copyMessage: (content: string) => Promise<void>;
  
  // State management
  setMessages: (messages: Message[]) => void;
  clearError: () => void;
  resetChat: () => void;
}

interface UseStreamingChatReturn extends UseStreamingChatState, UseStreamingChatActions {}

/**
 * Hook for managing streaming chat messages
 * 
 * Handles:
 * - Sending messages with streaming response
 * - Managing message list and UI state
 * - Regenerating responses
 * - Deleting messages
 * - Copying to clipboard
 * 
 * @returns Object with chat state and action methods
 * 
 * @example
 * const { messages, sendMessage, isLoading } = useStreamingChat();
 * 
 * async function handleSend(text: string) {
 *   await sendMessage(text, patientId, chatId);
 * }
 */
export function useStreamingChat(): UseStreamingChatReturn {
  // Message state
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [streamingCitations, setStreamingCitations] = useState<Citation[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Refs for tracking
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUserQueryRef = useRef<string>('');

  /**
   * Add message to conversation
   */
  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  /**
   * Update message in conversation
   */
  const updateMessage = useCallback(
    (messageId: string, updates: Partial<Message>) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        )
      );
    },
    []
  );

  /**
   * Send message with streaming response
   */
  const sendMessage = useCallback(
    async (content: string, patientId: string, chatId: string) => {
      if (!content.trim()) {
        setError(new Error('Message cannot be empty'));
        toast.error('Please enter a message');
        return;
      }

      if (!patientId || !chatId) {
        setError(new Error('Missing patient ID or chat ID'));
        toast.error('Invalid session context');
        return;
      }

      // Store user query for regeneration
      lastUserQueryRef.current = content;

      // Cancel previous request if any
      abortControllerRef.current?.abort();

      // Create and add user message
      const userMessage: Message = {
        id: uuidv4(),
        chatId,
        role: 'user',
        content: content.trim(),
        citations: [],
        timestamp: new Date(),
        status: 'sent',
      };

      addMessage(userMessage);
      setIsLoading(true);
      setError(null);
      setStreamingText('');
      setStreamingCitations([]);

      try {
        // Create streaming assistant message
        const assistantMessageId = uuidv4();
        setStreamingMessageId(assistantMessageId);

        const assistantMessage: Message = {
          id: assistantMessageId,
          chatId,
          role: 'assistant',
          content: '',
          citations: [],
          timestamp: new Date(),
          status: 'streaming',
        };

        addMessage(assistantMessage);

        // Send message and process streaming response
        let fullContent = '';
        let citations: Citation[] = [];
        let confidence = 0;
        let tokensUsed = 0;
        let hasError = false;

        for await (const event of chatClient.sendMessageStream(
          content,
          patientId
        )) {
          if (event.type === 'metadata') {
            citations = event.citations || [];
            setStreamingCitations(citations);
          } else if (event.type === 'token') {
            fullContent += event.token;
            setStreamingText(fullContent);
            
            // Update message in real-time
            updateMessage(assistantMessageId, {
              content: fullContent,
            });
          } else if (event.type === 'completion') {
            fullContent = event.answer;
            confidence = event.confidence;
            tokensUsed = event.tokens_used;
            setStreamingText('');

            // Final message update
            updateMessage(assistantMessageId, {
              content: fullContent,
              citations,
              confidence,
              tokensUsed,
              status: 'complete' as const,
            });
          } else if (event.type === 'error') {
            hasError = true;
            throw new Error(event.error || 'Streaming error occurred');
          }
        }

        setStreamingMessageId(null);
        toast.success('Response received');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to send message';
        
        setError(new Error(errorMessage));
        
        // Mark assistant message as error
        if (streamingMessageId) {
          updateMessage(streamingMessageId, {
            status: 'error' as const,
            error: errorMessage,
            content: streamingText || '(No response generated)', // Keep partial content
          });
          setStreamingMessageId(null);
        }

        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
        setStreamingText('');
      }
    },
    [addMessage, updateMessage, streamingMessageId]
  );

  /**
   * Regenerate last assistant message
   */
  const regenerateMessage = useCallback(
    async (messageId: string, userQuery: string, patientId: string, chatId: string) => {
      // Find and delete the assistant message
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      
      // Resend the user query
      await sendMessage(userQuery, patientId, chatId);
    },
    [sendMessage]
  );

  /**
   * Delete a message
   */
  const deleteMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    toast.success('Message deleted');
  }, []);

  /**
   * Copy message to clipboard
   */
  const copyMessage = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Copied to clipboard');
    } catch (err) {
      const errorMsg = 'Failed to copy message';
      setError(new Error(errorMsg));
      toast.error(errorMsg);
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset chat to initial state
   */
  const resetChat = useCallback(() => {
    setMessages([]);
    setStreamingText('');
    setStreamingCitations([]);
    setStreamingMessageId(null);
    setError(null);
    setIsLoading(false);
    lastUserQueryRef.current = '';
    abortControllerRef.current?.abort();
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    // State
    messages,
    streamingText,
    streamingCitations,
    isLoading,
    error,
    streamingMessageId,
    
    // Actions
    sendMessage,
    regenerateMessage,
    deleteMessage,
    copyMessage,
    setMessages,
    clearError,
    resetChat,
  };
}
