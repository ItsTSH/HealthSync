import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/dashboard";
import Sessions from "./pages/session";
import Analytics from "./pages/analytics";
import Settings from "./pages/Settings";

export default function App() {
  const [theme, setTheme] = useState("light");

  const toggleTheme = () =>
    setTheme((prev) => (prev === "light" ? "dark" : "light"));

  return (
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
          path="/analytics"
          element={<Analytics theme={theme} toggleTheme={toggleTheme} />}
        />
        <Route
          path="/settings"
          element={<Settings theme={theme} toggleTheme={toggleTheme} />}
        />
        <Route
          path="*"
          element={<Dashboard theme={theme} toggleTheme={toggleTheme} />}
        />
      </Routes>
    </Router>
  );
}
