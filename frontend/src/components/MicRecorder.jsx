// components/MicRecorder.jsx
import React, { useEffect } from "react";

export default function MicRecorder({ isRecording }) {
  useEffect(() => {
    let recognition;
    if ("webkitSpeechRecognition" in window) {
      recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      if (isRecording) recognition.start();
      else recognition.stop();

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join("");
        console.log("Transcript:", transcript);
      };
    } else {
      console.warn("SpeechRecognition not supported in this browser.");
    }
  }, [isRecording]);

  return null;
}
