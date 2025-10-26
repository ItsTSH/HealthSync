import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { User, Activity, ArrowLeft } from "lucide-react";

export default function Analytics({ theme = "light" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const patient = location.state?.patient;

  if (!patient) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center ${
          theme === "light" ? "bg-gray-50 text-gray-800" : "bg-[#030712] text-gray-100"
        }`}
      >
        <p className="text-lg mb-4">No patient selected.</p>
        <button
          onClick={() => navigate("/Dashboard")}
          className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-[#141b2e]"
        >
          Go Back to Sessions
        </button>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen px-6 py-8 ${
        theme === "light" ? "bg-gray-50 text-gray-900" : "bg-[#030712] text-gray-100"
      }`}
    >
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate("/sessions")}
          className={`flex items-center gap-2 mb-6 text-sm font-medium ${
            theme === "light"
              ? "text-gray-600 hover:text-gray-800"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Patients
        </button>

        <div
          className={`rounded-xl border p-6 shadow-sm ${
            theme === "light" ? "bg-white border-gray-200" : "bg-[#0b0f1a] border-gray-600"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="w-5 h-5" />
              {patient.name}
            </h2>
            <span className="text-sm text-gray-500">
              Last Visit: {patient.lastVisit}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-500">Age</p>
              <p className="font-medium">{patient.age}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Gender</p>
              <p className="font-medium">{patient.gender}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Condition</p>
              <p className="font-medium">{patient.condition}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className={`font-medium ${
                patient.status === "Completed" ? "text-green-600" : "text-yellow-600"
              }`}>
                {patient.status}
              </p>
            </div>
          </div>

          <div
            className={`p-4 rounded-lg border ${
              theme === "light" ? "bg-gray-50 border-gray-200" : "bg-[#141b2e] border-gray-700"
            }`}
          >
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Session Summary
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {`Detailed analytics for ${patient.name} will appear here once integrated with ChromaDB — such as diagnosis trends, consultation frequency, and response summaries.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
