"use client";
import VSCodeEditor from "./vscode-editor";
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
  Video,
  VideoOff,
  Wifi,
  WifiOff,
  X,
  Minus,
  Circle,
  Square,
  Eraser,
  Highlighter,
  Link2,
  Check,
} from "lucide-react";
import { ConnectionState, Participant, Room, RoomEvent, Track, TrackPublication } from "livekit-client";
import ParticipantsPanel, { ParticipantEntry } from "@/components/meeting/participants-panel";
import ChatWindow from "@/components/chat/ChatWindow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ThemeToggle from "@/components/navigation/theme-toggle";
import { copyToClipboard } from "@/lib/utils";

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
  isRecording?: boolean;
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
    }
  | {
      type: "whiteboard_open";
      controllerId: string;
      mode: WhiteboardMode;
      background: string;
      allowedEditorIds: string[];
    }
  | {
      type: "whiteboard_close";
    }
  | {
      type: "whiteboard_mode";
      mode: WhiteboardMode;
    }
  | {
      type: "whiteboard_background";
      background: string;
    }
  | {
      type: "whiteboard_permissions";
      allowedEditorIds: string[];
    }
  | {
      type: "whiteboard_clear";
      mode: WhiteboardMode;
    }
  | {
      type: "whiteboard_op";
      mode: WhiteboardMode;
      op: WhiteboardOp;
    }
  | {
      type: "whiteboard_history";
      mode: WhiteboardMode;
      action: "undo" | "redo";
      op: WhiteboardOp;
      participantId: string;
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
type WhiteboardMode = "whiteboard" | "annotate";
type WhiteboardTool = "pen" | "highlighter" | "eraser" | "line" | "rect" | "circle";
type WhiteboardPoint = { x: number; y: number };
type WhiteboardOp = {
  id: string;
  authorId?: string;
  tool: WhiteboardTool;
  color: string;
  size: number;
  from: WhiteboardPoint;
  to: WhiteboardPoint;
};

function trackFromPublication(pub: TrackPublication | undefined, kind: Track.Kind) {
  if (!pub?.track) return undefined;
  if (pub.track.kind !== kind) return undefined;
  return pub.track;
}

function userKeyFromIdentity(identity: string) {
  return identity;
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
    isRecording: participant.attributes?.aiconnect_recording === "1",
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
      const failedFetchNoise =
        (typeof first === "string" && first.includes("Failed to fetch")) ||
        (first instanceof Error && first.message.includes("Failed to fetch")) ||
        (typeof first === "object" &&
          first !== null &&
          "message" in first &&
          typeof (first as { message?: unknown }).message === "string" &&
          ((first as { message: string }).message.includes("Failed to fetch")));
      const secondIsEmptyObject =
        args.length > 1 &&
        typeof args[1] === "object" &&
        args[1] !== null &&
        Object.keys(args[1] as Record<string, unknown>).length === 0;
      if (
        text.includes("Unknown DataChannel error on lossy") ||
        text.includes("Unknown DataChannel error on reliable") ||
        (failedFetchNoise && (args.length === 1 || secondIsEmptyObject))
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
  const [minimizedAppsHub, setMinimizedAppsHub] = useState(false);
  const [activeHubTab, setActiveHubTab] = useState<HubTab>("whiteboard");
  const [activePollsTab, setActivePollsTab] = useState<PollsTab>("polls");
  const [activeNotesTab, setActiveNotesTab] = useState<NotesTab>("shared");
  const [whiteboardMode, setWhiteboardMode] = useState<WhiteboardMode>("whiteboard");
  const [whiteboardControllerId, setWhiteboardControllerId] = useState<string>("");
  const [whiteboardAllowedEditorIds, setWhiteboardAllowedEditorIds] = useState<string[]>([]);
  const [whiteboardBackground, setWhiteboardBackground] = useState("#ffffff");
  const [whiteboardOps, setWhiteboardOps] = useState<WhiteboardOp[]>([]);
  const [annotationOps, setAnnotationOps] = useState<WhiteboardOp[]>([]);
  const [whiteboardRedoOps, setWhiteboardRedoOps] = useState<WhiteboardOp[]>([]);
  const [annotationRedoOps, setAnnotationRedoOps] = useState<WhiteboardOp[]>([]);
  const [whiteboardTool, setWhiteboardTool] = useState<WhiteboardTool>("pen");
  const [whiteboardColor, setWhiteboardColor] = useState("#22c55e");
  const [whiteboardSize, setWhiteboardSize] = useState(4);
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
  const [recordingState, setRecordingState] = useState<
    "idle" | "starting" | "recording" | "stopping"
  >("idle");
  const [recordingEgressId, setRecordingEgressId] = useState<string>("");
  const [recordingMessage, setRecordingMessage] = useState("");
  const [meetingInviteLink, setMeetingInviteLink] = useState("");
  const [meetingLinkCopied, setMeetingLinkCopied] = useState(false);
  const [participants, setParticipants] = useState<ParticipantView[]>([]);
  const [raisedHands, setRaisedHands] = useState<Record<string, boolean>>({});
  const [localIdentity, setLocalIdentity] = useState<string>("");

  const roomRef = useRef<Room | null>(null);
  const uiRecorderRef = useRef<MediaRecorder | null>(null);
  const uiRecordingChunksRef = useRef<Blob[]>([]);
  const uiCaptureStreamRef = useRef<MediaStream | null>(null);
  const uiMicStreamRef = useRef<MediaStream | null>(null);
  const uiAudioContextRef = useRef<AudioContext | null>(null);
  const uiUploadUrlRef = useRef<string>("");
  const uiLocalSavedRef = useRef(false);
  const intentionalLeaveRef = useRef(false);
  const desiredCameraEnabledRef = useRef(Boolean(videoEnabled));
  const desiredMicEnabledRef = useRef(Boolean(audioEnabled));
  const whiteboardLastPublishAtRef = useRef(0);
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

  useEffect(() => {
    if (typeof window === "undefined" || !roomName) {
      setMeetingInviteLink("");
      return;
    }

    setMeetingInviteLink(
      `${window.location.origin}/meeting/join?room=${encodeURIComponent(roomName)}`
    );
  }, [roomName]);

  const copyMeetingLink = useCallback(async () => {
    if (!meetingInviteLink) {
      setMeetingLinkCopied(false);
      return;
    }

    try {
      const ok = await copyToClipboard(meetingInviteLink);
      if (!ok) throw new Error("Copy failed");
      setMeetingLinkCopied(true);
      window.setTimeout(() => setMeetingLinkCopied(false), 1800);
    } catch {
      setMeetingLinkCopied(false);
      setRecordingMessage("Unable to copy link. Please copy manually.");
    }
  }, [meetingInviteLink]);

  useEffect(() => {
    desiredCameraEnabledRef.current = Boolean(videoEnabled);
  }, [videoEnabled]);

  useEffect(() => {
    desiredMicEnabledRef.current = Boolean(audioEnabled);
  }, [audioEnabled]);

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

  const setLocalRecordingAttribute = useCallback(
    async (isRecording: boolean) => {
      const room = roomRef.current;
      if (!room?.localParticipant) return;
      try {
        await room.localParticipant.setAttributes({
          aiconnect_recording: isRecording ? "1" : "0",
        });
        refreshParticipants();
      } catch {
        // Ignore attribute sync errors; recording itself should keep working.
      }
    },
    [refreshParticipants]
  );

  const publishRoomEvent = useCallback(
    async (event: MeetingRealtimeEvent, options?: { reliable?: boolean }) => {
    const room = roomRef.current;
    if (!room) return;
    if (room.state !== ConnectionState.Connected) return;
    if (!room.localParticipant) return;
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(event));
      await room.localParticipant.publishData(bytes, {
        reliable: options?.reliable ?? true,
      });
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
    },
    []
  );

  useEffect(() => {
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    if (!livekitUrl) {
      setMediaError("NEXT_PUBLIC_LIVEKIT_URL is not configured.");
      setIsLoading(false);
      setConnectionStatus("disconnected");
      return;
    }

    intentionalLeaveRef.current = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 8;
    const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 12000];

    const getSessionId = () => {
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
    };

    const fetchToken = async () => {
      const tokenRes = await fetch(
        `/api/livekit/token?room=${encodeURIComponent(roomName)}&username=${encodeURIComponent(
          displayName
        )}&session=${encodeURIComponent(getSessionId())}&join=${encodeURIComponent(
          joinSessionIdRef.current
        )}`,
        { cache: "no-store" }
      );
      const tokenBody = (await tokenRes.json()) as { token?: string; error?: string };
      if (!tokenRes.ok || !tokenBody.token) {
        throw new Error(tokenBody.error || "Failed to get meeting token.");
      }
      return tokenBody.token;
    };

    const connectToRoom = async (isReconnect = false) => {
      if (disposed || intentionalLeaveRef.current) return;
      try {
        if (!isReconnect) {
          setIsLoading(true);
        }
        setConnectionStatus("connecting");
        setMediaError("");
        const token = await fetchToken();
        if (disposed || intentionalLeaveRef.current) return;

        await room.connect(livekitUrl, token, { autoSubscribe: true });
        reconnectAttempts = 0;
        setLocalIdentity(userKeyFromIdentity(room.localParticipant.identity));
        try {
          await room.localParticipant.setAttributes({ aiconnect_recording: "0" });
        } catch {
          // Some deployments may not grant metadata updates; do not block join.
        }

        if (desiredCameraEnabledRef.current) {
          await room.localParticipant.setCameraEnabled(
            true,
            videoDeviceId ? ({ deviceId: videoDeviceId } as never) : undefined
          );
        }
        if (desiredMicEnabledRef.current) {
          await room.localParticipant.setMicrophoneEnabled(
            true,
            audioDeviceId ? ({ deviceId: audioDeviceId } as never) : undefined
          );
        }

        setConnectionStatus("connected");
        refreshParticipants();
      } catch (error) {
        if (disposed || intentionalLeaveRef.current) return;
        let message = error instanceof Error ? error.message : "Failed to join meeting.";
        if (typeof window !== "undefined" && !window.isSecureContext) {
          message = "Media access (Camera/Mic/Recording) requires a secure context (HTTPS or localhost). Please access the app via http://localhost:3005 or configure HTTPS/Chrome flags.";
        }
        setMediaError(message);
        setConnectionStatus("disconnected");
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay =
            RECONNECT_DELAYS_MS[
              Math.min(reconnectAttempts, RECONNECT_DELAYS_MS.length - 1)
            ];
          reconnectAttempts += 1;
          if (!reconnectTimer) {
            reconnectTimer = setTimeout(() => {
              reconnectTimer = null;
              void connectToRoom(true);
            }, delay);
          }
        } else {
          setMediaError(
            "Connection lost repeatedly. Please check network and rejoin meeting."
          );
        }
      } finally {
        if (!isReconnect) {
          setIsLoading(false);
        }
      }
    };

    const handleRoomUpdate = () => {
      setConnectionStatus(mapConnectionState(room.state));
      refreshParticipants();
    };

    const handleConnectionStateChanged = (state: ConnectionState) => {
      setConnectionStatus(mapConnectionState(state));
      refreshParticipants();

      if (state === ConnectionState.Connected) {
        reconnectAttempts = 0;
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        return;
      }

      if (
        state === ConnectionState.Disconnected &&
        !disposed &&
        !intentionalLeaveRef.current &&
        reconnectAttempts < MAX_RECONNECT_ATTEMPTS &&
        !reconnectTimer
      ) {
        const delay =
          RECONNECT_DELAYS_MS[
            Math.min(reconnectAttempts, RECONNECT_DELAYS_MS.length - 1)
          ];
        reconnectAttempts += 1;
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          void connectToRoom(true);
        }, delay);
      }
    };

    room.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);
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
    room.on(RoomEvent.ParticipantAttributesChanged, handleRoomUpdate);
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
              participantName: parsed.participantName || participant.name || participant.identity || "Participant",
            },
          ]);
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
          return;
        }
        if (parsed.type === "whiteboard_open") {
          setWhiteboardControllerId(parsed.controllerId);
          setWhiteboardMode(parsed.mode);
          setWhiteboardBackground(parsed.background);
          setWhiteboardAllowedEditorIds(parsed.allowedEditorIds);
          if (parsed.mode === "whiteboard") {
            setWhiteboardOps([]);
            setWhiteboardRedoOps([]);
          } else {
            setAnnotationOps([]);
            setAnnotationRedoOps([]);
          }
          return;
        }
        if (parsed.type === "whiteboard_close") {
          setWhiteboardControllerId("");
          setWhiteboardAllowedEditorIds([]);
          setWhiteboardOps([]);
          setAnnotationOps([]);
          setWhiteboardRedoOps([]);
          setAnnotationRedoOps([]);
          return;
        }
        if (parsed.type === "whiteboard_mode") {
          setWhiteboardMode(parsed.mode);
          return;
        }
        if (parsed.type === "whiteboard_background") {
          setWhiteboardBackground(parsed.background);
          return;
        }
        if (parsed.type === "whiteboard_permissions") {
          setWhiteboardAllowedEditorIds(parsed.allowedEditorIds);
          return;
        }
        if (parsed.type === "whiteboard_clear") {
          const targetMode = parsed.mode || "whiteboard";
          if (targetMode === "whiteboard") {
            setWhiteboardOps([]);
            setWhiteboardRedoOps([]);
          } else {
            setAnnotationOps([]);
            setAnnotationRedoOps([]);
          }
          return;
        }
        if (parsed.type === "whiteboard_op") {
          const targetMode = parsed.mode || "whiteboard";
          if (targetMode === "whiteboard") {
            setWhiteboardOps((prev) => [...prev, parsed.op]);
          } else {
            setAnnotationOps((prev) => [...prev, parsed.op]);
          }
          return;
        }
        if (parsed.type === "whiteboard_history") {
          const targetMode = parsed.mode || "whiteboard";
          if (targetMode === "whiteboard") {
            if (parsed.action === "undo") {
              setWhiteboardOps((prev) => prev.filter((entry) => entry.id !== parsed.op.id));
            } else {
              setWhiteboardOps((prev) =>
                prev.some((entry) => entry.id === parsed.op.id) ? prev : [...prev, parsed.op]
              );
            }
          } else {
            if (parsed.action === "undo") {
              setAnnotationOps((prev) => prev.filter((entry) => entry.id !== parsed.op.id));
            } else {
              setAnnotationOps((prev) =>
                prev.some((entry) => entry.id === parsed.op.id) ? prev : [...prev, parsed.op]
              );
            }
          }
        }
      } catch {
        // Ignore non-meeting data messages.
      }
    });

    void connectToRoom();

    return () => {
      disposed = true;
      intentionalLeaveRef.current = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      room.off(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);
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
      room.off(RoomEvent.ParticipantAttributesChanged, handleRoomUpdate);
      room.disconnect();
      roomRef.current = null;
    };
  }, [audioDeviceId, displayName, refreshParticipants, roomName, videoDeviceId]);

  useEffect(() => {
    return () => {
      if (uiRecorderRef.current && uiRecorderRef.current.state !== "inactive") {
        try {
          uiRecorderRef.current.stop();
        } catch {
          // Ignore stop errors during unmount.
        }
      }
      uiCaptureStreamRef.current?.getTracks().forEach((track) => track.stop());
      uiMicStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (uiAudioContextRef.current) {
        void uiAudioContextRef.current.close().catch(() => undefined);
        uiAudioContextRef.current = null;
      }
      uiCaptureStreamRef.current = null;
      uiMicStreamRef.current = null;
      uiRecorderRef.current = null;
      uiRecordingChunksRef.current = [];
      uiUploadUrlRef.current = "";
      uiLocalSavedRef.current = false;
    };
  }, []);

  const localParticipant = participants.find((participant) => participant.isLocal);
  const localCameraOn = Boolean(localParticipant?.cameraEnabled);
  const localMicOn = Boolean(localParticipant?.micEnabled);
  const localScreenOn = Boolean(localParticipant?.screenShareEnabled);
  const activeRecordingParticipants = participants.filter(
    (participant) => participant.isRecording
  );
  const activeRecordingNames = activeRecordingParticipants.map((participant) =>
    participant.name.trim()
  );
  const whiteboardActive = Boolean(whiteboardControllerId);
  const canEditWhiteboard = Boolean(
    localIdentity &&
      (localIdentity === whiteboardControllerId ||
        whiteboardAllowedEditorIds.includes(localIdentity))
  );
  const otherActiveScreenShareCount = participants.filter(
    (participant) => participant.screenShareEnabled && !participant.isLocal
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
      const nextEnabled = !localCameraOn;
      await room.localParticipant.setCameraEnabled(
        nextEnabled,
        nextEnabled && videoDeviceId ? ({ deviceId: videoDeviceId } as never) : undefined
      );
      desiredCameraEnabledRef.current = nextEnabled;
      refreshParticipants();
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : "Unable to toggle camera.");
    }
  }, [localCameraOn, refreshParticipants, videoDeviceId]);

  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      const nextEnabled = !localMicOn;
      await room.localParticipant.setMicrophoneEnabled(
        nextEnabled,
        nextEnabled && audioDeviceId ? ({ deviceId: audioDeviceId } as never) : undefined
      );
      desiredMicEnabledRef.current = nextEnabled;
      refreshParticipants();
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : "Unable to toggle microphone.");
    }
  }, [audioDeviceId, localMicOn, refreshParticipants]);

  const toggleScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      // Enforce the 2-share limit only when user starts sharing.
      // Do not auto-stop an active share during transient participant state changes.
      if (!localScreenOn && otherActiveScreenShareCount >= 2) {
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
  }, [localScreenOn, otherActiveScreenShareCount, refreshParticipants]);

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

  const openWhiteboard = (mode: WhiteboardMode) => {
    if (!localIdentity) return;
    if (mode === "annotate" && sharingParticipants.length === 0) {
      setMediaError("Start screen share first, then use Annotate.");
      return;
    }
    setMediaError("");
    setWhiteboardControllerId(localIdentity);
    setWhiteboardMode(mode);
    setWhiteboardAllowedEditorIds([localIdentity]);
    if (mode === "whiteboard") {
      setWhiteboardOps([]);
    } else {
      setAnnotationOps([]);
    }
    void publishRoomEvent({
      type: "whiteboard_open",
      controllerId: localIdentity,
      mode,
      background: whiteboardBackground,
      allowedEditorIds: [localIdentity],
    });
  };

  const closeWhiteboard = () => {
    setWhiteboardControllerId("");
    setWhiteboardAllowedEditorIds([]);
    setWhiteboardOps([]);
    void publishRoomEvent({ type: "whiteboard_close" });
  };

  const setWhiteboardModeAndShare = (mode: WhiteboardMode) => {
    if (whiteboardControllerId && localIdentity !== whiteboardControllerId) return;
    setWhiteboardMode(mode);
    void publishRoomEvent({ type: "whiteboard_mode", mode });
  };

  const setWhiteboardBackgroundAndShare = (background: string) => {
    if (whiteboardControllerId && localIdentity !== whiteboardControllerId) return;
    setWhiteboardBackground(background);
    void publishRoomEvent({ type: "whiteboard_background", background });
  };

  const setWhiteboardPermissions = (allowedEditorIds: string[]) => {
    if (localIdentity !== whiteboardControllerId) return;
    setWhiteboardAllowedEditorIds(allowedEditorIds);
    void publishRoomEvent({ type: "whiteboard_permissions", allowedEditorIds });
  };

  const appendWhiteboardOp = (op: WhiteboardOp) => {
    if (!canEditWhiteboard) return;
    const opWithAuthor: WhiteboardOp = {
      ...op,
      authorId: localIdentity || op.authorId,
    };
    if (whiteboardMode === "whiteboard") {
      setWhiteboardOps((prev) => [...prev, opWithAuthor]);
      setWhiteboardRedoOps([]);
    } else {
      setAnnotationOps((prev) => [...prev, opWithAuthor]);
      setAnnotationRedoOps([]);
    }
    const isContinuousTool =
      op.tool === "pen" || op.tool === "highlighter" || op.tool === "eraser";
    const now = Date.now();
    if (isContinuousTool && now - whiteboardLastPublishAtRef.current < 24) {
      return;
    }
    whiteboardLastPublishAtRef.current = now;
    void publishRoomEvent(
      { type: "whiteboard_op", mode: whiteboardMode, op: opWithAuthor },
      { reliable: false }
    );
  };

  const clearWhiteboard = () => {
    if (localIdentity !== whiteboardControllerId) return;
    if (whiteboardMode === "whiteboard") {
      setWhiteboardOps([]);
      setWhiteboardRedoOps([]);
    } else {
      setAnnotationOps([]);
      setAnnotationRedoOps([]);
    }
    void publishRoomEvent({ type: "whiteboard_clear", mode: whiteboardMode });
  };

  const undoWhiteboard = useCallback(() => {
    if (!canEditWhiteboard || !localIdentity) return;
    if (whiteboardMode === "whiteboard") {
      const target = [...whiteboardOps]
        .reverse()
        .find((op) => (op.authorId || localIdentity) === localIdentity);
      if (!target) return;
      setWhiteboardOps((prev) => prev.filter((entry) => entry.id !== target.id));
      setWhiteboardRedoOps((prev) => [...prev, target]);
      void publishRoomEvent({
        type: "whiteboard_history",
        mode: "whiteboard",
        action: "undo",
        op: target,
        participantId: localIdentity,
      });
    } else {
      const target = [...annotationOps]
        .reverse()
        .find((op) => (op.authorId || localIdentity) === localIdentity);
      if (!target) return;
      setAnnotationOps((prev) => prev.filter((entry) => entry.id !== target.id));
      setAnnotationRedoOps((prev) => [...prev, target]);
      void publishRoomEvent({
        type: "whiteboard_history",
        mode: "annotate",
        action: "undo",
        op: target,
        participantId: localIdentity,
      });
    }
  }, [
    annotationOps,
    canEditWhiteboard,
    localIdentity,
    publishRoomEvent,
    whiteboardMode,
    whiteboardOps,
  ]);

  const redoWhiteboard = useCallback(() => {
    if (!canEditWhiteboard || !localIdentity) return;
    if (whiteboardMode === "whiteboard") {
      const target = whiteboardRedoOps[whiteboardRedoOps.length - 1];
      if (!target) return;
      setWhiteboardRedoOps((prev) => prev.slice(0, -1));
      setWhiteboardOps((prev) => [...prev, target]);
      void publishRoomEvent({
        type: "whiteboard_history",
        mode: "whiteboard",
        action: "redo",
        op: target,
        participantId: localIdentity,
      });
    } else {
      const target = annotationRedoOps[annotationRedoOps.length - 1];
      if (!target) return;
      setAnnotationRedoOps((prev) => prev.slice(0, -1));
      setAnnotationOps((prev) => [...prev, target]);
      void publishRoomEvent({
        type: "whiteboard_history",
        mode: "annotate",
        action: "redo",
        op: target,
        participantId: localIdentity,
      });
    }
  }, [
    annotationRedoOps,
    canEditWhiteboard,
    localIdentity,
    publishRoomEvent,
    whiteboardMode,
    whiteboardRedoOps,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!whiteboardActive || !canEditWhiteboard) return;
      const key = event.key.toLowerCase();
      const withMeta = event.ctrlKey || event.metaKey;
      if (!withMeta) return;
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undoWhiteboard();
        return;
      }
      if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        redoWhiteboard();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canEditWhiteboard, redoWhiteboard, undoWhiteboard, whiteboardActive]);

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

  const downloadBlobFile = (filename: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const uploadUiRecordingToS3 = useCallback(async (blob: Blob, filename: string) => {
    const uploadViaServerRoute = async () => {
      setRecordingMessage("UI recording: retrying upload via server route...");
      const formData = new FormData();
      formData.append(
        "file",
        new File([blob], filename, { type: blob.type || "video/webm" })
      );
      formData.append("roomName", roomName);
      const response = await fetch("/api/meeting/recordings/upload", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
      };
      if (!response.ok) {
        throw new Error(
          `UI recording server-upload failed (${response.status}): ${
            payload.error || "unknown error"
          }`
        );
      }
      return payload.url || "";
    };

    const extension = filename.toLowerCase().endsWith(".mp4") ? "mp4" : "webm";
    setRecordingMessage("UI recording: creating upload URL...");
    const createRes = await fetch("/api/meeting/recordings/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomName,
        contentType: blob.type || "video/webm",
        extension,
      }),
    });
    const createPayload = (await createRes.json().catch(() => ({}))) as {
      error?: string;
      putUrl?: string;
      downloadUrl?: string;
    };
    if (!createRes.ok || !createPayload.putUrl) {
      return uploadViaServerRoute();
    }

    setRecordingMessage("UI recording: uploading to S3...");
    let putRes: Response;
    try {
      putRes = await fetch(createPayload.putUrl, {
        method: "PUT",
        headers: {
          "Content-Type": blob.type || "video/webm",
        },
        body: blob,
      });
    } catch {
      return uploadViaServerRoute();
    }
    if (!putRes.ok) {
      const details = await putRes.text().catch(() => "");
      if (putRes.status === 403 || putRes.status === 400) {
        return uploadViaServerRoute();
      }
      throw new Error(
        `UI recording S3 PUT failed (${putRes.status}): ${
          details.slice(0, 220) || putRes.statusText || "unknown error"
        }`
      );
    }

    return createPayload.downloadUrl || "";
  }, [roomName]);

  const stopUiRootCapture = useCallback(
    async (options?: { skipUpload?: boolean }) => {
      const recorder = uiRecorderRef.current;
      if (!recorder) return "";
      let blob: Blob;
      if (recorder.state === "inactive") {
        blob = new Blob(uiRecordingChunksRef.current, {
          type: recorder.mimeType || "video/webm",
        });
      } else {
        const stopped = new Promise<Blob>((resolve) => {
          recorder.onstop = () => {
            const b = new Blob(uiRecordingChunksRef.current, {
              type: recorder.mimeType || "video/webm",
            });
            resolve(b);
          };
        });
        recorder.stop();
        blob = await stopped;
      }

      uiCaptureStreamRef.current?.getTracks().forEach((track) => track.stop());
      uiMicStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (uiAudioContextRef.current) {
        void uiAudioContextRef.current.close().catch(() => undefined);
        uiAudioContextRef.current = null;
      }
      uiCaptureStreamRef.current = null;
      uiMicStreamRef.current = null;
      uiRecorderRef.current = null;
      uiRecordingChunksRef.current = [];
      const filename = `meeting-ui-${roomName}-${Date.now()}.webm`;
      // downloadBlobFile(filename, blob); // Disabled local browser download
      uiLocalSavedRef.current = true;

      if (options?.skipUpload) {
        uiUploadUrlRef.current = "";
        return "";
      }
      const uploadedUrl = await uploadUiRecordingToS3(blob, filename);
      uiUploadUrlRef.current = uploadedUrl;
      return uploadedUrl;
    },
    [roomName, uploadUiRecordingToS3]
  );

  const startUiRootCapture = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getDisplayMedia !== "function"
    ) {
      throw new Error("Screen capture is not supported in this browser.");
    }

    uiRecordingChunksRef.current = [];
    uiUploadUrlRef.current = "";

    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: 30,
      },
      audio: true,
      // @ts-expect-error - experimental browser hint
      preferCurrentTab: true,
      selfBrowserSurface: "include",
      surfaceSwitching: "include",
      systemAudio: "include",
    });

    const composed = new MediaStream();
    displayStream.getVideoTracks().forEach((track) => composed.addTrack(track));

    const audioContext = new AudioContext();
    uiAudioContextRef.current = audioContext;
    const destination = audioContext.createMediaStreamDestination();
    let mixedCount = 0;

    const addTrackToMix = (track?: MediaStreamTrack) => {
      if (!track || track.kind !== "audio") return;
      try {
        const source = audioContext.createMediaStreamSource(new MediaStream([track]));
        source.connect(destination);
        mixedCount += 1;
      } catch {
        // Ignore unusable tracks.
      }
    };

    // 1. Add shared display / tab system audio if available
    displayStream.getAudioTracks().forEach((track) => {
      addTrackToMix(track);
    });

    // 2. Add local microphone (direct getUserMedia)
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      uiMicStreamRef.current = micStream;
      micStream.getAudioTracks().forEach((track) => addTrackToMix(track));
    } catch {
      // Continue with remote/fallback tracks
    }

    // 3. Add remote participants' audio tracks
    for (const track of remoteAudioTracks) {
      const mediaTrack = (track as unknown as { mediaStreamTrack?: MediaStreamTrack })
        .mediaStreamTrack;
      addTrackToMix(mediaTrack);
    }

    // 4. Add local participant track if direct micStream wasn't captured
    if (!uiMicStreamRef.current) {
      const localMicTrack = (localParticipant?.micTrack as unknown as
        | { mediaStreamTrack?: MediaStreamTrack }
        | undefined)?.mediaStreamTrack;
      addTrackToMix(localMicTrack);
    }

    if (mixedCount > 0) {
      const mixedTrack = destination.stream.getAudioTracks()[0];
      if (mixedTrack) composed.addTrack(mixedTrack);
    } else {
      void audioContext.close().catch(() => undefined);
      uiAudioContextRef.current = null;
    }

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
      ? "video/webm;codecs=vp8"
      : "video/webm";

    const recorder = new MediaRecorder(composed, { mimeType });
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        uiRecordingChunksRef.current.push(event.data);
      }
    };
    recorder.start(1000);

    uiRecorderRef.current = recorder;
    uiCaptureStreamRef.current = displayStream;

    const [videoTrack] = displayStream.getVideoTracks();
    if (videoTrack) {
      videoTrack.onended = () => {
        setRecordingMessage(
          "Screen capture was ended from browser controls. Use Stop Recording to finalize."
        );
      };
    }
  }, [localParticipant?.micTrack, remoteAudioTracks]);

  const saveResourceToS3 = useCallback(async (
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
  }, [roomName]);

  const startRecording = useCallback(async () => {
    if (recordingState !== "idle") return;
    setRecordingState("starting");
    setRecordingMessage("");
    try {
      await startUiRootCapture();
      const response = await fetch("/api/livekit/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        egressId?: string;
        message?: string;
        error?: string;
      };
      if (!response.ok || !payload.egressId) {
        throw new Error(payload.error || "Failed to start recording.");
      }
      setRecordingEgressId(payload.egressId);
      setRecordingState("recording");
      void setLocalRecordingAttribute(true);
      setRecordingMessage(
        payload.message ||
          "Recording started. Ensure you shared the current meeting tab for full layout capture."
      );
    } catch {
      if (uiRecorderRef.current) {
        await stopUiRootCapture({ skipUpload: true });
      }
      setRecordingState("idle");
    }
  }, [recordingState, roomName, setLocalRecordingAttribute, startUiRootCapture, stopUiRootCapture]);

  const stopRecording = useCallback(async () => {
    if (!recordingEgressId || recordingState !== "recording") return;
    setRecordingState("stopping");
    setRecordingMessage("");
    try {
      const response = await fetch("/api/livekit/recordings/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ egressId: recordingEgressId }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        egressId?: string;
        status?: string;
        statusCode?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to stop recording.");
      }

      let uiUrl = "";
      let uiCaptureAttempted = false;
      uiLocalSavedRef.current = false;
      if (uiRecorderRef.current) {
        uiCaptureAttempted = true;
        uiUrl = await stopUiRootCapture();
      }

      const listRes = await fetch(
        `/api/livekit/recordings?room=${encodeURIComponent(roomName)}`,
        { cache: "no-store" }
      );
      const recordings = (await listRes.json().catch(() => [])) as Array<{
        egressId: string;
        roomName: string;
        status: string;
        startedAt?: number;
        endedAt?: number;
        durationSeconds?: number;
        filename?: string;
        sizeBytes?: number;
        downloadUrl?: string | null;
        streamUrl?: string | null;
        storageLocation?: string;
      }>;
      const latest = recordings.find((entry) => entry.egressId === recordingEgressId);

      if (uiUrl) {
        window.open(uiUrl, "_blank", "noopener,noreferrer");
      } else if (!uiCaptureAttempted && latest?.downloadUrl) {
        window.open(latest.downloadUrl, "_blank", "noopener,noreferrer");
      }

      const manifest = JSON.stringify(
        {
          room: roomName,
          exportedAt: new Date().toISOString(),
          recording: latest || payload,
          uiRecordingUrl: uiUrl || uiUploadUrlRef.current || null,
        },
        null,
        2
      );
      const filename = `recording-${roomName}-${Date.now()}.json`;
      await saveResourceToS3(
        "recordings",
        filename,
        manifest,
        "application/json;charset=utf-8"
      );

      setRecordingState("idle");
      setRecordingEgressId("");
      void setLocalRecordingAttribute(false);
      if (uiCaptureAttempted && uiUrl) {
        setRecordingMessage("UI recording saved (server upload complete).");
      } else if (uiCaptureAttempted) {
        setRecordingMessage("UI recording stop completed, but server upload failed. Check exact error above.");
      } else {
        setRecordingMessage("Recording stopped and metadata saved to S3.");
      }
    } catch {
      setRecordingState("recording");
    }
  }, [
    recordingEgressId,
    recordingState,
    roomName,
    saveResourceToS3,
    setLocalRecordingAttribute,
    stopUiRootCapture,
  ]);

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

  const exportSharedNotes = useCallback(async () => {
    const content = JSON.stringify(
      {
        room: roomName,
        exportedAt: new Date().toISOString(),
        notes: sharedNotes,
      },
      null,
      2
    );
    const filename = `shared-notes-${roomName}-${Date.now()}.json`;
    const url = await saveResourceToS3("notes", filename, content, "application/json;charset=utf-8");
    if (url) setExportStatus("Shared notes auto-saved to S3.");
  }, [roomName, saveResourceToS3, sharedNotes]);

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

  const exportActionItemsCsv = useCallback(async () => {
    const rows = [
      ["Task", "Owner", "Due Date", "Status"],
      ...actionItems.map((item) => [item.text, item.owner, item.dueDate, item.status]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const filename = `action-items-${roomName}-${Date.now()}.csv`;
    const url = await saveResourceToS3("action-items", filename, csv, "text/csv;charset=utf-8");
    if (url) setExportStatus("Action items auto-saved to S3.");
  }, [actionItems, roomName, saveResourceToS3]);

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
  }, [exportSharedNotes, sharedNotes]);

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
  }, [actionItems, exportActionItemsCsv]);

  if (isLoading) {
    return (
      <div className="h-dvh bg-background flex items-center justify-center text-foreground">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative h-dvh min-h-dvh flex flex-col bg-background text-foreground">
      {showLiveCode ? (
  <div className="absolute inset-0 z-10050 bg-black/80 p-4">
    <div className="h-full w-full bg-gray-900 rounded-xl p-3">
      <div className="flex justify-between mb-2">
        <span className="text-white font-semibold">Live Coding</span>

        <button
          onClick={() => setShowLiveCode(false)}
          className="text-white bg-red-500 px-3 py-1 rounded"
        >
          Close
        </button>
      </div>

      <VSCodeEditor
  room={roomRef.current}
  roomId={roomName}
/>
    </div>
  </div>
) : null}
      {showCaption ? (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 rounded-lg border border-border bg-card/90 px-3 py-2 text-xs text-foreground shadow-sm sm:bottom-36 sm:px-4 sm:text-sm z-9999">
          {captionText || "Listening..."}
        </div>
      ) : null}

      {reactions.map((reaction, i) => (
        <div
          key={`${reaction.id}-${i}`}
          className="fixed bottom-32 left-1/2 -translate-x-1/2 text-3xl animate-bounce sm:bottom-40 sm:text-4xl z-9999"
          title={`${reaction.participantName} reacted`}
        >
          {reaction.emoji}
        </div>
      ))}

      {showAppsHub ? (
        <div
          className={`fixed right-3 top-16 z-10020 rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-md ${
            minimizedAppsHub ? "w-56 p-2" : "w-[min(92vw,28rem)] p-3"
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Services Hub</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMinimizedAppsHub((prev) => !prev)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
                aria-label={minimizedAppsHub ? "Restore services hub" : "Minimize services hub"}
                title={minimizedAppsHub ? "Restore services hub" : "Minimize services hub"}
              >
                {minimizedAppsHub ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => setShowAppsHub(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
                aria-label="Close services hub"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!minimizedAppsHub ? (
            <>
          <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl border border-border bg-background/70 p-1">
            <button type="button" onClick={() => setActiveHubTab("whiteboard")} className={`rounded-lg px-2 py-1 text-[11px] ${activeHubTab === "whiteboard" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>Whiteboard</button>
            <button type="button" onClick={() => setActiveHubTab("polls")} className={`rounded-lg px-2 py-1 text-[11px] ${activeHubTab === "polls" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>Polls/Q&A</button>
            <button type="button" onClick={() => setActiveHubTab("notes")} className={`rounded-lg px-2 py-1 text-[11px] ${activeHubTab === "notes" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>Notes</button>
          </div>

          {activeHubTab === "whiteboard" ? (
            <div className="space-y-3 rounded-xl border border-border bg-background/60 p-3">
              <div>
                <p className="text-sm font-medium">Shared Whiteboard + Annotation</p>
                <p className="text-xs text-muted-foreground">
                  Visible to all users like a shared screen. One controller edits by default.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-background/70 p-1">
                <button type="button" onClick={() => setWhiteboardModeAndShare("whiteboard")} className={`rounded-lg px-2 py-1 text-[11px] ${whiteboardMode === "whiteboard" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>Whiteboard</button>
                <button type="button" onClick={() => setWhiteboardModeAndShare("annotate")} className={`rounded-lg px-2 py-1 text-[11px] ${whiteboardMode === "annotate" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>Annotate</button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!whiteboardActive ? (
                  <button
                    type="button"
                    onClick={() => openWhiteboard(whiteboardMode)}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
                  >
                    <PencilLine className="h-4 w-4" />
                    Start Session
                  </button>
                ) : (
                  <>
                    {localIdentity === whiteboardControllerId ? (
                      <button
                        type="button"
                        onClick={closeWhiteboard}
                        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs"
                      >
                        Stop Session
                      </button>
                    ) : null}
                  </>
                )}
              </div>
              {whiteboardActive ? (
                <div className="max-h-20 overflow-y-auto rounded-lg border border-border bg-card/70 p-2">
                  <p className="mb-1 text-xs font-medium">Allow editors</p>
                  <div className="flex flex-wrap gap-2">
                    {participants.map((participant) => (
                      <label key={`wb-editor-${participant.id}`} className="inline-flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={whiteboardAllowedEditorIds.includes(participant.id)}
                          disabled={localIdentity !== whiteboardControllerId}
                          onChange={() => {
                            const next = whiteboardAllowedEditorIds.includes(participant.id)
                              ? whiteboardAllowedEditorIds.filter((entry) => entry !== participant.id)
                              : [...whiteboardAllowedEditorIds, participant.id];
                            setWhiteboardPermissions(next);
                          }}
                        />
                        {participant.name}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
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
                        <p className="wrap-break-word font-medium">{item.text}</p>
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
            </>
          ) : (
            <p className="text-xs text-muted-foreground px-1 pb-1">
              Hub minimized. Use + to restore.
            </p>
          )}
        </div>
      ) : null}

      {remoteAudioTracks.map((track, index) => (
        <AudioElement key={`${track.sid}-${index}`} track={track} />
      ))}

      {mediaError ? (
        <div className="absolute top-3 left-1/2 z-10000 -translate-x-1/2 rounded-md border border-red-400/60 bg-red-900/70 px-3 py-2 text-xs text-red-50">
          Media error: {mediaError}
        </div>
      ) : null}

      <div className="fixed top-3 left-3 z-9999">
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
        <div className="relative flex-1 overflow-hidden p-2">
          {whiteboardActive ? (
            <div className="grid h-full grid-cols-1 gap-2 xl:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="relative h-full min-h-0">
                {whiteboardMode === "annotate" && sharingParticipants[0]?.screenTrack ? (
                  <AnnotateStage
                    ops={annotationOps}
                    canEdit={canEditWhiteboard}
                    tool={whiteboardTool}
                    color={whiteboardColor}
                    size={whiteboardSize}
                    onAddOp={appendWhiteboardOp}
                    controllerName={
                      participants.find((participant) => participant.id === whiteboardControllerId)?.name ||
                      "Participant"
                    }
                    track={sharingParticipants[0].screenTrack}
                    muted={sharingParticipants[0].isLocal}
                    sharedByName={sharingParticipants[0].name}
                  />
                ) : (
                  <WhiteboardStage
                    mode={whiteboardMode}
                    background={whiteboardBackground}
                    ops={whiteboardOps}
                    canEdit={canEditWhiteboard}
                    tool={whiteboardTool}
                    color={whiteboardColor}
                    size={whiteboardSize}
                    onAddOp={appendWhiteboardOp}
                    controllerName={
                      participants.find((participant) => participant.id === whiteboardControllerId)?.name ||
                      "Participant"
                    }
                  />
                )}
                <div className="pointer-events-none absolute top-3 left-3 right-3 z-20">
                  <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/85 p-2 shadow-lg backdrop-blur-sm">
                    <button type="button" disabled={!canEditWhiteboard} onClick={() => setWhiteboardTool("pen")} className={`rounded p-1 ${whiteboardTool === "pen" ? "bg-accent" : ""}`} title="Pen">
                      <PencilLine className="h-4 w-4" />
                    </button>
                    <button type="button" disabled={!canEditWhiteboard} onClick={() => setWhiteboardTool("highlighter")} className={`rounded p-1 ${whiteboardTool === "highlighter" ? "bg-accent" : ""}`} title="Highlighter">
                      <Highlighter className="h-4 w-4" />
                    </button>
                    <button type="button" disabled={!canEditWhiteboard} onClick={() => setWhiteboardTool("eraser")} className={`rounded p-1 ${whiteboardTool === "eraser" ? "bg-accent" : ""}`} title="Eraser">
                      <Eraser className="h-4 w-4" />
                    </button>
                    <button type="button" disabled={!canEditWhiteboard} onClick={() => setWhiteboardTool("line")} className={`rounded p-1 ${whiteboardTool === "line" ? "bg-accent" : ""}`} title="Line">
                      <Minus className="h-4 w-4" />
                    </button>
                    <button type="button" disabled={!canEditWhiteboard} onClick={() => setWhiteboardTool("rect")} className={`rounded p-1 ${whiteboardTool === "rect" ? "bg-accent" : ""}`} title="Rectangle">
                      <Square className="h-4 w-4" />
                    </button>
                    <button type="button" disabled={!canEditWhiteboard} onClick={() => setWhiteboardTool("circle")} className={`rounded p-1 ${whiteboardTool === "circle" ? "bg-accent" : ""}`} title="Circle">
                      <Circle className="h-4 w-4" />
                    </button>
                    <input disabled={!canEditWhiteboard} type="color" value={whiteboardColor} onChange={(e) => setWhiteboardColor(e.target.value)} className="h-8 w-8 rounded border border-border" />
                    <label className="flex items-center gap-1 text-xs">
                      Size
                      <input disabled={!canEditWhiteboard} type="range" min={1} max={24} value={whiteboardSize} onChange={(e) => setWhiteboardSize(Number(e.target.value))} />
                    </label>
                    <label className="flex items-center gap-1 text-xs">
                      BG
                      <input disabled={localIdentity !== whiteboardControllerId} type="color" value={whiteboardBackground} onChange={(e) => setWhiteboardBackgroundAndShare(e.target.value)} className="h-8 w-8 rounded border border-border" />
                    </label>
                    <button type="button" disabled={localIdentity !== whiteboardControllerId} onClick={clearWhiteboard} className="rounded-md border border-border px-2 py-1 text-xs">
                      Clear
                    </button>
                  </div>
                </div>
              </div>
              <div className="h-32 min-h-32 sm:h-36 sm:min-h-36 xl:h-full xl:min-h-0">
                <div
                  className={`grid h-full gap-2 overflow-x-auto pb-1 grid-flow-col auto-cols-[minmax(7.5rem,10rem)] sm:auto-cols-[minmax(9rem,1fr)] xl:overflow-visible xl:pb-0 xl:grid-flow-row xl:auto-cols-auto ${
                    stripVisibleParticipants.length > 2
                      ? "xl:grid-cols-2 xl:auto-rows-fr"
                      : "xl:grid-cols-1"
                  }`}
                >
                  {stripVisibleParticipants.map((participant) => (
                    <div
                      key={`wb-camera-tile-${participant.id}`}
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
          ) : null}
          {!whiteboardActive && sharingParticipants.length > 0 ? (
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
              <div className="h-32 min-h-32 sm:h-36 sm:min-h-36 xl:h-full xl:min-h-0">
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
          ) : !whiteboardActive ? (
            <div
              className={`relative grid h-full gap-2 ${
                mainGridVisibleParticipants.length === 1
                  ? "grid-cols-1"
                  : mainGridVisibleParticipants.length === 2
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-1 auto-rows-fr sm:grid-cols-2"
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
          ) : null}
        </div>

        <div
          className={`${
            showParticipants ? "" : "hidden"
          } fixed inset-y-0 right-0 z-40 w-full max-w-[100vw] border-l border-border bg-background/95 sm:w-[92vw] sm:max-w-80 lg:static lg:w-80 lg:bg-transparent`}
        >
          <button
            type="button"
            aria-label="Close participants"
            onClick={() => setShowParticipants(false)}
            className="absolute right-3 top-3 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            <X className="h-4 w-4" />
          </button>
          <ParticipantsPanel
            participants={participants.map((participant) =>
              participant.isLocal
                ? {
                    ...participant,
                    isRecording:
                      Boolean(participant.isRecording) ||
                      recordingState === "starting" ||
                      recordingState === "recording" ||
                      recordingState === "stopping",
                  }
                : participant
            )}
            raisedHands={raisedHands}
          />
        </div>

        <div
          className={`${
            showChat ? "" : "hidden"
          } fixed inset-y-0 right-0 z-40 w-full max-w-[100vw] border-l border-border bg-background/95 sm:w-[96vw] sm:max-w-[32rem] lg:static lg:w-[28rem] lg:max-w-none lg:bg-transparent`}
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
        <div className="absolute right-2 top-2 z-50 flex items-center gap-1.5 sm:right-4 sm:top-4 sm:gap-2">
          <Button
            size="sm"
            onClick={() => void copyMeetingLink()}
            disabled={!meetingInviteLink}
            className="rounded-full h-9 px-3 bg-secondary text-secondary-foreground hover:bg-secondary/80"
            title="Copy meeting link"
          >
            {meetingLinkCopied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            <span className="ml-1 hidden sm:inline">
              {meetingLinkCopied ? "Copied" : "Copy link"}
            </span>
          </Button>
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

        <div className="mx-auto flex min-h-21.5 w-full max-w-[96vw] items-center justify-start gap-2 overflow-x-auto px-1 pr-24 py-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] sm:pr-28 md:max-w-[94vw] md:flex-wrap md:justify-center md:overflow-visible md:px-0 md:py-4 md:pb-4 md:gap-3">
          <button
            onClick={() => void toggleMic()}
            title={localMicOn ? "Microphone On" : "Microphone Off"}
            aria-label={localMicOn ? "Microphone On" : "Microphone Off"}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/80 sm:h-11 sm:w-11 md:h-12 md:w-12"
          >
            {localMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </button>

          <button
            onClick={() => void toggleCamera()}
            title={localCameraOn ? "Camera On" : "Camera Off"}
            aria-label={localCameraOn ? "Camera On" : "Camera Off"}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/80 sm:h-11 sm:w-11 md:h-12 md:w-12"
          >
            {localCameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </button>

          <button
            onClick={() => void toggleScreenShare()}
            title={localScreenOn ? "Stop Share" : "Share Screen"}
            aria-label={localScreenOn ? "Stop Share" : "Share Screen"}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition sm:h-11 sm:w-11 md:h-12 md:w-12 ${
              localScreenOn
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <Monitor className="h-4 w-4" />
          </button>

          <button
            onClick={() => setShowLiveCode((v) => !v)}
            title={showLiveCode ? "Hide Live Code" : "Show Live Code"}
            aria-label={showLiveCode ? "Hide Live Code" : "Show Live Code"}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 sm:h-11 sm:w-11 md:h-12 md:w-12"
          >
            <Code2 className="h-4 w-4" />
          </button>

          <button
            onClick={toggleRaiseHand}
            title={handRaised ? "Hand Raised" : "Raise Hand"}
            aria-label={handRaised ? "Hand Raised" : "Raise Hand"}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition sm:h-11 sm:w-11 md:h-12 md:w-12 ${
              handRaised
                ? "bg-yellow-500 text-black"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <Hand className="h-4 w-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowReactions((v) => !v)}
              title={showReactions ? "Hide Reactions" : "Reactions"}
              aria-label={showReactions ? "Hide Reactions" : "Reactions"}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 sm:h-11 sm:w-11 md:h-12 md:w-12"
            >
              <Smile className="h-4 w-4" />
            </button>
            {showReactions ? (
              <div className="absolute bottom-12 left-1/2 z-9999 flex -translate-x-1/2 gap-2 rounded-full border border-border bg-card/90 px-3 py-2 shadow-lg">
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
            title={showCaption ? "Hide Live Caption" : "Live Caption"}
            aria-label={showCaption ? "Hide Live Caption" : "Live Caption"}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 sm:h-11 sm:w-11 md:h-12 md:w-12"
          >
            <Captions className="h-4 w-4" />
          </button>

          <button
            onClick={() => {
              if (recordingState === "idle") {
                void startRecording();
                return;
              }
              if (recordingState === "recording") {
                void stopRecording();
              }
            }}
            disabled={recordingState === "starting" || recordingState === "stopping"}
            title={
              recordingState === "recording"
                ? "Stop Recording"
                : recordingState === "starting"
                ? "Starting Recording"
                : recordingState === "stopping"
                ? "Stopping Recording"
                : "Start Recording"
            }
            aria-label={
              recordingState === "recording"
                ? "Stop Recording"
                : recordingState === "starting"
                ? "Starting Recording"
                : recordingState === "stopping"
                ? "Stopping Recording"
                : "Start Recording"
            }
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-70 sm:h-11 sm:w-11 md:h-12 md:w-12"
          >
            {recordingState === "starting" || recordingState === "stopping" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="text-sm leading-none" aria-hidden>
                🔴
              </span>
            )}
            {recordingState === "recording" ? (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
            ) : null}
          </button>

          <button
            onClick={() => {
              intentionalLeaveRef.current = true;
              roomRef.current?.disconnect();
              onLeave();
            }}
            title="Leave Meeting"
            aria-label="Leave Meeting"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700 sm:h-11 sm:w-11 md:h-12 md:w-12"
          >
            <PhoneOff className="h-4 w-4" />
          </button>
        </div>
      </div>
      {activeRecordingNames.length > 0 ? (
        <div className="pointer-events-none absolute left-1/2 top-3 z-40 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
          🔴 Recording: {activeRecordingNames.join(", ")}
        </div>
      ) : null}
      {recordingMessage ? (
        <div className="pointer-events-none absolute bottom-[5.8rem] left-1/2 z-40 -translate-x-1/2 rounded-md bg-black/65 px-3 py-1 text-xs text-white">
          {recordingMessage}
        </div>
      ) : null}
    </div>
  );
}

function drawWhiteboardOps(
  ctx: CanvasRenderingContext2D,
  ops: WhiteboardOp[],
  background: string
) {
  const canvas = ctx.canvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const op of ops) {
    const alpha = op.tool === "highlighter" ? 0.28 : 1;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = op.size;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = op.tool === "eraser" ? background : op.color;
    ctx.fillStyle = op.tool === "eraser" ? background : op.color;

    if (op.tool === "line" || op.tool === "pen" || op.tool === "highlighter" || op.tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(op.from.x, op.from.y);
      ctx.lineTo(op.to.x, op.to.y);
      ctx.stroke();
    } else if (op.tool === "rect") {
      const x = Math.min(op.from.x, op.to.x);
      const y = Math.min(op.from.y, op.to.y);
      const w = Math.abs(op.to.x - op.from.x);
      const h = Math.abs(op.to.y - op.from.y);
      ctx.strokeRect(x, y, w, h);
    } else if (op.tool === "circle") {
      const cx = (op.from.x + op.to.x) / 2;
      const cy = (op.from.y + op.to.y) / 2;
      const rx = Math.abs(op.to.x - op.from.x) / 2;
      const ry = Math.abs(op.to.y - op.from.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawAnnotationOps(ctx: CanvasRenderingContext2D, ops: WhiteboardOp[]) {
  const canvas = ctx.canvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const op of ops) {
    const alpha = op.tool === "highlighter" ? 0.32 : 1;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = op.size;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = op.tool === "eraser" ? "rgba(0,0,0,0)" : op.color;
    ctx.fillStyle = op.color;
    ctx.globalCompositeOperation = op.tool === "eraser" ? "destination-out" : "source-over";

    if (op.tool === "line" || op.tool === "pen" || op.tool === "highlighter" || op.tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(op.from.x, op.from.y);
      ctx.lineTo(op.to.x, op.to.y);
      ctx.stroke();
    } else if (op.tool === "rect") {
      const x = Math.min(op.from.x, op.to.x);
      const y = Math.min(op.from.y, op.to.y);
      const w = Math.abs(op.to.x - op.from.x);
      const h = Math.abs(op.to.y - op.from.y);
      ctx.strokeRect(x, y, w, h);
    } else if (op.tool === "circle") {
      const cx = (op.from.x + op.to.x) / 2;
      const cy = (op.from.y + op.to.y) / 2;
      const rx = Math.abs(op.to.x - op.from.x) / 2;
      const ry = Math.abs(op.to.y - op.from.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function WhiteboardStage({
  mode,
  background,
  ops,
  canEdit,
  tool,
  color,
  size,
  onAddOp,
  controllerName,
}: {
  mode: WhiteboardMode;
  background: string;
  ops: WhiteboardOp[];
  canEdit: boolean;
  tool: WhiteboardTool;
  color: string;
  size: number;
  onAddOp: (op: WhiteboardOp) => void;
  controllerName: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const startRef = useRef<WhiteboardPoint | null>(null);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canEdit) return;
    const point = getPoint(event);
    if (!point) return;
    drawingRef.current = true;
    startRef.current = point;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canEdit || !drawingRef.current) return;
    const point = getPoint(event);
    const from = startRef.current;
    if (!point || !from) return;
    if (tool === "pen" || tool === "highlighter" || tool === "eraser") {
      onAddOp({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        tool,
        color,
        size,
        from,
        to: point,
      });
      startRef.current = point;
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canEdit) return;
    const point = getPoint(event);
    const from = startRef.current;
    if (point && from && (tool === "line" || tool === "rect" || tool === "circle")) {
      onAddOp({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        tool,
        color,
        size,
        from,
        to: point,
      });
    }
    drawingRef.current = false;
    startRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width);
      canvas.height = Math.floor(rect.height);
      drawWhiteboardOps(ctx, ops, background);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [ops, background]);

  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-border bg-card/60 shadow-xl">
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="h-full w-full"
      />
      <span className="absolute bottom-3 left-3 rounded-full bg-emerald-700/80 px-3 py-1 text-sm font-semibold text-white shadow">
        {mode === "annotate" ? `${possessive(controllerName)} Annotation` : `${possessive(controllerName)} Whiteboard`}
      </span>
      {!canEdit ? (
        <span className="absolute top-3 right-3 rounded-full bg-card/90 px-2 py-1 text-[11px] text-muted-foreground">
          View only
        </span>
      ) : null}
    </div>
  );
}

function AnnotateStage({
  track,
  muted,
  ops,
  canEdit,
  tool,
  color,
  size,
  onAddOp,
  controllerName,
  sharedByName,
}: {
  track?: Track;
  muted?: boolean;
  ops: WhiteboardOp[];
  canEdit: boolean;
  tool: WhiteboardTool;
  color: string;
  size: number;
  onAddOp: (op: WhiteboardOp) => void;
  controllerName: string;
  sharedByName: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const startRef = useRef<WhiteboardPoint | null>(null);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canEdit) return;
    const point = getPoint(event);
    if (!point) return;
    drawingRef.current = true;
    startRef.current = point;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canEdit || !drawingRef.current) return;
    const point = getPoint(event);
    const from = startRef.current;
    if (!point || !from) return;
    if (tool === "pen" || tool === "highlighter" || tool === "eraser") {
      onAddOp({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        tool,
        color,
        size,
        from,
        to: point,
      });
      startRef.current = point;
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canEdit) return;
    const point = getPoint(event);
    const from = startRef.current;
    if (point && from && (tool === "line" || tool === "rect" || tool === "circle")) {
      onAddOp({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        tool,
        color,
        size,
        from,
        to: point,
      });
    }
    drawingRef.current = false;
    startRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width);
      canvas.height = Math.floor(rect.height);
      drawAnnotationOps(ctx, ops);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [ops]);

  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-border bg-card/60 shadow-xl">
      <MediaElement track={track} muted={muted} className="h-full w-full object-contain bg-muted" />
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="absolute inset-0 h-full w-full"
      />
      <span className="absolute bottom-3 left-3 rounded-full bg-emerald-700/80 px-3 py-1 text-sm font-semibold text-white shadow">
        {`${possessive(controllerName)} Annotation on ${possessive(sharedByName)} Screen`}
      </span>
      {!canEdit ? (
        <span className="absolute top-3 right-3 rounded-full bg-card/90 px-2 py-1 text-[11px] text-muted-foreground">
          View only
        </span>
      ) : null}
    </div>
  );
}