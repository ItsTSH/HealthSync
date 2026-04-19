/**
 * HealthSync Chat - Base Message Bubble Component
 * 
 * Reusable message bubble component with theming support.
 * Variants: user (right-aligned), assistant (left-aligned).
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface MessageBubbleProps {
  /** Message content (plain text or markdown) */
  children: React.ReactNode;
  /** Role: user or assistant */
  variant: 'user' | 'assistant';
  /** Optional CSS class name */
  className?: string;
  /** Custom styling */
  style?: React.CSSProperties;
  /** Optional actions to display on hover */
  actions?: React.ReactNode;
  /** Whether actions are visible */
  showActions?: boolean;
}

/**
 * Base message bubble component
 * 
 * Provides styling and layout for chat messages.
 * Variants handle alignment and background colors.
 */
export function MessageBubble({
  children,
  variant,
  className,
  style,
  actions,
  showActions = false,
}: MessageBubbleProps) {
  return (
    <div
      className={cn(
        'flex gap-2',
        'animate-in fade-in-50 slide-in-from-bottom-2 duration-300',
        variant === 'user' ? 'flex-row-reverse justify-start' : 'flex-row justify-start'
      )}
    >
      {/* Message bubble container */}
      <div
        className={cn(
          'flex-1 max-w-md rounded-2xl px-4 py-3 text-base leading-relaxed',
          'transition-all duration-200 ease-out',
          variant === 'user'
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-sm hover:shadow-md'
            : 'bg-transparent text-slate-900 dark:text-slate-50 hover:bg-slate-50/30 dark:hover:bg-slate-800/20 hover:shadow-sm',
          className
        )}
        style={style}
      >
        {children}
      </div>

      {/* Message actions (appears on hover) */}
      {actions && showActions && (
        <div className="flex items-end pb-1 animate-in fade-in-50 duration-200">
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * Message bubble display name for debugging
 */
MessageBubble.displayName = 'MessageBubble';
