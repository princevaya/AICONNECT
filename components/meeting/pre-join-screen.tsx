"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Video, VideoOff, Mic, MicOff } from "lucide-react";

interface PreJoinScreenProps {
  onJoin: (
    name: string,
    roomName?: string,
    videoEnabled?: boolean,
    audioEnabled?: boolean
  ) => void;
  meetingCode?: string;
  isHost?: boolean;
}

export default function PreJoinScreen({
  onJoin,
  meetingCode,
  isHost = false,
}: PreJoinScreenProps) {
  const [participantName, setParticipantName] = useState("");
  const [roomName, setRoomName] = useState(meetingCode || "");
  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [mediaBusy, setMediaBusy] = useState(false);

  const inviteLink =
    typeof window !== "undefined" && meetingCode
      ? `${window.location.origin}/meeting/join?room=${meetingCode}`
      : "";

  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const canUseMediaApi = () =>
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function";

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  const mergeStreamTracks = useCallback((nextTracks: MediaStreamTrack[], kind: "audio" | "video") => {
    setStream((prev) => {
      const keepTracks = (prev?.getTracks() || []).filter((track) => track.kind !== kind);
      return new MediaStream([...keepTracks, ...nextTracks]);
    });
  }, []);

  const toggleVideo = async () => {
    if (!canUseMediaApi()) return;
    setJoinError(null);
    setMediaBusy(true);
    try {
      if (!isVideoEnabled) {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTracks = videoStream.getVideoTracks();
        mergeStreamTracks(videoTracks, "video");
        setIsVideoEnabled(videoTracks.length > 0);
      } else {
        stream?.getVideoTracks().forEach((track) => track.stop());
        setStream((prev) => {
          const keepTracks = (prev?.getTracks() || []).filter((track) => track.kind !== "video");
          return keepTracks.length ? new MediaStream(keepTracks) : null;
        });
        setIsVideoEnabled(false);
      }
    } catch {
      setJoinError("Camera permission was denied or unavailable.");
    } finally {
      setMediaBusy(false);
    }
  };

  const toggleAudio = async () => {
    if (!canUseMediaApi()) return;
    setJoinError(null);
    setMediaBusy(true);
    try {
      if (!isAudioEnabled) {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        const audioTracks = audioStream.getAudioTracks();
        mergeStreamTracks(audioTracks, "audio");
        setIsAudioEnabled(audioTracks.length > 0);
      } else {
        stream?.getAudioTracks().forEach((track) => track.stop());
        setStream((prev) => {
          const keepTracks = (prev?.getTracks() || []).filter((track) => track.kind !== "audio");
          return keepTracks.length ? new MediaStream(keepTracks) : null;
        });
        setIsAudioEnabled(false);
      }
    } catch {
      setJoinError("Microphone permission was denied or unavailable.");
    } finally {
      setMediaBusy(false);
    }
  };

  const handleJoinMeeting = async () => {
    setJoinError(null);
    setJoinMessage(null);

    if (!participantName.trim()) {
      setJoinError("Please enter your display name.");
      return;
    }

    if (!roomName.trim()) {
      setJoinError("Room code missing.");
      return;
    }

    // 🔥 HOST FLOW
    if (isHost) {
      onJoin(participantName, roomName, isVideoEnabled, isAudioEnabled);
      return;
    }

    // 🔥 JOINER FLOW (approval required)
    const joinRes = await fetch("/api/request-join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: roomName,
        name: participantName,
      }),
    });

    if (!joinRes.ok) {
      const data = await joinRes.json().catch(() => ({}));
      setJoinError(data.error || "Unable to send join request. Please retry.");
      return;
    }

    const joinData = await joinRes.json().catch(() => ({}));
    if (joinData.status === "approved") {
      onJoin(participantName, roomName, isVideoEnabled, isAudioEnabled);
      return;
    }
    if (joinData.status === "rejected") {
      setJoinError("Host is not accepting new participants right now.");
      return;
    }

    setWaitingForApproval(true);
    setJoinMessage("Join request sent. Waiting for host approval.");
  };

  // 🔥 Poll approval
  useEffect(() => {
    if (!waitingForApproval) return;

    const interval = setInterval(async () => {
      const res = await fetch(
        `/api/check-approval?roomId=${roomName}&name=${participantName}`
      );
      const data = await res.json();

      if (data.approved) {
        clearInterval(interval);
        setWaitingForApproval(false);
        setJoinMessage("Approved. Joining now...");
        onJoin(participantName, roomName, isVideoEnabled, isAudioEnabled);
        return;
      }

      if (data.rejected) {
        clearInterval(interval);
        setWaitingForApproval(false);
        setJoinError("Host rejected your join request.");
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [waitingForApproval, participantName, roomName, isVideoEnabled, isAudioEnabled, onJoin]);

  const copyToClipboard = async (text: string, successLabel: string) => {
    try {
      const clipboardAvailable =
        typeof navigator !== "undefined" &&
        !!navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function";

      if (clipboardAvailable) {
        await navigator.clipboard.writeText(text);
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (!copied) {
          throw new Error("Clipboard fallback failed");
        }
      } else {
        throw new Error("Clipboard unavailable");
      }
      setCopyMessage(successLabel);
      setTimeout(() => setCopyMessage(null), 1800);
    } catch {
      setCopyMessage("Copy failed. Please copy manually.");
      setTimeout(() => setCopyMessage(null), 2200);
    }
  };

  return (
    <div className="h-screen bg-background overflow-hidden">
      <div className="h-full container mx-auto px-4 py-6 max-w-7xl flex flex-col">
        <header className="mb-4 flex-shrink-0 text-center">
          <h1 className="text-2xl font-bold sm:text-3xl">Ready to join?</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Set up your camera and microphone before joining
          </p>
        </header>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
          {/* Video Preview - takes 2/3 width */}
          <div className="lg:col-span-2 min-h-0">
            <Card className="h-full">
              <CardContent className="p-4 sm:p-6 h-full flex flex-col">
                <div className="relative bg-muted rounded-lg overflow-hidden flex items-center justify-center flex-1 min-h-0">
                  {isVideoEnabled ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <VideoOff className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground text-sm">
                        Camera is off
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex-shrink-0 flex justify-center gap-4">
                  <Button
                    variant={isVideoEnabled ? "default" : "outline"}
                    onClick={toggleVideo}
                    disabled={mediaBusy}
                    size="default"
                  >
                    {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                    <span className="ml-2 hidden sm:inline">
                      {isVideoEnabled ? "Camera On" : "Camera Off"}
                    </span>
                  </Button>

                  <Button
                    variant={isAudioEnabled ? "default" : "outline"}
                    onClick={toggleAudio}
                    disabled={mediaBusy}
                    size="default"
                  >
                    {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    <span className="ml-2 hidden sm:inline">
                      {isAudioEnabled ? "Mic On" : "Mic Off"}
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - takes 1/3 width */}
          <div className="lg:col-span-1 min-h-0">
            <Card className="h-full flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle>
                  {isHost ? "Start Meeting" : "Join Meeting"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 overflow-y-auto">
                <div>
                  <Label htmlFor="display-name">Display Name</Label>
                  <Input
                    id="display-name"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    placeholder="Your name"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="room-code">Room Code</Label>
                  <div className="mt-1.5 flex gap-2">
                    <Input
                      id="room-code"
                      value={roomName}
                      disabled={!!meetingCode}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="Enter room code"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void copyToClipboard(roomName.trim(), "Room code copied.");
                      }}
                      disabled={!roomName.trim()}
                    >
                      Copy
                    </Button>
                  </div>

                  {isHost && meetingCode && (
                    <>
                      <p className="text-xs mt-2 text-muted-foreground">
                        Room ID: {meetingCode}
                      </p>

                      <div className="mt-3">
                        <Label>Invite Link</Label>
                        <div className="mt-1.5 flex gap-2">
                          <Input value={inviteLink} readOnly className="text-sm" />
                          <Button
                            size="sm"
                            onClick={() => {
                              void copyToClipboard(inviteLink, "Invite link copied.");
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {joinError && (
                  <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
                    {joinError}
                  </div>
                )}
                {joinMessage && (
                  <div className="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-lg">
                    {joinMessage}
                  </div>
                )}
                {copyMessage && (
                  <p className="text-xs text-muted-foreground text-center">
                    {copyMessage}
                  </p>
                )}

                <Button
                  className="w-full mt-2"
                  onClick={handleJoinMeeting}
                  disabled={waitingForApproval || mediaBusy}
                >
                  {waitingForApproval && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isHost ? "Start Meeting" : "Join Meeting"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
