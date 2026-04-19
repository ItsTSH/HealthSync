/**
 * HealthSync Chat - Message Actions Component
 * 
 * Action buttons that appear on hover over messages.
 * Supports: Copy, Delete, Regenerate (assistant only)
 */

'use client';

import React from 'react';
import { Copy, Trash2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface MessageActionsProps {
  /** Message role: user or assistant */
  role: 'user' | 'assistant';
  /** Callback when copy is clicked */
  onCopy?: (e: React.MouseEvent) => Promise<void>;
  /** Callback when delete is clicked */
  onDelete?: (e: React.MouseEvent) => void;
  /** Callback when regenerate is clicked (assistant only) */
  onRegenerate?: (e: React.MouseEvent) => Promise<void>;
  /** Whether action is in loading state */
  isLoading?: boolean;
  /** Custom CSS class name */
  className?: string;
}

/**
 * Message actions component
 * 
 * Shows action buttons that appear on hover.
 * - Copy: Copies message text to clipboard
 * - Delete: Removes message from conversation
 * - Regenerate: Re-sends query (assistant messages only)
 */
export function MessageActions({
  role,
  onCopy,
  onDelete,
  onRegenerate,
  isLoading = false,
  className,
}: MessageActionsProps) {
  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex gap-1 flex-nowrap',
          className
        )}
      >
        {/* Copy action */}
        {onCopy && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCopy}
                disabled={isLoading}
                className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                aria-label="Copy message"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy message</TooltipContent>
          </Tooltip>
        )}

        {/* Regenerate action (assistant only) */}
        {role === 'assistant' && onRegenerate && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRegenerate}
                disabled={isLoading}
                className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                aria-label="Regenerate response"
              >
                <RotateCw className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Regenerate response</TooltipContent>
          </Tooltip>
        )}

        {/* Delete action */}
        {onDelete && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                disabled={isLoading}
                className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600"
                aria-label="Delete message"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete message</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

/**
 * Message actions display name for debugging
 */
MessageActions.displayName = 'MessageActions';
