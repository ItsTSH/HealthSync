import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../api/authService";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Check if user is authenticated on mound
    useEffect(() => {
        const checkAuth = () => {
            const token = authAPI.getAccessToken();
            if (token) {
                setIsAuthenticated(true);
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    const login = async (credentials) => {
        try{
            const data = await authAPI.login(credentials);
            setIsAuthenticated(true);
            return data;
        } catch (error) {
            throw error;
        }
    };

    const signup = async (userData) => {
        try{
            const data = await authAPI.signup(userData);
            return data;
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        authAPI.logout();
        setUser(null);
        setIsAuthenticated(false);
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