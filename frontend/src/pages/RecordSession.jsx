// src/pages/RecordSession.jsx
import React, { useState, useEffect, useRef } from "react";
import { Mic, Square, CheckCircle } from "lucide-react";

export default function RecordSession({ theme, onStop, onCancel }) {
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const timerRef = useRef(null);

  // timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  // start recording
  const handleStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        await sendAudioToBackend(blob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setTimer(0);
    } catch (err) {
      console.error("Mic access denied:", err);
      alert("Microphone access is required to record a session.");
    }
  };

  // stop recording
  const handleStop = () => {
    if (mediaRecorder) mediaRecorder.stop();
    setIsRecording(false);
  };

  // send blob to backend
  const sendAudioToBackend = async (audioBlob) => {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "session_audio.webm");

      // 🔗 Replace with your real API endpoint
      const response = await fetch("http://localhost:8000/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Transcription failed");
      const data = await response.json();

      // Example expected backend response:
      // {
      //   patientName: "John Doe",
      //   age: 34,
      //   gender: "Male",
      //   condition: "Cough and Fever",
      //   medications: "Paracetamol 500mg",
      //   followUp: "After 3 days"
      // }

      setExtracted(data);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to process audio on the backend.");
    } finally {
      setIsUploading(false);
    }
  };

  // submit extracted data
  const handleSubmit = () => {
    onStop(extracted);
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
          <p className="text-gray-500 mb-6">
            {isRecording
              ? "Recording in progress..."
              : "Click below to start recording your consultation."}
          </p>

          <div
            className={`w-24 h-24 flex items-center justify-center rounded-full border-4 transition-all ${
              isRecording
                ? "border-red-500 bg-red-100 animate-pulse"
                : "border-gray-400 bg-gray-50 hover:bg-gray-100"
            }`}
          >
            {isRecording ? (
              <Square
                className="w-10 h-10 text-red-600 cursor-pointer"
                onClick={handleStop}
              />
            ) : (
              <Mic
                className="w-10 h-10 text-gray-700 cursor-pointer"
                onClick={handleStart}
              />
            )}
          </div>

          <p className="mt-4 text-sm text-gray-400">
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
            onClick={onCancel}
            className="mt-8 px-4 py-2 text-sm border rounded-lg hover:bg-gray-100 dark:hover:bg-[#141b2e] transition"
          >
            Cancel
          </button>
        </>
      )}

      {extracted && (
        <div
          className={`mt-8 text-left w-full max-w-lg border rounded-lg p-4 ${
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
            className="mt-6 flex items-center justify-center w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-all"
          >
            <CheckCircle className="w-4 h-4 mr-2" /> Submit & Save
          </button>
        </div>
      )}
    </div>
  );
}
