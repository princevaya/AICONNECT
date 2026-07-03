"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import PreJoinScreen from "@/components/meeting/pre-join-screen";

function JoinMeetingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && !user) {
      router.replace(`/auth/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`);
    }
  }, [isLoaded, user, router]);

  const meetingCode = searchParams.get("room") || "";
  // ✅ FIX Bug 1: read host from URL instead of hardcoding false
  const isHost = searchParams.get("host") === "true";

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Redirecting to login...</p>
      </div>
    );
  }

  const handleJoin = (
    name: string,
    roomName?: string,
    video?: boolean,
    audio?: boolean
  ) => {
    if (!roomName) return;

    const params = new URLSearchParams({
      name: name || "Guest",
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
