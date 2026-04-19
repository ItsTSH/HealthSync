/**
 * HealthSync Chat - Assistant Message Component
 * 
 * Left-aligned message bubble for assistant responses.
 * Supports markdown rendering and citations.
 */

'use client';

import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageBubble } from './MessageBubble';
import { MessageActions } from './MessageActions';
import { Citation } from '@/types/chat';
import { formatTime } from '@/lib/messageFormatter';
import { cn } from '@/lib/utils';

export interface AssistantMessageProps {
  /** Message content (markdown) */
  content: string;
  /** Array of citations */
  citations: Citation[];
  /** Timestamp of the message */
  timestamp: Date;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Tokens used */
  tokensUsed?: number;
  /** Optional CSS class name */
  className?: string;
  /** Callback when copy button is clicked */
  onCopy?: (content: string) => Promise<void>;
  /** Callback when regenerate button is clicked */
  onRegenerate?: () => Promise<void>;
  /** Whether message is loading */
  isLoading?: boolean;
}

/**
 * Custom markdown components for rendering
 */
const markdownComponents: Record<string, any> = {
  p: ({ children }: any) => (
    <p className="mb-2 last:mb-0">{children}</p>
  ),
  ul: ({ children }: any) => (
    <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
  ),
  li: ({ children }: any) => (
    <li className="mb-1">{children}</li>
  ),
  code: ({ inline, children }: any) =>
    inline ? (
      <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    ) : (
      <code className="block bg-slate-900 dark:bg-slate-950 text-slate-50 p-3 rounded mb-2 overflow-x-auto font-mono text-sm">
        {children}
      </code>
    ),
  a: ({ href, children }: any) => (
    <a
      href={href}
      className="text-teal-600 dark:text-teal-400 hover:underline"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-teal-400 pl-3 italic text-slate-600 dark:text-slate-400 mb-2">
      {children}
    </blockquote>
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }: any) => (
    <em className="italic">{children}</em>
  ),
};

/**
 * Assistant message component
 * 
 * Displays assistant responses with:
 * - Left alignment
 * - Markdown rendering
 * - Citation display
 * - Copy and regenerate actions on hover
 * - Confidence and token usage info
 */
export function AssistantMessage({
  content,
  citations,
  timestamp,
  confidence,
  tokensUsed,
  className,
  onCopy,
  onRegenerate,
  isLoading = false,
}: AssistantMessageProps) {
  const [showActions, setShowActions] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleCopy = async () => {
    setIsCopying(true);
    try {
      await onCopy?.(content);
    } finally {
      setIsCopying(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await onRegenerate?.();
    } finally {
      setIsRegenerating(false);
    }
  };

  // Render citations as inline links in markdown
  const contentWithCitations = useMemo(() => {
    let rendered = content;
    citations.forEach((citation, index) => {
      const pattern = new RegExp(`\\[${index + 1}\\]\\s+${citation.text}`, 'g');
      const link = `[${index + 1}. ${citation.text}](${citation.url || '#'})`;
      rendered = rendered.replace(pattern, link);
    });
    return rendered;
  }, [content, citations]);

  return (
    <div
      className="flex flex-col items-start"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Message bubble */}
      <MessageBubble
        variant="assistant"
        showActions={showActions}
        className={className}
        actions={
          <MessageActions
            role="assistant"
            onCopy={handleCopy}
            onRegenerate={handleRegenerate}
            isLoading={isCopying || isRegenerating || isLoading}
          />
        }
      >
        {/* Markdown content */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {contentWithCitations}
          </ReactMarkdown>
        </div>
      </MessageBubble>

      {/* Timestamp and metadata below message */}
      <div className="mt-2 ml-4 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span>{formatTime(timestamp)}</span>

        {/* Confidence score */}
        {confidence !== undefined && (
          <span className="inline-flex items-center gap-1">
            <span className="text-teal-600 dark:text-teal-400">
              Confidence: {(confidence * 100).toFixed(0)}%
            </span>
          </span>
        )}

        {/* Token usage */}
        {tokensUsed !== undefined && (
          <span className="text-slate-400">
            ({tokensUsed} tokens)
          </span>
        )}
      </div>

      {/* Citations display with improved styling */}
      {citations.length > 0 && (
        <div className="mt-3 ml-4 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2 w-full max-w-md">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
            Sources ({citations.length})
          </div>
          {citations.map((citation, index) => (
            <a
              key={citation.id}
              href={citation.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex items-start gap-2 p-2.5 rounded-lg',
                'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700',
                'hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-teal-300 dark:hover:border-teal-600',
                'transition-colors duration-200',
                'group'
              )}
            >
              {/* Citation number badge */}
              <div className="flex-shrink-0 mt-0.5">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-teal-100 dark:bg-teal-500/20 text-xs font-medium text-teal-700 dark:text-teal-400 group-hover:bg-teal-200 dark:group-hover:bg-teal-500/30 transition-colors">
                  {index + 1}
                </span>
              </div>

              {/* Citation text and section */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-2">
                  {citation.text}
                </p>
                {citation.section && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {citation.section}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Assistant message display name for debugging
 */
AssistantMessage.displayName = 'AssistantMessage';
