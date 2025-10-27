// src/components/Layout.jsx
import React from "react";
import Navbar from "./navbar";

export default function Layout({ children, theme }) {
  return (
    <div className={`${theme === "light" ? "bg-gray-50 text-gray-900" : "bg-[#030712] text-gray-100"} min-h-screen`}>
     
      {/* Header */}
      <header className={`border-b ${theme === "light" ? "bg-white border-gray-200" : "bg-[#030712] border-gray-700"}`}>
          <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Navbar */}
          <Navbar />
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}