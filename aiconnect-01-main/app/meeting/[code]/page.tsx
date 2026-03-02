"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import MeetingRoom from "@/components/meeting/meeting-room";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

export default function MeetingPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const meetingCode = params.code as string;

  const [pendingUsers, setPendingUsers] = useState<string[]>([]);
  const [inviteLink, setInviteLink] = useState("");
  const [showInvitePopup, setShowInvitePopup] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!meetingCode || typeof window === "undefined") {
      return;
    }

    const link = `${window.location.origin}/meeting/join?room=${encodeURIComponent(meetingCode)}`;
    setInviteLink(link);
    setShowInvitePopup(true);
  }, [meetingCode]);

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

  const copyMeetingLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      alert("Unable to copy link. Please copy it manually.");
    }
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

      {/* Meeting Link Popup (Google Meet style) */}
      {showInvitePopup && (
        <div className="fixed left-6 bottom-24 z-50 w-[min(92vw,380px)] rounded-xl border bg-card p-4 shadow-xl">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Your meeting is ready</h3>
              <p className="text-sm text-muted-foreground">
                Share this link so others can join this meeting.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowInvitePopup(false)}
              aria-label="Close meeting link popup"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Input value={inviteLink} readOnly />
            <div className="flex items-center justify-between gap-2">
              <Button onClick={copyMeetingLink} disabled={!inviteLink}>
                Copy link
              </Button>
              <span className="text-xs text-muted-foreground">
                {copied ? "Link copied" : "Anyone with this link can request to join"}
              </span>
            </div>
          </div>
        </div>
      )}

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