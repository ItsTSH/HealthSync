/**
 * HealthSync Chat - Chat Input Component
 * 
 * Auto-expanding textarea with send button.
 * Handles Enter to send, Shift+Enter for new lines.
 */

'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ChatInputProps {
  /** Current input value */
  value: string;
  /** Callback when input value changes */
  onChange: (value: string) => void;
  /** Callback when send is clicked/Enter pressed */
  onSend: (message: string) => Promise<void>;
  /** Whether input should be disabled */
  disabled?: boolean;
  /** Whether a request is in progress */
  isLoading?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Max message length */
  maxLength?: number;
  /** Custom CSS class name */
  className?: string;
}

/**
 * Chat input component
 * 
 * Features:
 * - Auto-expanding textarea (min 60px, max 150px)
 * - Send button with loading state
 * - Enter to send, Shift+Enter for new line
 * - Disabled state when loading or value is empty
 * - Character counter (optional)
 */
export function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
  isLoading = false,
  placeholder = "Ask about this patient's medication history...",
  maxLength = 2000,
  className,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isSending, setIsSending] = useState(false);

  // Auto-expand textarea on input
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(
        textareaRef.current.scrollHeight,
        150
      ).toString() + 'px';
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      value.trim()
    ) {
      e.preventDefault();
      handleSend();
    }
    // Shift+Enter creates new line (default behavior)
  };

  const handleSend = async () => {
    if (!value.trim() || disabled || isLoading || isSending) {
      return;
    }

    setIsSending(true);
    try {
      await onSend(value.trim());
      onChange(''); // Clear input after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = '60px'; // Reset height
      }
    } finally {
      setIsSending(false);
    }
  };

  const isDisabled = disabled || isLoading || isSending || !value.trim();

  return (
    <div
      className={cn(
        'sticky bottom-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 rounded-t-xl',
        'shadow-lg shadow-slate-200/50 dark:shadow-slate-950/50',
        className
      )}
    >
      {/* Input container with flex layout */}
      <div className="flex gap-3 items-end max-w-3xl mx-auto">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled || isLoading}
          className={cn(
            'flex-1 resize-none px-4 py-3 border rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900',
            'bg-white dark:bg-slate-800',
            'text-slate-900 dark:text-slate-50',
            'border-slate-300 dark:border-slate-700',
            'placeholder-slate-400 dark:placeholder-slate-500',
            'font-sans text-base leading-relaxed',
            'transition-all duration-200',
            disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-400 dark:hover:border-slate-600'
          )}
          style={{
            minHeight: '60px',
            maxHeight: '150px',
            height: 'auto',
          }}
        />

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={isDisabled}
          size="lg"
          className={cn(
            'h-12 w-12 p-0 rounded-full transition-all duration-200 flex-shrink-0',
            'touch-target-48', // Ensure 48x48 minimum for touch
            isDisabled
              ? 'opacity-50 cursor-not-allowed'
              : 'bg-teal-600 dark:bg-teal-500 hover:bg-teal-700 dark:hover:bg-teal-600 active:scale-95 shadow-md hover:shadow-lg'
          )}
          aria-label="Send message"
        >
          {isSending || isLoading ? (
            <div className="animate-spin">
              <Send className="w-5 h-5" />
            </div>
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Help text and character counter */}
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-4">
        <span className="transition-colors">
          Shift + Enter for new line, Enter to send
        </span>
        {maxLength && (
          <span className={cn(
            'transition-colors',
            value.length > maxLength * 0.9 && 'text-orange-500 font-medium'
          )}>
            {value.length} / {maxLength}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Chat input display name for debugging
 */
ChatInput.displayName = 'ChatInput';
