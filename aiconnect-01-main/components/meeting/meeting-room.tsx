"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Captions,
  Code2,
  Grid3X3,
  Hand,
  Loader2,
  MessageSquare,
  Monitor,
  Mic,
  MicOff,
  Plus,
  PhoneOff,
  PencilLine,
  Vote,
  Smile,
  StickyNote,
  ThumbsUp,
  ThumbsDown,
  Users,
  UsersRound,
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
import { Input } from "@/components/ui/input";
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
    }
  | {
      type: "qna_add";
      item: QaItem;
    }
  | {
      type: "qna_vote";
      questionId: string;
      participantId: string;
      vote: "up" | "down";
    }
  | {
      type: "poll_create";
      poll: PollItem;
    }
  | {
      type: "poll_vote";
      pollId: string;
      optionId: string;
      participantId: string;
    }
  | {
      type: "quiz_create";
      quiz: QuizItem;
    }
  | {
      type: "quiz_respond";
      quizId: string;
      optionId: string;
      participantId: string;
    }
  | {
      type: "shared_note_add";
      note: SharedNoteItem;
    }
  | {
      type: "action_item_add";
      item: ActionItem;
    }
  | {
      type: "action_item_status";
      itemId: string;
      status: ActionStatus;
    };

type HubTab = "whiteboard" | "polls" | "notes";
type PollsTab = "polls" | "quizzes" | "qna";
type NotesTab = "shared" | "actions";
type QaItem = {
  id: string;
  text: string;
  author: string;
  votesByUser: Record<string, "up" | "down">;
};
type PollItem = {
  id: string;
  question: string;
  options: Array<{ id: string; text: string; votes: number }>;
  votesByUser: Record<string, string>;
};
type QuizItem = {
  id: string;
  question: string;
  options: Array<{ id: string; text: string }>;
  correctOptionId: string;
  responsesByUser: Record<string, string>;
};
type SharedNoteItem = { id: string; text: string; author: string; createdAt: string };
type ActionStatus = "Not Started" | "In Progress" | "Completed";
type ActionItem = {
  id: string;
  text: string;
  owner: string;
  dueDate: string;
  status: ActionStatus;
};

function trackFromPublication(pub: TrackPublication | undefined, kind: Track.Kind) {
  if (!pub?.track) return undefined;
  if (pub.track.kind !== kind) return undefined;
  return pub.track;
}

