"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import MeetingRoom from "@/components/meeting/meeting-room";

export default function MeetingPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const meetingCode = params.code as string;

  const [pendingUsers, setPendingUsers] = useState<string[]>([]);

  // 🔥 HOST POLLING
  useEffect(() => {
    if (!meetingCode) return;

    const interval = setInterval(async () => {
      const res = await fetch(
        `/api/get-pending?roomId=${meetingCode}`
      );
      const data = await res.json();
      setPendingUsers(data.pending || []);
    }, 2000);

    return () => clearInterval(interval);
  }, [meetingCode]);

  const approveUser = async (name: string) => {
    await fetch("/api/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: meetingCode,
        name,
      }),
    });
  };

  if (!meetingCode || !isLoaded || !user) return null;

  return (
    <div className="min-h-screen bg-background relative">
      <MeetingRoom
        roomName={meetingCode}
        participantName={user.fullName || "Host"}
        videoEnabled={true}
        audioEnabled={true}
        onLeave={() => router.push("/dashboard")}
      />

      {/* 🔥 Pending Popup */}
      {pendingUsers.length > 0 && (
        <div className="fixed top-6 right-6 bg-white shadow-xl p-4 rounded-lg space-y-3 z-50 w-72">
          <h3 className="font-semibold text-lg">
            Waiting to join
          </h3>

          {pendingUsers.map((name) => (
            <div
              key={name}
              className="flex justify-between items-center"
            >
              <span>{name}</span>

              <div className="flex gap-2">
                <button
                  onClick={() => approveUser(name)}
                  className="bg-green-500 text-white px-3 py-1 rounded"
                >
                  Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}