"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PreJoinScreen from "@/components/meeting/pre-join-screen";

function JoinMeetingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomCode = searchParams.get("room") || "";

  const handleJoin = (
    name: string,
    roomName?: string,
    video?: boolean,
    audio?: boolean
  ) => {
    if (!roomName) return;
    const params = new URLSearchParams({
      name: name || "Guest",
      video: video ? "1" : "0",
      audio: audio ? "1" : "0",
    });
    router.push(`/meeting/${roomName}?${params.toString()}`);
  };

  return (
    <PreJoinScreen
      onJoin={handleJoin}
      meetingCode={roomCode}
      isHost={false}
    />
  );
}

export default function JoinMeetingPage() {
  return (
    <Suspense fallback={null}>
      <JoinMeetingContent />
    </Suspense>
  );
}
