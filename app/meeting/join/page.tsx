"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PreJoinScreen from "@/components/meeting/pre-join-screen";

function JoinMeetingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomCode = searchParams.get("room") || "";
  const direct = searchParams.get("direct") === "1";

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
      direct: direct ? "1" : "0",
    });
    router.push(`/meeting/${roomName}?${params.toString()}`);
  };

  if (direct && roomCode) {
    // Personal (1:1) calls: skip the pre-join screen and go directly in.
    // Defaults: Guest + mic/cam enabled (meeting page may still respect query params).
    const params = new URLSearchParams({
      name: "Guest",
      video: "1",
      audio: "1",
      direct: "1",
    });
    router.replace(`/meeting/${roomCode}?${params.toString()}`);
    return null;
  }

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
