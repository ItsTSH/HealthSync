/**
 * HealthSync Chat - Chat Container Component
 * 
 * Main chat interface combining header, message list, and input.
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Chat, Message } from '@/types/chat';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface ChatContainerProps {
  /** Current chat data (title, patient info) */
  chat?: Chat;
  /** Patient ID for context */
  patientId?: string;
  /** Optional chat ID for existing conversations */
  chatId?: string;
  /** Whether this is a new chat */
  isNew?: boolean;
  /** Callback when chat is created */
  onChatCreated?: (chat: Chat) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Custom CSS class name */
  className?: string;
}

/**
 * Chat container component
 * 
 * Features:
 * - Combines ChatHeader, MessageList, ChatInput
 * - Manages streaming chat state via useStreamingChat hook
 * - Handles message sending, regeneration, deletion
 * - Full keyboard support
 * - Error handling with toast notifications
 * - Responsive layout
 */
export function ChatContainer({
  chat,
  patientId,
  chatId,
  isNew = false,
  onChatCreated,
  onError,
  className,
}: ChatContainerProps) {
  const {
    messages,
    streamingText,
    streamingCitations,
    isLoading,
    error,
    sendMessage,
    regenerateMessage,
    deleteMessage,
  } = useStreamingChat();

  const [inputValue, setInputValue] = useState('');
  const [showHeaderDropdown, setShowHeaderDropdown] = useState(false);

  // Show error toast if error occurs
  useEffect(() => {
    if (error) {
      toast.error(error.message || 'An error occurred');
      onError?.(error);
    }
  }, [error, onError]);

  // Handle sending message
  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) return;

      try {
        // Clear input optimistically
        setInputValue('');

        // Send message with chatId and patientId
        await sendMessage(message, patientId || '', chatId || '');

        // Success toast
        toast.success('Message sent');
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to send message');
        toast.error(error.message);
      }
    },
    [sendMessage, patientId]
  );

  // Handle message copy
  const handleCopyMessage = useCallback(
    async (content: string) => {
      try {
        await navigator.clipboard.writeText(content);
        toast.success('Copied to clipboard');
      } catch {
        toast.error('Failed to copy');
      }
    },
    []
  );

  // Handle message delete
  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      deleteMessage(messageId);
      toast.success('Message deleted');
    },
    [deleteMessage]
  );

  // Handle regenerate message
  const handleRegenerateMessage = useCallback(
    async (messageId: string) => {
      try {
        // Find the assistant message being regenerated
        const messageIndex = messages.findIndex((m) => m.id === messageId);
        if (messageIndex <= 0) {
          toast.error('Cannot regenerate: user message not found');
          return;
        }

        // Get the user message that prompted this response
        const userMessage = messages[messageIndex - 1];
        if (!userMessage || userMessage.role !== 'user') {
          toast.error('Cannot find user message');
          return;
        }

        // Regenerate with correct parameters
        await regenerateMessage(
          messageId,
          userMessage.content,
          patientId || '',
          chatId || ''
        );
        toast.success('Regenerating response...');
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to regenerate');
        toast.error(error.message);
      }
    },
    [messages, patientId, chatId, regenerateMessage]
  );

  // Calculate chat title
  const chatTitle = isNew
    ? 'New Chat'
    : chat?.title || patientId?.slice(0, 8) || 'Chat';

  // Calculate subtitle (patient info)
  const chatSubtitle = chat?.title ? patientId?.slice(0, 8) : undefined;

  // Build current messages with streaming
  const displayMessages = [
    ...messages,
    ...(streamingText && !isLoading
      ? [
          {
            id: 'streaming-' + Date.now(),
            role: 'assistant',
            content: streamingText,
            citations: streamingCitations || [],
            timestamp: new Date(),
            status: 'streaming',
          } as Message,
        ]
      : []),
  ];

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-white dark:bg-slate-900',
        'rounded-lg overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <ChatHeader
        title={chatTitle}
        subtitle={chatSubtitle}
        isNew={isNew}
        chatId={chatId}
        showDropdown={showHeaderDropdown}
        onClick={() => setShowHeaderDropdown(!showHeaderDropdown)}
      />

      {/* Message List */}
      <MessageList
        messages={displayMessages}
        isLoading={isLoading}
        onCopyMessage={handleCopyMessage}
        onRegenerate={handleRegenerateMessage}
        onDeleteMessage={handleDeleteMessage}
        showTimestamps={true}
      />

      {/* Chat Input */}
      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSendMessage}
        disabled={isLoading}
        isLoading={isLoading}
        placeholder="Ask about this patient's medication history..."
        maxLength={2000}
      />
    </div>
  );
}

/**
 * Chat container display name for debugging
 */
ChatContainer.displayName = 'ChatContainer';
