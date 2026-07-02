"use client";

import React, { useState, useEffect, useRef } from "react";
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

    let cancelled = false;

    const checkApproval = async () => {
      try {
        const res = await fetch(
          `/api/check-approval?roomId=${encodeURIComponent(roomName)}&name=${encodeURIComponent(
            participantName
          )}`,
          { cache: "no-store" }
        );
        const data = await res.json();

        if (cancelled) return;

        if (data.approved) {
          setWaitingForApproval(false);
          setJoinMessage("Approved. Joining now...");
          onJoin(participantName, roomName, isVideoEnabled, isAudioEnabled);
          return;
        }

        if (data.rejected) {
          setWaitingForApproval(false);
          setJoinError("Host rejected your join request.");
        }
      } catch {
        if (!cancelled) {
          setJoinError("Unable to check approval status. Please retry.");
          setWaitingForApproval(false);
        }
      }
    };

    // Check immediately, then keep polling quickly for near-instant joins.
    void checkApproval();

    const interval = setInterval(async () => {
      void checkApproval();
    }, 700);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [waitingForApproval, participantName, roomName, isVideoEnabled, isAudioEnabled, onJoin]);

  const copyToClipboard = async (text: string, successLabel: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage(successLabel);
      setTimeout(() => setCopyMessage(null), 1800);
    } catch {
      setCopyMessage("Copy failed. Please copy manually.");
      setTimeout(() => setCopyMessage(null), 2200);
    }
  };

  return (
    <div className="min-h-screen bg-background px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
        <header>
          <h1 className="text-2xl font-bold sm:text-3xl">Ready to join?</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Set up your camera and microphone before joining
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          {/* Video Preview */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-3 sm:p-6">
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
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
                      <VideoOff className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Camera is off
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-center gap-3 sm:mt-6 sm:gap-4">
                  <Button
                    variant={isVideoEnabled ? "default" : "outline"}
                    onClick={toggleVideo}
                    disabled={mediaBusy}
                  >
                    {isVideoEnabled ? <Video /> : <VideoOff />}
                  </Button>

                  <Button
                    variant={isAudioEnabled ? "default" : "outline"}
                    onClick={toggleAudio}
                    disabled={mediaBusy}
                  >
                    {isAudioEnabled ? <Mic /> : <MicOff />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {isHost ? "Start Meeting" : "Join Meeting"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Display Name</Label>
                  <Input
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Room Code</Label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      value={roomName}
                      disabled={!!meetingCode}
                      onChange={(e) => setRoomName(e.target.value)}
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
                      <p className="text-xs mt-2">
                        Room ID: {meetingCode}
                      </p>

                      <div className="mt-3 flex gap-2">
                        <Input value={inviteLink} readOnly />
                        <Button
                          size="sm"
                          onClick={() => {
                            void copyToClipboard(inviteLink, "Invite link copied.");
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                {joinError ? (
                  <p className="text-sm text-red-600">{joinError}</p>
                ) : null}
                {joinMessage ? <p className="text-sm text-emerald-600">{joinMessage}</p> : null}
                {copyMessage ? <p className="text-xs text-muted-foreground">{copyMessage}</p> : null}
              </CardContent>
            </Card>

            <Button className="w-full" onClick={handleJoinMeeting} disabled={waitingForApproval || mediaBusy}>
              {waitingForApproval ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isHost ? "Start Meeting" : "Join Meeting"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
