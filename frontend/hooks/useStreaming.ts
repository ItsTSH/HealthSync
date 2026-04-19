/**
 * HealthSync Chat - useStreaming Hook
 * 
 * Hook for parsing and managing streaming NDJSON responses.
 * Handles token batching, citation extraction, and error management.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { StreamEvent, Citation, isTokenEvent, isMetadataEvent, isCompletionEvent, isErrorEvent } from '@/types/chat';

/**
 * Streaming state
 */
interface StreamingState {
  /** Accumulated text from tokens */
  text: string;
  /** Extracted citations */
  citations: Citation[];
  /** Whether streaming is complete */
  isComplete: boolean;
  /** Final answer (from completion event) */
  answer: string | null;
  /** Confidence score */
  confidence: number;
  /** Tokens used */
  tokensUsed: number;
  /** Any error that occurred */
  error: Error | null;
}

/**
 * Hook for managing streaming responses
 * 
 * Handles:
 * - Token batching for smooth rendering (50ms intervals)
 * - Citation extraction from metadata
 * - Completion event processing
 * - Error handling
 * - Performance optimization
 * 
 * @param options - Configuration options
 * @returns Streaming state object
 * 
 * @example
 * const streaming = useStreaming({
 *   batchInterval: 50,
 *   onUpdate: (state) => console.log('Streaming update:', state.text)
 * });
 * 
 * for await (const event of response.stream) {
 *   streaming.processEvent(event);
 * }
 */
export function useStreaming(options: {
  batchInterval?: number;
  onUpdate?: (state: StreamingState) => void;
  onComplete?: (state: StreamingState) => void;
  onError?: (error: Error) => void;
} = {}) {
  const {
    batchInterval = 50,
    onUpdate,
    onComplete,
    onError,
  } = options;

  // State
  const [text, setText] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  // Refs for batching
  const batchedTokensRef = useRef<string[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  /**
   * Flush batched tokens to state
   */
  const flushBatch = useCallback(() => {
    if (batchedTokensRef.current.length === 0) return;

    const batchedText = batchedTokensRef.current.join('');
    batchedTokensRef.current = [];

    setText((prev) => {
      const newText = prev + batchedText;

      const newState: StreamingState = {
        text: newText,
        citations,
        isComplete,
        answer,
        confidence,
        tokensUsed,
        error,
      };

      onUpdate?.(newState);
      return newText;
    });

    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
  }, [citations, isComplete, answer, confidence, tokensUsed, error, onUpdate]);

  /**
   * Process streaming event
   */
  const processEvent = useCallback(
    (event: StreamEvent) => {
      if (isMetadataEvent(event)) {
        // Extract citations from metadata
        const extractedCitations = (event.citations || []).map((citation, index) => ({
          id: String(index + 1),
          text: citation.text || 'Reference',
          noteId: citation.noteId || (citation as any).note_id,
          section: citation.section,
          similarity: citation.similarity,
          url: citation.url,
        }));

        setCitations(extractedCitations);

        const newState: StreamingState = {
          text,
          citations: extractedCitations,
          isComplete,
          answer,
          confidence,
          tokensUsed,
          error,
        };

        onUpdate?.(newState);
      } else if (isTokenEvent(event)) {
        // Batch tokens for performance
        batchedTokensRef.current.push(event.token);

        // Set timeout to flush batch
        if (!batchTimeoutRef.current) {
          batchTimeoutRef.current = setTimeout(flushBatch, batchInterval);
        }
      } else if (isCompletionEvent(event)) {
        // Flush remaining tokens
        flushBatch();

        // Set completion state
        setText(event.answer);
        setAnswer(event.answer);
        setConfidence(event.confidence);
        setTokensUsed(event.tokens_used);
        setIsComplete(true);

        const finalState: StreamingState = {
          text: event.answer,
          citations,
          isComplete: true,
          answer: event.answer,
          confidence: event.confidence,
          tokensUsed: event.tokens_used,
          error: null,
        };

        onUpdate?.(finalState);
        onComplete?.(finalState);
      } else if (isErrorEvent(event)) {
        // Handle error
        const err = new Error(event.error || 'Streaming error');
        setError(err);
        setIsComplete(true);

        const errorState: StreamingState = {
          text,
          citations,
          isComplete: true,
          answer: null,
          confidence: 0,
          tokensUsed: 0,
          error: err,
        };

        onUpdate?.(errorState);
        onError?.(err);
      }
    },
    [text, citations, isComplete, answer, confidence, tokensUsed, batchInterval, flushBatch, onUpdate, onComplete, onError]
  );

  /**
   * Reset streaming state
   */
  const reset = useCallback(() => {
    setText('');
    setCitations([]);
    setIsComplete(false);
    setAnswer(null);
    setConfidence(0);
    setTokensUsed(0);
    setError(null);
    batchedTokensRef.current = [];
    
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    text,
    citations,
    isComplete,
    answer,
    confidence,
    tokensUsed,
    error,
    
    // Methods
    processEvent,
    reset,
    flushBatch,
  };
}

/**
 * Utility hook for processing a stream of events
 * Handles all event parsing automatically
 * 
 * @param eventSource - AsyncIterable of stream events
 * @param options - Configuration options (same as useStreaming)
 * @returns Streaming state and methods
 * 
 * @example
 * const streaming = useStreamProcessor(eventIterable, { onComplete: handleDone });
 * 
 * return (
 *   <div>
 *     <p>{streaming.text}</p>
 *     {streaming.citations.map((c) => <Citation key={c.id} citation={c} />)}
 *   </div>
 * );
 */
export function useStreamProcessor(
  eventSource: AsyncIterable<StreamEvent> | null,
  options?: Parameters<typeof useStreaming>[0]
) {
  const streaming = useStreaming(options);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!eventSource || isProcessingRef.current) return;

    isProcessingRef.current = true;

    const processStream = async () => {
      try {
        for await (const event of eventSource) {
          streaming.processEvent(event);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        streaming.processEvent({
          type: 'error',
          error: error.message,
        });
      } finally {
        isProcessingRef.current = false;
      }
    };

    processStream();
  }, [eventSource, streaming]);

  return streaming;
}
