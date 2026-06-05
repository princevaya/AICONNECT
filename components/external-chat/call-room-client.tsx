"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Circle, PhoneOff, ShieldCheck, Video } from "lucide-react";
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
}: {
  call: CallSession;
  participantName: string;
}) {
  const router = useRouter();
  const displayName = useMemo(() => participantName || "Guest", [participantName]);
  const isVideoCall = call.type === "video";
  const isLive = call.status === "active" || call.status === "ringing";
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
      ? "bg-emerald-500"
      : call.status === "ringing"
        ? "bg-amber-500"
        : "bg-slate-500";

  const leaveCall = async () => {
    await fetch(`/api/external-chat/calls/${encodeURIComponent(call.id)}/end`, {
      method: "POST",
    }).catch(() => undefined);
    router.push("/dashboard/external-chat");
  };

  return (
    <div className="flex min-h-dvh flex-col bg-slate-950 text-white">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 pt-[calc(0.85rem+env(safe-area-inset-top))] backdrop-blur">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${statusTone} ${isLive ? "animate-pulse" : ""}`} />
            <p className="truncate text-sm font-semibold">
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
            onClick={() => router.push("/dashboard/external-chat")}
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
            Leave
          </Button>
        </div>
      </div>

      <div className="grid gap-3 border-b border-white/10 px-4 py-3 text-xs text-white/70 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] uppercase tracking-wide text-white/45">Room</p>
          <p className="mt-1 truncate font-medium text-white">{call.room.code}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] uppercase tracking-wide text-white/45">Participants</p>
          <p className="mt-1 font-medium text-white">{call.participants.length} connected or invited</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] uppercase tracking-wide text-white/45">Host</p>
          <p className="mt-1 flex items-center gap-2 font-medium text-white">
            <ShieldCheck className="h-4 w-4 text-cyan-300" />
            {call.starter.name || call.starter.email || "Host"}
          </p>
        </div>
      </div>

      {!isLive ? (
        <div className="border-b border-white/10 px-4 py-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Circle className="h-3 w-3 fill-current text-white/75" />
              This call is {statusLabel.toLowerCase()}.
            </div>
            <p className="mt-1 text-sm text-white/65">
              You can still review the call context, or return to chat when you’re done.
            </p>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1">
        <MeetingRoom
          roomName={call.livekitRoomName}
          participantName={displayName}
          onLeave={() => void leaveCall()}
        />
      </div>
    </div>
  );
}
