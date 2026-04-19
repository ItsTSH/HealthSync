/**
 * HealthSync Chat - Chat Header Component
 * 
 * Sticky header displaying chat information.
 */

'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChatHeaderProps {
  /** Chat title or patient name */
  title: string;
  /** Optional subtitle or patient ID */
  subtitle?: string;
  /** Whether chat is a new conversation */
  isNew?: boolean;
  /** Optional chat ID for identification */
  chatId?: string;
  /** Callback when header is clicked */
  onClick?: () => void;
  /** Whether dropdown is visible */
  showDropdown?: boolean;
  /** Custom CSS class name */
  className?: string;
}

/**
 * Chat header component
 * 
 * Features:
 * - Sticky positioning at top
 * - Teal gradient background
 * - Displays chat title and optional subtitle
 * - Optional dropdown indicator
 * - Responsive padding
 */
export function ChatHeader({
  title,
  subtitle,
  isNew = false,
  chatId,
  onClick,
  showDropdown = false,
  className,
}: ChatHeaderProps) {
  return (
    <div
      className={cn(
        'sticky top-0 z-40 border-b border-slate-200 dark:border-slate-700',
        'bg-gradient-to-r from-teal-50 to-teal-25 dark:from-slate-800 dark:to-slate-900',
        'px-4 sm:px-6 py-3 sm:py-4',
        onClick && 'cursor-pointer hover:bg-opacity-80 transition-colors',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {/* Title and subtitle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {/* Title */}
            <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-50 truncate">
              {isNew ? 'New Chat' : title}
            </h1>

            {/* New badge */}
            {isNew && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-100 dark:bg-teal-900 rounded-full text-xs font-medium text-teal-700 dark:text-teal-200">
                New
              </span>
            )}
          </div>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Dropdown indicator */}
        {showDropdown && (
          <div className="ml-4 flex items-center">
            <ChevronDown
              className={cn(
                'w-5 h-5 text-slate-400 transition-transform duration-200',
                showDropdown && 'rotate-180'
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Chat header display name for debugging
 */
ChatHeader.displayName = 'ChatHeader';
