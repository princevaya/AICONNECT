"use client";

import { useRouter, useSearchParams } from "next/navigation";
import PreJoinScreen from "@/components/meeting/pre-join-screen";
import { useEffect, useState } from "react";

export default function JoinMeetingPage() {

  const router = useRouter();
  const searchParams = useSearchParams();

  const roomCode = searchParams.get("room") || "";

  const [name, setName] = useState("");
  const [requested, setRequested] = useState(false);

  // called when user clicks Join button
  const handleJoin = async (
    username: string,
    roomName?: string
  ) => {

    if (!roomName || !username) return;

    setName(username);

    // send join request
    await fetch("/api/request-join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        roomId: roomName,
        name: username
      })
    });

    setRequested(true);
  };


  // approval polling
  useEffect(() => {

    if (!requested || !roomCode || !name) return;

    const interval = setInterval(async () => {

      const res = await fetch(
        `/api/check-approval?roomId=${roomCode}&name=${name}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      console.log("approval status:", data);

      if (data.approved) {

        clearInterval(interval);

        console.log("APPROVED → joining meeting");

        router.push(`/meeting/${roomCode}`);

      }

    }, 2000);

    return () => clearInterval(interval);

  }, [requested, roomCode, name, router]);


  return (

    <PreJoinScreen
      onJoin={handleJoin}
      meetingCode={roomCode}
      isHost={false}
    />

  );

}