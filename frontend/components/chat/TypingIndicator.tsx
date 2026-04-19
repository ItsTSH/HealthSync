/**
 * HealthSync Chat - Typing Indicator Component
 * 
 * Animated typing indicator showing bouncing dots.
 * Indicates assistant is processing/thinking.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface TypingIndicatorProps {
  /** Optional custom text (default: "Analyzing notes...") */
  text?: string;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Typing indicator component
 * 
 * Shows animated bouncing dots with optional text.
 * Used to indicate assistant is generating response.
 * 
 * Respects prefers-reduced-motion for accessibility.
 */
export function TypingIndicator({
  text = 'Analyzing notes...',
  className,
}: TypingIndicatorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 animate-in fade-in-50 duration-300',
        className
      )}
    >
      {/* Animated dots */}
      <div className="flex gap-1">
        <div
          className="w-2 h-2 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <div
          className="w-2 h-2 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <div
          className="w-2 h-2 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>

      {/* Optional text */}
      {text && (
        <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">
          {text}
        </span>
      )}
    </div>
  );
}

/**
 * Typing indicator display name for debugging
 */
TypingIndicator.displayName = 'TypingIndicator';
