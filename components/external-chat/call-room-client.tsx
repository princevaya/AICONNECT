"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Circle, PhoneOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import MeetingRoom from "@/components/meeting/meeting-room";

type UserRow = { id: string; clerkId: string; name: string | null; email: string | null; imageUrl?: string | null };
type CallSession = {
  id: string;
  livekitRoomName: string;
  type: "audio" | "video";
  status: "ringing" | "active" | "ended" | "missed" | "declined";
  room: { id: string; code: string; name: string };
  starter: UserRow;
  participants: Array<{ user: UserRow }>;
};

export default function CallRoomClient({
  call,
  participantName,
  initialVideoEnabled,
  initialAudioEnabled = true,
}: {
  call: CallSession;
  participantName: string;
  initialVideoEnabled?: boolean;
  initialAudioEnabled?: boolean;
}) {
  const router = useRouter();
  const displayName = useMemo(() => participantName || "Guest", [participantName]);
  const isVideoCall = call.type === "video";
  const isLive = call.status === "active" || call.status === "ringing";
  const endedRef = useRef(false);

  const statusLabel =
    call.status === "active"
      ? "Live"
      : call.status === "ringing"
        ? "Ringing"
        : call.status === "ended"
          ? "Ended"
          : call.status === "missed"
            ? "Missed"
            : "Declined";
  const statusTone =
    call.status === "active"
      ? "bg-[#25D366]"
      : call.status === "ringing"
        ? "bg-amber-500"
        : "bg-slate-500";

  useEffect(() => {
    if (!isLive) return;
    void fetch(`/api/external-chat/calls/${encodeURIComponent(call.id)}/join`, {
      method: "POST",
    }).catch(() => undefined);
  }, [call.id, isLive]);

  const leaveCall = async () => {
    if (!endedRef.current) {
      endedRef.current = true;
      await fetch(`/api/external-chat/calls/${encodeURIComponent(call.id)}/end`, {
        method: "POST",
        keepalive: true,
      }).catch(() => undefined);
    }
    router.push(`/dashboard/external-chat?room=${encodeURIComponent(call.room.code)}`);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#ECE5DD] dark:bg-[#0B141A] text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-[#075E54] dark:bg-[#1F2C33] px-4 py-3 pt-[calc(0.85rem+env(safe-area-inset-top))] backdrop-blur">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${statusTone} ${isLive ? "animate-pulse" : ""}`} />
            <p className="truncate text-sm font-semibold text-white">
              {isVideoCall ? "Video call" : "Audio call"} · {statusLabel}
            </p>
          </div>
          <p className="truncate text-xs text-white/65">
            {call.room.name} · {call.livekitRoomName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="gap-2 text-white hover:bg-white/10 hover:text-white"
            onClick={() => router.push(`/dashboard/external-chat?room=${encodeURIComponent(call.room.code)}`)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to chat
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            onClick={() => void leaveCall()}
          >
            <PhoneOff className="h-4 w-4" />
            End Call
          </Button>
        </div>
      </div>

      <div className="grid gap-3 border-b border-border/60 px-4 py-3 text-xs text-foreground/80 dark:text-white/70 md:grid-cols-3 bg-card/40 dark:bg-transparent">
        <div className="rounded-2xl border border-border/60 bg-background/60 dark:bg-white/5 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Room</p>
          <p className="mt-1 truncate font-medium">{call.room.code}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/60 dark:bg-white/5 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Participants</p>
          <p className="mt-1 font-medium">{call.participants.length} connected or invited</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/60 dark:bg-white/5 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Host</p>
          <p className="mt-1 flex items-center gap-2 font-medium">
            <ShieldCheck className="h-4 w-4 text-[#25D366]" />
            {call.starter.name || call.starter.email || "Host"}
          </p>
        </div>
      </div>

      {!isLive ? (
        <div className="border-b border-border/60 px-4 py-3">
          <div className="rounded-2xl border border-border/60 bg-card/80 dark:bg-white/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Circle className="h-3 w-3 fill-current" />
              This call is {statusLabel.toLowerCase()}.
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              You can still review the call context, or return to chat when you’re done.
            </p>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1">
        {isLive ? (
          <MeetingRoom
            roomName={call.livekitRoomName}
            participantName={displayName}
            videoEnabled={initialVideoEnabled ?? isVideoCall}
            audioEnabled={initialAudioEnabled}
            onLeave={() => void leaveCall()}
          />
        ) : null}
      </div>
    </div>
  );
}
