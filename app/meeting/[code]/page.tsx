"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Crown, Users, Info, Settings, Copy, ExternalLink } from "lucide-react";
import MeetingRoom from "@/components/meeting/meeting-room";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [isHostPanelCollapsed, setIsHostPanelCollapsed] = useState(true);
  const mutationVersionRef = useRef(0);
  const [isModerating, setIsModerating] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isServicesHubOpen, setIsServicesHubOpen] = useState(false);
  const shouldHideHostPanel = isChatOpen || isParticipantsOpen || isServicesHubOpen;
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
        if (pollVersion !== mutationVersionRef.current) {
          return;
        }
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

  useEffect(() => {
    const handlePanelStateChange = (event: CustomEvent<{ chat: boolean; participants: boolean; servicesHub: boolean }>) => {
      setIsChatOpen(event.detail.chat);
      setIsParticipantsOpen(event.detail.participants);
      setIsServicesHubOpen(event.detail.servicesHub);
    };

    window.addEventListener('meeting-panel-state-change', handlePanelStateChange as EventListener);
    return () => {
      window.removeEventListener('meeting-panel-state-change', handlePanelStateChange as EventListener);
    };
  }, []);

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
      const clipboardAvailable =
        typeof navigator !== "undefined" &&
        !!navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function";

      if (clipboardAvailable) {
        await navigator.clipboard.writeText(text);
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (!copied) {
          throw new Error("Clipboard fallback failed");
        }
      } else {
        throw new Error("Clipboard unavailable");
      }
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

  if (!meetingCode || !isLoaded || !user) return null;

  return (
    <div className="min-h-screen bg-background relative">
      <MeetingRoom
        roomName={meetingCode}
        participantName={participantName}
        videoEnabled={videoEnabled}
        audioEnabled={audioEnabled}
        onLeave={() => router.push("/dashboard")}
        onPanelStateChange={(chat, participants, servicesHub) => {
          setIsChatOpen(chat);
          setIsParticipantsOpen(participants);
          setIsServicesHubOpen(servicesHub);
        }}
      />

      {/* Host Panel Button - Top Right Corner - Hidden when chat/participants/services hub is open */}
      {isHost && isHostPanelCollapsed && !shouldHideHostPanel && (
        <Button
          onClick={() => setIsHostPanelCollapsed(false)}
          className="fixed top-4 right-4 z-[100] h-10 w-10 rounded-full p-0 shadow-lg backdrop-blur-sm bg-primary text-primary-foreground hover:bg-primary/90"
          title={`Host Panel (${pendingUsers.length} pending)`}
        >
          <Crown className="h-5 w-5" />
          {pendingUsers.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] leading-5 text-center">
              {pendingUsers.length > 99 ? "99+" : pendingUsers.length}
            </span>
          )}
        </Button>
      )}

      {/* Host Panel Modal - Hidden when chat/participants/services hub is open */}
      {isHost && !isHostPanelCollapsed && !shouldHideHostPanel && (
        <>
          <button
            type="button"
            aria-label="Close host panel backdrop"
            onClick={() => setIsHostPanelCollapsed(true)}
            className="fixed inset-0 z-40 bg-black/35 sm:hidden"
          />
          <div className="fixed inset-x-2 top-20 z-50 overflow-hidden rounded-2xl border border-border bg-card/95 text-card-foreground shadow-xl backdrop-blur-sm sm:left-auto sm:right-4 sm:top-20 sm:w-[25rem] sm:max-h-[calc(100vh-5rem)]">
            {/* ... modal content remains the same ... */}
          </div>
        </>
      )}
    </div>
  );
}