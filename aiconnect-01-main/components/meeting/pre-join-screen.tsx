"use client";

import React, { useState, useEffect, useRef } from "react";
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
  const [roomName, setRoomName] = useState("");

  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  // ✅ AUTO-FILL ROOM CODE FROM URL PARAM
  useEffect(() => {
    if (meetingCode) {
      setRoomName(meetingCode);
    }
  }, [meetingCode]);

  // invite link (host only)
  const inviteLink =
    typeof window !== "undefined" && meetingCode
      ? `${window.location.origin}/meeting/join?room=${meetingCode}`
      : "";

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // VIDEO
  const toggleVideo = async () => {

    if (!navigator.mediaDevices) return;

    if (!isVideoEnabled) {

      const newStream =
        await navigator.mediaDevices.getUserMedia({
          video: true,
        });

      setStream(newStream);
      setIsVideoEnabled(true);

    } else {

      stream?.getTracks().forEach(t => t.stop());
      setStream(null);
      setIsVideoEnabled(false);

    }
  };

  // AUDIO
  const toggleAudio = async () => {

    if (!navigator.mediaDevices) return;

    if (!isAudioEnabled) {

      const newStream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      setStream(newStream);
      setIsAudioEnabled(true);

    } else {

      stream?.getTracks().forEach(t => t.stop());
      setStream(null);
      setIsAudioEnabled(false);

    }
  };

  // ✅ DIRECT JOIN (NO APPROVAL)
  const handleJoinMeeting = () => {

    if (!participantName.trim()) {
      alert("Enter display name");
      return;
    }

    if (!roomName.trim()) {
      alert("Room code missing");
      return;
    }

    onJoin(
      participantName,
      roomName,
      isVideoEnabled,
      isAudioEnabled
    );
  };

  return (

    <div className="min-h-screen bg-background p-6">

      <div className="max-w-6xl mx-auto space-y-6">

        <header>
          <h1 className="text-3xl font-bold">
            Ready to join?
          </h1>

          <p className="text-muted-foreground">
            Paste meeting link or enter room code
          </p>
        </header>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* VIDEO */}
          <div className="lg:col-span-2">

            <Card>

              <CardContent className="p-6">

                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">

                  {isVideoEnabled ? (

                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />

                  ) : (

                    <div className="text-center">

                      <VideoOff className="h-16 w-16 mx-auto mb-4 text-muted-foreground"/>

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
                    {isVideoEnabled ? <Video/> : <VideoOff/>}
                  </Button>


                  <Button
                    variant={isAudioEnabled ? "default" : "outline"}
                    onClick={toggleAudio}
                  >
                    {isAudioEnabled ? <Mic/> : <MicOff/>}
                  </Button>

                </div>

              </CardContent>

            </Card>

          </div>


          {/* RIGHT PANEL */}
          <div>

            <Card>

              <CardHeader>
                <CardTitle>
                  {isHost ? "Start Meeting" : "Join Meeting"}
                </CardTitle>
              </CardHeader>


              <CardContent className="space-y-4">

                {/* NAME */}
                <div>

                  <Label>Display Name</Label>

                  <Input
                    placeholder="Enter your name"
                    value={participantName}
                    onChange={(e) =>
                      setParticipantName(e.target.value)
                    }
                  />

                </div>


                {/* ROOM CODE / LINK */}
                <div>

                  <Label>Room Code or Invite Link</Label>

                  <Input
                    placeholder="Paste meeting link or enter code"
                    value={roomName}
                    disabled={!!meetingCode}
                    onChange={(e) => {

                      const value = e.target.value.trim();

                      // invite link pasted
                      if (value.includes("/meeting/join?room=")) {
                        try {
                          const url = new URL(value);
                          const code =
                            url.searchParams.get("room");

                          if (code) {
                            setRoomName(code);
                            return;
                          }
                        } catch {}
                      }

                      // direct meeting link
                      if (value.includes("/meeting/")) {
                        const parts =
                          value.split("/meeting/");

                        if (parts[1]) {
                          setRoomName(parts[1]);
                          return;
                        }
                      }

                      setRoomName(value);
                    }}
                  />

                </div>


                {/* HOST COPY LINK */}
                {isHost && meetingCode && (

                  <div className="flex gap-2">

                    <Input value={inviteLink} readOnly/>

                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(inviteLink);
                        alert("Link copied");
                      }}
                    >
                      Copy
                    </Button>

                  </div>

                )}

              </CardContent>

            </Card>


            {/* JOIN BUTTON */}
            <Button
              className="w-full mt-4"
              onClick={handleJoinMeeting}
            >
              {isHost ? "Start Meeting" : "Join Meeting"}
            </Button>

          </div>

        </div>

      </div>

    </div>

  );
}