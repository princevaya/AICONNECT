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
    if (closingRef.current) {
      return;
    }
    closingRef.current = true;

    try {
      await fetch(`/api/rooms/${encodeURIComponent(roomName)}`, {
        method: "DELETE",
      });
    } catch (apiError) {
      console.error("Failed to remove meeting from schedule", apiError);
    } finally {
      onLeave();
    }
  }, [roomName, onLeave]);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/livekit/token?room=${encodeURIComponent(
            roomName
          )}&username=${encodeURIComponent(participantName)}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch token");
        }

        const data = await response.json();
        setToken(data.token);
        setError("");
      } catch (err) {
        console.error("Error fetching token:", err);
        setError("Failed to connect to meeting. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchToken();
  }, [roomName, participantName]);

  if (isLoading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">Connecting to meeting...</p>
          <p className="text-sm text-muted-foreground mt-2">Room: {roomName}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-lg text-destructive mb-4">{error}</p>
          <button
            onClick={exitRoom}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!token) {
    return null;
  }

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!serverUrl) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white max-w-md">
          <p className="text-lg text-destructive mb-4">
            LiveKit not configured
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Please add NEXT_PUBLIC_LIVEKIT_URL to your .env.local file
          </p>
          <button
            onClick={exitRoom}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={videoEnabled}
      audio={audioEnabled}
      token={token}
      serverUrl={serverUrl}
      data-lk-theme="default"
      onDisconnected={exitRoom}
      style={{ height: "100vh" }}
      options={{
        publishDefaults: {
          videoSimulcastLayers: undefined,
          ...(videoDeviceId && { videoDeviceId }),
          ...(audioDeviceId && { audioDeviceId }),
        },
      }}
    >
      <MeetingLayout roomName={roomName} />
    </LiveKitRoom>
  );
}

function MeetingLayout({ roomName }: { roomName: string }) {
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleNewMessage = useCallback(() => {
    setUnreadCount((prev) => prev + 1);
  }, []);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <div className="h-full flex flex-col bg-black">
      <RoomAudioRenderer />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main video area */}
        <div className="flex-1 p-2">
          <GridLayout tracks={tracks} style={{ height: "100%", width: "100%" }}>
            <ParticipantTile />
          </GridLayout>
        </div>

        {/* Chat panel */}
        <div
          className={`w-80 border-l border-border bg-background ${
            showChat ? "" : "hidden"
          }`}
        >
          <ChatPanel onNewMessage={!showChat ? handleNewMessage : undefined} />
        </div>
      </div>

      {/* Controls bar */}
      <div className="relative">
        <RecordingControls roomName={roomName} />
        <div className="absolute top-4 right-4 z-50">
          <div className="relative">
            <Button
              size="lg"
              variant={showChat ? "default" : "outline"}
              onClick={() => {
                setShowChat(!showChat);
                if (!showChat) {
                  setUnreadCount(0);
                }
              }}
              className="rounded-full h-14 w-14 p-0 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border-white/20"
            >
              {showChat ? (
                <X className="h-6 w-6" />
              ) : (
                <MessageSquare className="h-6 w-6" />
              )}
            </Button>
            {!showChat && unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </div>
            )}
          </div>
        </div>
        <ControlBar />
      </div>
    </div>
  );
}

type RecordingPollingResult = {
  status?: string | number;
  statusCode?: number;
  roomName?: string;
  egressId?: string;
  id?: string;
};

function RecordingControls({ roomName }: { roomName: string }) {
  const [isRecording, setIsRecording] = useState(false);
  const [egressId, setEgressId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const checkActiveRecording = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/livekit/recordings?room=${encodeURIComponent(roomName)}`,
        { cache: "no-store" }
      );

      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || "Unable to list recordings");
      }

      const data = await res.json();
      const list: RecordingPollingResult[] = Array.isArray(data) ? data : [];

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
  }, [roomName]);

  useEffect(() => {
    checkActiveRecording();
    const interval = setInterval(checkActiveRecording, 10000);
    return () => clearInterval(interval);
  }, [checkActiveRecording]);

  // Handle page unload/navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRecording) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isRecording]);

  const toggleRecording = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (isRecording && egressId) {
        // Stop recording
        const res = await fetch("/api/livekit/recordings/stop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ egressId, roomName }),
        });

        if (res.ok) {
          setIsRecording(false);
          setEgressId(null);
          await checkActiveRecording();
        } else {
          const errorText = await res.text();
          console.error("Failed to stop recording:", res.status, errorText);
          alert(`Failed to stop recording: ${errorText || res.statusText}`);
        }
      } else {
        // Start recording
        const res = await fetch("/api/livekit/recordings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName }),
        });

        if (res.ok) {
          const data = await res.json();
          setEgressId(data.egressId);
          setIsRecording(true);
          await checkActiveRecording();
        } else {
          const errorData = await res.json().catch(() => null);
          const message = errorData?.error || "Unknown error";
          console.error("Failed to start recording", errorData);
          alert(`Failed to start recording: ${message}`);
        }
      }
    } catch (error) {
      console.error("Error toggling recording:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute top-4 left-4 z-50 flex gap-2">
      <button
        onClick={toggleRecording}
        disabled={isProcessing}
        className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors ${
          isRecording
            ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
            : "bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
        }`}
      >
        <div
          className={`w-3 h-3 rounded-full ${
            isRecording ? "bg-white" : "bg-red-500"
          }`}
        />
        {isProcessing
          ? "Processing..."
          : isRecording
          ? "Recording"
          : "Start Recording"}
      </button>
      <button
        onClick={copyLink}
        className="flex items-center gap-2 px-4 py-2 rounded-full font-medium bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors"
      >
        {copied ? "Copied!" : "Copy Link"}
      </button>
    </div>
  );
}
