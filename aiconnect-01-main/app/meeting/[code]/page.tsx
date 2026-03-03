"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import MeetingRoom from "@/components/meeting/meeting-room";
import { Button } from "@/components/ui/button";

export default function MeetingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();

  const meetingCode = params.code as string;
  const isHost = searchParams.get("host") === "1";
  const participantName =
    searchParams.get("name")?.trim() || user?.fullName?.trim() || "Host";
  const videoEnabled = searchParams.get("video") !== "0";
  const audioEnabled = searchParams.get("audio") !== "0";

  const [pendingUsers, setPendingUsers] = useState<string[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [isApprovalPanelCollapsed, setIsApprovalPanelCollapsed] = useState(false);

  useEffect(() => {
    if (!meetingCode || !isHost) return;

    const pollPending = async () => {
      setIsLoadingPending(true);
      try {
        const res = await fetch(`/api/get-pending?roomId=${meetingCode}`);
        const data = await res.json();
        setPendingUsers(data.pending || []);
      } catch {
        setApprovalError("Unable to refresh join requests.");
      } finally {
        setIsLoadingPending(false);
      }
    };

    void pollPending();
    const interval = setInterval(() => {
      void pollPending();
    }, 2000);

    return () => clearInterval(interval);
  }, [meetingCode, isHost]);

  const moderateUser = async (name: string, action: "approve" | "reject") => {
    setApprovalError(null);
    const res = await fetch("/api/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: meetingCode,
        name,
        action: action === "reject" ? "reject" : "approve",
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setApprovalError(data.error || "Failed to update join request.");
      return;
    }

    setPendingUsers((prev) => prev.filter((u) => u !== name));
    setApprovalMessage(action === "reject" ? `${name} rejected` : `${name} approved`);
  };

  const approveAll = async () => {
    if (pendingUsers.length === 0) return;

    setApprovalError(null);
    const res = await fetch("/api/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: meetingCode,
        action: "all",
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setApprovalError(data.error || "Failed to approve all requests.");
      return;
    }

    setApprovalMessage(`Approved ${pendingUsers.length} request(s)`);
    setPendingUsers([]);
  };

  if (!meetingCode || !isLoaded || !user) return null;

  return (
    <div className="min-h-screen bg-background relative">
      <MeetingRoom
        roomName={meetingCode}
        participantName={participantName}
        videoEnabled={videoEnabled}
        audioEnabled={audioEnabled}
        onLeave={() => router.push("/dashboard")}
      />

      {isHost && isApprovalPanelCollapsed && (
        <Button
          onClick={() => setIsApprovalPanelCollapsed(false)}
          size="sm"
          className="fixed top-6 right-6 z-50 rounded-full shadow-lg"
        >
          Requests ({pendingUsers.length})
        </Button>
      )}

      {isHost && !isApprovalPanelCollapsed && (
        <div className="fixed top-6 right-6 z-50 w-80 space-y-3 rounded-lg border border-border bg-card/95 p-4 text-card-foreground shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Join Requests</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {isLoadingPending ? "Refreshing..." : `${pendingUsers.length} pending`}
              </span>
              <Button
                onClick={() => setIsApprovalPanelCollapsed(true)}
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
              >
                Collapse
              </Button>
            </div>
          </div>

          {approvalMessage ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">{approvalMessage}</p>
          ) : null}
          {approvalError ? (
            <p className="text-sm text-destructive">{approvalError}</p>
          ) : null}

          {pendingUsers.length > 0 ? (
            <>
              <Button
                onClick={approveAll}
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
              >
                Approve all
              </Button>

              {pendingUsers.map((name) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-md border border-border bg-background/40 px-2 py-2"
                >
                  <span className="truncate pr-2">{name}</span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => moderateUser(name, "approve")}
                      size="sm"
                      className="h-8 bg-emerald-600 px-2 text-sm text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
                    >
                      Approve
                    </Button>
                    <Button
                      onClick={() => moderateUser(name, "reject")}
                      size="sm"
                      variant="destructive"
                      className="h-8 px-2 text-sm"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No pending requests right now.</p>
          )}
        </div>
      )}
    </div>
  );
}
