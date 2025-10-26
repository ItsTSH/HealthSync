// src/components/MicRecorder.jsx
import React, { useRef, useState, useEffect } from "react";
import { Mic, Square } from "lucide-react";

/**
 * MicRecorder
 * Props:
 *  - onDone(AudioBlob) => called when user stops recording with the final audio blob
 *  - theme: "light" | "dark"
 *
 * UI: mic visual (circle) and a START / STOP button below the mic.
 */
export default function MicRecorder({ onDone, theme = "light" }) {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      // cleanup on unmount
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        try { mediaRecorderRef.current.stop(); } catch (e) {}
      }
      clearInterval(timerRef.current);
    };
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (typeof onDone === "function") onDone(blob);
        // stop the tracks to release mic
        stream.getTracks().forEach((t) => t.stop());
      };

      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      console.error("Mic permission error:", err);
      alert("Microphone access is required to record sessions.");
    }
  };

  const stop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="flex flex-col items-center">
      {/* Mic visual */}
      <div
        className={`w-40 h-40 rounded-full flex items-center justify-center transition-all ${
          isRecording ? "bg-red-100 border-4 border-red-400 animate-pulse" : "bg-white border-4 border-gray-200 shadow-sm"
        }`}
      >
        <Mic className={`w-16 h-16 ${isRecording ? "text-red-600" : "text-gray-700"}`} />
      </div>

      {/* Timer */}
      <div className="mt-3 text-sm text-gray-500">{formatTime(seconds)}</div>

      {/* START / STOP button (below mic) */}
      <div className="mt-5">
        {isRecording ? (
          <button
            onClick={stop}
            className="px-6 py-2 rounded-full bg-red-600 text-white flex items-center gap-2 hover:bg-red-700 transition"
          >
            <Square className="w-5 h-5" />
            Stop
          </button>
        ) : (
          <button
            onClick={start}
            className="px-6 py-2 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 text-white flex items-center gap-2 hover:opacity-95 transition"
          >
            <Mic className="w-5 h-5" />
            Start
          </button>
        )}
      </div>
    </div>
  );
}
