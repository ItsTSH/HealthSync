/**
 * API Client for HealthSync Backend
 * 
 * Handles all communication with the backend API.
 * Automatically includes auth tokens and handles errors.
 */

import { createClient } from "@/lib/supabase-browser";

// Backend URL - configured via environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class APIError extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: any
  ) {
    super(message);
    this.name = "APIError";
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
}

/**
 * Get auth token from Supabase session
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error("Failed to get auth token:", error);
    return null;
  }
}

/**
 * Make authenticated request to backend API
 * 
 * @param endpoint - API endpoint (e.g., "/chats")
 * @param options - Fetch options (method, body, etc.)
 * @returns Parsed JSON response
 */
export async function fetchAPI<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;

  // Build URL with query parameters
  const url = new URL(endpoint, API_BASE_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  // Get auth token from Supabase
  const token = await getAuthToken();

  // Default headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  // Merge additional headers from options
  if (fetchOptions.headers) {
    Object.entries(fetchOptions.headers as Record<string, string>).forEach(([key, value]) => {
      headers[key] = value;
    });
  }

  // Add auth token if available
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url.toString(), {
      ...fetchOptions,
      headers,
    });

    // Handle non-JSON responses
    const contentType = response.headers.get("content-type");
    let data: any;

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Handle error responses
    if (!response.ok) {
      throw new APIError(
        response.status,
        data?.detail || data?.message || `HTTP ${response.status}`,
        data
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(
      0,
      error instanceof Error ? error.message : "Unknown error",
      error
    );
  }
}

/**
 * GET request helper
 */
export function apiGet<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  return fetchAPI<T>(endpoint, {
    ...options,
    method: "GET",
  });
}

/**
 * POST request helper
 */
export function apiPost<T = any>(
  endpoint: string,
  body?: any,
  options: RequestOptions = {}
): Promise<T> {
  return fetchAPI<T>(endpoint, {
    ...options,
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT request helper
 */
export function apiPut<T = any>(
  endpoint: string,
  body?: any,
  options: RequestOptions = {}
): Promise<T> {
  return fetchAPI<T>(endpoint, {
    ...options,
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request helper
 */
export function apiDelete<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  return fetchAPI<T>(endpoint, {
    ...options,
    method: "DELETE",
  });
}
