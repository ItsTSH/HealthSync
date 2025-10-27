import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/authContext";
import Dashboard from "./pages/DashBoard";
import Sessions from "./pages/session";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Notes from "./pages/Notes";

export default function App() {
  const [theme, setTheme] = useState("light");

  const toggleTheme = () =>
    setTheme((prev) => (prev === "light" ? "dark" : "light"));

  return (
    <AuthProvider>
      <Router>
      <Routes>
        <Route
          path="/dashboard"
          element={<Dashboard theme={theme} toggleTheme={toggleTheme} />}
        />
        <Route
          path="/sessions"
          element={<Sessions theme={theme} toggleTheme={toggleTheme} />}
        />
        <Route
          path="/settings"
          element={<Settings theme={theme} toggleTheme={toggleTheme} />}
        />
        <Route
          path="/login"
          element={<Login theme={theme} toggleTheme={toggleTheme} />}
        />
        <Route
          path="/register"
          element={<Register theme={theme} toggleTheme={toggleTheme} />}
        />
        <Route
            path="/notes"
            element={<Notes theme={theme} toggleTheme={toggleTheme} />}
          />
        <Route
          path="*"
          element={<Login theme={theme} toggleTheme={toggleTheme} />}
        />
      </Routes>
    </Router>
    </AuthProvider>
  );
}
