"use client";

import { useRouter, useSearchParams } from "next/navigation";
import PreJoinScreen from "@/components/meeting/pre-join-screen";

export default function JoinMeetingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ get room code from URL
  const meetingCode = searchParams.get("room") || "";

  const handleJoin = (
    name: string,
    roomName?: string
  ) => {
    if (!roomName) return;
    router.push(`/meeting/${roomName}`);
  };

  return (
    <PreJoinScreen
      onJoin={handleJoin}
      meetingCode={meetingCode}
      isHost={false}
    />
  );
}