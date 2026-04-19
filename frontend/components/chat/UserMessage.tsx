/**
 * HealthSync Chat - User Message Component
 * 
 * Right-aligned message bubble for user messages.
 * Shows message copy and delete actions on hover.
 */

'use client';

import React, { useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { MessageActions } from './MessageActions';
import { formatTime } from '@/lib/messageFormatter';
import { cn } from '@/lib/utils';

export interface UserMessageProps {
  /** Message content text */
  content: string;
  /** Timestamp of the message */
  timestamp: Date;
  /** Optional CSS class name */
  className?: string;
  /** Callback when copy button is clicked */
  onCopy?: (content: string) => Promise<void>;
  /** Callback when delete button is clicked */
  onDelete?: () => void;
  /** Whether message is being edited */
  isEditing?: boolean;
}

/**
 * User message component
 * 
 * Displays user messages with:
 * - Right alignment
 * - Light gray background (respects theme)
 * - Timestamp below message
 * - Copy and delete actions on hover
 */
export function UserMessage({
  content,
  timestamp,
  className,
  onCopy,
  onDelete,
  isEditing = false,
}: UserMessageProps) {
  const [showActions, setShowActions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCopy = async () => {
    setIsLoading(true);
    try {
      await onCopy?.(content);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col items-end"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Message bubble */}
      <MessageBubble
        variant="user"
        showActions={showActions}
        className={className}
        actions={
          <MessageActions
            role="user"
            onCopy={handleCopy}
            onDelete={onDelete}
            isLoading={isLoading}
          />
        }
      >
        {/* Message content */}
        <div className="whitespace-pre-wrap break-words">
          {content}
        </div>
      </MessageBubble>

      {/* Timestamp below message */}
      <div className="mt-1 mr-4 text-xs text-slate-500 dark:text-slate-400">
        {formatTime(timestamp)}
      </div>
    </div>
  );
}

/**
 * User message display name for debugging
 */
UserMessage.displayName = 'UserMessage';