function userKeyFromIdentity(identity: string) {
  const [userKey] = identity.split(":");
  return userKey || identity;
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
    id: userKeyFromIdentity(participant.identity),
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
  useEffect(() => {
    if (typeof window === "undefined") return;
    const originalConsoleError = window.console.error.bind(window.console);
    window.console.error = (...args: unknown[]) => {
      const first = args[0];
      const text = typeof first === "string" ? first : "";
      if (
        text.includes("Unknown DataChannel error on lossy") ||
        text.includes("Unknown DataChannel error on reliable")
      ) {
        return;
      }
      originalConsoleError(...args);
    };
    return () => {
      window.console.error = originalConsoleError;
    };
  }, []);

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
  const [showAppsHub, setShowAppsHub] = useState(false);
  const [activeHubTab, setActiveHubTab] = useState<HubTab>("whiteboard");
  const [activePollsTab, setActivePollsTab] = useState<PollsTab>("polls");
  const [activeNotesTab, setActiveNotesTab] = useState<NotesTab>("shared");
  const [showWhiteboardOverlay, setShowWhiteboardOverlay] = useState(false);
  const [qaDraft, setQaDraft] = useState("");
  const [qaItems, setQaItems] = useState<QaItem[]>([]);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [polls, setPolls] = useState<PollItem[]>([]);
  const [quizQuestion, setQuizQuestion] = useState("");
  const [quizOptions, setQuizOptions] = useState<string[]>(["", ""]);
  const [quizCorrectIndex, setQuizCorrectIndex] = useState(0);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [quizDraftResponses, setQuizDraftResponses] = useState<Record<string, string>>({});
  const [sharedNoteDraft, setSharedNoteDraft] = useState("");
  const [sharedNotes, setSharedNotes] = useState<SharedNoteItem[]>([]);
  const [noteText, setNoteText] = useState("");
  const [noteOwner, setNoteOwner] = useState("");
  const [noteDueDate, setNoteDueDate] = useState("");
  const [noteStatus, setNoteStatus] = useState<ActionStatus>("Not Started");
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [exportStatus, setExportStatus] = useState("");
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
  const notesAutosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionsAutosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitializedNotesRef = useRef(false);
  const hasInitializedActionsRef = useRef(false);
  const joinSessionIdRef = useRef(
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
  const displayName = useMemo(() => participantName || "User", [participantName]);

  const refreshParticipants = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const local = buildParticipantView(room.localParticipant, true, displayName);
    const remotes = Array.from(room.remoteParticipants.values()).map((participant) =>
      buildParticipantView(participant, false, participant.name || participant.identity)
    );
    const merge = (current: ParticipantView, next: ParticipantView): ParticipantView => ({
      ...current,
      ...next,
      id: current.id,
      name: next.name || current.name,
      isLocal: current.isLocal || next.isLocal,
      isSpeaking: current.isSpeaking || next.isSpeaking,
      micEnabled: current.micEnabled || next.micEnabled,
      cameraEnabled: current.cameraEnabled || next.cameraEnabled,
      screenShareEnabled: current.screenShareEnabled || next.screenShareEnabled,
      cameraTrack: next.cameraTrack || current.cameraTrack,
      screenTrack: next.screenTrack || current.screenTrack,
      micTrack: next.micTrack || current.micTrack,
    });

    const deduped = new Map<string, ParticipantView>();
    deduped.set(local.id, local);
    for (const participant of remotes) {
      const existing = deduped.get(participant.id);
      deduped.set(participant.id, existing ? merge(existing, participant) : participant);
    }
    setParticipants(Array.from(deduped.values()));
  }, [displayName]);

  const publishRoomEvent = useCallback(async (event: MeetingRealtimeEvent) => {
    const room = roomRef.current;
    if (!room) return;
    if (room.state !== ConnectionState.Connected) return;
    if (!room.localParticipant) return;
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(event));
      await room.localParticipant.publishData(bytes, { reliable: true });
    } catch (error) {
      // Ignore transient data channel failures (disconnect/reconnect races).
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.toLowerCase().includes("datachannel") ||
        message.toLowerCase().includes("disconnected") ||
        message.toLowerCase().includes("unknown datachannel error")
      ) {
        return;
      }
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
          return;
        }
        if (parsed.type === "qna_add") {
          setQaItems((prev) =>
            prev.some((item) => item.id === parsed.item.id) ? prev : [parsed.item, ...prev]
          );
          return;
        }
        if (parsed.type === "qna_vote") {
          const voterId = parsed.participantId || participant.identity;
          setQaItems((prev) =>
            prev.map((item) => {
              if (item.id !== parsed.questionId) return item;
              return {
                ...item,
                votesByUser: { ...item.votesByUser, [voterId]: parsed.vote },
              };
            })
          );
          return;
        }
        if (parsed.type === "poll_create") {
          setPolls((prev) =>
            prev.some((poll) => poll.id === parsed.poll.id) ? prev : [parsed.poll, ...prev]
          );
          return;
        }
        if (parsed.type === "poll_vote") {
          const voterId = parsed.participantId || participant.identity;
          setPolls((prev) =>
            prev.map((poll) => {
              if (poll.id !== parsed.pollId) return poll;
              const previousOptionId = poll.votesByUser[voterId];
              if (previousOptionId === parsed.optionId) return poll;
              return {
                ...poll,
                votesByUser: { ...poll.votesByUser, [voterId]: parsed.optionId },
                options: poll.options.map((option) =>
                  option.id === parsed.optionId
                    ? { ...option, votes: option.votes + 1 }
                    : option.id === previousOptionId
                    ? { ...option, votes: Math.max(0, option.votes - 1) }
                    : option
                ),
              };
            })
          );
          return;
        }
        if (parsed.type === "quiz_create") {
          setQuizzes((prev) =>
            prev.some((quiz) => quiz.id === parsed.quiz.id) ? prev : [parsed.quiz, ...prev]
          );
          return;
        }
        if (parsed.type === "quiz_respond") {
          const responderId = parsed.participantId || participant.identity;
          setQuizzes((prev) =>
            prev.map((quiz) => {
              if (quiz.id !== parsed.quizId) return quiz;
              if (quiz.responsesByUser[responderId]) return quiz;
              return {
                ...quiz,
                responsesByUser: { ...quiz.responsesByUser, [responderId]: parsed.optionId },
              };
            })
          );
          return;
        }
        if (parsed.type === "shared_note_add") {
          setSharedNotes((prev) =>
            prev.some((note) => note.id === parsed.note.id) ? prev : [parsed.note, ...prev]
          );
          return;
        }
        if (parsed.type === "action_item_add") {
          setActionItems((prev) =>
            prev.some((item) => item.id === parsed.item.id) ? prev : [parsed.item, ...prev]
          );
          return;
        }
        if (parsed.type === "action_item_status") {
          setActionItems((prev) =>
            prev.map((item) =>
              item.id === parsed.itemId ? { ...item, status: parsed.status } : item
            )
          );
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
          )}&join=${encodeURIComponent(
            joinSessionIdRef.current
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
  const activeScreenShareCount = participants.filter(
    (participant) => participant.screenShareEnabled
  ).length;
  const sharingParticipants = participants.filter((participant) => participant.screenTrack);
  const participantsForCameraStrip = participants;
  const [stripPage, setStripPage] = useState(0);
  const [mainGridPage, setMainGridPage] = useState(0);
  const stripPageSize = 6;
  const mainGridPageSize = 8;
  const stripTotalPages = Math.max(
    1,
    Math.ceil(participantsForCameraStrip.length / stripPageSize)
  );
  const mainGridTotalPages = Math.max(
    1,
    Math.ceil(participants.length / mainGridPageSize)
  );
  const stripVisibleParticipants = participantsForCameraStrip.slice(
    stripPage * stripPageSize,
    stripPage * stripPageSize + stripPageSize
  );
  const mainGridVisibleParticipants = participants.slice(
    mainGridPage * mainGridPageSize,
    mainGridPage * mainGridPageSize + mainGridPageSize
  );

  useEffect(() => {
    setStripPage((prev) => Math.min(prev, stripTotalPages - 1));
  }, [stripTotalPages]);

  useEffect(() => {
    setMainGridPage((prev) => Math.min(prev, mainGridTotalPages - 1));
  }, [mainGridTotalPages]);

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
      if (!localScreenOn && activeScreenShareCount >= 2) {
        setMediaError(
          "Maximum 2 participants can share screens at once. Ask one person to stop sharing."
        );
        return;
      }
      setMediaError("");
      await room.localParticipant.setScreenShareEnabled(!localScreenOn);
      refreshParticipants();
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : "Unable to toggle screen sharing.");
    }
  }, [activeScreenShareCount, localScreenOn, refreshParticipants]);

  useEffect(() => {
    const room = roomRef.current;
    if (!room) return;
    if (localScreenOn && activeScreenShareCount > 2) {
      void room.localParticipant.setScreenShareEnabled(false);
      setMediaError(
        "Maximum 2 participants can share screens at once. Ask one person to stop sharing."
      );
    }
  }, [activeScreenShareCount, localScreenOn]);

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

  const addQaItem = () => {
    const text = qaDraft.trim();
    if (!text) return;
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const item: QaItem = { id, text, author: displayName, votesByUser: {} };
    setQaItems((prev) => [item, ...prev]);
    void publishRoomEvent({ type: "qna_add", item });
    setQaDraft("");
  };

  const voteQa = (id: string, vote: "up" | "down") => {
    if (!localIdentity) return;
    setQaItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          votesByUser: { ...item.votesByUser, [localIdentity]: vote },
        };
      })
    );
    void publishRoomEvent({
      type: "qna_vote",
      questionId: id,
      participantId: localIdentity,
      vote,
    });
  };

  const createPoll = () => {
    const question = pollQuestion.trim();
    const cleanedOptions = pollOptions.map((entry) => entry.trim()).filter(Boolean);
    if (!question || cleanedOptions.length < 2) return;
    const pollId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const poll: PollItem = {
      id: pollId,
      question,
      options: cleanedOptions.map((text) => ({
        id:
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        text,
        votes: 0,
      })),
      votesByUser: {},
    };
    setPolls((prev) => [poll, ...prev]);
    void publishRoomEvent({ type: "poll_create", poll });
    setPollQuestion("");
    setPollOptions(["", ""]);
  };

  const votePollOption = (pollId: string, optionId: string) => {
    if (!localIdentity) return;
    let didVote = false;
    setPolls((prev) =>
      prev.map((poll) => {
        if (poll.id !== pollId) return poll;
        const previousOptionId = poll.votesByUser[localIdentity];
        if (previousOptionId === optionId) return poll;
        didVote = true;
        return {
          ...poll,
          votesByUser: { ...poll.votesByUser, [localIdentity]: optionId },
          options: poll.options.map((option) =>
            option.id === optionId
              ? { ...option, votes: option.votes + 1 }
              : option.id === previousOptionId
              ? { ...option, votes: Math.max(0, option.votes - 1) }
              : option
          ),
        };
      })
    );
    if (didVote && localIdentity) {
      void publishRoomEvent({
        type: "poll_vote",
        pollId,
        optionId,
        participantId: localIdentity,
      });
    }
  };

  const createQuiz = () => {
    const question = quizQuestion.trim();
    const cleanedOptions = quizOptions.map((entry) => entry.trim()).filter(Boolean);
    if (!question || cleanedOptions.length < 2) return;
    const quizId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const options = cleanedOptions.map((text) => ({
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      text,
    }));
    const correctedIndex = Math.max(0, Math.min(options.length - 1, quizCorrectIndex));
    const quiz: QuizItem = {
      id: quizId,
      question,
      options,
      correctOptionId: options[correctedIndex].id,
      responsesByUser: {},
    };
    setQuizzes((prev) => [quiz, ...prev]);
    void publishRoomEvent({ type: "quiz_create", quiz });
    setQuizQuestion("");
    setQuizOptions(["", ""]);
    setQuizCorrectIndex(0);
  };

  const respondQuiz = (quizId: string, optionId: string) => {
    if (!localIdentity) return;
    let didRespond = false;
    setQuizzes((prev) =>
      prev.map((quiz) => {
        if (quiz.id !== quizId) return quiz;
        if (quiz.responsesByUser[localIdentity]) return quiz;
        didRespond = true;
        return {
          ...quiz,
          responsesByUser: { ...quiz.responsesByUser, [localIdentity]: optionId },
        };
      })
    );
    if (didRespond && localIdentity) {
      void publishRoomEvent({
        type: "quiz_respond",
        quizId,
        optionId,
        participantId: localIdentity,
      });
    }
  };

  const submitQuizResponse = (quizId: string) => {
    const optionId = quizDraftResponses[quizId];
    if (!optionId) return;
    respondQuiz(quizId, optionId);
  };

  const addActionItem = () => {
    const text = noteText.trim();
    const owner = noteOwner.trim();
    if (!text || !owner || !noteDueDate) return;
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const item: ActionItem = { id, text, owner, dueDate: noteDueDate, status: noteStatus };
    setActionItems((prev) => [item, ...prev]);
    void publishRoomEvent({ type: "action_item_add", item });
    setNoteText("");
    setNoteOwner("");
    setNoteDueDate("");
    setNoteStatus("Not Started");
  };

  const updateActionStatus = (id: string, status: ActionStatus) => {
    setActionItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
    void publishRoomEvent({ type: "action_item_status", itemId: id, status });
  };

  const addSharedNote = () => {
    const text = sharedNoteDraft.trim();
    if (!text) return;
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const note: SharedNoteItem = {
      id,
      text,
      author: displayName,
      createdAt: new Date().toISOString(),
    };
    setSharedNotes((prev) => [note, ...prev]);
    void publishRoomEvent({ type: "shared_note_add", note });
    setSharedNoteDraft("");
  };

  const downloadLocalFile = (filename: string, content: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const saveResourceToS3 = async (
    feature: string,
    filename: string,
    content: string,
    contentType: string
  ) => {
    const response = await fetch("/api/meeting/resources/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feature,
        roomId: roomName,
        filename,
        content,
        contentType,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
    };
    if (!response.ok) {
      throw new Error(payload.error || "Failed to save resource to S3");
    }
    return payload.url;
  };

  const buildSharedNotesJson = () =>
    JSON.stringify(
      {
        room: roomName,
        exportedAt: new Date().toISOString(),
        notes: sharedNotes,
      },
      null,
      2
    );

  const downloadSharedNotes = () => {
    const content = buildSharedNotesJson();
    const filename = `shared-notes-${roomName}-${Date.now()}.json`;
    downloadLocalFile(filename, content, "application/json;charset=utf-8");
  };

  const exportSharedNotes = async () => {
    const content = buildSharedNotesJson();
    const filename = `shared-notes-${roomName}-${Date.now()}.json`;
    const url = await saveResourceToS3("notes", filename, content, "application/json;charset=utf-8");
    if (url) setExportStatus("Shared notes auto-saved to S3.");
  };

  const buildActionItemsCsv = () => {
    const rows = [
      ["Task", "Owner", "Due Date", "Status"],
      ...actionItems.map((item) => [item.text, item.owner, item.dueDate, item.status]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    return csv;
  };

  const downloadActionItemsCsv = () => {
    const csv = buildActionItemsCsv();
    const filename = `action-items-${roomName}-${Date.now()}.csv`;
    downloadLocalFile(filename, csv, "text/csv;charset=utf-8");
  };

  const exportActionItemsCsv = async () => {
    const csv = buildActionItemsCsv();
    const filename = `action-items-${roomName}-${Date.now()}.csv`;
    const url = await saveResourceToS3("action-items", filename, csv, "text/csv;charset=utf-8");
    if (url) setExportStatus("Action items auto-saved to S3.");
  };

  useEffect(() => {
    if (!hasInitializedNotesRef.current) {
      hasInitializedNotesRef.current = true;
      if (sharedNotes.length === 0) return;
    }
    if (notesAutosaveTimerRef.current) {
      clearTimeout(notesAutosaveTimerRef.current);
    }
    notesAutosaveTimerRef.current = setTimeout(() => {
      if (sharedNotes.length === 0) return;
      void exportSharedNotes().catch(() => {
        setExportStatus("Failed to auto-save shared notes to S3.");
      });
    }, 1000);
    return () => {
      if (notesAutosaveTimerRef.current) {
        clearTimeout(notesAutosaveTimerRef.current);
      }
    };
  }, [sharedNotes]);

  useEffect(() => {
    if (!hasInitializedActionsRef.current) {
      hasInitializedActionsRef.current = true;
      if (actionItems.length === 0) return;
    }
    if (actionsAutosaveTimerRef.current) {
      clearTimeout(actionsAutosaveTimerRef.current);
    }
    actionsAutosaveTimerRef.current = setTimeout(() => {
      if (actionItems.length === 0) return;
      void exportActionItemsCsv().catch(() => {
        setExportStatus("Failed to auto-save action items to S3.");
      });
    }, 1000);
    return () => {
      if (actionsAutosaveTimerRef.current) {
        clearTimeout(actionsAutosaveTimerRef.current);
      }
    };
  }, [actionItems]);

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

      {showAppsHub ? (
        <div className="fixed right-3 top-16 z-[10020] w-[min(92vw,28rem)] rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Services Hub</p>
            <button
              type="button"
              onClick={() => setShowAppsHub(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
              aria-label="Close services hub"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl border border-border bg-background/70 p-1">
            <button type="button" onClick={() => setActiveHubTab("whiteboard")} className={`rounded-lg px-2 py-1 text-[11px] ${activeHubTab === "whiteboard" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>Whiteboard</button>
            <button type="button" onClick={() => setActiveHubTab("polls")} className={`rounded-lg px-2 py-1 text-[11px] ${activeHubTab === "polls" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>Polls/Q&A</button>
            <button type="button" onClick={() => setActiveHubTab("notes")} className={`rounded-lg px-2 py-1 text-[11px] ${activeHubTab === "notes" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>Notes</button>
          </div>

          {activeHubTab === "whiteboard" ? (
            <div className="space-y-2 rounded-xl border border-border bg-background/60 p-3">
              <p className="text-sm font-medium">Shared Whiteboard + Annotation</p>
              <p className="text-xs text-muted-foreground">
                Collaborate live with sketches and annotations while screens are shared.
              </p>
              <button
                type="button"
                onClick={() => setShowWhiteboardOverlay(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
              >
                <PencilLine className="h-4 w-4" />
                Open Whiteboard
              </button>
            </div>
          ) : null}

          {activeHubTab === "polls" ? (
            <div className="space-y-3 rounded-xl border border-border bg-background/60 p-3">
              <div>
                <p className="text-sm font-medium">Live Polls, Quizzes, and Q&A</p>
                <p className="text-xs text-muted-foreground">Structured engagement with one-response controls.</p>
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-background/70 p-1">
                <button type="button" onClick={() => setActivePollsTab("polls")} className={`rounded-lg px-2 py-1 text-[11px] ${activePollsTab === "polls" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>Polls</button>
                <button type="button" onClick={() => setActivePollsTab("quizzes")} className={`rounded-lg px-2 py-1 text-[11px] ${activePollsTab === "quizzes" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>Quizzes</button>
                <button type="button" onClick={() => setActivePollsTab("qna")} className={`rounded-lg px-2 py-1 text-[11px] ${activePollsTab === "qna" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>Q&A</button>
              </div>

              {activePollsTab === "polls" ? (
                <div className="space-y-2 rounded-lg border border-border p-2">
                  <Input value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="Poll question" className="h-9" />
                  {pollOptions.map((option, idx) => (
                    <Input
                      key={`hub-poll-option-${idx}`}
                      value={option}
                      onChange={(e) =>
                        setPollOptions((prev) => prev.map((entry, i) => (i === idx ? e.target.value : entry)))
                      }
                      placeholder={`Option ${idx + 1}`}
                      className="h-8"
                    />
                  ))}
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setPollOptions((prev) => [...prev, ""])} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs">
                      <Plus className="h-3.5 w-3.5" /> Option
                    </button>
                    <button type="button" onClick={createPoll} className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground">
                      <Vote className="h-3.5 w-3.5" /> Publish
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">One vote per user. You can switch your vote.</p>
                  <div className="max-h-24 space-y-1 overflow-y-auto">
                    {polls.map((poll) => (
                      <div key={poll.id} className="rounded-md border border-border bg-card p-2 text-xs">
                        <p className="mb-1 font-medium">{poll.question}</p>
                        <div className="space-y-1">
                          {poll.options.map((option) => (
                            <button key={option.id} type="button" onClick={() => votePollOption(poll.id, option.id)} className={`flex w-full items-center justify-between rounded border px-2 py-1 text-left ${poll.votesByUser[localIdentity] === option.id ? "border-primary bg-primary/10" : "border-border bg-background"}`}>
                              <span className="truncate pr-2">{option.text}</span>
                              <span>{option.votes}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {activePollsTab === "quizzes" ? (
                <div className="space-y-2 rounded-lg border border-border p-2">
                  <Input value={quizQuestion} onChange={(e) => setQuizQuestion(e.target.value)} placeholder="Quiz question" className="h-9" />
                  {quizOptions.map((option, idx) => (
                    <div key={`hub-quiz-option-${idx}`} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="quiz-correct"
                        checked={quizCorrectIndex === idx}
                        onChange={() => setQuizCorrectIndex(idx)}
                        className="h-4 w-4"
                      />
                      <Input
                        value={option}
                        onChange={(e) =>
                          setQuizOptions((prev) => prev.map((entry, i) => (i === idx ? e.target.value : entry)))
                        }
                        placeholder={`Option ${idx + 1}`}
                        className="h-8"
                      />
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setQuizOptions((prev) => [...prev, ""])} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs">
                      <Plus className="h-3.5 w-3.5" /> Option
                    </button>
                    <button type="button" onClick={createQuiz} className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground">
                      <Vote className="h-3.5 w-3.5" /> Publish Quiz
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Select one option and submit. After submit, answer is locked.</p>
                  <div className="max-h-24 space-y-1 overflow-y-auto">
                    {quizzes.map((quiz) => (
                      <div key={quiz.id} className="rounded-md border border-border bg-card p-2 text-xs">
                        <p className="mb-1 font-medium">{quiz.question}</p>
                        <div className="space-y-1">
                          {quiz.options.map((option) => {
                            const submittedOptionId = quiz.responsesByUser[localIdentity];
                            const draftOptionId = quizDraftResponses[quiz.id];
                            const isSubmitted = Boolean(submittedOptionId);
                            const activeOptionId = submittedOptionId || draftOptionId;
                            const isSelected = activeOptionId === option.id;
                            const isCorrect = option.id === quiz.correctOptionId;
                            const isCorrectSelection = isSubmitted && isSelected && isCorrect;
                            const isWrongSelection = isSubmitted && isSelected && !isCorrect;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => {
                                  if (isSubmitted) return;
                                  setQuizDraftResponses((prev) => ({ ...prev, [quiz.id]: option.id }));
                                }}
                                className={`flex w-full items-center justify-between rounded border px-2 py-1 text-left ${
                                  isCorrectSelection
                                    ? "border-emerald-500/60 bg-emerald-500/10"
                                    : isWrongSelection
                                    ? "border-rose-500/60 bg-rose-500/10"
                                    : isSelected
                                    ? "border-primary bg-primary/10"
                                    : "border-border bg-background"
                                }`}
                              >
                                <span className="truncate pr-2">{option.text}</span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="text-[10px] text-muted-foreground">
                            {quiz.responsesByUser[localIdentity]
                              ? quiz.responsesByUser[localIdentity] === quiz.correctOptionId
                                ? "Your answer is correct."
                                : "Your answer is incorrect."
                              : "Choose one option, then submit."}
                          </p>
                          <button
                            type="button"
                            onClick={() => submitQuizResponse(quiz.id)}
                            disabled={!quizDraftResponses[quiz.id] || Boolean(quiz.responsesByUser[localIdentity])}
                            className="inline-flex items-center rounded-md border border-border px-2 py-1 text-[10px] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {quiz.responsesByUser[localIdentity] ? "Submitted" : "Submit"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {activePollsTab === "qna" ? (
                <div className="space-y-2 rounded-lg border border-border p-2">
                  <div className="flex gap-2">
                    <Input
                      value={qaDraft}
                      onChange={(e) => setQaDraft(e.target.value)}
                      placeholder="Ask a question..."
                      className="h-9"
                    />
                    <button type="button" onClick={addQaItem} className="inline-flex h-9 items-center gap-1 rounded-lg bg-secondary px-3 text-xs">
                      <Plus className="h-4 w-4" /> Add
                    </button>
                  </div>
                  <div className="max-h-28 space-y-2 overflow-y-auto">
                    {qaItems.map((qa) => (
                      <div key={qa.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-2 py-1.5 text-xs">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{qa.text}</p>
                          <p className="text-[10px] text-muted-foreground">by {qa.author}</p>
                        </div>
                        <div className="ml-2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => voteQa(qa.id, "up")}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] ${
                              qa.votesByUser[localIdentity] === "up" ? "bg-emerald-500/20 text-emerald-700" : "bg-accent"
                            }`}
                          >
                            <ThumbsUp className="h-3 w-3" />{" "}
                            {Object.values(qa.votesByUser).filter((vote) => vote === "up").length}
                          </button>
                          <button
                            type="button"
                            onClick={() => voteQa(qa.id, "down")}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] ${
                              qa.votesByUser[localIdentity] === "down" ? "bg-rose-500/20 text-rose-700" : "bg-accent"
                            }`}
                          >
                            <ThumbsDown className="h-3 w-3" />{" "}
                            {Object.values(qa.votesByUser).filter((vote) => vote === "down").length}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {activeHubTab === "notes" ? (
            <div className="space-y-3 rounded-xl border border-border bg-background/60 p-3">
              <div className="mb-1 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Shared Notes and Action Items</p>
                  <p className="text-xs text-muted-foreground">Capture meeting notes and track tasks with owners, dates, and status.</p>
                </div>
              </div>

              <div className="inline-flex rounded-lg border border-border bg-background/70 p-1">
                <button type="button" onClick={() => setActiveNotesTab("shared")} className={`rounded-lg px-2 py-1 text-[11px] ${activeNotesTab === "shared" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>Shared Notes</button>
                <button type="button" onClick={() => setActiveNotesTab("actions")} className={`rounded-lg px-2 py-1 text-[11px] ${activeNotesTab === "actions" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>Action Items</button>
              </div>

              {activeNotesTab === "shared" ? (
                <div className="space-y-2 rounded-lg border border-border p-2">
                  <div className="flex gap-2">
                    <Input
                      value={sharedNoteDraft}
                      onChange={(e) => setSharedNoteDraft(e.target.value)}
                      placeholder="Write a shared note..."
                      className="h-9"
                    />
                    <button type="button" onClick={addSharedNote} className="inline-flex h-9 items-center gap-1 rounded-lg bg-secondary px-3 text-xs">
                      <Plus className="h-4 w-4" /> Add
                    </button>
                  </div>
                  <div className="max-h-36 space-y-2 overflow-y-auto">
                    {sharedNotes.map((item) => (
                      <div key={item.id} className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs">
                        <p className="break-words font-medium">{item.text}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {item.author} • {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setExportStatus("");
                        downloadSharedNotes();
                      } catch (error) {
                        setExportStatus(error instanceof Error ? error.message : "Failed to download shared notes");
                      }
                    }}
                    className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs"
                  >
                    Download JSON
                  </button>
                </div>
              ) : null}

              {activeNotesTab === "actions" ? (
                <div className="space-y-2 rounded-lg border border-border p-2">
                  <Input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Action item" className="h-9" />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Input value={noteOwner} onChange={(e) => setNoteOwner(e.target.value)} placeholder="Owner" className="h-9" />
                    <Input type="date" value={noteDueDate} onChange={(e) => setNoteDueDate(e.target.value)} className="h-9" />
                    <select
                      value={noteStatus}
                      onChange={(e) => setNoteStatus(e.target.value as ActionStatus)}
                      className="h-9 rounded-md border border-border bg-background px-2 text-xs"
                    >
                      <option>Not Started</option>
                      <option>In Progress</option>
                      <option>Completed</option>
                    </select>
                  </div>
                  <button type="button" onClick={addActionItem} className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-xs text-primary-foreground">
                    <StickyNote className="h-4 w-4" /> Add Item
                  </button>
                  <div className="max-h-36 space-y-2 overflow-y-auto">
                    {actionItems.map((item) => (
                      <div key={item.id} className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs">
                        <p className="truncate font-medium">{item.text}</p>
                        <p className="text-[10px] text-muted-foreground">{item.owner} • {item.dueDate}</p>
                        <div className="mt-1">
                          <select
                            value={item.status}
                            onChange={(e) => updateActionStatus(item.id, e.target.value as ActionStatus)}
                            className="h-8 rounded-md border border-border bg-background px-2 text-[11px]"
                          >
                            <option>Not Started</option>
                            <option>In Progress</option>
                            <option>Completed</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setExportStatus("");
                        downloadActionItemsCsv();
                      } catch (error) {
                        setExportStatus(error instanceof Error ? error.message : "Failed to download action items");
                      }
                    }}
                    className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs"
                  >
                    Download CSV
                  </button>
                </div>
              ) : null}

              {exportStatus ? (
                <p className="text-[11px] text-muted-foreground">{exportStatus}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {showWhiteboardOverlay ? (
        <WhiteboardOverlay onClose={() => setShowWhiteboardOverlay(false)} />
      ) : null}

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
          {sharingParticipants.length > 0 ? (
            <div className="grid h-full grid-cols-1 gap-2 xl:grid-cols-[minmax(0,1fr)_20rem]">
              <div
                className={`grid h-full min-h-0 gap-2 ${
                  sharingParticipants.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
                }`}
              >
                {sharingParticipants.map((sharingParticipant) => (
                  <div
                    key={`share-${sharingParticipant.id}`}
                    className="relative h-full min-h-0 overflow-hidden rounded-2xl border border-border bg-card/60 shadow-xl"
                  >
                    <MediaElement
                      track={sharingParticipant.screenTrack}
                      muted={sharingParticipant.isLocal}
                      className="h-full w-full object-contain bg-muted"
                    />
                    <span className="absolute bottom-3 left-3 max-w-52 truncate rounded-full px-3 py-1 text-sm font-semibold text-white shadow bg-emerald-700/80">
                      {`${possessive(sharingParticipant.name ?? "User")} Screen`}
                    </span>
                    {raisedHands[sharingParticipant.id] ? (
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
              <div className="h-32 min-h-[8rem] sm:h-36 sm:min-h-[9rem] xl:h-full xl:min-h-0">
                <div
                  className={`grid h-full gap-2 overflow-x-auto pb-1 grid-flow-col auto-cols-[minmax(7.5rem,10rem)] sm:auto-cols-[minmax(9rem,1fr)] xl:overflow-visible xl:pb-0 xl:grid-flow-row xl:auto-cols-auto ${
                    stripVisibleParticipants.length > 2
                      ? "xl:grid-cols-2 xl:auto-rows-fr"
                      : "xl:grid-cols-1"
                  }`}
                >
                  {stripVisibleParticipants.map((participant) => (
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
                {stripTotalPages > 1 ? (
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setStripPage((prev) => Math.max(0, prev - 1))}
                      disabled={stripPage === 0}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground disabled:opacity-40"
                      aria-label="Previous participant tiles page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs text-muted-foreground">
                      {stripPage + 1}/{stripTotalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setStripPage((prev) => Math.min(stripTotalPages - 1, prev + 1))
                      }
                      disabled={stripPage >= stripTotalPages - 1}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground disabled:opacity-40"
                      aria-label="Next participant tiles page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div
              className={`relative grid h-full gap-2 ${
                mainGridVisibleParticipants.length === 1
                  ? "grid-cols-1"
                  : mainGridVisibleParticipants.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-2 auto-rows-fr"
              }`}
            >
              {mainGridVisibleParticipants.map((participant) => (
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
              {mainGridTotalPages > 1 ? (
                <div className="pointer-events-none absolute bottom-3 right-3 z-30 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMainGridPage((prev) => Math.max(0, prev - 1))}
                    disabled={mainGridPage === 0}
                    className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground disabled:opacity-40"
                    aria-label="Previous participants page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="rounded-full bg-card/90 px-2 py-0.5 text-xs text-muted-foreground">
                    {mainGridPage + 1}/{mainGridTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setMainGridPage((prev) => Math.min(mainGridTotalPages - 1, prev + 1))
                    }
                    disabled={mainGridPage >= mainGridTotalPages - 1}
                    className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground disabled:opacity-40"
                    aria-label="Next participants page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
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
            onClick={() => setShowAppsHub((prev) => !prev)}
            className="rounded-full h-10 w-10 p-0 bg-secondary text-secondary-foreground hover:bg-secondary/80 sm:h-11 sm:w-11 md:h-14 md:w-14"
            title="Open services hub"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
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

function WhiteboardOverlay({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * window.devicePixelRatio);
      canvas.height = Math.floor(rect.height * window.devicePixelRatio);
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#22c55e";
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const point = getPoint(event);
    if (!point) return;
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const point = getPoint(event);
    if (!point) return;
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawingRef.current = false;
    canvas.releasePointerCapture(event.pointerId);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="fixed inset-0 z-[10060] bg-background/95 p-3 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">Shared Whiteboard</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearCanvas}
            className="rounded-md border border-border bg-card px-3 py-1 text-xs"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground"
          >
            Close
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="h-[calc(100dvh-5rem)] w-full rounded-xl border border-border bg-card"
      />
    </div>
  );
}


