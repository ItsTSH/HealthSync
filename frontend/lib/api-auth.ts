/**
 * API Authentication Utilities
 * Provides functions to retrieve JWT token from Supabase and add auth headers
 */

import { createClient } from "@/utils/supabase/client";

/**
 * Get JWT token from current Supabase session
 * Used to authenticate requests to FastAPI backend
 * 
 * @returns JWT token string or null if not authenticated
 * @throws Error if unable to retrieve session
 */
export async function getJWTToken(): Promise<string | null> {
  try {
    const supabase = createClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("[getJWTToken] Error retrieving session:", error);
      throw error;
    }

    if (!session) {
      console.warn("[getJWTToken] No active session");
      return null;
    }

    const token = session.access_token;
    if (!token) {
      console.error("[getJWTToken] Session exists but no access token");
      return null;
    }

    return token;
  } catch (error) {
    console.error("[getJWTToken] Unexpected error:", error);
    throw error;
  }
}

/**
 * Get authorization headers for FastAPI requests
 * Includes JWT token in Authorization header with Bearer scheme
 * 
 * @returns Object with Authorization header, or empty object if no token
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const token = await getJWTToken();

    if (!token) {
      console.warn("[getAuthHeaders] No token available for authentication");
      return {};
    }

    return {
      Authorization: `Bearer ${token}`,
    };
  } catch (error) {
    console.error("[getAuthHeaders] Error getting auth headers:", error);
    // Return empty object to allow request to proceed (may fail on backend)
    return {};
  }
}

/**
 * Create fetch headers for API calls including auth and content type
 * 
 * @param contentType The Content-Type header value (default: application/json)
 * @returns Headers object with Authorization and Content-Type
 */
export async function createFetchHeaders(
  contentType: string = "application/json"
): Promise<Record<string, string>> {
  const authHeaders = await getAuthHeaders();
  return {
    ...authHeaders,
    "Content-Type": contentType,
  };
}
