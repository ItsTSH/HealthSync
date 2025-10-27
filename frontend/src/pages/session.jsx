// src/pages/session.jsx
import React, { useState, useEffect } from "react";
import { User, Plus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import Layout from "../components/Layout";
import RecordSession from "../components/RecordSession";
import axios from "axios";

export default function SessionsPage() {
  const navigate = useNavigate();
  const location = useLocation(); // ✅ ADDED: To handle refresh from Notes page
  const [isRecording, setIsRecording] = useState(false);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [theme, setTheme] = useState(() => {
    // Initialize theme from localStorage or default to light
    return localStorage.getItem("theme") || "light";
  });

  // Sync theme from localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const newTheme = localStorage.getItem("theme") || "light";
      setTheme(newTheme);
    };
    
    window.addEventListener("storage", handleStorageChange);
    
    // Check periodically for same-tab updates
    const interval = setInterval(() => {
      const currentTheme = localStorage.getItem("theme") || "light";
      if (currentTheme !== theme) {
        setTheme(currentTheme);
      }
    }, 100);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [theme]);

  // 🔹 Fetch patient records from backend
  // ✅ CHANGED: Moved outside useEffect so it can be called from multiple places
  const fetchPatients = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:8000/records", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // ✅ CRITICAL CHANGE: Include record_uuid in formatted data
      const formatted = res.data.map((p) => ({
        // ⚠️ IMPORTANT: Add record_uuid from backend
        // Adjust the field name based on what your API returns (uuid, record_uuid, _id, etc.)
        record_uuid: p.uuid || p.record_uuid || p.id,
        
        // ✅ CHANGED: Use patientName instead of name for consistency with Notes.jsx
        patientName: p.patientName || "NA",
        age: p.age || "NA",
        gender: p.gender || "NA",
        lastVisit: p.lastVisit || "NA",
        condition: p.chiefComplaint || "NA",
        status: p.status || "Completed",
        
        // Keep name for backward compatibility if needed elsewhere
        name: p.patientName || "NA",
      }));

      setPatients(formatted);
    } catch (err) {
      console.error("Error fetching patients:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // ✅ NEW: Handle refresh after deletion from Notes page
  useEffect(() => {
    if (location.state?.refresh) {
      fetchPatients(); // Reload patient list
      // Clear the state to prevent repeated refreshes
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // ✅ CHANGED: Navigate to /notes instead of /analytics
  const handlePatientClick = (patient) => {
    // ⚠️ Ensure patient has record_uuid before navigating
    if (!patient.record_uuid) {
      console.error("Patient missing record_uuid:", patient);
      alert("Error: Cannot view patient details - missing record ID");
      return;
    }

    // Navigate to Notes page with complete patient data
    navigate("/notes", { 
      state: { 
        patient: {
          record_uuid: patient.record_uuid,
          patientName: patient.patientName,
          age: patient.age,
          gender: patient.gender,
          lastVisit: patient.lastVisit,
          condition: patient.condition,
          status: patient.status,
        }
      } 
    });
  };

  const handleNewSession = () => {
    setIsRecording(true);
  };

  const handleSessionComplete = (extractedData) => {
    console.log("Session completed with data:", extractedData);
    alert("Session data saved successfully!");
    setIsRecording(false);
    // ✅ ADDED: Refresh patient list after new session
    fetchPatients();
  };

  const handleCancel = () => {
    setIsRecording(false);
  };

  return (
    <Layout theme={theme}>
      {!isRecording && (
        <div
          className={`${
            theme === "light"
              ? "bg-white border-gray-200"
              : "bg-[#0b0f1a] border-gray-600"
          } rounded-lg border`}
        >
          <div
            className={`px-6 py-4 border-b flex items-center justify-between ${
              theme === "light" ? "border-gray-200" : "border-gray-600"
            }`}
          >
            <h2 className="text-lg font-semibold">Consulted Patients</h2>

            <button
              onClick={handleNewSession}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Session</span>
            </button>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading patients...</div>
          ) : patients.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No patient records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead
                  className={`${
                    theme === "light"
                      ? "bg-gray-50 border-gray-200"
                      : "bg-[#0b0f1a] border-gray-600"
                  } border-b`}
                >
                  <tr>
                    {[
                      "Patient Name",
                      "Age",
                      "Gender",
                      "Last Visit",
                      "Condition",
                      "Status",
                    ].map((header) => (
                      <th
                        key={header}
                        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          theme === "light" ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody
                  className={`${
                    theme === "light"
                      ? "bg-white divide-gray-200"
                      : "bg-[#0b0f1a] divide-gray-600"
                  } divide-y`}
                >
                  {patients.map((patient, i) => (
                    <tr
                      key={patient.record_uuid || i}
                      onClick={() => handlePatientClick(patient)}
                      className={`hover:cursor-pointer ${
                        theme === "light"
                          ? "hover:bg-gray-50"
                          : "hover:bg-[#141b2e]"
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                              theme === "light"
                                ? "bg-gray-200"
                                : "bg-[#141b2e]"
                            }`}
                          >
                            <User
                              className={`w-5 h-5 ${
                                theme === "light"
                                  ? "text-gray-600"
                                  : "text-gray-300"
                              }`}
                            />
                          </div>
                          <div
                            className={`${
                              theme === "light"
                                ? "text-gray-900"
                                : "text-gray-100"
                            } font-medium`}
                          >
                            {/* ✅ CHANGED: Use patientName instead of name */}
                            {patient.patientName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {patient.age}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {patient.gender}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {patient.lastVisit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {patient.condition}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${
                            patient.status === "Completed"
                              ? theme === "light"
                                ? "bg-green-100 text-green-800"
                                : "bg-green-900 text-green-400"
                              : theme === "light"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-yellow-900 text-yellow-400"
                          }`}
                        >
                          {patient.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Recording view - uses RecordSession */}
      {isRecording && (
        <div className="max-w-2xl mx-auto">
          <RecordSession
            theme={theme}
            onStop={handleSessionComplete}
            onCancel={handleCancel}
          />
        </div>
      )}
    </Layout>
  );
}