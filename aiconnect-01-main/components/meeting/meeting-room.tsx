"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Captions,
  Code2,
  Hand,
  Loader2,
  MessageSquare,
  Monitor,
  Mic,
  MicOff,
  PhoneOff,
  Smile,
  Users,
  Video,
  VideoOff,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { ConnectionState, Participant, Room, RoomEvent, Track, TrackPublication } from "livekit-client";
import ParticipantsPanel, { ParticipantEntry } from "@/components/meeting/participants-panel";
import ChatWindow from "@/components/chat/ChatWindow";
import { Button } from "@/components/ui/button";
import LiveCodePanel from "./live-code-panel";
import ThemeToggle from "@/components/navigation/theme-toggle";

interface MeetingRoomProps {
  roomName: string;
  participantName: string;
  videoEnabled?: boolean;
  audioEnabled?: boolean;
  videoDeviceId?: string;
  audioDeviceId?: string;
  onLeave: () => void;
}

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };

type ParticipantView = ParticipantEntry & {
  cameraTrack?: Track;
  screenTrack?: Track;
  micTrack?: Track;
};

type MeetingRealtimeEvent =
  | {
      type: "hand_raise";
      participantId: string;
      raised: boolean;
    }
  | {
      type: "reaction";
      participantId: string;
      participantName: string;
      emoji: string;
    };

function trackFromPublication(pub: TrackPublication | undefined, kind: Track.Kind) {
  if (!pub?.track) return undefined;
  if (pub.track.kind !== kind) return undefined;
  return pub.track;
}

function buildParticipantView(
  participant: Participant,
  isLocal: boolean,
  fallbackName: string
): ParticipantView {
  const cameraPub = participant.getTrackPublication(Track.Source.Camera);
  const micPub = participant.getTrackPublication(Track.Source.Microphone);
  const screenPub = participant.getTrackPublication(Track.Source.ScreenShare);

  return {
    id: participant.identity,
    name: participant.name || fallbackName || participant.identity,
    isLocal,
    isSpeaking: participant.isSpeaking,
    micEnabled: Boolean(micPub && !micPub.isMuted),
    cameraEnabled: Boolean(cameraPub && !cameraPub.isMuted),
    screenShareEnabled: Boolean(screenPub && !screenPub.isMuted),
    cameraTrack: trackFromPublication(cameraPub, Track.Kind.Video),
    screenTrack: trackFromPublication(screenPub, Track.Kind.Video),
    micTrack: trackFromPublication(micPub, Track.Kind.Audio),
  };
}

function mapConnectionState(state: ConnectionState): "connecting" | "connected" | "disconnected" {
  if (state === ConnectionState.Connected) return "connected";
  if (state === ConnectionState.Disconnected) return "disconnected";
  return "connecting";
}

function MediaElement({
  track,
  muted = false,
  className,
}: {
  track?: Track;
  muted?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !track || track.kind !== Track.Kind.Video) return;
    track.attach(el);
    return () => {
      track.detach(el);
      el.srcObject = null;
    };
  }, [track]);

  return <video ref={videoRef} autoPlay playsInline muted={muted} className={className} />;
}

function AudioElement({ track }: { track?: Track }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !track || track.kind !== Track.Kind.Audio) return;
    track.attach(el);
    return () => {
      track.detach(el);
      el.srcObject = null;
    };
  }, [track]);

  return <audio ref={audioRef} autoPlay playsInline />;
}

