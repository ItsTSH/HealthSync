// src/pages/session.jsx
import React, { useState } from "react";
import { User, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import MicRecorder from "../components/MicRecorder";

export default function SessionsPage({ theme = "light", toggleTheme }) {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [extracted, setExtracted] = useState(null);

  const patients = [
    { name: "John Martinez", age: 45, gender: "Male", lastVisit: "Oct 25, 2025", condition: "Annual Checkup", status: "Completed" },
    { name: "Emily Chan", age: 32, gender: "Female", lastVisit: "Oct 25, 2025", condition: "Follow-up Visit", status: "Completed" },
    { name: "Michael Brown", age: 58, gender: "Male", lastVisit: "Oct 25, 2025", condition: "Consultation", status: "Completed" },
    { name: "Lisa Anderson", age: 28, gender: "Female", lastVisit: "Oct 25, 2025", condition: "Initial Assessment", status: "In Progress" },
    { name: "David Kim", age: 41, gender: "Male", lastVisit: "Oct 24, 2025", condition: "Routine Check", status: "Completed" },
  ];

  const handlePatientClick = (patient) => {
    navigate("/analytics", { state: { patient } });
  };

  const handleNewSession = () => {
    setIsRecording(true);
  };

  const handleAudioDone = async (audioBlob) => {
    // Upload the audio to your backend
    const formData = new FormData();
    formData.append("file", audioBlob, "session_audio.webm");

    try {
      const response = await fetch("http://localhost:8000/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Transcription failed");
      const data = await response.json();
      setExtracted(data);
    } catch (err) {
      console.error(err);
      alert("Error processing audio on the backend.");
    }
  };

  const handleSubmit = () => {
    alert("Session data saved successfully!");
    setExtracted(null);
    setIsRecording(false);
  };

  const handleCancel = () => {
    setIsRecording(false);
    setExtracted(null);
  };

  return (
    <Layout theme={theme} toggleTheme={toggleTheme}>
      {!isRecording && !extracted && (
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
                }`}
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
                            theme === "light" ? "bg-gray-200" : "bg-[#141b2e]"
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
        </div>
      )}

      {/* Recording view */}
      {isRecording && !extracted && (
        <div
          className={`flex flex-col items-center justify-center p-8 rounded-lg ${
            theme === "light"
              ? "bg-white text-gray-900"
              : "bg-[#0b0f1a] text-gray-100"
          }`}
        >
          <h2 className="text-xl font-semibold mb-6">New Session Recording</h2>
          <MicRecorder onDone={handleAudioDone} theme={theme} />
          <button
            onClick={handleCancel}
            className="mt-8 px-4 py-2 text-sm border rounded-lg hover:bg-gray-100 dark:hover:bg-[#141b2e] transition"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Extracted data view */}
      {extracted && (
        <div
          className={`mt-8 text-left w-full max-w-lg mx-auto border rounded-lg p-6 ${
            theme === "light" ? "border-gray-200" : "border-gray-700"
          }`}
        >
          <h3 className="text-lg font-semibold mb-2">Extracted Data</h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li>
              <strong>Patient:</strong> {extracted.patientName}
            </li>
            <li>
              <strong>Age:</strong> {extracted.age}
            </li>
            <li>
              <strong>Gender:</strong> {extracted.gender}
            </li>
            <li>
              <strong>Condition:</strong> {extracted.condition}
            </li>
            <li>
              <strong>Medications:</strong> {extracted.medications}
            </li>
            <li>
              <strong>Follow-up:</strong> {extracted.followUp}
            </li>
          </ul>
          <button
            onClick={handleSubmit}
            className="mt-6 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
          >
            Submit & Save
          </button>
        </div>
      )}
    </Layout>
  );
}
