/**
 * HealthSync Chat - Message Formatting Utilities
 * 
 * Utilities for parsing and formatting messages including:
 * - Citation extraction and linking
 * - Markdown parsing
 * - Text truncation and formatting
 */

import { Citation, ParsedMessage } from '@/types/chat';

/**
 * Extract citations from message text
 * Looks for pattern: [N] Text where N is 1-99
 * 
 * @param text - Message text to parse
 * @returns Array of citations found
 * 
 * @example
 * extractCitations("See [1] Patient Notes and [2] Lab Results")
 * // Returns: [{id: "1", text: "Patient Notes"}, {id: "2", text: "Lab Results"}]
 */
export function extractCitations(text: string): Citation[] {
  const citations: Citation[] = [];
  // Pattern: [N] Text
  const citationPattern = /\[(\d+)\]\s+([^\n[\]]+)/g;
  
  let match;
  while ((match = citationPattern.exec(text)) !== null) {
    const citationNumber = match[1];
    const citationText = match[2].trim();
    
    citations.push({
      id: citationNumber,
      text: citationText,
    });
  }
  
  return citations;
}

/**
 * Extract citations from streaming metadata
 * Converts citation objects to array
 * 
 * @param metadata - Streaming metadata object
 * @returns Array of citations
 */
export function extractCitationsFromMetadata(metadata: any): Citation[] {
  if (!metadata || !metadata.citations) {
    return [];
  }
  
  if (Array.isArray(metadata.citations)) {
    return metadata.citations.map((citation: any, index: number) => ({
      id: String(index + 1),
      text: citation.text || citation.title || 'Reference',
      noteId: citation.noteId || citation.note_id,
      section: citation.section,
      similarity: citation.similarity,
      url: citation.url,
    }));
  }
  
  return [];
}

/**
 * Replace citations with markdown links
 * Converts [N] Text to [Text](#citation-N)
 * 
 * @param text - Message text
 * @param citations - Array of citations
 * @returns Text with citation links
 */
export function formatCitationsAsLinks(text: string, citations: Citation[]): string {
  let formatted = text;
  
  citations.forEach((citation, index) => {
    const pattern = new RegExp(`\\[${index + 1}\\]\\s+${escapeRegex(citation.text)}`, 'g');
    const link = `[${index + 1}. ${citation.text}](#citation-${index + 1})`;
    formatted = formatted.replace(pattern, link);
  });
  
  return formatted;
}

/**
 * Escape special regex characters
 * 
 * @param text - Text to escape
 * @returns Escaped text
 */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse markdown formatting in message
 * Detects: **bold**, *italic*, `code`, code blocks, lists
 * 
 * @param text - Raw message text
 * @returns Object with markdown and plain text versions
 */
export function parseMarkdown(text: string): {
  markdown: string;
  plainText: string;
  hasMarkdown: boolean;
} {
  const hasMarkdown = /(\*\*|__|\*|_|`|```|^[-*+]\s|^\d+\.)/.test(text);
  
  // Remove markdown syntax to get plain text
  const plainText = text
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
    .replace(/__(.+?)__/g, '$1') // Remove bold (alt)
    .replace(/\*(.+?)\*/g, '$1') // Remove italic
    .replace(/_(.+?)_/g, '$1') // Remove italic (alt)
    .replace(/`(.+?)`/g, '$1') // Remove inline code
    .replace(/```[\s\S]*?```/g, ''); // Remove code blocks
  
  return {
    markdown: text,
    plainText: plainText.trim(),
    hasMarkdown,
  };
}

/**
 * Extract code blocks from message
 * Finds markdown code blocks with optional language
 * 
 * @param text - Message text
 * @returns Array of code blocks with language
 */
export function extractCodeBlocks(text: string): Array<{ language: string; code: string }> {
  const codeBlocks: Array<{ language: string; code: string }> = [];
  // Pattern: ```language\ncode\n```
  const codeBlockPattern = /```([\w-]*)\n([\s\S]*?)```/g;
  
  let match;
  while ((match = codeBlockPattern.exec(text)) !== null) {
    const language = match[1] || 'text';
    const code = match[2].trim();
    
    codeBlocks.push({ language, code });
  }
  
  return codeBlocks;
}

/**
 * Truncate text with ellipsis
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add (default: "...")
 * @returns Truncated text
 * 
 * @example
 * truncateText("This is a long message", 15) // "This is a lo..."
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Format timestamp for display
 * 
 * @param date - Date to format
 * @returns Formatted time string (e.g., "2:34 PM")
 */
export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Format relative time (e.g., "2 minutes ago")
 * 
 * @param date - Date to format
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}

/**
 * Parse full message with citations, markdown, and code blocks
 * 
 * @param text - Raw message text
 * @param citations - Array of citations
 * @returns Parsed message object
 */
export function parseMessage(text: string, citations: Citation[] = []): ParsedMessage {
  const { markdown, plainText } = parseMarkdown(text);
  const codeBlocks = extractCodeBlocks(text);
  const formattedCitations = formatCitationsAsLinks(markdown, citations);
  
  return {
    plainText,
    markdown: formattedCitations,
    citations,
    codeBlocks,
  };
}

/**
 * Copy text to clipboard
 * 
 * @param text - Text to copy
 * @returns Promise that resolves when copy is complete
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}

/**
 * Sanitize message text for security
 * Removes potentially dangerous HTML/JS
 * 
 * @param text - Text to sanitize
 * @returns Sanitized text
 */
export function sanitizeMessageText(text: string): string {
  // Remove HTML tags but preserve markdown
  return text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '');
}

/**
 * Check if text contains specific keywords (case-insensitive)
 * Used for content filtering or highlighting
 * 
 * @param text - Text to search
 * @param keywords - Keywords to find
 * @returns Array of found keywords
 */
export function findKeywords(text: string, keywords: string[]): string[] {
  const foundKeywords: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      foundKeywords.push(keyword);
    }
  }
  
  return foundKeywords;
}

/**
 * Create a chat preview string for sidebar/list display
 * 
 * @param lastMessage - Last message content
 * @param maxLength - Max length for preview
 * @returns Preview string
 */
export function createChatPreview(lastMessage: string, maxLength: number = 50): string {
  const { plainText } = parseMarkdown(lastMessage);
  return truncateText(plainText, maxLength);
}
