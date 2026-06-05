"use client";

import { Mic, MicOff, Radio, Video, VideoOff } from "lucide-react";

export type ParticipantEntry = {
  id: string;
  name: string;
  isLocal?: boolean;
  isSpeaking?: boolean;
  isRecording?: boolean;
  micEnabled?: boolean;
  cameraEnabled?: boolean;
  screenShareEnabled?: boolean;
};

interface ParticipantsPanelProps {
  participants: ParticipantEntry[];
  raisedHands: Record<string, boolean>;
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

export default function ParticipantsPanel({
  participants,
  raisedHands,
}: ParticipantsPanelProps) {
  const speaking = participants.filter((participant) => participant.isSpeaking);

  return (
    <aside className="flex h-full w-full flex-col bg-card/95 text-card-foreground sm:w-80 sm:border-l sm:border-border">
      <div className="border-b border-border px-4 py-4 sm:px-4">
        <p className="text-sm font-semibold tracking-tight">Participants</p>
        <p className="text-xs text-muted-foreground">{participants.length} in meeting</p>
      </div>

      <div className="border-b border-border px-4 py-3">
        <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          Speaking now
        </p>
        {speaking.length === 0 ? (
          <p className="text-xs text-muted-foreground">No one is speaking</p>
        ) : (
          <div className="space-y-1">
            {speaking.map((participant) => (
              <div
                key={`speaker-${participant.id}`}
                className="flex items-center gap-2 text-xs text-emerald-300"
              >
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                <span className="truncate">{participant.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-3">
        {participants.map((participant) => {
          const initials = initialsFromName(participant.name);
          const avatarColor = avatarColorClass(participant.id);

          return (
            <div
              key={participant.id}
              className="rounded-2xl border border-border/80 bg-background/70 p-3 shadow-sm backdrop-blur-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full ${avatarColor} text-xs font-semibold text-white shadow-sm`}
                    >
                      {initials}
                    </div>
                    {raisedHands[participant.id] ? (
                      <span
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-yellow-100/40 bg-yellow-200/45 text-xs text-yellow-900 shadow backdrop-blur-md"
                        title="Hand raised"
                      >
                        {"\u270B"}
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {participant.name}
                      {participant.isLocal ? " (You)" : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {participant.isLocal ? "Your device" : "Remote participant"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {participant.isRecording ? (
                    <span
                      className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse"
                      title="Recording in progress"
                    />
                  ) : null}
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      participant.isSpeaking ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/60"
                    }`}
                    title={participant.isSpeaking ? "Speaking" : "Not speaking"}
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 text-muted-foreground">
                {participant.micEnabled ? (
                  <Mic className="h-4 w-4" />
                ) : (
                  <MicOff className="h-4 w-4 text-red-400" />
                )}
                {participant.cameraEnabled ? (
                  <Video className="h-4 w-4" />
                ) : (
                  <VideoOff className="h-4 w-4 text-red-400" />
                )}
                {participant.screenShareEnabled ? (
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                    Sharing
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
