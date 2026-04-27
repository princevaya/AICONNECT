"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import PreJoinScreen from "@/components/meeting/pre-join-screen";

function JoinMeetingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn } = useUser();

  const meetingCode = searchParams.get("room") || "";
  const isHost = searchParams.get("host") === "true";

  // Wait for Clerk to finish loading
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // If not signed in, redirect to sign-in page
  if (!isSignedIn) {
    const redirectUrl = encodeURIComponent(
      `/meeting/join?room=${meetingCode}&host=${isHost}`
    );
    router.push(`/auth/sign-in?redirect_url=${redirectUrl}`);
    return null;
  }

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