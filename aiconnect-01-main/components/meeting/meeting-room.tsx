"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  LiveKitRoom,
  ControlBar,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2, MessageSquare, X } from "lucide-react";
import { Track } from "livekit-client";
import ChatPanel from "./chat-panel";
import LiveCodePanel from "./live-code-panel";
import { Button } from "@/components/ui/button";

interface MeetingRoomProps {
  roomName: string;
  participantName: string;
  videoEnabled?: boolean;
  audioEnabled?: boolean;
  videoDeviceId?: string;
  audioDeviceId?: string;
  onLeave: () => void;
}

export default function MeetingRoom({
  roomName,
  participantName,
  videoEnabled = true,
  audioEnabled = true,
  videoDeviceId,
  audioDeviceId,
  onLeave,
}: MeetingRoomProps) {
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const closingRef = useRef(false);

  const exitRoom = useCallback(async () => {
    if (closingRef.current) return;
    closingRef.current = true;
    try {
      await fetch(`/api/rooms/${encodeURIComponent(roomName)}`, {
        method: "DELETE",
      });
    } finally {
      onLeave();
    }
  }, [roomName, onLeave]);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await fetch(
          `/api/livekit/token?room=${encodeURIComponent(
            roomName
          )}&username=${encodeURIComponent(participantName)}`
        );
        const data = await res.json();
        setToken(data.token);
      } catch {
        setError("Failed to connect to meeting");
      } finally {
        setIsLoading(false);
      }
    };
    fetchToken();
  }, [roomName, participantName]);

  if (isLoading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center text-white">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!token || error) return null;

  return (
    <LiveKitRoom
      video={videoEnabled}
      audio={audioEnabled}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      data-lk-theme="default"
      onDisconnected={exitRoom}
      style={{ height: "100vh" }}
    >
      <MeetingLayout />
    </LiveKitRoom>
  );
}

function MeetingLayout() {
  const [showChat, setShowChat] = useState(false);
  const [showLiveCode, setShowLiveCode] = useState(false);

  /* 🔴 LIVE CAPTION STATES (ADDED) */
  const [showCaption, setShowCaption] = useState(false);
  const [captionText, setCaptionText] = useState("");

  const [code, setCode] = useState(`export default function App() {
  return <h1>Hello Live Coding 🚀</h1>;
}`);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  /* 🔴 LIVE CAPTION LOGIC (ADDED) */
  useEffect(() => {
    if (!showCaption) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Live Caption not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US"; // hi-IN for Hindi

    recognition.onresult = (event: any) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setCaptionText(text);
    };

    recognition.start();
    return () => recognition.stop();
  }, [showCaption]);

  return (
    <div className="h-full flex flex-col bg-black">
      <RoomAudioRenderer />

      {/* ✅ LIVE CODE OVERLAY (UNCHANGED) */}
      {showLiveCode && (
        <LiveCodePanel
          code={code}
          onChange={setCode}
        />
      )}

      {/* 🔴 LIVE CAPTION UI (ADDED) */}
      {showCaption && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 
        bg-black/70 text-white px-4 py-2 rounded-lg text-sm 
        max-w-xl text-center z-50">
          {captionText || "Listening..."}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 p-2">
          <GridLayout tracks={tracks} style={{ height: "100%" }}>
            <ParticipantTile />
          </GridLayout>
        </div>

        <div className={`w-80 ${showChat ? "" : "hidden"}`}>
          <ChatPanel />
        </div>
      </div>

      {/* CONTROLS */}
      <div className="relative">
        <RecordingControls />

        <div className="absolute top-4 right-4 z-50">
          <Button
            size="lg"
            onClick={() => setShowChat(!showChat)}
            className="rounded-full h-14 w-14 p-0 bg-white/10 text-white"
          >
            {showChat ? <X /> : <MessageSquare />}
          </Button>
        </div>

        <ExtraMeetingControls
          onLiveCode={() => setShowLiveCode(v => !v)}
          onLiveCaption={() => setShowCaption(v => !v)} /* 🔴 ADDED */
        />

        <ControlBar />
      </div>
    </div>
  );
}

function RecordingControls() {
  return (
    <div className="absolute top-4 left-4 z-50 flex gap-2">
      <button className="px-4 py-2 rounded-full bg-white/10 text-white">
        Start Recording
      </button>
      <button className="px-4 py-2 rounded-full bg-white/10 text-white">
        Copy Link
      </button>
    </div>
  );
}

function ExtraMeetingControls({
  onLiveCode,
  onLiveCaption,
}: {
  onLiveCode: () => void;
  onLiveCaption: () => void;
}) {
  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 flex gap-3">
      <button
        onClick={onLiveCode}
        className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
      >
        💻 Live Code
      </button>

      <button className="px-4 py-2 rounded-full bg-white/10 text-white">
        ✋ Raise Hand
      </button>

      <button className="px-4 py-2 rounded-full bg-white/10 text-white">
        😀 Reactions
      </button>

      {/* 🔴 LIVE CAPTION BUTTON (CONNECTED) */}
      <button
        onClick={onLiveCaption}
        className="px-4 py-2 rounded-full bg-white/10 text-white"
      >
        📝 Live Caption
      </button>
    </div>
  );
}
