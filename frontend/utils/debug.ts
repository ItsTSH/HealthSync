/**
 * Centralized Debug Logging Utility
 * Controls all console output based on environment and configuration.
 * Enables/disables debug logging via NEXT_PUBLIC_DEBUG environment variable.
 *
 * Usage:
 * - debug.log("componentName", "message", optionalData)
 * - debug.error("componentName", "message", optionalError) // Always shown
 * - debug.warn("componentName", "message", optionalData)
 */

const DEBUG_ENABLED =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_DEBUG === "true"

/**
 * Centralized debug logging interface.
 * All debug logs respect NODE_ENV and NEXT_PUBLIC_DEBUG settings.
 */
export const debug = {
  /**
   * Log debug information (only shown in development with NEXT_PUBLIC_DEBUG=true)
   * Useful for tracing application flow and data values
   */
  log: (context: string, message: string, data?: any) => {
    if (DEBUG_ENABLED) {
      console.log(`[${context}] ${message}`, data)
    }
  },

  /**
   * Log errors (always shown, regardless of settings)
   * Critical for debugging issues in production
   */
  error: (context: string, message: string, error?: any) => {
    console.error(`[${context}] ${message}`, error)
  },

  /**
   * Log warnings (shown in development with NEXT_PUBLIC_DEBUG=true)
   * Useful for potential issues that don't stop execution
   */
  warn: (context: string, message: string, data?: any) => {
    if (DEBUG_ENABLED) {
      console.warn(`[${context}] ${message}`, data)
    }
  },

  /**
   * Log info messages (always shown)
   * Important information that should always be visible
   */
  info: (context: string, message: string, data?: any) => {
    console.info(`[${context}] ${message}`, data)
  },

  /**
   * Check if debugging is enabled
   * Useful for conditional expensive logging operations
   */
  isEnabled: (): boolean => DEBUG_ENABLED,
}

export default debug
