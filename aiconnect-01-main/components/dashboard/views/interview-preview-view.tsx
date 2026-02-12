"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function InterviewPreviewView() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState<boolean>(true);
  const [micOn, setMicOn] = useState<boolean>(true);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);

  /* ================= CAMERA + MIC PREVIEW ================= */
  useEffect(() => {
    let localStream: MediaStream | null = null;

    const setupMedia = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        setStream(localStream);
        setPermissionGranted(true);

        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
        }
      } catch (error) {
        console.error("Camera/Mic permission error:", error);
        setPermissionGranted(false);
        alert("Please allow camera and microphone to continue");
      }
    };

    setupMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  /* ================= TOGGLES ================= */
  const toggleCamera = () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    track.enabled = !cameraOn;
    setCameraOn(!cameraOn);
  };

  const toggleMic = () => {
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (!track) return;

    track.enabled = !micOn;
    setMicOn(!micOn);
  };

  /* ================= UI ================= */
  return (
    <div className="h-screen flex gap-6 p-6 bg-gray-100">
      {/* 👤 USER PREVIEW */}
      <div className="flex-1 bg-black rounded-xl p-4 text-white">
        <h2 className="mb-2 text-lg font-semibold">You</h2>

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-[80%] object-cover rounded-lg"
        />

        <div className="flex gap-4 mt-4">
          <button
            onClick={toggleCamera}
            className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
          >
            {cameraOn ? "Camera OFF" : "Camera ON"}
          </button>

          <button
            onClick={toggleMic}
            className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
          >
            {micOn ? "Mic OFF" : "Mic ON"}
          </button>
        </div>
      </div>

      {/* 🤖 AI PREVIEW */}
      <div className="flex-1 bg-white rounded-xl p-6 text-center">
        <h2 className="text-lg font-semibold mb-4">AI Interviewer</h2>

        <img
          src="/ai/ai-avatar.jpg"
          alt="AI Interviewer Avatar"
          className="w-60 h-60 mx-auto rounded-full object-cover"
        />

        <p className="mt-6 text-gray-600">
          You are about to start your AI interview.
          <br />
          Please check camera and microphone.
        </p>

        {/* ▶️ START INTERVIEW */}
        <button
          onClick={() => router.push("/dashboard/ai-interview/live")}
          disabled={!permissionGranted || !cameraOn || !micOn}
          className={`mt-8 px-6 py-3 rounded-lg text-white transition ${
            permissionGranted && cameraOn && micOn
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          Start Interview
        </button>
      </div>
    </div>
  );
}
