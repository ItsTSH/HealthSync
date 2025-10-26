const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Helper function for API calls with token
const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem("access_token");
  
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // If token expired, try to refresh
  if (response.status === 401) {
    const refreshed = await authAPI.refreshToken();
    if (refreshed) {
      // Retry the original request with new token
      headers["Authorization"] = `Bearer ${localStorage.getItem("access_token")}`;
      return fetch(url, { ...options, headers });
    }
  }

  return response;
};

export const authAPI = {
  // Sign up new user
  signup: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Registration failed");
    }

    return data;
  },

  // Login user
  login: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Login failed");
    }

    // Store tokens
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);

    return data;
  },

  // Refresh token
  refreshToken: async () => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      
      if (!refreshToken) {
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Clear tokens if refresh fails
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        return false;
      }

      // Update tokens
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);

      return true;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return false;
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("remember_me");
  },

  // Get access token
  getAccessToken: () => {
    return localStorage.getItem("access_token");
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem("access_token");
  },
};

// Export the authenticated fetch for other API calls
export { fetchWithAuth };