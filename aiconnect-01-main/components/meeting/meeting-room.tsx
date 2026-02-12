"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  LiveKitRoom,
  ControlBar,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2, MessageSquare, X } from "lucide-react";
import { Track } from "livekit-client";
import ChatPanel from "./chat-panel";
import LiveCodePanel from "./live-code-panel";
import { Button } from "@/components/ui/button";

/* ================= PROPS ================= */

interface MeetingRoomProps {
  roomName: string;
  participantName: string;
  videoEnabled?: boolean;
  audioEnabled?: boolean;
  onLeave: () => void;
}

/* ================= MAIN ================= */

export default function MeetingRoom({
  roomName,
  participantName,
  videoEnabled = true,
  audioEnabled = true,
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

/* ================= LAYOUT ================= */

function MeetingLayout() {
  const room = useRoomContext();
  const encoder = new TextEncoder();

  const [showChat, setShowChat] = useState(false);
  const [showLiveCode, setShowLiveCode] = useState(false);
  const [showCaption, setShowCaption] = useState(false);
  const [captionText, setCaptionText] = useState("");

  const [handRaised, setHandRaised] = useState(false);
  const [reactions, setReactions] = useState<string[]>([]);
  const [showReactions, setShowReactions] = useState(false);

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

  /* ================= LIVE CAPTION ================= */

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
    recognition.lang = "en-US";

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

  /* ================= RAISE HAND ================= */

  const toggleRaiseHand = () => {
    if (!room) return;

    const value = !handRaised;
    setHandRaised(value);

    room.localParticipant.publishData(
      encoder.encode(
        JSON.stringify({
          type: "hand",
          value,
          name: room.localParticipant.identity,
        })
      ),
      { reliable: true }
    );
  };

  /* ================= SEND REACTION ================= */

  const sendReaction = (emoji: string) => {
    if (!room) return;

    room.localParticipant.publishData(
      encoder.encode(JSON.stringify({ type: "reaction", emoji })),
      { reliable: false }
    );

    // local feedback
    setReactions((prev) => [...prev, emoji]);
    setTimeout(() => {
      setReactions((prev) => prev.slice(1));
    }, 2000);

    setShowReactions(false);
  };

  /* ================= RECEIVE DATA ================= */

  useEffect(() => {
    if (!room) return;

    const handler = (payload: Uint8Array) => {
      const data = JSON.parse(new TextDecoder().decode(payload));

      if (data.type === "reaction") {
        setReactions((prev) => [...prev, data.emoji]);
        setTimeout(() => {
          setReactions((prev) => prev.slice(1));
        }, 2000);
      }
    };

    room.on("dataReceived", handler);
    return () => room.off("dataReceived", handler);
  }, [room]);

  return (
    <div className="h-full flex flex-col bg-black">
      <RoomAudioRenderer />

      {/* LIVE CODE */}
      {showLiveCode && (
        <LiveCodePanel code={code} onChange={setCode} />
      )}

      {/* LIVE CAPTION */}
      {showCaption && (
        <div className="fixed bottom-36 left-1/2 -translate-x-1/2
        bg-black/70 text-white px-4 py-2 rounded-lg text-sm z-[9999]">
          {captionText || "Listening..."}
        </div>
      )}

      {/* FLOATING REACTIONS */}
      {reactions.map((emoji, i) => (
        <div
          key={i}
          className="fixed bottom-40 left-1/2 -translate-x-1/2 
          text-4xl animate-bounce z-[9999]"
        >
          {emoji}
        </div>
      ))}

      <div className="flex-1 flex overflow-hidden">
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
        <div className="absolute top-4 right-4 z-50">
          <Button
            size="lg"
            onClick={() => setShowChat(!showChat)}
            className="rounded-full h-14 w-14 p-0 bg-white/10 text-white"
          >
            {showChat ? <X /> : <MessageSquare />}
          </Button>
        </div>

        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 flex gap-3">
          <button
            onClick={() => setShowLiveCode(v => !v)}
            className="px-4 py-2 rounded-full bg-white/10 text-white"
          >
            💻 Live Code
          </button>

          <button
            onClick={toggleRaiseHand}
            className={`px-4 py-2 rounded-full text-white transition
            ${handRaised ? "bg-yellow-500" : "bg-white/10"}`}
          >
            ✋ {handRaised ? "Hand Raised" : "Raise Hand"}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowReactions(v => !v)}
              className="px-4 py-2 rounded-full bg-white/10 text-white"
            >
              😀 Reactions
            </button>

            {showReactions && (
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2
              bg-black/80 px-3 py-2 rounded-full flex gap-2 z-[9999]">
                {["❤️", "😀", "😂", "😢", "👍"].map((e) => (
                  <button
                    key={e}
                    onClick={() => sendReaction(e)}
                    className="text-2xl hover:scale-125 transition"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowCaption(v => !v)}
            className="px-4 py-2 rounded-full bg-white/10 text-white"
          >
            📝 Live Caption
          </button>
        </div>

        <ControlBar />
      </div>
    </div>
  );
}
