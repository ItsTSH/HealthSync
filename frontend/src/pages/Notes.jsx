import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { User, ArrowLeft, Edit2, Trash2, X } from "lucide-react";
import Layout from "../components/Layout";

export default function Notes() {
  const navigate = useNavigate();
  const location = useLocation();
  const patient = location.state?.patient;

  // Initialize theme from localStorage
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  // Listen for theme changes in localStorage (for sync across components)
  useEffect(() => {
    const handleStorageChange = () => {
      setTheme(localStorage.getItem("theme") || "light");
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Also check for changes within the same window
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

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [editedData, setEditedData] = useState({
    patientName: patient?.patientName || patient?.name || "",
    age: patient?.age || null,
    gender: patient?.gender || "",
    chiefComplaint: patient?.chiefComplaint || patient?.condition || "",
    symptoms: patient?.symptoms || null,
    previousDiagnosis: patient?.previousDiagnosis || null,
    previousMedications: patient?.previousMedications || null,
    otherInfo: patient?.otherInfo || null,
  });
  const API_BASE_URL = "http://localhost:8000";

  // Fallback if no patient was passed
  if (!patient) {
    return (
      <Layout theme={theme} toggleTheme={toggleTheme}>
        <div className="min-h-screen flex flex-col items-center justify-center text-center">
          <p className="text-lg mb-4">No patient data available.</p>
          <button
            onClick={() => navigate("/sessions")}
            className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-[#141b2e]"
          >
            Go Back to Sessions
          </button>
        </div>
      </Layout>
    );
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedData(prev => ({
      ...prev,
      [name]: name === 'age' ? (value === '' ? null : parseInt(value)) : value
    }));
  };

  const handleSaveEdit = async () => {
    if (!patient?.record_uuid) {
      setError("No record UUID available");
      return;
    }
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/records/${patient.record_uuid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedData),
      });

      if (!response.ok) {
        throw new Error('Failed to update record');
      }

      const updatedPatient = await response.json();
      
      // Update local state with saved data
      setIsEditing(false);
      // Optionally navigate back or show success message
      alert('Record updated successfully!');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/records/${patient.record_uuid}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete record');
      }

      // Navigate back to sessions after successful deletion
      alert('Record deleted successfully!');
      navigate("/sessions");
      
    } catch (err) {
      setError(err.message);
      setShowDeleteConfirm(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout theme={theme} toggleTheme={toggleTheme}>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate("/sessions")}
          className={`flex items-center gap-2 mb-6 text-sm font-medium ${
            theme === "light"
              ? "text-gray-600 hover:text-gray-800"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Sessions
        </button>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Patient Info Container */}
        <div
          className={`rounded-xl border p-6 shadow-sm ${
            theme === "light"
              ? "bg-white border-gray-200"
              : "bg-[#0b0f1a] border-gray-600"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="w-5 h-5" />
              {isEditing ? editedData.patientName : (patient.patientName || patient.name)}
            </h2>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === "light"
                        ? "hover:bg-gray-100"
                        : "hover:bg-gray-700"
                    }`}
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === "light"
                        ? "hover:bg-red-50 text-red-600"
                        : "hover:bg-red-900/20 text-red-400"
                    }`}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isLoading}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      theme === "light"
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    } disabled:opacity-50`}
                  >
                    {isLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedData({
                        patientName: patient?.patientName || patient?.name || "",
                        age: patient?.age || null,
                        gender: patient?.gender || "",
                        chiefComplaint: patient?.chiefComplaint || patient?.condition || "",
                        symptoms: patient?.symptoms || null,
                        previousDiagnosis: patient?.previousDiagnosis || null,
                        previousMedications: patient?.previousMedications || null,
                        otherInfo: patient?.otherInfo || null,
                      });
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                      theme === "light"
                        ? "border-gray-300 hover:bg-gray-100"
                        : "border-gray-600 hover:bg-gray-700"
                    }`}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          {patient.lastVisit && (
            <p className="text-sm text-gray-500 mb-4">
              Last Visit: {patient.lastVisit}
            </p>
          )}

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Patient Name</label>
                <input
                  type="text"
                  name="patientName"
                  value={editedData.patientName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === "light"
                      ? "bg-white border-gray-300"
                      : "bg-[#141b2e] border-gray-600"
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Age</label>
                  <input
                    type="number"
                    name="age"
                    value={editedData.age || ''}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === "light"
                        ? "bg-white border-gray-300"
                        : "bg-[#141b2e] border-gray-600"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Gender</label>
                  <input
                    type="text"
                    name="gender"
                    value={editedData.gender}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === "light"
                        ? "bg-white border-gray-300"
                        : "bg-[#141b2e] border-gray-600"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Chief Complaint</label>
                <input
                  type="text"
                  name="chiefComplaint"
                  value={editedData.chiefComplaint}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === "light"
                      ? "bg-white border-gray-300"
                      : "bg-[#141b2e] border-gray-600"
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Symptoms</label>
                <textarea
                  name="symptoms"
                  value={editedData.symptoms || ''}
                  onChange={handleInputChange}
                  rows="3"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === "light"
                      ? "bg-white border-gray-300"
                      : "bg-[#141b2e] border-gray-600"
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Previous Diagnosis</label>
                <textarea
                  name="previousDiagnosis"
                  value={editedData.previousDiagnosis || ''}
                  onChange={handleInputChange}
                  rows="2"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === "light"
                      ? "bg-white border-gray-300"
                      : "bg-[#141b2e] border-gray-600"
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Previous Medications</label>
                <textarea
                  name="previousMedications"
                  value={editedData.previousMedications || ''}
                  onChange={handleInputChange}
                  rows="2"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === "light"
                      ? "bg-white border-gray-300"
                      : "bg-[#141b2e] border-gray-600"
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Other Information</label>
                <textarea
                  name="otherInfo"
                  value={editedData.otherInfo || ''}
                  onChange={handleInputChange}
                  rows="3"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === "light"
                      ? "bg-white border-gray-300"
                      : "bg-[#141b2e] border-gray-600"
                  }`}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Age</p>
                <p className="font-medium">{patient.age || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Gender</p>
                <p className="font-medium">{patient.gender || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Chief Complaint</p>
                <p className="font-medium">{patient.chiefComplaint || patient.condition || 'N/A'}</p>
              </div>
              {patient.symptoms && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Symptoms</p>
                  <p className="font-medium">{patient.symptoms}</p>
                </div>
              )}
              {patient.previousDiagnosis && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Previous Diagnosis</p>
                  <p className="font-medium">{patient.previousDiagnosis}</p>
                </div>
              )}
              {patient.previousMedications && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Previous Medications</p>
                  <p className="font-medium">{patient.previousMedications}</p>
                </div>
              )}
              {patient.otherInfo && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Other Information</p>
                  <p className="font-medium">{patient.otherInfo}</p>
                </div>
              )}
              {patient.status && (
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p
                    className={`font-medium ${
                      patient.status === "Completed"
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {patient.status}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Overlay */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className={`rounded-xl p-6 max-w-md w-full shadow-xl ${
              theme === "light"
                ? "bg-white"
                : "bg-[#0b0f1a] border border-gray-600"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Confirm Deletion</h3>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={`p-1 rounded-lg transition-colors ${
                  theme === "light"
                    ? "hover:bg-gray-100"
                    : "hover:bg-gray-700"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete the record for <strong>{patient.patientName || patient.name}</strong>? This action cannot be undone.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isLoading}
                className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                  theme === "light"
                    ? "border-gray-300 hover:bg-gray-100"
                    : "border-gray-600 hover:bg-gray-700"
                } disabled:opacity-50`}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}