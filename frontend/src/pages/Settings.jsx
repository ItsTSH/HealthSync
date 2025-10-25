// src/pages/Settings.jsx
import React from "react";

export default function Settings({ theme = "light" }) {

  const handleProfileEdit = () => {
    alert("Profile Edit clicked!");
  };

  const handleLogout = () => {
    alert("Logging out...");
  };

  return (
    <div className={`rounded-lg border p-8 space-y-6 transition-colors ${
      theme === "light"
        ? "bg-white border-gray-200 text-gray-900"
        : "bg-[#0b0f1a] border-gray-600 text-gray-100"
    }`}>
      <h2 className="text-xl font-semibold">Settings</h2>

      {/* Profile Edit */}
      <div>
        <button
          onClick={handleProfileEdit}
          className={`w-full flex items-center justify-center px-4 py-2 border rounded-lg font-medium transition-colors ${
            theme === "light"
              ? "border-gray-300 text-gray-900 hover:bg-gray-50"
              : "border-gray-700 text-gray-100 hover:bg-[#141b2e]"
          }`}
        >
          Edit Profile
        </button>
      </div>

      {/* Log Out */}
      <div>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center justify-center px-4 py-2 border rounded-lg font-medium transition-colors ${
            theme === "light"
              ? "border-gray-300 text-gray-900 hover:bg-gray-50"
              : "border-gray-700 text-gray-100 hover:bg-[#141b2e]"
          }`}
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
