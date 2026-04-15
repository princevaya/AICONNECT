"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PreJoinScreen from "@/components/meeting/pre-join-screen";

function JoinMeetingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const meetingCode = searchParams.get("room") || "";
  // ✅ FIX Bug 1: read host from URL instead of hardcoding false
  const isHost = searchParams.get("host") === "true";

  const handleJoin = (
    name: string,
    roomName?: string,
    video?: boolean,
    audio?: boolean
  ) => {
    if (!roomName) return;

    const params = new URLSearchParams({
      name,
      video: video === false ? "0" : "1",
      audio: audio === false ? "0" : "1",
    });

    router.push(`/meeting/${encodeURIComponent(roomName)}?${params.toString()}`);
  };

  return (
    <PreJoinScreen
      onJoin={handleJoin}
      meetingCode={meetingCode}
      isHost={isHost}
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