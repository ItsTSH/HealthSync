/**
 * Utility functions for safe date handling
 */

/**
 * Safely parse a date from various formats
 * Handles: Date objects, ISO strings, timestamps, and invalid inputs
 */
export function parseDate(value: any): Date {
  // Already a Date object
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? new Date() : value
  }

  // String value
  if (typeof value === "string") {
    // Try ISO format first
    const isoDate = new Date(value)
    if (!isNaN(isoDate.getTime())) {
      return isoDate
    }
    
    // Return current date if parsing fails
    console.warn(`[parseDate] Invalid date string: "${value}", using current date`)
    return new Date()
  }

  // Numeric timestamp (milliseconds)
  if (typeof value === "number") {
    const numDate = new Date(value)
    if (!isNaN(numDate.getTime())) {
      return numDate
    }
  }

  // Invalid or undefined - return current date
  console.warn(`[parseDate] Invalid date value:`, value, "using current date")
  return new Date()
}

/**
 * Convert a date to ISO string safely
 */
export function toISOString(date: any): string {
  const parsed = parseDate(date)
  return parsed.toISOString()
}

/**
 * Format a date for display
 */
export function formatDate(date: any): string {
  const parsed = parseDate(date)
  return parsed.toLocaleString()
}

/**
 * Calculate how many days ago a date was from today
 * Returns a human-readable string like "5 days ago", "today", "yesterday", etc.
 */
export function getDaysAgoText(date: any): string {
  const parsed = parseDate(date)
  const today = new Date()
  
  // Reset time to start of day for accurate comparison
  const dateStart = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  
  const daysAgo = Math.floor((todayStart.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysAgo === 0) {
    return "today"
  } else if (daysAgo === 1) {
    return "yesterday"
  } else if (daysAgo < 7) {
    return `${daysAgo} days ago`
  } else if (daysAgo < 30) {
    const weeks = Math.floor(daysAgo / 7)
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`
  } else if (daysAgo < 365) {
    const months = Math.floor(daysAgo / 30)
    return `${months} month${months > 1 ? 's' : ''} ago`
  } else {
    const years = Math.floor(daysAgo / 365)
    return `${years} year${years > 1 ? 's' : ''} ago`
  }
}
