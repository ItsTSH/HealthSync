/**
 * HealthSync Chat - Message Skeleton Loader
 * 
 * Shows loading state while message is streaming.
 * Used in empty state and during streaming.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface MessageSkeletonProps {
  /** Whether skeleton is for assistant message (left) or user (right) */
  variant?: 'user' | 'assistant';
  /** Custom CSS class name */
  className?: string;
  /** Number of skeleton lines to show */
  lineCount?: number;
}

/**
 * Message skeleton component for loading states
 * 
 * Displays animated placeholder while message loads.
 * Matches styling of actual message bubbles.
 */
export function MessageSkeleton({
  variant = 'assistant',
  className,
  lineCount = 2,
}: MessageSkeletonProps) {
  const isUser = variant === 'user';

  return (
    <div
      className={cn(
        'flex gap-2 animate-in fade-in-50 duration-300',
        isUser ? 'flex-row-reverse justify-start' : 'flex-row justify-start'
      )}
    >
      {/* Skeleton bubble container */}
      <div
        className={cn(
          'flex-1 max-w-md rounded-2xl px-4 py-3 space-y-2',
          isUser
            ? 'bg-slate-100 dark:bg-slate-800'
            : 'bg-slate-50 dark:bg-slate-800/50',
          className
        )}
      >
        {/* Skeleton lines with pulsing animation */}
        {Array.from({ length: lineCount }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-4 rounded animate-pulse',
              'bg-slate-200 dark:bg-slate-700',
              i === lineCount - 1 ? 'w-2/3' : 'w-full'
            )}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Batch skeleton loader (multiple messages)
 */
export function MessageSkeletonBatch({
  count = 1,
  variant = 'assistant',
  className,
}: {
  count?: number;
  variant?: 'user' | 'assistant';
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <MessageSkeleton
          key={i}
          variant={i % 2 === 0 ? 'assistant' : 'user'}
          lineCount={Math.floor(Math.random() * 2) + 2}
        />
      ))}
    </div>
  );
}

/**
 * Display name for debugging
 */
MessageSkeleton.displayName = 'MessageSkeleton';
MessageSkeletonBatch.displayName = 'MessageSkeletonBatch';
