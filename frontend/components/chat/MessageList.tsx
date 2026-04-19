/**
 * HealthSync Chat - Message List Component
 * 
 * Scrollable container for displaying all chat messages.
 * Auto-scrolls to bottom on new messages.
 */

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { Message } from '@/types/chat';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import { TypingIndicator } from './TypingIndicator';
import { MessageSkeleton } from './MessageSkeleton';
import { cn } from '@/lib/utils';
import { Send, Lightbulb } from 'lucide-react';

export interface MessageListProps {
  /** Array of messages to display */
  messages: Message[];
  /** Whether a response is currently streaming */
  isLoading?: boolean;
  /** Callback when user message copy is clicked */
  onCopyMessage?: (content: string) => Promise<void>;
  /** Callback when regenerate is clicked */
  onRegenerate?: (messageId: string) => Promise<void>;
  /** Callback when delete is clicked */
  onDeleteMessage?: (messageId: string) => void;
  /** Custom CSS class name */
  className?: string;
  /** Show timestamp on messages */
  showTimestamps?: boolean;
}

/**
 * Message list component
 * 
 * Features:
 * - Scrollable container with auto-scroll to bottom
 * - Renders both user and assistant messages
 * - Shows typing indicator during streaming
 * - Responsive layout
 * - Dark/light mode support
 */
export function MessageList({
  messages,
  isLoading = false,
  onCopyMessage,
  onRegenerate,
  onDeleteMessage,
  className,
  showTimestamps = true,
}: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or loading state change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Scroll to bottom on mount
  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  // Handle scroll events (optional future enhancement: "New message" indicator)
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isNearBottom = scrollHeight - (scrollTop + clientHeight) < 100;
      // Could set state here to show "scroll down" button if not near bottom
    }
  }, []);

  // Empty state
  if (messages.length === 0 && !isLoading) {
    return (
      <div
        className={cn(
          'flex-1 flex items-center justify-center px-4 py-8',
          className
        )}
      >
        <div className="text-center max-w-sm">
          {/* Icon */}
          <div className="mb-4 flex justify-center">
            <div className="p-3 rounded-full bg-teal-50 dark:bg-teal-500/10">
              <Lightbulb className="w-8 h-8 text-teal-600 dark:text-teal-400" />
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-2">
            Start a conversation
          </h2>

          {/* Description */}
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Ask questions about the patient's medical history, medications, symptoms, or recent visits.
          </p>

          {/* Suggestion prompts */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
              Try asking:
            </p>
            <div className="space-y-2">
              {[
                "What medications is the patient taking?",
                "What are the recent vital signs?",
                "Any known allergies?",
              ].map((suggestion, i) => (
                <div
                  key={i}
                  className="text-sm px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/50"
                >
                  <Send className="inline-block w-3 h-3 mr-2 text-teal-500" />
                  {suggestion}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className={cn(
        'flex-1 overflow-y-auto scroll-smooth',
        'space-y-4 px-4 py-6',
        'max-w-3xl mx-auto w-full',
        className
      )}
    >
      {/* Messages */}
      {messages.map((message, index) => (
        <div
          key={message.id}
          className={cn(
            'flex w-full gap-3',
            message.role === 'user' ? 'justify-end' : 'justify-start'
          )}
        >
          {message.role === 'user' ? (
            <UserMessage
              content={message.content}
              timestamp={message.timestamp}
              onCopy={onCopyMessage ? () => onCopyMessage(message.content) : undefined}
              onDelete={onDeleteMessage ? () => onDeleteMessage(message.id) : undefined}
            />
          ) : (
            <AssistantMessage
              content={message.content}
              citations={message.citations || []}
              timestamp={message.timestamp}
              confidence={message.confidence}
              tokensUsed={message.tokensUsed}
              onCopy={onCopyMessage ? () => onCopyMessage(message.content) : undefined}
              onRegenerate={onRegenerate ? () => onRegenerate(message.id) : undefined}
              isLoading={isLoading && index === messages.length - 1}
            />
          )}
        </div>
      ))}

      {/* Loading state - show skeleton instead of typing indicator */}
      {isLoading && (
        <div className="flex w-full gap-3">
          {/* Message skeleton with typing indicator inside */}
          <div className="flex-1 max-w-md rounded-2xl px-4 py-3 bg-slate-50 dark:bg-slate-800/50">
            <TypingIndicator />
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}

/**
 * Message list display name for debugging
 */
MessageList.displayName = 'MessageList';
