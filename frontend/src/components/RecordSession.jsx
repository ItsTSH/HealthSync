import { useState, useEffect, useRef } from "react";
import { Mic, Square } from "lucide-react";
import ExtractedDataForm from "./ExtractedDataForm";

// Mock authAPI for demo purposes
const authAPI = {
  getAccessToken: () => "mock-token-12345",
  refreshToken: async () => true
};

export default function RecordSession({ theme = "light", onStop, onCancel }) {
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [extracted, setExtracted] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  // Timer effect
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Start recording
  const handleStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Check supported types and use the best available
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        mimeType = "audio/ogg;codecs=opus";
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000,
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release microphone
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        // Create blob from chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];

        // Send to backend
        await sendAudioToBackend(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTimer(0);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Microphone access is required to record a session.");
    }
  };

  // Stop recording
  const handleStop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Send audio to backend with authentication
  const sendAudioToBackend = async (audioBlob) => {
    setIsUploading(true);

    try {
      // Get access token
      const token = authAPI.getAccessToken();
      
      if (!token) {
        throw new Error("No authentication token found. Please login again.");
      }

      const formData = new FormData();
      formData.append("audio_file", audioBlob, "session_audio.webm");

      // Get API base URL
      const API_BASE_URL = "http://localhost:8000";

      // Make authenticated request
      const response = await fetch(`${API_BASE_URL}/transcribe/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });

      // Handle 401 - token expired
      if (response.status === 401) {
        // Try to refresh token
        const refreshed = await authAPI.refreshToken();
        
        if (refreshed) {
          // Retry with new token
          const newToken = authAPI.getAccessToken();
          const retryResponse = await fetch(`${API_BASE_URL}/transcribe/`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${newToken}`,
            },
            body: formData,
          });

          if (!retryResponse.ok) {
            throw new Error(`Transcription failed: ${retryResponse.statusText}`);
          }

          const data = await retryResponse.json();
          setExtracted(data.extractedMetadata);
          return;
        } else {
          // Refresh failed - redirect to login
          alert("Session expired. Please login again.");
          window.location.href = "/";
          return;
        }
      }

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const data = await response.json();
      setExtracted(data.extractedMetadata);
    } catch (error) {
      console.error("Upload error:", error);
      alert(error.message || "Failed to process audio on the backend. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // Submit extracted data (now receives edited form data)
  const handleSubmit = async (editedData) => {
    if (!editedData) return;

    try {
      setIsUploading(true);

      // Get access token
      const token = authAPI.getAccessToken();
      
      if (!token) {
        throw new Error("No authentication token found. Please login again.");
      }

      // Get API base URL
      const API_BASE_URL = "http://localhost:8000";
      const age = editedData.age ? parseInt(editedData.age) : null;
      const recordData = {
        patientName: editedData.patientName || "",
        age: (age !== null && !isNaN(age)) ? age : null,
        gender: editedData.gender || "",
        chiefComplaint: editedData.chiefComplaint || "",
        symptoms: editedData.symptoms || null,
        previousDiagnosis: editedData.previousDiagnosis || null,
        previousMedications: editedData.previousMedications || null,
        otherInfo: editedData.otherInfo || null
      };

      // Make authenticated request
      const response = await fetch(`${API_BASE_URL}/records/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(recordData),
      });

      // Handle 401 - token expired
      if (response.status === 401) {
        // Try to refresh token
        const refreshed = await authAPI.refreshToken();
        
        if (refreshed) {
          // Retry with new token
          const newToken = authAPI.getAccessToken();
          const retryResponse = await fetch(`${API_BASE_URL}/records/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${newToken}`,
            },
            body: JSON.stringify(recordData),
          });

          if (!retryResponse.ok) {
            const errorData = await retryResponse.json().catch(() => ({}));
            throw new Error(errorData.detail || `Failed to save record: ${retryResponse.statusText}`);
          }

          const savedRecord = await retryResponse.json();
          
          // Call onStop callback with the saved record
          if (onStop) {
            onStop(savedRecord);
          }
          return;
        } else {
          // Refresh failed - redirect to login
          alert("Session expired. Please login again.");
          window.location.href = "/";
          return;
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to save record: ${response.statusText}`);
      }

      const savedRecord = await response.json();
      
      // Call onStop callback with the saved record
      if (onStop) {
        onStop(savedRecord);
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert(error.message || "Failed to save record. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // Cancel recording or discard extracted data
  const handleCancel = () => {
    // Stop recording if in progress
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Reset state
    setTimer(0);
    setExtracted(null);
    audioChunksRef.current = [];

    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-lg p-8 transition-all ${
        theme === "light"
          ? "bg-white text-gray-900"
          : "bg-[#0b0f1a] text-gray-100"
      }`}
    >
      <h2 className="text-xl font-semibold mb-4">Recording Session</h2>

      {!extracted && (
        <>
          <p className={`mb-6 ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>
            {isRecording
              ? "Recording in progress..."
              : "Click below to start recording your consultation."}
          </p>

          <div
            className={`w-24 h-24 flex items-center justify-center rounded-full border-4 transition-all cursor-pointer ${
              isRecording
                ? "border-red-500 bg-red-100 animate-pulse"
                : theme === "light"
                ? "border-gray-400 bg-gray-50 hover:bg-gray-100"
                : "border-gray-600 bg-gray-800 hover:bg-gray-700"
            }`}
          >
            {isRecording ? (
              <Square
                className="w-10 h-10 text-red-600 cursor-pointer"
                onClick={handleStop}
              />
            ) : (
              <Mic
                className={`w-10 h-10 cursor-pointer ${
                  theme === "light" ? "text-gray-700" : "text-gray-300"
                }`}
                onClick={handleStart}
              />
            )}
          </div>

          <p className={`mt-4 text-sm ${theme === "light" ? "text-gray-400" : "text-gray-500"}`}>
            {Math.floor(timer / 60)
              .toString()
              .padStart(2, "0")}
            :
            {(timer % 60).toString().padStart(2, "0")}
          </p>

          {isUploading && (
            <p className="mt-6 text-sm text-blue-500 animate-pulse">
              Uploading & processing audio...
            </p>
          )}

          <button
            onClick={handleCancel}
            disabled={isUploading}
            className={`mt-8 px-4 py-2 text-sm border rounded-lg transition ${
              theme === "light"
                ? "border-gray-300 hover:bg-gray-100"
                : "border-gray-600 hover:bg-[#141b2e]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Cancel
          </button>
        </>
      )}

      {extracted && (
        <ExtractedDataForm
          initialData={extracted}
          theme={theme}
          onSubmit={handleSubmit}
          onDiscard={handleCancel}
          isSubmitting={isUploading}
        />
      )}
    </div>
  );
}