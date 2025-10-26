import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../api/authService";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Check if user is authenticated on mount
    useEffect(() => {
        const checkAuth = async () => {
            const token = authAPI.getAccessToken();
            console.log("AuthContext init - token exists:", !!token);
            if (token) {
                const authenticated = authAPI.isAuthenticated();
                console.log("AuthContext init - token valid:", authenticated);
                setIsAuthenticated(authenticated);
                
                // If token exists but is expired, try to refresh
                if (!authenticated) {
                    const refreshed = await authAPI.refreshToken();
                    console.log("AuthContext init - refresh result:", refreshed);
                    setIsAuthenticated(refreshed);
                }
            } else {
                // No token found - user is NOT authenticated
                setIsAuthenticated(false);
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    // Periodic token validation (every 5 minutes)
    useEffect(() => {
        if (!isAuthenticated) return;

        const interval = setInterval(async () => {
            const authenticated = authAPI.isAuthenticated();
            if (!authenticated) {
                // Token expired, try to refresh
                const refreshed = await authAPI.refreshToken();
                if (!refreshed) {
                    // Refresh failed, log out
                    logout();
                }
            }
        }, 5 * 60 * 1000); // Check every 5 minutes

        return () => clearInterval(interval);
    }, [isAuthenticated]);

    const login = async (credentials) => {
        try {
            const data = await authAPI.login(credentials);
            setIsAuthenticated(true);
            return data;
        } catch (error) {
            throw error;
        }
    };

    const signup = async (userData) => {
        try {
            const data = await authAPI.signup(userData);
            return data;
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        authAPI.logout();
        setIsAuthenticated(false);
        setUser(null);
    };

    const value = {
        user,
        isAuthenticated,
        loading,
        login,
        signup,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
};

// Custom hook to use auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};