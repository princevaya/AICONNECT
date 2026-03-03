"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, VideoOff, Mic, MicOff } from "lucide-react";

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

  const toggleVideo = async () => {
    if (!canUseMediaApi()) return;

    if (!isVideoEnabled) {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      setStream(newStream);
      setIsVideoEnabled(true);
    } else {
      stream?.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsVideoEnabled(false);
    }
  };

  const toggleAudio = async () => {
    if (!canUseMediaApi()) return;

    if (!isAudioEnabled) {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      setStream(newStream);
      setIsAudioEnabled(true);
    } else {
      stream?.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsAudioEnabled(false);
    }
  };

  const handleJoinMeeting = async () => {
    setJoinError(null);

    if (!participantName.trim()) {
      alert("Please enter your display name");
      return;
    }

    if (!roomName.trim()) {
      alert("Room code missing");
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
    alert("Waiting for host approval...");
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Ready to join?</h1>
          <p className="text-muted-foreground">
            Set up your camera and microphone before joining
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Preview */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
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

                <div className="flex justify-center gap-4 mt-6">
                  <Button
                    variant={isVideoEnabled ? "default" : "outline"}
                    onClick={toggleVideo}
                  >
                    {isVideoEnabled ? <Video /> : <VideoOff />}
                  </Button>

                  <Button
                    variant={isAudioEnabled ? "default" : "outline"}
                    onClick={toggleAudio}
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
                  <Input
                    value={roomName}
                    disabled={!!meetingCode}
                    onChange={(e) => setRoomName(e.target.value)}
                  />

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
                            navigator.clipboard.writeText(inviteLink);
                            alert("Link copied!");
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
              </CardContent>
            </Card>

            <Button className="w-full" onClick={handleJoinMeeting}>
              {isHost ? "Start Meeting" : "Join Meeting"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
