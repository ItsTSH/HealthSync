// src/pages/session.jsx
import React, { useState, useEffect } from "react";
import { User, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import RecordSession from "../components/RecordSession";
import axios from "axios";

export default function SessionsPage({ theme = "light", toggleTheme }) {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔹 Fetch patient records from backend
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:8000/records", {
          headers: { Authorization: `Bearer ${token}` },
        });

        // format backend data for UI
        const formatted = res.data.map((p) => ({
          name: p.patientName || "NA",
          age: p.age || "NA",
          gender: p.gender || "NA",
          lastVisit: p.lastVisit || "NA",
          condition: p.chiefComplaint || "NA",
          status: "Completed", // or derive from backend if available
        }));

        setPatients(formatted);
      } catch (err) {
        console.error("Error fetching patients:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const handlePatientClick = (patient) => {
    navigate("/analytics", { state: { patient } });
  };

  const handleNewSession = () => {
    setIsRecording(true);
  };

  const handleSessionComplete = (extractedData) => {
    console.log("Session completed with data:", extractedData);
    alert("Session data saved successfully!");
    setIsRecording(false);
  };

  const handleCancel = () => {
    setIsRecording(false);
  };

  return (
    <Layout theme={theme} toggleTheme={toggleTheme}>
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
                      key={i}
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
                            {patient.name}
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
