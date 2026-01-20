"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import PreJoinScreen from "@/components/meeting/pre-join-screen";
import MeetingRoom from "@/components/meeting/meeting-room";

export default function MeetingPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [hasJoined, setHasJoined] = useState(false);
  const [participantName, setParticipantName] = useState("");
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoDeviceId, setVideoDeviceId] = useState<string>();
  const [audioDeviceId, setAudioDeviceId] = useState<string>();

  const meetingCode = params.code as string;

  useEffect(() => {
    // If no meeting code or user not loaded, redirect to dashboard
    if (!meetingCode || (isLoaded && !user)) {
      router.push("/dashboard");
    }
  }, [meetingCode, router, isLoaded, user]);

  const handleJoin = (
    name: string,
    roomName?: string,
    video?: boolean,
    audio?: boolean,
    videoDev?: string,
    audioDev?: string
  ) => {
    // Use authenticated user's name instead of provided name
    const userName =
      user?.fullName || user?.firstName || user?.username || "User";
    setParticipantName(userName);
    setVideoEnabled(video ?? true);
    setAudioEnabled(audio ?? true);
    setVideoDeviceId(videoDev);
    setAudioDeviceId(audioDev);
    setHasJoined(true);
  };

  const handleLeave = () => {
    setHasJoined(false);
    setParticipantName("");
    router.push("/dashboard");
  };

  if (!meetingCode || !isLoaded) {
    return null;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-4">Please sign in to join the meeting</p>
          <Button onClick={() => router.push("/auth/sign-in")}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {!hasJoined ? (
        <PreJoinScreen onJoin={handleJoin} meetingCode={meetingCode} />
      ) : (
        <MeetingRoom
          roomName={meetingCode}
          participantName={participantName}
          videoEnabled={videoEnabled}
          audioEnabled={audioEnabled}
          videoDeviceId={videoDeviceId}
          audioDeviceId={audioDeviceId}
          onLeave={handleLeave}
        />
      )}
    </div>
  );
}
