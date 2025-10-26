// RecordPage.jsx
import React, { useState, useEffect } from "react";
import { Mic, StopCircle, ArrowLeft } from "lucide-react";
import MicRecorder from "../components/MicRecorder";

export default function RecordPage({ theme, onExit }) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let timer;
    if (isRecording) {
      timer = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <div className={`${theme === "light" ? "bg-gray-50 text-gray-900" : "bg-[#030712] text-gray-100"} min-h-screen flex flex-col items-center justify-center`}>
      <div className="absolute top-6 left-6">
        <button
          onClick={onExit}
          className={`flex items-center px-4 py-2 rounded-md ${
            theme === "light"
              ? "bg-gray-200 hover:bg-gray-300 text-gray-800"
              : "bg-gray-800 hover:bg-gray-700 text-gray-100"
          }`}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
      </div>

      <div className="flex flex-col items-center space-y-6">
        <div className="text-3xl font-semibold">Recording Session</div>

        {/* Timer */}
        <div className="text-lg font-medium">{formatTime(seconds)}</div>

        {/* Mic Visual */}
        <div
          className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 ${
            isRecording
              ? "bg-red-500/20 border-4 border-red-500"
              : theme === "light"
              ? "bg-gray-200 border-4 border-gray-400"
              : "bg-gray-800 border-4 border-gray-700"
          }`}
        >
          <Mic className={`w-12 h-12 ${isRecording ? "text-red-500" : "text-gray-400"}`} />
        </div>

        {/* Recorder */}
        <MicRecorder isRecording={isRecording} />

        {/* Control Button */}
        <button
          onClick={() => setIsRecording(!isRecording)}
          className={`fixed bottom-12 rounded-full px-8 py-4 font-semibold text-lg transition-all shadow-lg ${
            isRecording
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isRecording ? (
            <span className="flex items-center space-x-2">
              <StopCircle className="w-6 h-6" /> <span>Stop Recording</span>
            </span>
          ) : (
            <span className="flex items-center space-x-2">
              <Mic className="w-6 h-6" /> <span>Start Recording</span>
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