const avatarColorClasses = [
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
const avatarColorHexes = [
  "#f43f5e",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
];

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getAvatarColorHex(identity: string) {
  let hash = 0;
  for (let i = 0; i < identity.length; i++) {
    hash = (hash * 31 + identity.charCodeAt(i)) >>> 0;
  }
  return avatarColorHexes[hash % avatarColorHexes.length];
}

function possessive(name: string) {
  const clean = name.trim();
  if (!clean) return "User's";
  return clean.endsWith("s") ? `${clean}'` : `${clean}'s`;
}

function TileFallback({
  name,
  identity,
}: {
  name: string;
  identity: string;
}) {
  const base = getAvatarColorHex(identity);
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ backgroundColor: `${base}24` }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-semibold text-white shadow-lg"
            style={{ backgroundColor: `${base}66` }}
          >
            {initialsFromName(name)}
          </div>
        </div>
        <p className="max-w-52 truncate text-sm font-medium text-foreground/90">{name}</p>
      </div>
    </div>
  );
}

export default function MeetingRoom({
  roomName,
  participantName,
  videoEnabled = true,
  audioEnabled = true,
  videoDeviceId,
  audioDeviceId,
  onLeave,
}: MeetingRoomProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [mediaError, setMediaError] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showLiveCode, setShowLiveCode] = useState(false);
  const [showCaption, setShowCaption] = useState(false);
  const [captionText, setCaptionText] = useState("");
  const [showReactions, setShowReactions] = useState(false);
  const [reactions, setReactions] = useState<
    Array<{ id: string; emoji: string; participantId: string; participantName: string }>
  >([]);
  const [handRaised, setHandRaised] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [participants, setParticipants] = useState<ParticipantView[]>([]);
  const [raisedHands, setRaisedHands] = useState<Record<string, boolean>>({});
  const [code, setCode] = useState(`export default function App() {
  return <h1>Hello Live Coding</h1>;
}`);
  const [localIdentity, setLocalIdentity] = useState<string>("");

  const roomRef = useRef<Room | null>(null);
  const displayName = useMemo(() => participantName || "User", [participantName]);

  const refreshParticipants = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const local = buildParticipantView(room.localParticipant, true, displayName);
    const remotes = Array.from(room.remoteParticipants.values()).map((participant) =>
      buildParticipantView(participant, false, participant.name || participant.identity)
    );
    setParticipants([local, ...remotes]);
  }, [displayName]);

  const publishRoomEvent = useCallback(async (event: MeetingRealtimeEvent) => {
    const room = roomRef.current;
    if (!room) return;
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(event));
      await room.localParticipant.publishData(bytes, { reliable: true });
    } catch {
      // Ignore transient data channel failures.
    }
  }, []);

  useEffect(() => {
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    if (!livekitUrl) {
      setMediaError("NEXT_PUBLIC_LIVEKIT_URL is not configured.");
      setIsLoading(false);
      setConnectionStatus("disconnected");
      return;
    }

    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    const handleRoomUpdate = () => {
      setConnectionStatus(mapConnectionState(room.state));
      refreshParticipants();
    };

    room.on(RoomEvent.ConnectionStateChanged, handleRoomUpdate);
    room.on(RoomEvent.ParticipantConnected, handleRoomUpdate);
    room.on(RoomEvent.ParticipantDisconnected, handleRoomUpdate);
    room.on(RoomEvent.TrackSubscribed, handleRoomUpdate);
    room.on(RoomEvent.TrackUnsubscribed, handleRoomUpdate);
    room.on(RoomEvent.TrackPublished, handleRoomUpdate);
    room.on(RoomEvent.TrackUnpublished, handleRoomUpdate);
    room.on(RoomEvent.LocalTrackPublished, handleRoomUpdate);
    room.on(RoomEvent.LocalTrackUnpublished, handleRoomUpdate);
    room.on(RoomEvent.TrackMuted, handleRoomUpdate);
    room.on(RoomEvent.TrackUnmuted, handleRoomUpdate);
    room.on(RoomEvent.ActiveSpeakersChanged, handleRoomUpdate);
    room.on(RoomEvent.ParticipantNameChanged, handleRoomUpdate);
    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      setRaisedHands((prev) => {
        if (!(participant.identity in prev)) return prev;
        const next = { ...prev };
        delete next[participant.identity];
        return next;
      });
    });
    room.on(RoomEvent.DataReceived, (payload, participant) => {
      if (!participant) return;
      try {
        const parsed = JSON.parse(new TextDecoder().decode(payload)) as MeetingRealtimeEvent;
        if (parsed.type === "hand_raise") {
          setRaisedHands((prev) => ({
            ...prev,
            [parsed.participantId || participant.identity]: Boolean(parsed.raised),
          }));
          return;
        }
        if (parsed.type === "reaction") {
          const id =
            typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
          setReactions((prev) => [
            ...prev,
            {
              id,
              emoji: parsed.emoji,
              participantId: parsed.participantId || participant.identity,
              participantName: parsed.participantName || participant.name || "Participant",
            },
          ]);
          setTimeout(() => {
            setReactions((prev) => prev.filter((entry) => entry.id !== id));
          }, 2000);
        }
      } catch {
        // Ignore non-meeting data messages.
      }
    });

    const init = async () => {
      try {
        setIsLoading(true);
        setConnectionStatus("connecting");
        setMediaError("");

        const tokenRes = await fetch(
          `/api/livekit/token?room=${encodeURIComponent(roomName)}&username=${encodeURIComponent(
            displayName
          )}&session=${encodeURIComponent(
            (() => {
              const key = "aiconnect_livekit_session_id";
              const existing =
                typeof window !== "undefined" ? window.sessionStorage.getItem(key) : null;
              if (existing) return existing;
              const created =
                typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                  ? crypto.randomUUID()
                  : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
              if (typeof window !== "undefined") {
                window.sessionStorage.setItem(key, created);
              }
              return created;
            })()
          )}`,
          { cache: "no-store" }
        );
        const tokenBody = (await tokenRes.json()) as { token?: string; error?: string };
        if (!tokenRes.ok || !tokenBody.token) {
          throw new Error(tokenBody.error || "Failed to get meeting token.");
        }

        await room.connect(livekitUrl, tokenBody.token, { autoSubscribe: true });
        setLocalIdentity(room.localParticipant.identity);

        if (videoEnabled) {
          await room.localParticipant.setCameraEnabled(true, videoDeviceId ? ({ deviceId: videoDeviceId } as never) : undefined);
        }
        if (audioEnabled) {
          await room.localParticipant.setMicrophoneEnabled(true, audioDeviceId ? ({ deviceId: audioDeviceId } as never) : undefined);
        }

        handleRoomUpdate();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to join meeting.";
        setMediaError(message);
        setConnectionStatus("disconnected");
      } finally {
        setIsLoading(false);
      }
    };

    void init();

    return () => {
      room.off(RoomEvent.ConnectionStateChanged, handleRoomUpdate);
      room.off(RoomEvent.ParticipantConnected, handleRoomUpdate);
      room.off(RoomEvent.ParticipantDisconnected, handleRoomUpdate);
      room.off(RoomEvent.TrackSubscribed, handleRoomUpdate);
      room.off(RoomEvent.TrackUnsubscribed, handleRoomUpdate);
      room.off(RoomEvent.TrackPublished, handleRoomUpdate);
      room.off(RoomEvent.TrackUnpublished, handleRoomUpdate);
      room.off(RoomEvent.LocalTrackPublished, handleRoomUpdate);
      room.off(RoomEvent.LocalTrackUnpublished, handleRoomUpdate);
      room.off(RoomEvent.TrackMuted, handleRoomUpdate);
      room.off(RoomEvent.TrackUnmuted, handleRoomUpdate);
      room.off(RoomEvent.ActiveSpeakersChanged, handleRoomUpdate);
      room.off(RoomEvent.ParticipantNameChanged, handleRoomUpdate);
      room.disconnect();
      roomRef.current = null;
    };
  }, [audioDeviceId, audioEnabled, displayName, refreshParticipants, roomName, videoDeviceId, videoEnabled]);

  const localParticipant = participants.find((participant) => participant.isLocal);
  const localCameraOn = Boolean(localParticipant?.cameraEnabled);
  const localMicOn = Boolean(localParticipant?.micEnabled);
  const localScreenOn = Boolean(localParticipant?.screenShareEnabled);

  const activeRemoteScreenParticipant = participants.find(
    (participant) => !participant.isLocal && participant.screenTrack
  );

  const activeScreenTrack = localParticipant?.screenTrack || activeRemoteScreenParticipant?.screenTrack;
  const activeScreenOwnerName = localParticipant?.screenTrack
    ? localParticipant.name
    : activeRemoteScreenParticipant?.name;
  const participantsForCameraStrip = participants;

  const remoteAudioTracks = participants
    .filter((participant) => !participant.isLocal)
    .map((participant) => participant.micTrack)
    .filter((track): track is Track => Boolean(track));

  const toggleCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.localParticipant.setCameraEnabled(!localCameraOn, !localCameraOn && videoDeviceId ? ({ deviceId: videoDeviceId } as never) : undefined);
      refreshParticipants();
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : "Unable to toggle camera.");
    }
  }, [localCameraOn, refreshParticipants, videoDeviceId]);

  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.localParticipant.setMicrophoneEnabled(!localMicOn, !localMicOn && audioDeviceId ? ({ deviceId: audioDeviceId } as never) : undefined);
      refreshParticipants();
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : "Unable to toggle microphone.");
    }
  }, [audioDeviceId, localMicOn, refreshParticipants]);

  const toggleScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.localParticipant.setScreenShareEnabled(!localScreenOn);
      refreshParticipants();
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : "Unable to toggle screen sharing.");
    }
  }, [localScreenOn, refreshParticipants]);

  useEffect(() => {
    if (!showCaption) return;
    const speechWindow = window as SpeechRecognitionWindow;
    const SpeechRecognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Live Caption not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setCaptionText(text);
    };
    recognition.start();
    return () => recognition.stop();
  }, [showCaption]);

  const toggleRaiseHand = () => {
    const value = !handRaised;
    const id = localParticipant?.id || localIdentity;
    setHandRaised(value);
    if (!id) return;
    setRaisedHands((prev) => ({ ...prev, [id]: value }));
    void publishRoomEvent({
      type: "hand_raise",
      participantId: id,
      raised: value,
    });
  };

  const sendReaction = (emoji: string) => {
    const participantId = localParticipant?.id || localIdentity;
    const participantName = localParticipant?.name || displayName;
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setReactions((prev) => [
      ...prev,
      {
        id,
        emoji,
        participantId,
        participantName,
      },
    ]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((entry) => entry.id !== id));
    }, 2000);
    if (participantId) {
      void publishRoomEvent({
        type: "reaction",
        participantId,
        participantName,
        emoji,
      });
    }
    setShowReactions(false);
  };

  if (isLoading) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center text-foreground">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] min-h-[100dvh] flex flex-col bg-background text-foreground">
      {showLiveCode ? <LiveCodePanel code={code} onChange={setCode} /> : null}

      {showCaption ? (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 rounded-lg border border-border bg-card/90 px-3 py-2 text-xs text-foreground shadow-sm sm:bottom-36 sm:px-4 sm:text-sm z-[9999]">
          {captionText || "Listening..."}
        </div>
      ) : null}

      {reactions.map((reaction, i) => (
        <div
          key={`${reaction.id}-${i}`}
          className="fixed bottom-32 left-1/2 -translate-x-1/2 text-3xl animate-bounce sm:bottom-40 sm:text-4xl z-[9999]"
          title={`${reaction.participantName} reacted`}
        >
          {reaction.emoji}
        </div>
      ))}

      {remoteAudioTracks.map((track, index) => (
        <AudioElement key={`${track.sid}-${index}`} track={track} />
      ))}

      {mediaError ? (
        <div className="absolute top-3 left-1/2 z-[10000] -translate-x-1/2 rounded-md border border-red-400/60 bg-red-900/70 px-3 py-2 text-xs text-red-50">
          Media error: {mediaError}
        </div>
      ) : null}

      <div className="fixed top-3 left-3 z-[9999]">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs text-foreground backdrop-blur-md">
          {connectionStatus === "connected" ? (
            <>
              <span className="relative inline-flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <Wifi className="h-3.5 w-3.5 text-emerald-300" />
              Connected
            </>
          ) : connectionStatus === "connecting" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-300" />
              Connecting
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-red-300" />
              Disconnected
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-2">
          {activeScreenTrack ? (
            <div className="grid h-full grid-cols-1 gap-2 xl:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="relative h-full min-h-0 overflow-hidden rounded-2xl border border-border bg-card/60 shadow-xl">
                <MediaElement
                  track={activeScreenTrack}
                  muted={Boolean(localParticipant?.screenTrack)}
                  className="h-full w-full object-contain bg-muted"
                />
                <span className="absolute bottom-3 left-3 max-w-52 truncate rounded-full px-3 py-1 text-sm font-semibold text-white shadow bg-emerald-700/80">
                  {`${possessive(activeScreenOwnerName ?? "User")} Screen`}
                </span>
                {activeRemoteScreenParticipant &&
                raisedHands[activeRemoteScreenParticipant.id] ? (
                  <span
                    className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-yellow-100/40 bg-yellow-200/70 text-base text-yellow-900 shadow"
                    title="Hand raised"
                  >
                    {"\u270B"}
                  </span>
                ) : null}
              </div>
              <div className="h-32 min-h-[8rem] sm:h-36 sm:min-h-[9rem] xl:h-full xl:min-h-0">
                <div
                  className={`grid h-full gap-2 overflow-x-auto pb-1 grid-flow-col auto-cols-[minmax(7.5rem,10rem)] sm:auto-cols-[minmax(9rem,1fr)] xl:overflow-visible xl:pb-0 xl:grid-flow-row xl:auto-cols-auto ${
                    participantsForCameraStrip.length > 2
                      ? "xl:grid-cols-2 xl:auto-rows-fr"
                      : "xl:grid-cols-1"
                  }`}
                >
                  {participantsForCameraStrip.map((participant) => (
                    <div
                      key={`camera-tile-${participant.id}`}
                      className="relative min-h-0 overflow-hidden rounded-2xl border bg-card/60 shadow-xl"
                      style={{
                        borderColor: `${getAvatarColorHex(participant.id)}99`,
                        boxShadow: participant.isSpeaking
                          ? `0 0 0 2px ${getAvatarColorHex(participant.id)}99`
                          : undefined,
                      }}
                    >
                      {participant.cameraEnabled && participant.cameraTrack ? (
                        <MediaElement
                          track={participant.cameraTrack}
                          muted={participant.isLocal}
                          className={`h-full w-full object-cover ${participant.isLocal ? "scale-x-[-1]" : ""}`}
                        />
                      ) : (
                        <TileFallback
                          name={participant.name}
                          identity={participant.id}
                        />
                      )}
                      <span className="absolute top-3 left-3 rounded-full bg-card/80 p-2 text-foreground">
                        {participant.micEnabled ? (
                          <Mic className="h-4 w-4 text-emerald-300" />
                        ) : (
                          <MicOff className="h-4 w-4 text-red-300" />
                        )}
                      </span>
                      {raisedHands[participant.id] ? (
                        <span
                          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-yellow-100/40 bg-yellow-200/70 text-base text-yellow-900 shadow"
                          title="Hand raised"
                        >
                          {"\u270B"}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`grid h-full gap-2 ${
                participants.length === 1
                  ? "grid-cols-1"
                  : participants.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-2 auto-rows-fr"
              }`}
            >
              {participants.map((participant) => (
                <div
                  key={`main-tile-${participant.id}`}
                  className="relative min-h-0 overflow-hidden rounded-2xl border bg-card/60 shadow-xl"
                  style={{
                    borderColor: `${getAvatarColorHex(participant.id)}99`,
                    boxShadow: participant.isSpeaking
                      ? `0 0 0 2px ${getAvatarColorHex(participant.id)}99`
                      : undefined,
                  }}
                >
                  {participant.cameraEnabled && participant.cameraTrack ? (
                    <MediaElement
                      track={participant.cameraTrack}
                      muted={participant.isLocal}
                      className={`h-full w-full object-cover ${participant.isLocal ? "scale-x-[-1]" : ""}`}
                    />
                  ) : (
                    <TileFallback
                      name={participant.name}
                      identity={participant.id}
                    />
                  )}
                  <span className="absolute top-3 left-3 rounded-full bg-card/80 p-2 text-foreground">
                    {participant.micEnabled ? (
                      <Mic className="h-4 w-4 text-emerald-300" />
                    ) : (
                      <MicOff className="h-4 w-4 text-red-300" />
                    )}
                  </span>
                  {raisedHands[participant.id] ? (
                    <span
                      className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-yellow-100/40 bg-yellow-200/70 text-base text-yellow-900 shadow"
                      title="Hand raised"
                    >
                      {"\u270B"}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className={`${
            showParticipants ? "" : "hidden"
          } fixed inset-y-0 right-0 z-40 w-[92vw] max-w-80 border-l border-border bg-background/95 lg:static lg:w-80 lg:bg-transparent`}
        >
          <button
            type="button"
            aria-label="Close participants"
            onClick={() => setShowParticipants(false)}
            className="absolute right-3 top-3 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            <X className="h-4 w-4" />
          </button>
          <ParticipantsPanel participants={participants} raisedHands={raisedHands} />
        </div>

        <div
          className={`${
            showChat ? "" : "hidden"
          } fixed inset-y-0 right-0 z-40 w-[96vw] max-w-[32rem] border-l border-border bg-background/95 lg:static lg:w-[28rem] lg:max-w-none lg:bg-transparent`}
        >
          <button
            type="button"
            aria-label="Close chat"
            onClick={() => setShowChat(false)}
            className="absolute right-3 top-3 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            <X className="h-4 w-4" />
          </button>
          <ChatWindow
            roomId={roomName}
            isOpen={showChat}
            onUnreadCountChange={setUnreadChatCount}
            participantId={localIdentity}
            participantName={displayName}
          />
        </div>
      </div>

      <div className="relative border-t border-border bg-background/90 backdrop-blur-md">
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <div className="rounded-full bg-secondary text-secondary-foreground shadow-sm">
            <ThemeToggle />
          </div>
          <Button
            size="lg"
            onClick={() =>
              setShowParticipants((prev) => {
                const next = !prev;
                if (next) setShowChat(false);
                return next;
              })
            }
            className="rounded-full h-10 w-10 p-0 bg-secondary text-secondary-foreground hover:bg-secondary/80 sm:h-11 sm:w-11 md:h-14 md:w-14"
          >
            {showParticipants ? <X /> : <Users />}
          </Button>
          <Button
            size="lg"
            onClick={() => {
              setShowChat((prev) => {
                const next = !prev;
                if (next) setUnreadChatCount(0);
                if (next) setShowParticipants(false);
                return next;
              });
            }}
            className="relative rounded-full h-10 w-10 p-0 bg-secondary text-secondary-foreground hover:bg-secondary/80 sm:h-11 sm:w-11 md:h-14 md:w-14"
          >
            {showChat ? <X /> : <MessageSquare />}
            {!showChat && unreadChatCount > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] leading-5 text-center">
                {unreadChatCount > 99 ? "99+" : unreadChatCount}
              </span>
            ) : null}
          </Button>
        </div>

        <div className="mx-auto flex min-h-[86px] w-full max-w-[96vw] items-center justify-start gap-2 overflow-x-auto px-1 pr-24 py-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] sm:pr-28 md:max-w-[94vw] md:flex-wrap md:justify-center md:overflow-visible md:px-0 md:py-4 md:pb-4 md:gap-3">
          <button
            onClick={() => void toggleMic()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/80 lg:h-auto lg:w-auto lg:px-3 lg:py-2 lg:text-xs lg:font-medium xl:px-4 xl:text-sm"
          >
            {localMicOn ? <Mic className="h-4 w-4 lg:mr-2" /> : <MicOff className="h-4 w-4 lg:mr-2" />}
            <span className="hidden lg:inline">{localMicOn ? "Microphone On" : "Microphone Off"}</span>
          </button>

          <button
            onClick={() => void toggleCamera()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/80 lg:h-auto lg:w-auto lg:px-3 lg:py-2 lg:text-xs lg:font-medium xl:px-4 xl:text-sm"
          >
            {localCameraOn ? <Video className="h-4 w-4 lg:mr-2" /> : <VideoOff className="h-4 w-4 lg:mr-2" />}
            <span className="hidden lg:inline">{localCameraOn ? "Camera On" : "Camera Off"}</span>
          </button>

          <button
            onClick={() => void toggleScreenShare()}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition lg:h-auto lg:w-auto lg:px-3 lg:py-2 lg:text-xs xl:px-4 xl:text-sm ${
              localScreenOn
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <Monitor className="h-4 w-4 lg:mr-2" />
            <span className="hidden lg:inline">{localScreenOn ? "Stop Share" : "Share Screen"}</span>
          </button>

          <button
            onClick={() => setShowLiveCode((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 lg:h-auto lg:w-auto lg:px-3 lg:py-2 lg:text-xs xl:px-4 xl:text-sm"
          >
            <Code2 className="h-4 w-4 lg:mr-2" />
            <span className="hidden lg:inline">Live Code</span>
          </button>

          <button
            onClick={toggleRaiseHand}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition lg:h-auto lg:w-auto lg:px-3 lg:py-2 lg:text-xs xl:px-4 xl:text-sm ${
              handRaised
                ? "bg-yellow-500 text-black"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <Hand className="h-4 w-4 lg:mr-2" />
            <span className="hidden lg:inline">{handRaised ? "Hand Raised" : "Raise Hand"}</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowReactions((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 lg:h-auto lg:w-auto lg:px-3 lg:py-2 lg:text-xs xl:px-4 xl:text-sm"
            >
              <Smile className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Reactions</span>
            </button>
            {showReactions ? (
              <div className="absolute bottom-12 left-1/2 z-[9999] flex -translate-x-1/2 gap-2 rounded-full border border-border bg-card/90 px-3 py-2 shadow-lg">
                {["\u2764\uFE0F", "\u{1F600}", "\u{1F602}", "\u{1F622}", "\u{1F44D}"].map((e) => (
                  <button
                    key={e}
                    onClick={() => sendReaction(e)}
                    className="text-2xl hover:scale-125 transition"
                  >
                    {e}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            onClick={() => setShowCaption((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 lg:h-auto lg:w-auto lg:px-3 lg:py-2 lg:text-xs xl:px-4 xl:text-sm"
          >
            <Captions className="h-4 w-4 lg:mr-2" />
            <span className="hidden lg:inline">Live Caption</span>
          </button>

          <button
            onClick={() => {
              roomRef.current?.disconnect();
              onLeave();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700 lg:h-auto lg:w-auto lg:px-3 lg:py-2 lg:text-xs xl:px-4 xl:text-sm"
          >
            <PhoneOff className="h-4 w-4 lg:mr-2" />
            <span className="hidden lg:inline">Leave</span>
          </button>
        </div>
      </div>
    </div>
  );
}
