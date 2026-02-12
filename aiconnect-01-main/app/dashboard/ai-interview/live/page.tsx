"use client";

import { useEffect, useRef, useState } from "react";

/* 🔹 Interview Questions */
const QUESTIONS = [
  "Tell me about yourself.",
  "What technical skills do you have?",
  "Tell me about a project you worked on.",
  "Why should we hire you?",
];

export default function LiveInterviewPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);

  const [aiText, setAiText] = useState("");
  const [userText, setUserText] = useState("");
  const [listening, setListening] = useState(false);

  /* ================= CAMERA SETUP ================= */
  useEffect(() => {
    let localStream: MediaStream;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((mediaStream) => {
        localStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      });

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  /* ================= AI SPEAK ================= */
  const speakAI = (text: string) => {
    setAiText(text);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  /* ================= ASK QUESTION ================= */
  useEffect(() => {
    if (questionIndex < QUESTIONS.length) {
      speakAI(QUESTIONS[questionIndex]);
    } else {
      speakAI("Thank you. Your interview is completed.");
    }
  }, [questionIndex]);

  /* ================= USER SPEAK ================= */
  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event: any) => {
      setUserText(event.results[0][0].transcript);

      setTimeout(() => {
        setQuestionIndex((prev) => prev + 1);
      }, 1200);
    };

    recognition.onend = () => setListening(false);

    recognition.start();
  };

  /* ================= UI ================= */
  return (
    <div className="h-screen flex gap-6 p-6 bg-gray-100">
      {/* 👤 USER VIDEO */}
      <div className="flex-1 bg-black rounded-xl p-4 text-white">
        <h2 className="mb-2 text-lg font-semibold">You</h2>

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-[80%] object-cover rounded-lg"
        />
      </div>

      {/* 🤖 AI INTERVIEWER */}
      <div className="flex-1 bg-white rounded-xl p-6 text-center">
        <h2 className="text-lg font-semibold mb-4">AI Interviewer</h2>

        <img
          src="/ai/ai-avatar.jpg"
          alt="AI Avatar"
          className="w-56 h-56 mx-auto rounded-full object-cover"
        />

        <p className="mt-6 text-gray-800">
          <strong>AI:</strong> {aiText}
        </p>

        {questionIndex < QUESTIONS.length && (
          <button
            onClick={startListening}
            className="mt-6 px-6 py-2 bg-green-600 text-white rounded-lg"
          >
            {listening ? "Listening..." : "Answer"}
          </button>
        )}

        {userText && (
          <p className="mt-4 text-gray-800">
            <strong>You:</strong> {userText}
          </p>
        )}
      </div>
    </div>
  );
}
