import React, { useState } from "react";
import { Calendar, Settings, Sun, Moon } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
 
  const [theme, setTheme] = useState(() => {
    // Initialize theme from localStorage or default to light
    return localStorage.getItem("theme") || "light";
  });

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <nav className="flex items-center justify-between">
      {/* Left: Logo and Tabs */}
      <div className="flex items-center space-x-6">
        {/* Logo */}
        <div className={`py-2 px-4 text-3xl font-bold ${
          theme === "light" ? "text-gray-900" : "text-white"
        }`}>
          HealthSync
        </div>
       
        {/* Tabs */}
        <div className="flex space-x-1">
          <button
            onClick={() => navigate("/dashboard")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentPath === "/dashboard"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate("/sessions")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
              currentPath === "/sessions"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Sessions</span>
          </button>
          <button
            onClick={() => navigate("/settings")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
              currentPath === "/settings"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Right: Theme Toggle */}
      <div className="flex items-center space-x-3">
        <button
          onClick={toggleTheme}
          className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          {theme === "light" ? (
            <Moon className="w-5 h-5 text-gray-700" />
          ) : (
            <Sun className="w-5 h-5 text-yellow-400" />
          )}
        </button>
      </div>
    </nav>
  );
}