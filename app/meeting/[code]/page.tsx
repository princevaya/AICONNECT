"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import MeetingRoom from "@/components/meeting/meeting-room";
import { createLaunchOnceGuard } from "./launch-guard";
import { copyToClipboard } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { PhoneOff, Loader2 } from "lucide-react";

export default function MeetingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();

  const meetingCode = params.code as string;
  const participantName =
    searchParams.get("name")?.trim() || user?.fullName?.trim() || "Guest";
  const videoEnabled = searchParams.get("video") !== "0";
  const audioEnabled = searchParams.get("audio") !== "0";

  // ✅ REPLACED: isHost is now state, auto-detected from DB
  const [isHost, setIsHost] = useState(false);
  const [isCheckingHost, setIsCheckingHost] = useState(true);

  const [pendingUsers, setPendingUsers] = useState<string[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [isHostPanelCollapsed, setIsHostPanelCollapsed] = useState(false);
  const mutationVersionRef = useRef(0);
  const [isModerating, setIsModerating] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [linkCopiedMessage, setLinkCopiedMessage] = useState<string | null>(null);
  const [hostSettings, setHostSettings] = useState({
    autoApprove: false,
    isLocked: false,
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Time-based lifecycle states
  const [meetingStatus, setMeetingStatus] = useState<string>("Scheduled");
  const [isEnding, setIsEnding] = useState(false);

  // ✅ AUTO-DETECT HOST: check if logged-in user created this meeting
  const launchGuardRef = useRef<ReturnType<typeof createLaunchOnceGuard> | null>(null);
  if (!launchGuardRef.current) launchGuardRef.current = createLaunchOnceGuard();

  useEffect(() => {
    if (!isLoaded || !meetingCode) return;

    const checkIfHost = async () => {
      launchGuardRef.current?.runOnce(() => {
        // no-op: guard prevents duplicate side-effects via replace/router
      });
      try {
        const res = await fetch(`/api/schedule?all=true`, { cache: "no-store" });
        const text = await res.text();
        if (!text.trim().startsWith("{")) return;
        const payload = JSON.parse(text);
        if (!payload.success) return;

        const meeting = payload.meetings.find(
          (m: any) => m.code === meetingCode
        );

        if (meeting && user?.id && meeting.createdBy === user.id) {
          // ✅ You created this meeting → auto host
          setIsHost(true);
          await fetch(`/api/meetings/${encodeURIComponent(meetingCode)}/start`, {
            method: "POST",
            cache: "no-store",
          }).catch((e) => console.error("Start meeting API failed:", e));
        } else if (searchParams.get("host") === "true") {
          // ✅ Fallback: manual host param
          setIsHost(true);
          await fetch(`/api/meetings/${encodeURIComponent(meetingCode)}/start`, {
            method: "POST",
            cache: "no-store",
          }).catch((e) => console.error("Start meeting API failed:", e));
        } else {
          // ✅ Attendee check: verify approval
          const approvalRes = await fetch(
            `/api/check-approval?roomId=${encodeURIComponent(meetingCode)}&name=${encodeURIComponent(
              participantName
            )}`,
            { cache: "no-store" }
          );
          if (approvalRes.ok) {
            const approvalData = await approvalRes.json();
            if (!approvalData.approved) {
              router.replace(`/meeting/join?room=${encodeURIComponent(meetingCode)}`);
              return;
            }
          } else {
            router.replace(`/meeting/join?room=${encodeURIComponent(meetingCode)}`);
            return;
          }
        }
      } catch {
        // fallback to URL param if API fails
        if (searchParams.get("host") === "true") {
          setIsHost(true);
        } else {
          router.replace(`/meeting/join?room=${encodeURIComponent(meetingCode)}`);
          return;
        }
      } finally {
        setIsCheckingHost(false);
      }
    };

    void checkIfHost();
  }, [isLoaded, meetingCode, user?.id, searchParams, participantName, router]);

  // Poll status endpoint every 5 seconds to know when the meeting ends
  useEffect(() => {
    if (!meetingCode) return;
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/meetings/${encodeURIComponent(meetingCode)}/status`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success) {
          setMeetingStatus(data.status);
        }
      } catch (e) {
        console.warn("Failed to check status:", e);
      }
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [meetingCode]);

  const handleEndMeeting = async () => {
    setIsEnding(true);
    try {
      await fetch(`/api/meetings/${encodeURIComponent(meetingCode)}/end`, {
        method: "POST",
        cache: "no-store",
      });
      router.push("/dashboard");
    } catch (e) {
      console.error("Failed to end meeting:", e);
    } finally {
      setIsEnding(false);
    }
  };

  useEffect(() => {
    if (!meetingCode || !isHost) return;

    const pollPending = async () => {
      const pollVersion = mutationVersionRef.current;
      setIsLoadingPending(true);
      try {
        const res = await fetch(`/api/get-pending?roomId=${meetingCode}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (pollVersion !== mutationVersionRef.current) return;
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
    }, 700);

    return () => clearInterval(interval);
  }, [meetingCode, isHost]);

  useEffect(() => {
    if (!meetingCode || !isHost) return;
    if (typeof window !== "undefined") {
      setShareLink(`${window.location.origin}/meeting/join?room=${meetingCode}`);
    }
  }, [meetingCode, isHost]);

  useEffect(() => {
    if (!meetingCode || !isHost) return;

    const loadSettings = async () => {
      setIsLoadingSettings(true);
      setSettingsError(null);
      try {
        const res = await fetch(`/api/room-settings?roomId=${meetingCode}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setSettingsError(data.error || "Unable to load host settings.");
          return;
        }
        const data = await res.json();
        setHostSettings({
          autoApprove: Boolean(data?.settings?.autoApprove),
          isLocked: Boolean(data?.settings?.isLocked),
        });
      } catch {
        setSettingsError("Unable to load host settings.");
      } finally {
        setIsLoadingSettings(false);
      }
    };

    void loadSettings();
  }, [meetingCode, isHost]);

  const moderateUser = async (name: string, action: "approve" | "reject") => {
    setIsModerating(true);
    mutationVersionRef.current += 1;
    setApprovalError(null);
    try {
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
    } catch {
      setApprovalError("Network error while updating join request.");
    } finally {
      setIsModerating(false);
    }
  };

  const approveAll = async () => {
    if (pendingUsers.length === 0) return;

    setIsModerating(true);
    mutationVersionRef.current += 1;
    setApprovalError(null);
    try {
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
    } catch {
      setApprovalError("Network error while approving requests.");
    } finally {
      setIsModerating(false);
    }
  };

  const copyText = async (text: string, successMessage: string) => {
    try {
      const ok = await copyToClipboard(text);
      if (!ok) throw new Error("Copy failed");
      setLinkCopiedMessage(successMessage);
      setTimeout(() => setLinkCopiedMessage(null), 2000);
    } catch {
      setLinkCopiedMessage("Unable to copy. Please copy manually.");
      setTimeout(() => setLinkCopiedMessage(null), 2500);
    }
  };

  const updateHostSettings = async (nextSettings: {
    autoApprove: boolean;
    isLocked: boolean;
  }) => {
    setIsSavingSettings(true);
    setSettingsError(null);
    setSettingsMessage(null);
    try {
      const res = await fetch("/api/room-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: meetingCode,
          autoApprove: nextSettings.autoApprove,
          isLocked: nextSettings.isLocked,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSettingsError(data.error || "Unable to save host settings.");
        return;
      }
      setHostSettings(nextSettings);
      const pendingRes = await fetch(`/api/get-pending?roomId=${meetingCode}`, {
        cache: "no-store",
      });
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json().catch(() => ({}));
        setPendingUsers(pendingData.pending || []);
      }
      setSettingsMessage("Host settings saved.");
      setTimeout(() => setSettingsMessage(null), 2000);
    } catch {
      setSettingsError("Unable to save host settings.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Enforce login and redirect back after successful authentication
  useEffect(() => {
    if (isLoaded && !user) {
      router.replace(`/auth/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`);
    }
  }, [isLoaded, user, router]);

  if (!meetingCode) return null;

  if (meetingStatus === "Completed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-border/80 text-center p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-zinc-500/10 flex items-center justify-center text-zinc-500">
              <PhoneOff className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">This meeting has ended</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs text-center">
              The host has ended the meeting. You have been disconnected.
            </p>
            <Button
              onClick={() => router.push("/dashboard")}
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold w-full"
            >
              Return to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Redirecting to login...</p>
      </div>
    );
  }

  // ✅ Show loading while checking if user is host
  if (isCheckingHost) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Loading meeting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <MeetingRoom
        roomName={meetingCode}
        participantName={participantName}
        videoEnabled={videoEnabled}
        audioEnabled={audioEnabled}
        onLeave={() => router.push("/dashboard")}
      />

      {isHost && isHostPanelCollapsed && (
        <Button
          onClick={() => setIsHostPanelCollapsed(false)}
          size="sm"
          className="fixed bottom-24 right-3 z-50 rounded-full shadow-lg sm:bottom-auto sm:right-6 sm:top-6"
        >
          Host Panel ({pendingUsers.length})
        </Button>
      )}

      {isHost && !isHostPanelCollapsed && (
        <>
          <button
            type="button"
            aria-label="Close host panel backdrop"
            onClick={() => setIsHostPanelCollapsed(true)}
            className="fixed inset-0 z-40 bg-black/35 sm:hidden"
          />
          <div className="fixed bottom-3 left-2 right-2 z-50 max-h-[86vh] overflow-hidden rounded-xl border border-border bg-card/95 p-3 text-card-foreground shadow-xl backdrop-blur-sm sm:bottom-auto sm:top-6 sm:right-6 sm:left-auto sm:p-4 sm:w-[25rem] sm:max-w-[calc(100vw-2rem)]">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <h3 className="font-semibold text-lg">Host Panel</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {isLoadingPending ? "Refreshing..." : `${pendingUsers.length} pending`}
              </span>
              <Button
                onClick={handleEndMeeting}
                disabled={isEnding}
                variant="destructive"
                size="sm"
                className="h-7 px-2 text-xs font-semibold"
              >
                {isEnding ? "Ending..." : "End Meeting"}
              </Button>
              <Button
                onClick={() => setIsHostPanelCollapsed(true)}
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
              >
                Minimize
              </Button>
            </div>
          </div>

          <Tabs defaultValue="requests" className="mt-3 flex h-[calc(86vh-4.5rem)] w-full flex-col min-w-0 sm:h-[min(70vh,42rem)]">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="requests">Requests</TabsTrigger>
              <TabsTrigger value="info">Meeting Info</TabsTrigger>
              <TabsTrigger value="settings">Host Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="requests" className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
              {approvalMessage && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">{approvalMessage}</p>
              )}

              {approvalError && (
                <p className="text-sm text-destructive">
                  {approvalError}
                </p>
              )}

              {pendingUsers.length > 0 ? (
                <>
                  <Button
                    onClick={approveAll}
                    disabled={isModerating}
                    className="w-full bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
                  >
                    Approve all
                  </Button>

                  {pendingUsers.map((name) => (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-md border border-border bg-background/40 px-2 py-2"
                    >
                    <span className="min-w-0 truncate pr-2">{name}</span>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => moderateUser(name, "approve")}
                          size="sm"
                          disabled={isModerating}
                          className="h-8 bg-emerald-600 px-2 text-sm text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
                        >
                          Approve
                        </Button>
                        <Button
                          onClick={() => moderateUser(name, "reject")}
                          size="sm"
                          variant="destructive"
                          disabled={isModerating}
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
            </TabsContent>

            <TabsContent value="info" className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Room code</p>
                <div className="flex gap-2">
                  <Input value={meetingCode} readOnly className="h-9" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyText(meetingCode, "Room code copied")}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Share link</p>
                <div className="flex gap-2">
                  <Input value={shareLink} readOnly className="h-9" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyText(shareLink, "Invite link copied")}
                    disabled={!shareLink}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (shareLink) window.open(shareLink, "_blank", "noopener,noreferrer");
                  }}
                  disabled={!shareLink}
                >
                  Open Join Page
                </Button>
              </div>

              {linkCopiedMessage && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">{linkCopiedMessage}</p>
              )}
            </TabsContent>

            <TabsContent value="settings" className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
              {isLoadingSettings ? (
                <p className="text-sm text-muted-foreground">Loading settings...</p>
              ) : (
                <>
                  <label className="flex items-start gap-3 rounded-md border border-border bg-background/40 px-3 py-2">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-emerald-600"
                      checked={hostSettings.autoApprove}
                      disabled={isSavingSettings}
                      onChange={(e) =>
                        void updateHostSettings({
                          ...hostSettings,
                          autoApprove: e.target.checked,
                        })
                      }
                    />
                    <div>
                      <p className="text-sm font-medium">Auto-approve requests</p>
                      <p className="text-xs text-muted-foreground">
                        New participants are approved immediately without manual action.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 rounded-md border border-border bg-background/40 px-3 py-2">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-rose-600"
                      checked={hostSettings.isLocked}
                      disabled={isSavingSettings}
                      onChange={(e) =>
                        void updateHostSettings({
                          ...hostSettings,
                          isLocked: e.target.checked,
                        })
                      }
                    />
                    <div>
                      <p className="text-sm font-medium">Lock meeting</p>
                      <p className="text-xs text-muted-foreground">
                        New join attempts are rejected until this is turned off.
                      </p>
                    </div>
                  </label>
                </>
              )}

              {settingsMessage && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">{settingsMessage}</p>
              )}
              {settingsError && (
                <p className="text-sm text-destructive">{settingsError}</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
        </>
      )}
    </div>
  );
}