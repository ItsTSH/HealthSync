/**
 * HealthSync Chat - Type Definitions
 * 
 * This file contains all TypeScript interfaces and types for the chat system.
 * Includes messages, citations, streaming events, and chat metadata.
 */

/**
 * Message roles in the chat
 */
export type MessageRole = 'user' | 'assistant';

/**
 * Message status in the chat
 */
export type MessageStatus = 'sending' | 'sent' | 'streaming' | 'complete' | 'error' | 'deleted';

/**
 * Citation from retrieved medical notes
 */
export interface Citation {
  /** Unique identifier for the citation */
  id: string;
  /** Display text/title of the citation */
  text: string;
  /** URL to navigate to when clicked */
  url?: string;
  /** Note ID in the database */
  noteId?: string;
  /** Similarity score (0-1) from retrieval */
  similarity?: number;
  /** Section type (e.g., "Chief Complaint", "Medications") */
  section?: string;
}

/**
 * Single message in a chat conversation
 */
export interface Message {
  /** Unique identifier (UUID) */
  id: string;
  /** Chat ID this message belongs to */
  chatId: string;
  /** Message author (user or assistant) */
  role: MessageRole;
  /** Message content (markdown) */
  content: string;
  /** Array of citations referenced in the message */
  citations: Citation[];
  /** When message was created */
  timestamp: Date;
  /** Current status of the message */
  status: MessageStatus;
  /** Confidence score (0-1) for assistant messages */
  confidence?: number;
  /** Number of tokens used (for assistant messages) */
  tokensUsed?: number;
  /** Error message if status is 'error' */
  error?: string;
}

/**
 * Streaming event types from backend NDJSON response
 */
export type StreamEventType = 'metadata' | 'token' | 'completion' | 'error';

/**
 * Streaming metadata event (first event in stream)
 */
export interface StreamMetadataEvent {
  type: 'metadata';
  citations: Citation[];
  retrieval_count: number;
}

/**
 * Streaming token event (individual tokens)
 */
export interface StreamTokenEvent {
  type: 'token';
  token: string;
}

/**
 * Streaming completion event (end of stream)
 */
export interface StreamCompletionEvent {
  type: 'completion';
  answer: string;
  confidence: number;
  tokens_used: number;
}

/**
 * Streaming error event
 */
export interface StreamErrorEvent {
  type: 'error';
  error: string;
  code?: string;
}

/**
 * Union type for all possible streaming events
 */
export type StreamEvent =
  | StreamMetadataEvent
  | StreamTokenEvent
  | StreamCompletionEvent
  | StreamErrorEvent;

/**
 * Chat conversation metadata
 */
export interface Chat {
  /** Unique identifier (UUID) */
  id: string;
  /** User ID who created this chat */
  userId: string;
  /** Patient ID this chat is scoped to */
  patientId: string;
  /** Chat title/name */
  title: string;
  /** Chat description/topic */
  description?: string;
  /** When chat was created */
  createdAt: Date;
  /** When chat was last updated */
  updatedAt: Date;
  /** Number of messages in this chat */
  messageCount: number;
  /** Last message preview */
  lastMessage?: string;
  /** Last message timestamp */
  lastMessageAt?: Date;
}

/**
 * Chat context for managing multiple chats and sessions
 */
export interface ChatSession {
  /** Current chat being viewed */
  currentChat: Chat | null;
  /** All messages in current chat */
  messages: Message[];
  /** Recent chats (max 5) */
  recentChats: Chat[];
  /** Is any request in progress */
  loading: boolean;
  /** Current streaming text (for rendering) */
  streamingText: string;
  /** Current streaming citations */
  streamingCitations: Citation[];
  /** Any error that occurred */
  error: Error | null;
}

/**
 * Request body for sending a message
 */
export interface SendMessageRequest {
  /** Message content */
  query: string;
  /** Patient ID to scope query */
  patientId: string;
  /** Number of top results to retrieve (default: 5) */
  topK?: number;
  /** Optional section filter */
  sectionFilter?: string;
}

/**
 * Response from chat API (for non-streaming responses)
 */
export interface ChatResponse {
  /** Message ID */
  messageId: string;
  /** Generated answer */
  answer: string;
  /** Citations from retrieved notes */
  citations: Citation[];
  /** Confidence score */
  confidence: number;
  /** Tokens used */
  tokensUsed: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Parsed message with formatted content and citations
 */
export interface ParsedMessage {
  /** Plain text without markdown */
  plainText: string;
  /** Markdown formatted text */
  markdown: string;
  /** Extracted citations with positions */
  citations: Citation[];
  /** Inline code blocks */
  codeBlocks: { language: string; code: string }[];
}

/**
 * Error response from API
 */
export interface ErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}

/**
 * Pagination metadata for message lists
 */
export interface PaginationMeta {
  /** Total number of messages */
  total: number;
  /** Current page */
  page: number;
  /** Page size */
  pageSize: number;
  /** Total pages */
  totalPages: number;
}

/**
 * Type guard to check if event is metadata event
 */
export function isMetadataEvent(event: StreamEvent): event is StreamMetadataEvent {
  return event.type === 'metadata';
}

/**
 * Type guard to check if event is token event
 */
export function isTokenEvent(event: StreamEvent): event is StreamTokenEvent {
  return event.type === 'token';
}

/**
 * Type guard to check if event is completion event
 */
export function isCompletionEvent(event: StreamEvent): event is StreamCompletionEvent {
  return event.type === 'completion';
}

/**
 * Type guard to check if event is error event
 */
export function isErrorEvent(event: StreamEvent): event is StreamErrorEvent {
  return event.type === 'error';
}
