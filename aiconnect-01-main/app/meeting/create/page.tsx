"use client";

import { useEffect, useState } from "react";
import PreJoinScreen from "@/components/meeting/pre-join-screen";
import { useRouter } from "next/navigation";

export default function CreateMeetingPage() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const createRoom = async () => {
      const res = await fetch("/api/create-room", {
        method: "POST",
      });

      const data = await res.json();

      if (data.roomId) {
        setRoomId(data.roomId);
      }
    };

    createRoom();
  }, []);

  const handleStart = (
    name: string,
    roomName?: string,
    video?: boolean,
    audio?: boolean
  ) => {
    if (!roomName) return;

    const params = new URLSearchParams({
      host: "1",
      name,
      video: video === false ? "0" : "1",
      audio: audio === false ? "0" : "1",
    });

    router.push(`/meeting/${encodeURIComponent(roomName)}?${params.toString()}`);
  };

  if (!roomId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Creating meeting...
      </div>
    );
  }

  return (
    <PreJoinScreen
      onJoin={handleStart}
      meetingCode={roomId}
      isHost={true}
    />
  );
}