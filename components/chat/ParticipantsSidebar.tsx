"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Mic, MicOff, Video, VideoOff, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";

type ParticipantItem = {
  id: string;
  userId: string;
  joinedAt: string;
  leftAt: string | null;
  role: "host" | "participant";
  micStatus: boolean;
  cameraStatus: boolean;
  removedAt: string | null;
  user: {
    id: string;
    clerkId: string;
    name: string | null;
    email: string | null;
    imageUrl: string | null;
  };
};

type ParticipantsResponse = {
  roomId: string;
  participants: ParticipantItem[];
  isHost: boolean;
};

type Props = {
  roomId: string;
  refreshKey?: number;
};

async function parseApiBody(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => ({}));
  }
  const text = await response.text().catch(() => "");
  return { error: text || `Request failed with status ${response.status}` };
}

function displayName(participant: ParticipantItem) {
  return participant.user.name || participant.user.email || participant.user.clerkId;
}

export default function ParticipantsSidebar({ roomId, refreshKey = 0 }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const onlineCount = useMemo(
    () => participants.filter((participant) => participant.leftAt === null).length,
    [participants]
  );

  useEffect(() => {
    if (!roomId) {
      setParticipants([]);
      setError("");
      return;
    }

    let active = true;
    const ensureJoined = async () => {
      const response = await fetch(`/api/chat/${encodeURIComponent(roomId)}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", micStatus: true, cameraStatus: true }),
      });
      if (!response.ok) {
        const body = (await parseApiBody(response)) as { error?: string };
        throw new Error(body.error || "Failed to join participants list");
      }
    };

    const fetchParticipants = async () => {
      setIsLoading(true);
      setError("");
      try {
        await ensureJoined();
        const response = await fetch(`/api/chat/${encodeURIComponent(roomId)}/participants`, {
          cache: "no-store",
        });
        const body = (await parseApiBody(response)) as ParticipantsResponse & { error?: string };
        if (!response.ok) {
          throw new Error(body.error || "Failed to load participants");
        }
        if (!active) return;
        setParticipants(body.participants || []);
        setIsHost(!!body.isHost);
      } catch (loadError) {
        if (!active) return;
        const message = loadError instanceof Error ? loadError.message : "Load failed";
        setError(message);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void fetchParticipants();
    const timer = setInterval(fetchParticipants, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [roomId, refreshKey]);

  const removeParticipant = async (participantId: string) => {
    setRemovingId(participantId);
    setError("");
    try {
      const response = await fetch(`/api/chat/${encodeURIComponent(roomId)}/participants`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId }),
      });
      const body = (await parseApiBody(response)) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error || "Failed to remove participant");
      }
      setParticipants((prev) =>
        prev.map((participant) =>
          participant.id === participantId
            ? { ...participant, leftAt: new Date().toISOString(), removedAt: new Date().toISOString() }
            : participant
        )
      );
    } catch (removeError) {
      const message = removeError instanceof Error ? removeError.message : "Remove failed";
      setError(message);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <aside className="w-80 border-l bg-slate-950/95 text-slate-100 flex flex-col">
      <div className="p-4 border-b border-white/10">
        <p className="text-sm font-semibold">Participants</p>
        <p className="text-xs text-slate-400">{onlineCount} online</p>
      </div>

      {error ? <p className="px-4 py-2 text-xs text-red-400">{error}</p> : null}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading && participants.length === 0 ? (
          <div className="flex items-center text-xs text-slate-400">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading participants...
          </div>
        ) : (
          participants.map((participant) => {
            const isOnline = participant.leftAt === null;
            return (
              <div
                key={participant.id}
                className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{displayName(participant)}</p>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">
                      {participant.role}
                    </p>
                  </div>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-emerald-400" : "bg-slate-500"}`}
                    title={isOnline ? "Online" : "Offline"}
                  />
                </div>

                <div className="flex items-center gap-2 text-slate-300">
                  {participant.micStatus ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-red-400" />}
                  {participant.cameraStatus ? (
                    <Video className="h-4 w-4" />
                  ) : (
                    <VideoOff className="h-4 w-4 text-red-400" />
                  )}
                </div>

                {isHost && participant.role !== "host" && isOnline ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={removingId === participant.id}
                    onClick={() => void removeParticipant(participant.id)}
                  >
                    {removingId === participant.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserMinus className="h-4 w-4" />
                    )}
                    Remove
                  </Button>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
