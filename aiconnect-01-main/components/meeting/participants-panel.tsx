"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocalParticipant, useParticipants, useRoomContext } from "@livekit/components-react";
import { Participant, Track } from "livekit-client";
import { Mic, MicOff, Radio, Video, VideoOff } from "lucide-react";

function participantName(participant: Participant) {
  return participant.name || participant.identity;
}

function micEnabled(participant: Participant) {
  const publication = participant.getTrackPublication(Track.Source.Microphone);
  return publication ? !publication.isMuted : false;
}

function cameraEnabled(participant: Participant) {
  const publication = participant.getTrackPublication(Track.Source.Camera);
  return publication ? !publication.isMuted : false;
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function avatarColorClass(identity: string) {
  const colors = [
    "bg-rose-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-lime-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-fuchsia-500",
  ];

  let hash = 0;
  for (let i = 0; i < identity.length; i++) {
    hash = (hash * 31 + identity.charCodeAt(i)) >>> 0;
  }

  return colors[hash % colors.length];
}

interface ParticipantsPanelProps {
  raisedHands?: Record<string, boolean>;
}

export default function ParticipantsPanel({ raisedHands: raisedHandsFromRoom }: ParticipantsPanelProps) {
  const room = useRoomContext();
  const remoteParticipants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [localRaisedHands, setLocalRaisedHands] = useState<Record<string, boolean>>({});

  const participants = useMemo(() => {
    const all = [localParticipant, ...remoteParticipants];
    const unique = new Map<string, Participant>();
    for (const participant of all) {
      unique.set(participant.identity, participant);
    }
    return Array.from(unique.values());
  }, [localParticipant, remoteParticipants]);

  const speaking = useMemo(
    () => participants.filter((participant) => participant.isSpeaking),
    [participants]
  );

  useEffect(() => {
    const handler = (payload: Uint8Array, participant?: Participant) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload)) as {
          type?: string;
          value?: boolean;
          identity?: string;
          name?: string;
        };

        if (data.type !== "hand") return;

        const senderIdentity = participant?.identity || data.identity || data.name;
        if (!senderIdentity) return;

        setLocalRaisedHands((prev) => ({
          ...prev,
          [senderIdentity]: Boolean(data.value),
        }));
      } catch {
        // Ignore non-JSON/non-hand payloads
      }
    };

    room.on("dataReceived", handler);
    return () => {
      room.off("dataReceived", handler);
    };
  }, [room]);

  const raisedHands = raisedHandsFromRoom ?? localRaisedHands;

  return (
    <aside className="w-80 border-l bg-slate-950/95 text-slate-100 flex flex-col">
      <div className="p-4 border-b border-white/10">
        <p className="text-sm font-semibold">Participants</p>
        <p className="text-xs text-slate-400">{participants.length} in meeting</p>
      </div>

      <div className="px-4 py-3 border-b border-white/10">
        <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-2">Speaking now</p>
        {speaking.length === 0 ? (
          <p className="text-xs text-slate-500">No one is speaking</p>
        ) : (
          <div className="space-y-1">
            {speaking.map((participant) => (
              <div
                key={`speaker-${participant.identity}`}
                className="flex items-center gap-2 text-xs text-emerald-300"
              >
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                <span className="truncate">{participantName(participant)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {participants.map((participant) => {
          const isSpeaking = participant.isSpeaking;
          const hasMic = micEnabled(participant);
          const hasCamera = cameraEnabled(participant);
          const displayName = participantName(participant);
          const initials = initialsFromName(displayName);
          const avatarColor = avatarColorClass(participant.identity);

          return (
            <div
              key={participant.identity}
              className="rounded-lg border border-white/10 bg-white/5 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative">
                    <div
                      className={`h-9 w-9 rounded-full ${avatarColor} flex items-center justify-center text-xs font-semibold text-white`}
                    >
                      {initials}
                    </div>
                    {raisedHands[participant.identity] && (
                      <span
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-yellow-400 text-black text-xs flex items-center justify-center shadow"
                        title="Hand raised"
                      >
                        ✋
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate">{displayName}</p>
                </div>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isSpeaking ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                  }`}
                  title={isSpeaking ? "Speaking" : "Not speaking"}
                />
              </div>

              <div className="mt-2 flex items-center gap-2 text-slate-300">
                {hasMic ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-red-400" />}
                {hasCamera ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4 text-red-400" />}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
