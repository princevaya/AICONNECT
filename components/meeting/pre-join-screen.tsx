"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Video, VideoOff, Mic, MicOff, Clock, AlertCircle, PhoneOff, Key } from "lucide-react";
import { copyToClipboard as utilCopyToClipboard } from "@/lib/utils";

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

  // Time-based joining properties
  const [meetingDetails, setMeetingDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(0);
  
  // Passcode settings
  const [passwordInput, setPasswordInput] = useState("");

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
    if (!canUseMediaApi()) {
      setJoinError("Camera access requires a secure context (HTTPS or localhost). Please run on localhost or configure HTTPS/Chrome flags.");
      return;
    }
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
    if (!canUseMediaApi()) {
      setJoinError("Microphone access requires a secure context (HTTPS or localhost). Please run on localhost or configure HTTPS/Chrome flags.");
      return;
    }
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

  /* ---------- POLL MEETING STATUS ---------- */
  const fetchStatus = useCallback(async () => {
    if (!roomName.trim()) return;
    try {
      const res = await fetch(`/api/meetings/${encodeURIComponent(roomName)}/status`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setMeetingDetails(data);
        
        const scheduledTime = new Date(data.scheduledFor).getTime();
        const diff = Math.floor((scheduledTime - Date.now()) / 1000);
        if (diff > 0) {
          setSecondsLeft(diff);
        } else {
          setSecondsLeft(0);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch meeting status:", e);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [roomName]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Countdown timer ticking
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const formatCountdown = (secs: number) => {
    if (secs <= 0) return "";
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0 || d > 0) parts.push(`${h}h`);
    if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
    parts.push(`${String(s).padStart(2, "0")}s`);
    
    return parts.join(" ");
  };

  const viewerTz = useMemo(() => {
    return typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  }, []);

  const formatScheduledTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      const dateStr = d.toLocaleDateString(undefined, { dateStyle: "full" });
      const timeStr = d.toLocaleTimeString(undefined, { timeStyle: "long" });
      return `${dateStr} at ${timeStr} (${viewerTz})`;
    } catch {
      return isoString;
    }
  };

  /* ---------- JOIN FLOW ---------- */
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

    // Passcode validation check (if required)
    if (meetingDetails?.meetingPassword && !isHost) {
      if (passwordInput.trim() !== meetingDetails.meetingPassword) {
        setJoinError("Incorrect meeting passcode password. Please try again.");
        return;
      }
    }

    // 🔥 HOST FLOW
    if (isHost) {
      onJoin(participantName, roomName, isVideoEnabled, isAudioEnabled);
      return;
    }

    // Check if waiting room option is enabled
    if (meetingDetails?.waitingRoom) {
      // 🔥 JOINER LOBBY FLOW (approval required)
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
    } else {
      // Direct Join
      onJoin(participantName, roomName, isVideoEnabled, isAudioEnabled);
    }
  };

  /* ---------- LOBBY POLL APPROVAL ---------- */
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
      const ok = await utilCopyToClipboard(text);
      if (!ok) throw new Error("Copy failed");
      setCopyMessage(successLabel);
      setTimeout(() => setCopyMessage(null), 1800);
    } catch {
      setCopyMessage("Copy failed. Please copy manually.");
      setTimeout(() => setCopyMessage(null), 2200);
    }
  };

  /* ---------- WAITING ROOM UI CONTROLLER ---------- */
  const waitState = useMemo(() => {
    if (isHost || isLoadingDetails || !meetingDetails) return null;
    
    // If allowJoinBeforeHost is true, they bypass waiting state
    if (meetingDetails.allowJoinBeforeHost) return null;

    const status = meetingDetails.status;

    // 1. Scheduled: Before meeting time
    if ((status === "Scheduled" || status === "WaitingForHost") && secondsLeft > 0) {
      return {
        type: "Scheduled",
        badge: "Scheduled",
        title: "This meeting has not started yet.",
        description: `Meeting starts at: ${formatScheduledTime(meetingDetails.scheduledFor)}`,
        showCountdown: true,
      };
    }

    // 2. Waiting for Host: At meeting time, but host has not joined (not Live)
    if (status === "Scheduled" || status === "WaitingForHost") {
      return {
        type: "WaitingForHost",
        badge: "Waiting for Host",
        title: "The meeting has not been started by the host yet.",
        description: "Please wait while the host starts the meeting.",
        showSpinner: true,
      };
    }

    // 3. Meeting Ended: Completed or closed
    if (status === "Completed") {
      return {
        type: "Completed",
        badge: "Meeting Ended",
        title: "This meeting has ended.",
        description: "Further entries to this meeting room have been disabled.",
      };
    }

    // 4. Cancelled
    if (status === "Cancelled") {
      return {
        type: "Cancelled",
        badge: "Cancelled",
        title: "Meeting cancelled.",
        description: "This scheduled meeting has been cancelled by the host.",
      };
    }

    return null;
  }, [meetingDetails, isLoadingDetails, secondsLeft, isHost]);

  /* ---------- WAITING SCREEN RENDER ---------- */
  if (waitState) {
    const isScheduled = waitState.type === "Scheduled";
    const isWaiting = waitState.type === "WaitingForHost";
    const isCompleted = waitState.type === "Completed";
    const isCancelled = waitState.type === "Cancelled";

    let color = "bg-blue-500/10 text-indigo-500 border-indigo-500/20";
    let Icon = Clock;

    if (isWaiting) {
      color = "bg-amber-500/10 text-amber-500 border-amber-500/20";
      Icon = Loader2;
    } else if (isCompleted) {
      color = "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
      Icon = PhoneOff;
    } else if (isCancelled) {
      color = "bg-rose-500/10 text-rose-500 border-rose-500/20";
      Icon = AlertCircle;
    }

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-border/80 text-center">
          <CardHeader className="flex flex-col items-center pb-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${color} mb-3`}>
              {isWaiting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}
              {waitState.badge}
            </span>
            <CardTitle className="text-xl font-extrabold tracking-tight mt-1">
              {waitState.title}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-xs">
              {waitState.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4 pb-6">
            {isScheduled && (
              <div className="bg-secondary/40 border rounded-2xl p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Starts In
                </p>
                <div className="font-mono text-3xl font-extrabold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                  {formatCountdown(secondsLeft)}
                </div>
              </div>
            )}

            {isWaiting && (
              <div className="flex flex-col items-center py-6">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-indigo-500 animate-pulse" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4 animate-pulse">
                  Auto-refreshing status...
                </p>
              </div>
            )}

            {(isCompleted || isCancelled) && (
              <div className="py-6 flex flex-col items-center">
                <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            )}

            <Button
              className="w-full mt-4"
              disabled={true}
            >
              Join Meeting
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------- STANDARD PRE-JOIN SCREEN ---------- */
  return (
    <div className="min-h-screen bg-background px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
        <header className="flex justify-between items-center border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
              Ready to join?
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base mt-0.5">
              Set up your camera and microphone before joining
            </p>
          </div>
          {meetingDetails && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
              <Video className="h-3 w-3" />
              Live Room
            </span>
          )}
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          {/* Video Preview */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-border/80">
              <CardContent className="p-3 sm:p-6">
                <div className="relative aspect-video bg-secondary/30 border rounded-lg overflow-hidden flex items-center justify-center">
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
                      <p className="text-muted-foreground text-sm font-medium">
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
                    className="w-12 h-12 rounded-full p-0"
                  >
                    {isVideoEnabled ? <Video /> : <VideoOff />}
                  </Button>

                  <Button
                    variant={isAudioEnabled ? "default" : "outline"}
                    onClick={toggleAudio}
                    disabled={mediaBusy}
                    className="w-12 h-12 rounded-full p-0"
                  >
                    {isAudioEnabled ? <Mic /> : <MicOff />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            <Card className="shadow-lg border-border/80">
              <CardHeader>
                <CardTitle className="text-lg font-bold">
                  {isHost ? "Start Meeting" : "Join Meeting"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Display Name
                  </Label>
                  <Input
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    placeholder="Enter display name"
                    className="mt-1 focus-visible:ring-indigo-500"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Room Code
                  </Label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      value={roomName}
                      disabled={true}
                      onChange={(e) => setRoomName(e.target.value)}
                      className="bg-secondary/40 font-mono"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void copyToClipboard(roomName.trim(), "Room code copied.");
                      }}
                      disabled={!roomName.trim()}
                      className="hover:bg-secondary shrink-0"
                    >
                      Copy
                    </Button>
                  </div>

                  {isHost && meetingCode && (
                    <>
                      <p className="text-xs mt-2 font-medium text-muted-foreground">
                        Room ID: <span className="font-mono text-foreground font-bold">{meetingCode}</span>
                      </p>

                      <div className="mt-3 flex gap-2">
                        <Input value={inviteLink} readOnly className="text-xs font-mono bg-secondary/40" />
                        <Button
                          size="sm"
                          onClick={() => {
                            void copyToClipboard(inviteLink, "Invite link copied.");
                          }}
                          className="bg-indigo-600 text-white hover:bg-indigo-700 shrink-0"
                        >
                          Copy
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                {/* Password Passcode input if required */}
                {meetingDetails?.meetingPassword && !isHost && (
                  <div className="transition-all duration-300">
                    <Label className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1">
                      <Key className="h-3 w-3" />
                      Passcode Password Required
                    </Label>
                    <Input
                      type="password"
                      placeholder="Enter meeting password passcode"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="mt-1 focus-visible:ring-amber-500 border-amber-300 bg-amber-500/[0.02]"
                    />
                  </div>
                )}

                {joinError ? (
                  <div className="flex items-center gap-2 border border-red-200 bg-red-50 p-3 rounded-lg text-xs text-red-700 font-medium">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{joinError}</span>
                  </div>
                ) : null}
                {joinMessage ? <p className="text-xs text-emerald-600 font-semibold">{joinMessage}</p> : null}
                {copyMessage ? <p className="text-xs text-muted-foreground font-medium">{copyMessage}</p> : null}
              </CardContent>
            </Card>

            <Button
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/20"
              onClick={handleJoinMeeting}
              disabled={waitingForApproval || mediaBusy}
            >
              {waitingForApproval ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isHost ? "Start Meeting" : "Join Meeting"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
