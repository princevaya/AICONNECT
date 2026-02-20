"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  LiveKitRoom,
  ControlBar,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useMaybeParticipantContext,
  useTracks,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2, MessageSquare, Users, X } from "lucide-react";
import { Participant, Track } from "livekit-client";
import ChatWindow from "@/components/chat/ChatWindow";
import ParticipantsPanel from "@/components/meeting/participants-panel";
import LiveCodePanel from "./live-code-panel";
import { Button } from "@/components/ui/button";

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type RecordingLike = {
  roomName?: string;
  status?: string | number;
  statusCode?: number;
  egressId?: string;
  id?: string;
};

type SpeechRecognitionWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };

interface MeetingRoomProps {
  roomName: string;
  participantName: string;
  videoEnabled?: boolean;
  audioEnabled?: boolean;
  onLeave: () => void;
}

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

function MeetingLayout() {
  const room = useRoomContext();
  const encoder = new TextEncoder();

  const [showChat, setShowChat] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showLiveCode, setShowLiveCode] = useState(false);
  const [showCaption, setShowCaption] = useState(false);
  const [captionText, setCaptionText] = useState("");
  const [fullscreenParticipantId, setFullscreenParticipantId] = useState<string | null>(null);

  const [handRaised, setHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState<Record<string, boolean>>({});
  const [reactions, setReactions] = useState<string[]>([]);
  const [showReactions, setShowReactions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [egressId, setEgressId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [code, setCode] = useState(`export default function App() {
  return <h1>Hello Live Coding</h1>;
}`);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  useEffect(() => {
    if (!showCaption) return;

    const speechWindow = window as SpeechRecognitionWindow;
    const SpeechRecognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Live Caption not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setCaptionText(text);
    };

    recognition.start();
    return () => recognition.stop();
  }, [showCaption]);

  const toggleRaiseHand = () => {
    if (!room) return;

    const value = !handRaised;
    setHandRaised(value);
    setRaisedHands((prev) => ({
      ...prev,
      [room.localParticipant.identity]: value,
    }));

    room.localParticipant.publishData(
      encoder.encode(
        JSON.stringify({
          type: "hand",
          value,
          identity: room.localParticipant.identity,
        })
      ),
      { reliable: true }
    );
  };

  const sendReaction = (emoji: string) => {
    if (!room) return;

    room.localParticipant.publishData(
      encoder.encode(JSON.stringify({ type: "reaction", emoji })),
      { reliable: false }
    );

    setReactions((prev) => [...prev, emoji]);
    setTimeout(() => {
      setReactions((prev) => prev.slice(1));
    }, 2000);

    setShowReactions(false);
  };

  const checkActiveRecording = useCallback(async () => {
    try {
      const roomName = room?.name || "";
      if (!roomName) {
        setIsRecording(false);
        setEgressId(null);
        return;
      }
      const res = await fetch(
        `/api/livekit/recordings?room=${encodeURIComponent(roomName)}`,
        { cache: "no-store" }
      );

      if (!res.ok) {
        setIsRecording(false);
        setEgressId(null);
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        setIsRecording(false);
        setEgressId(null);
        return;
      }

      const data = await res.json();
      const list: RecordingLike[] = Array.isArray(data) ? (data as RecordingLike[]) : [];

      const active = list.find((recording) => {
        if (recording.roomName && recording.roomName !== roomName) {
          return false;
        }

        const status = recording.status;
        if (typeof status === "string") {
          return (
            status !== "EGRESS_COMPLETE" &&
            status !== "EGRESS_ABORTED" &&
            status !== "EGRESS_FAILED"
          );
        }
        if (typeof status === "number") {
          return status >= 0 && status <= 2;
        }

        if (typeof recording.statusCode === "number") {
          return recording.statusCode === 1 || recording.statusCode === 2;
        }

        return false;
      });

      if (active) {
        setIsRecording(true);
        setEgressId(active.egressId ?? active.id ?? null);
      } else {
        setIsRecording(false);
        setEgressId(null);
      }
    } catch (error) {
      console.error("Failed to check active recording", error);
    }
  }, [room?.name]);

  useEffect(() => {
    checkActiveRecording();
    const interval = setInterval(checkActiveRecording, 10000);
    return () => clearInterval(interval);
  }, [checkActiveRecording]);

  const toggleRecording = async () => {
    if (isProcessing || !room) return;
    setIsProcessing(true);

    try {
      if (isRecording && egressId) {
        const res = await fetch("/api/livekit/recordings/stop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ egressId, roomName: room.name }),
        });

        if (res.ok) {
          setIsRecording(false);
          setEgressId(null);
          await checkActiveRecording();
        } else {
          const errorText = await res.text().catch(() => "");
          alert(`Failed to stop recording: ${errorText || res.statusText}`);
        }
      } else {
        const res = await fetch("/api/livekit/recordings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName: room.name }),
        });

        if (res.ok) {
          const data = await res.json();
          setEgressId(data.egressId);
          setIsRecording(true);
          await checkActiveRecording();
        } else {
          const errorData = await res.json().catch(() => null);
          const message = errorData?.error || "Unknown error";
          alert(`Failed to start recording: ${message}`);
        }
      }
    } catch (error) {
      console.error("Error toggling recording:", error);
      alert("An error occurred while processing the recording request.");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!room) return;

    const handler = (payload: Uint8Array, participant?: Participant) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload)) as {
          type?: string;
          emoji?: string;
          value?: boolean;
          identity?: string;
          name?: string;
        };

        if (data.type === "reaction" && data.emoji) {
          setReactions((prev) => [...prev, data.emoji as string]);
          setTimeout(() => {
            setReactions((prev) => prev.slice(1));
          }, 2000);
        }

        if (data.type === "hand") {
          const senderIdentity = participant?.identity || data.identity || data.name;
          if (!senderIdentity) return;

          setRaisedHands((prev) => ({
            ...prev,
            [senderIdentity]: Boolean(data.value),
          }));
        }
      } catch {
        // Ignore non-JSON payloads.
      }
    };

    room.on("dataReceived", handler);

    return () => {
      room.off("dataReceived", handler);
    };
  }, [room]);

  return (
    <div className="h-full flex flex-col bg-black">
      <RoomAudioRenderer />

      {showLiveCode && <LiveCodePanel code={code} onChange={setCode} />}

      {showCaption && (
        <div className="fixed bottom-36 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm z-[9999]">
          {captionText || "Listening..."}
        </div>
      )}

      {reactions.map((emoji, i) => (
        <div
          key={`${emoji}-${i}`}
          className="fixed bottom-40 left-1/2 -translate-x-1/2 text-4xl animate-bounce z-[9999]"
        >
          {emoji}
        </div>
      ))}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-2">
          <GridLayout tracks={tracks} style={{ height: "100%" }}>
            <ParticipantTile className="rounded-xl border-2 border-emerald-400/80">
              <TileProfileBadge raisedHands={raisedHands} />
            </ParticipantTile>
          </GridLayout>
        </div>

        <div
          className={`${
            showParticipants ? "" : "hidden"
          } fixed inset-y-0 right-0 z-40 w-[88vw] max-w-80 border-l bg-black/95 md:static md:w-80 md:bg-transparent`}
        >
          <ParticipantsPanel raisedHands={raisedHands} />
        </div>

        <div
          className={`${
            showChat ? "" : "hidden"
          } fixed inset-y-0 right-0 z-40 w-[96vw] border-l bg-black/95 md:static md:w-[28rem] md:bg-transparent`}
        >
          <ChatWindow
            roomId={room?.name || ""}
            isOpen={showChat}
            onUnreadCountChange={setUnreadChatCount}
          />
        </div>
      </div>

      <div className="relative">
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <Button
            size="lg"
            onClick={() => setShowParticipants((v) => !v)}
            className="rounded-full h-11 w-11 p-0 bg-white/10 text-white md:h-14 md:w-14"
          >
            {showParticipants ? <X /> : <Users />}
          </Button>
          <Button
            size="lg"
            onClick={() => setShowChat((prev) => !prev)}
            className="relative rounded-full h-11 w-11 p-0 bg-white/10 text-white md:h-14 md:w-14"
          >
            {showChat ? <X /> : <MessageSquare />}
            {!showChat && unreadChatCount > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] leading-5 text-center">
                {unreadChatCount > 99 ? "99+" : unreadChatCount}
              </span>
            ) : null}
          </Button>
        </div>

        <div className="absolute bottom-24 left-1/2 z-50 flex max-w-[94vw] -translate-x-1/2 flex-wrap justify-center gap-2 md:gap-3">
          <button
            onClick={toggleRecording}
            disabled={isProcessing}
            className={`rounded-full px-3 py-2 text-xs font-medium transition-colors md:px-4 md:text-sm ${
              isRecording
                ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
          >
            <span
              className={`w-3 h-3 rounded-full inline-block mr-2 ${
                isRecording ? "bg-white" : "bg-red-500"
              }`}
            />
            {isProcessing ? "Processing..." : isRecording ? "Recording" : "Start Recording"}
          </button>

          <button
            onClick={() => setShowLiveCode((v) => !v)}
            className="rounded-full bg-white/10 px-3 py-2 text-xs text-white md:px-4 md:text-sm"
          >
            Live Code
          </button>

          <button
            onClick={toggleRaiseHand}
            className={`rounded-full px-3 py-2 text-xs text-white transition md:px-4 md:text-sm ${
              handRaised ? "bg-yellow-500" : "bg-white/10"
            }`}
          >
            {handRaised ? "Hand Raised" : "Raise Hand"}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowReactions((v) => !v)}
              className="rounded-full bg-white/10 px-3 py-2 text-xs text-white md:px-4 md:text-sm"
            >
              Reactions
            </button>

            {showReactions && (
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-black/80 px-3 py-2 rounded-full flex gap-2 z-[9999]">
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
            onClick={() => setShowCaption((v) => !v)}
            className="rounded-full bg-white/10 px-3 py-2 text-xs text-white md:px-4 md:text-sm"
          >
            Live Caption
          </button>
        </div>

        <ControlBar />
      </div>
    </div>
  );
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function avatarColorClass(identity: string) {
  const colors = [
    "bg-rose-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-lime-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-fuchsia-500",
  ];

  let hash = 0;
  for (let i = 0; i < identity.length; i++) {
    hash = (hash * 31 + identity.charCodeAt(i)) >>> 0;
  }

  return colors[hash % colors.length];
}

function TileProfileBadge({
  raisedHands,
}: {
  raisedHands: Record<string, boolean>;
}) {
  const participant = useMaybeParticipantContext();
  if (!participant) return null;

  const displayName = participant.name || participant.identity;
  const initials = initialsFromName(displayName);
  const avatarColor = avatarColorClass(participant.identity);
  const isHandRaised = Boolean(raisedHands[participant.identity]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 pointer-events-none">
      {isHandRaised && (
        <span
          className="absolute top-2 right-2 h-6 w-6 rounded-full bg-yellow-400/120 text-black text-xl leading-none flex items-center justify-center shadow backdrop-blur-sm"
          title="Hand raised"
        >
          ✋
        </span>
      )}
      <div
        className={`relative h-28 w-28 rounded-full ${avatarColor} flex items-center justify-center text-4xl font-bold text-white shadow-2xl ring-4 ring-white/20`}
        title={displayName}
      >
        {initials}
      </div>
      <span className="max-w-52 truncate rounded-full bg-black/60 px-4 py-1 text-sm font-semibold text-white backdrop-blur-sm">
        {displayName}
      </span>
    </div>
  );
}
