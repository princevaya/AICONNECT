"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import {
  Check,
  CheckCheck,
  Bell,
  CalendarPlus,
  ChevronRight,
  ChevronLeft,
  Download,
  FileImage,
  HelpCircle,
  LogIn,
  Loader2,
  LayoutDashboard,
  MessageCircleMore,
  MessageSquare,
  Mic,
  MoreVertical,
  PanelLeft,
  Paperclip,
  Pin,
  Upload,
  Phone,
  PlusCircle,
  Settings2,
  Shield,
  Reply, Search,
  Send,
  Star,
  StarOff,
  UserPlus,
  UserX,
  Video,
  Vote,
  X,
  Type,
  Trash2,
  Camera,
  Circle,
  CircleCheck,
  CircleDot,
  CircleUser,
  History,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { copyToClipboard } from "@/lib/utils";
import ThemeToggle from "@/components/navigation/theme-toggle";
import { ChatPanel, ChatShell, OnlineDot, SidebarFilterTabs, type FilterTab } from "@/components/external-chat/chat-system";
import DirectCallModal from "@/components/external-chat/direct-call-modal";
import IncomingCallModal from "@/components/external-chat/incoming-call-modal";
import CallSelectorModal from "@/components/external-chat/call-selector-modal";
import StatusCreator from "@/components/external-chat/status-creator";
import StatusViewer from "@/components/external-chat/status-viewer";

type Room = {
  id: string;
  code: string;
  name: string;
  type: "direct" | "group" | "channel";
  unreadCount: number;
  description?: string | null;
  isPrivate?: boolean;
  avatarUrl?: string | null;
  archivedAt?: string | null;
  hiddenAt?: string | null;
  canSend?: boolean;
  viewerMembership?: { role: string; leftAt?: string | null; removedAt?: string | null } | null;
  members?: Array<{ id: string; userId: string; role: string; user: UserRow }>;
};
type UserRow = { id: string; clerkId: string; name: string | null; email: string | null; imageUrl?: string | null };
type Pending = { id: string; sender: UserRow; receiver: UserRow };
type Connection = {
  id: string;
  userA: UserRow;
  userB: UserRow;
  directRoom: { id: string; code: string; name: string };
};
type Message = {
  id: string;
  roomId?: string;
  sender: UserRow;
  content: string;
  type: "text" | "note" | "poll";
  metadata: unknown;
  mentions?: string[];
  replyToId: string | null;
  editedAt: string | null;
  pinnedAt: string | null;
  createdAt: string;
  attachment: { id: string; fileName: string; mimeType?: string; sizeBytes?: number; downloadUrl: string } | null;
  reactions?: Array<{ emoji: string; user: UserRow }>;
  seenBy: Array<{ userId: string; seenAt?: string; user?: UserRow }>;
  optimistic?: boolean;
  failed?: boolean;
};

type LinkPreview = {
  url: string;
  title: string;
  description?: string;
  image?: string;
  siteName?: string;
};

type InAppNotification = {
  id: string;
  level: "info" | "success" | "error";
  title: string;
  message?: string;
  createdAt: number;
};
type ActivityLog = {
  id: string;
  action: string;
  details?: Record<string, unknown> | null;
  createdAt: string;
  user: UserRow;
};
type InvitePreview = {
  room: { id: string; code: string; name: string; description?: string | null; avatarUrl?: string | null; memberCount: number };
  alreadyMember: boolean;
};

type CallHistory = {
  id: string;
  type: "audio" | "video";
  status: "ringing" | "active" | "ended" | "missed" | "declined";
  createdAt: string;
  starter: UserRow;
};

type StatusItem = {
  id: string;
  userId: string;
  author: UserRow;
  text: string | null;
  visibility: string;
  publishedAt: string;
  expiresAt: string;
  viewedByViewer: boolean;
  viewerCount: number;
  reactions: Array<{ emoji: string; count: number; viewerReacted?: boolean }>;
  attachment: { id: string; fileName: string; downloadUrl: string } | null;
};

const WHATSAPP_GREEN = "#25D366";
const WHATSAPP_DARK_GREEN = "#075E54";
const WHATSAPP_TEAL = "#128C7E";
const REACTIONS = ["👍", "❤️", "😂", "🎉", "🔥"];
const MESSAGE_PAGE_SIZE = 60;
const TIMELINE_WINDOW_SIZE = 260;
const NOTE_COLORS = [
  { id: "amber", label: "Amber", className: "border-amber-500/40 bg-amber-500/18" },
  { id: "emerald", label: "Emerald", className: "border-emerald-500/40 bg-[#25D366]/16" },
  { id: "sky", label: "Sky", className: "border-sky-500/40 bg-sky-500/16" },
  { id: "rose", label: "Rose", className: "border-rose-500/40 bg-rose-500/16" },
  { id: "violet", label: "Violet", className: "border-violet-500/40 bg-violet-500/16" },
] as const;
type NoteColorId = (typeof NOTE_COLORS)[number]["id"];

async function api<T>(url: string, init?: RequestInit) {
  const method = (init?.method || "GET").toUpperCase();
  const requestInit: RequestInit = {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    credentials: "same-origin",
    cache: "no-store",
  };
  let res = await fetch(url, requestInit);
  if (res.status === 401 && (method === "GET" || method === "HEAD")) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    res = await fetch(url, requestInit);
  }
  const body = (await res.json().catch(() => ({}))) as T & { error?: string; setupRequired?: boolean };
  if (!res.ok) {
    const e = new Error(body.error || "Request failed");
    (e as Error & { setupRequired?: boolean }).setupRequired = body.setupRequired;
    (e as Error & { status?: number }).status = res.status;
    throw e;
  }
  return body;
}

type ApiError = Error & { setupRequired?: boolean; status?: number };

function pollMeta(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return null;
  const poll = (metadata as { poll?: { question?: string; options?: Array<{ id: string; text: string; voters?: string[] }> } }).poll;
  if (!poll?.options) return null;
  return poll;
}

function userLabel(user: Pick<UserRow, "name" | "email">) {
  return user.name || user.email || "Unknown user";
}

function userInitials(label: string) {
  return label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";
}

function UserAvatar({
  user,
  className,
  fallbackClassName,
}: {
  user: Pick<UserRow, "name" | "email" | "imageUrl"> | null | undefined;
  className: string;
  fallbackClassName?: string;
}) {
  const label = userLabel(user || { name: null, email: null });
  if (user?.imageUrl) {
    return <img src={user.imageUrl} alt={label} className={className} />;
  }

  return <div className={fallbackClassName || className}>{userInitials(label)}</div>;
}

function roomAvatarUser(room: Room, selfUserId: string | null) {
  if (room.type !== "direct" || !selfUserId) return null;
  return room.members?.find((member) => member.user.id !== selfUserId)?.user || null;
}

function noteColorFromMetadata(metadata: unknown): NoteColorId {
  if (!metadata || typeof metadata !== "object") return "amber";
  const value = (metadata as { noteColor?: string }).noteColor;
  return NOTE_COLORS.some((item) => item.id === value) ? (value as NoteColorId) : "amber";
}

function roomAvatarImage(room: Room, selfUserId: string | null) {
  const directPeer = roomAvatarUser(room, selfUserId);
  if (directPeer?.imageUrl) return directPeer.imageUrl;
  if (room.type !== "direct" && room.avatarUrl) return room.avatarUrl;
  return null;
}

function firstUrl(content: string) {
  const match = content.match(/https?:\/\/[^\s]+/i);
  return match?.[0] || null;
}

function isAudioAttachment(attachment: Message["attachment"]) {
  if (!attachment) return false;
  const lower = attachment.fileName.toLowerCase();
  return (
    lower.endsWith(".mp3") ||
    lower.endsWith(".wav") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".ogg") ||
    lower.endsWith(".m4a") ||
    (attachment.mimeType || "").startsWith("audio/")
  );
}

function isImageAttachment(attachment: Message["attachment"]) {
  if (!attachment) return false;
  const lower = attachment.fileName.toLowerCase();
  return (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".gif") ||
    (attachment.mimeType || "").startsWith("image/")
  );
}

function mentionToken(user: UserRow) {
  const fromName = (user.name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "");
  if (fromName.length >= 2) return fromName;
  const fromEmail = (user.email || "").split("@")[0]?.toLowerCase().replace(/[^a-z0-9._-]+/g, "") || "";
  if (fromEmail.length >= 2) return fromEmail;
  return user.clerkId.toLowerCase().replace(/[^a-z0-9._-]+/g, "").slice(0, 20) || "user";
}

function highlightContent(content: string, q: string): ReactNode {
  const term = q.trim();
  if (!term) return content;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})`, "ig");
  const parts = content.split(re);
  const lower = term.toLowerCase();
  return parts.map((part, idx) =>
    part.toLowerCase() === lower ? (
      <mark key={`m-${idx}`} className="rounded bg-amber-400/35 px-0.5 text-foreground">
        {part}
      </mark>
    ) : (
      <span key={`t-${idx}`}>{part}</span>
    )
  );
}

function renderMessageContent(content: string, q: string): ReactNode {
  const parts = content.split(/(https?:\/\/[^\s]+)/gi);
  return parts.map((part, idx) => {
    if (!part) return null;
    if (/^https?:\/\/[^\s]+$/i.test(part)) {
      return (
        <a
          key={`url-${idx}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="break-all underline decoration-primary/50 underline-offset-2 hover:text-primary"
        >
          {part}
        </a>
      );
    }
    return <span key={`txt-${idx}`}>{highlightContent(part, q)}</span>;
  });
}

function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function preferredAudioMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const supported = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  return supported.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function reactionSummary(reactions: Array<{ emoji: string; user: UserRow }> | undefined) {
  const map = new Map<string, number>();
  for (const r of reactions || []) {
    map.set(r.emoji, (map.get(r.emoji) || 0) + 1);
  }
  return [...map.entries()].map(([emoji, count]) => ({ emoji, count }));
}

async function imageFileToDataUrl(file: File, maxDimension = 720, quality = 0.82) {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
  if (!source) throw new Error("Failed to read image");

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode image"));
    img.src = source;
  });

  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

function dayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ExternalChatApp() {
  const router = useRouter();
  const { isLoaded: authLoaded, userId: authUserId } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeRoomCode, setActiveRoomCode] = useState("");
  const [search, setSearch] = useState("");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [messagesHasMore, setMessagesHasMore] = useState(false);
  const [messagesNextCursor, setMessagesNextCursor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [setupRequired, setSetupRequired] = useState(false);
  const [authCooldownUntil, setAuthCooldownUntil] = useState(0);

  const [incoming, setIncoming] = useState<Pending[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserRow[]>([]);
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [createGroupName, setCreateGroupName] = useState("");
  const [searching, setSearching] = useState(false);
  const [messageSearchIndex, setMessageSearchIndex] = useState(0);
  const [menuOpenForRoomCode, setMenuOpenForRoomCode] = useState<string | null>(null);
  const [messageMenuOpenId, setMessageMenuOpenId] = useState<string | null>(null);
  const [infoPanelCollapsed, setInfoPanelCollapsed] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [starredRoomCodes, setStarredRoomCodes] = useState<string[]>([]);
  const [archivedOpen, setArchivedOpen] = useState(true);
  const [hiddenRoomCodes, setHiddenRoomCodes] = useState<string[]>([]);
  const [threadParentId, setThreadParentId] = useState<string | null>(null);
  const [threadOpen, setThreadOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [actionSheetMessageId, setActionSheetMessageId] = useState<string | null>(null);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);
  const [groupSettingsTab, setGroupSettingsTab] = useState<"general" | "members" | "activity">("general");
  const [groupNameDraft, setGroupNameDraft] = useState("");
  const [groupDescriptionDraft, setGroupDescriptionDraft] = useState("");
  const [groupAvatarDraft, setGroupAvatarDraft] = useState("");
  const [groupActivityLogs, setGroupActivityLogs] = useState<ActivityLog[]>([]);
  const [loadingGroupActivity, setLoadingGroupActivity] = useState(false);
  const [createGroupQuery, setCreateGroupQuery] = useState("");
  const [createGroupResults, setCreateGroupResults] = useState<UserRow[]>([]);
  const [creatingGroupSearch, setCreatingGroupSearch] = useState(false);
  const [groupMemberSearch, setGroupMemberSearch] = useState("");
  const [groupMemberSearchResults, setGroupMemberSearchResults] = useState<UserRow[]>([]);
  const [groupMemberSearchLoading, setGroupMemberSearchLoading] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [inAppNotifications, setInAppNotifications] = useState<InAppNotification[]>([]);
  const [inviteShareOpen, setInviteShareOpen] = useState(false);
  const [inviteShareText, setInviteShareText] = useState("");
  const [inviteJoinOpen, setInviteJoinOpen] = useState(false);
  const [inviteJoinCode, setInviteJoinCode] = useState("");
  const [invitePreview, setInvitePreview] = useState<InvitePreview | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [selfUser, setSelfUser] = useState<UserRow | null>(null);
  const [callOverlayOpen, setCallOverlayOpen] = useState(false);
  const [meetingCodeInput, setMeetingCodeInput] = useState("");
  const [notificationSoundOn, setNotificationSoundOn] = useState(true);
  const [privacyModeOn, setPrivacyModeOn] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionTerm, setMentionTerm] = useState("");
  const [mentionResults, setMentionResults] = useState<UserRow[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [linkPreviews, setLinkPreviews] = useState<Record<string, LinkPreview | null>>({});
  const [pendingNewCount, setPendingNewCount] = useState(0);
  const [draftByRoom, setDraftByRoom] = useState<Record<string, string>>({});
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(true);
  const [networkOnline, setNetworkOnline] = useState(true);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [bookmarkedMessageIds, setBookmarkedMessageIds] = useState<string[]>([]);
  const [fontScale, setFontScale] = useState<"sm" | "md" | "lg">("md");
  const [helpOpen, setHelpOpen] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [undoSend, setUndoSend] = useState<{ tempId: string; until: number } | null>(null);

  const [messageType, setMessageType] = useState<"text" | "note" | "poll">("text");
  const [text, setText] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [noteColor, setNoteColor] = useState<NoteColorId>("amber");
  const [attachment, setAttachment] = useState<{ id: string; fileName: string; downloadUrl: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  const composerFormRef = useRef<HTMLFormElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const draftByRoomRef = useRef<Record<string, string>>({});
  const roomsRef = useRef<Room[]>([]);
  const skipNextDraftPersistRef = useRef(false);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const messageNodeRefs = useRef<Record<string, HTMLElement | null>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSeenMessageIdRef = useRef<string | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const eventRef = useRef<EventSource | null>(null);
  const realtimeRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeStartXRef = useRef<number | null>(null);
  const lastGroupSettingsRoomRef = useRef<string | null>(null);
  const inviteParamHandledRef = useRef(false);

  // WhatsApp-style tabs
  const [activeTab, setActiveTab] = useState<"chats" | "status" | "calls" | "you">("chats");
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [selfStatus, setSelfStatus] = useState<StatusItem | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerStatuses, setViewerStatuses] = useState<StatusItem[]>([]);
  const [callsHistory, setCallsHistory] = useState<CallHistory[]>([]);
  const [incomingCall, setIncomingCall] = useState<{ id: string; type: "audio" | "video"; livekitRoomName: string; starter: UserRow; roomCode: string } | null>(null);
  const [directCallModalOpen, setDirectCallModalOpen] = useState(false);
  const [directCallTarget, setDirectCallTarget] = useState<UserRow | null>(null);
  const [directCallType, setDirectCallType] = useState<"audio" | "video">("audio");

  const activeRoom = useMemo(() => rooms.find((r) => r.code === activeRoomCode) || null, [rooms, activeRoomCode]);
  const selfUserId = selfUser?.id || null;
  const pushNotification = useCallback((entry: Omit<InAppNotification, "id" | "createdAt">) => {
    const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setInAppNotifications((prev) => [{ ...entry, id, createdAt: Date.now() }, ...prev].slice(0, 30));
  }, []);
  const dismissNotification = useCallback((id: string) => {
    setInAppNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);
  const activeRoomPeer = useMemo(() => {
    if (!activeRoom || activeRoom.type !== "direct" || !selfUserId) return null;
    return activeRoom.members?.find((member) => member.user.id !== selfUserId)?.user || null;
  }, [activeRoom, selfUserId]);
  const replying = useMemo(() => (replyToId ? messages.find((m) => m.id === replyToId) || null : null), [messages, replyToId]);
  const visibleRooms = useMemo(() => rooms.filter((room) => !hiddenRoomCodes.includes(room.code)), [rooms, hiddenRoomCodes]);
  const archivedRooms = useMemo(() => visibleRooms.filter((room) => Boolean(room.archivedAt)), [visibleRooms]);
  const filteredRooms = useMemo(() => {
    return visibleRooms.filter((room) => {
      if (room.archivedAt) return false;
      if (filterTab === "unread") return room.unreadCount > 0;
      if (filterTab === "groups") return room.type === "group";
      if (filterTab === "starred") return starredRoomCodes.includes(room.code);
      return true;
    });
  }, [visibleRooms, filterTab, starredRoomCodes]);
  const directRooms = useMemo(() => filteredRooms.filter((room) => room.type !== "group"), [filteredRooms]);
  const groupRooms = useMemo(() => filteredRooms.filter((room) => room.type === "group"), [filteredRooms]);
  const storyRooms = useMemo(() => filteredRooms.slice(0, 6), [filteredRooms]);
  const sharedMedia = useMemo(
    () => messages.filter((m) => Boolean(m.attachment)).slice(-6),
    [messages]
  );
  const messageMatches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [] as string[];
    return messages.filter((m) => m.content.toLowerCase().includes(term)).map((m) => m.id);
  }, [messages, search]);
  const mentionNotifications = useMemo(() => {
    if (!selfUserId) return [] as Message[];
    return messages
      .filter((m) => (m.mentions || []).some((token) => token))
      .filter((m) => m.sender.id !== selfUserId)
      .slice(-5)
      .reverse();
  }, [messages, selfUserId]);
  const firstUnreadMessageId = useMemo(() => {
    if (!selfUserId) return null;
    return (
      messages.find(
        (m) =>
          m.sender.id !== selfUserId &&
          m.sender.clerkId !== "self" &&
          !m.seenBy.some((s) => s.userId === selfUserId)
      )?.id || null
    );
  }, [messages, selfUserId]);
  const timelineItems = useMemo(() => {
    const items: Array<{ kind: "day"; key: string; label: string } | { kind: "unread"; key: string } | { kind: "message"; key: string; message: Message }> = [];
    let lastDay = "";
    for (const m of messages) {
      const label = dayLabel(m.createdAt);
      if (label !== lastDay) {
        items.push({ kind: "day", key: `day-${new Date(m.createdAt).toDateString()}`, label });
        lastDay = label;
      }
      if (firstUnreadMessageId && m.id === firstUnreadMessageId) {
        items.push({ kind: "unread", key: `unread-${m.id}` });
      }
      items.push({ kind: "message", key: m.id, message: m });
    }
    return items;
  }, [messages, firstUnreadMessageId]);
  const visibleTimelineItems = useMemo(() => {
    if (search.trim() || pinnedOnly) return timelineItems;
    const offset = Math.max(0, timelineItems.length - TIMELINE_WINDOW_SIZE);
    return timelineItems.slice(offset);
  }, [timelineItems, search, pinnedOnly]);
  const bookmarkedMessages = useMemo(
    () => messages.filter((m) => bookmarkedMessageIds.includes(m.id)),
    [messages, bookmarkedMessageIds]
  );
  const mutualGroups = useMemo(() => {
    if (!selfUserId || !activeRoomPeer) return [] as Room[];
    return rooms.filter(
      (room) =>
        room.type === "group" &&
        room.members?.some((member) => member.user.id === selfUserId) &&
        room.members?.some((member) => member.user.id === activeRoomPeer.id)
    );
  }, [activeRoomPeer, rooms, selfUserId]);
  const messageTextClass = fontScale === "sm" ? "text-[13px]" : fontScale === "lg" ? "text-[15px]" : "text-sm";
  const pinnedMessages = useMemo(
    () => messages.filter((m) => Boolean(m.pinnedAt)).slice(-4),
    [messages]
  );
  const actionSheetMessage = useMemo(
    () => (actionSheetMessageId ? messages.find((m) => m.id === actionSheetMessageId) || null : null),
    [messages, actionSheetMessageId]
  );
  const threadParent = useMemo(
    () => (threadParentId ? messages.find((m) => m.id === threadParentId) || null : null),
    [messages, threadParentId]
  );
  const threadReplies = useMemo(
    () => (threadParentId ? messages.filter((m) => m.replyToId === threadParentId) : []),
    [messages, threadParentId]
  );
  const messageById = useMemo(() => {
    const map = new Map<string, Message>();
    for (const m of messages) map.set(m.id, m);
    return map;
  }, [messages]);
  const activeRoomSubtitle = useMemo(() => {
    if (!activeRoom) return "No conversation selected";
    if (activeRoom.type === "direct" && activeRoomPeer) return activeRoomPeer.email || "Direct chat";
    if (activeRoom.type === "group") return "Group chat";
    if (activeRoom.type === "channel") return "Channel";
    return "Direct chat";
  }, [activeRoom, activeRoomPeer]);
  const activeViewerRole = activeRoom?.viewerMembership?.role || null;
  const canManageMembers = activeRoom?.type === "group" && (activeViewerRole === "owner" || activeViewerRole === "admin");
  const isOwnerInActiveRoom = activeViewerRole === "owner";
  const canSendInActiveRoom = Boolean(activeRoom?.canSend);
  const isFormerMemberInActiveRoom = Boolean(
    activeRoom?.viewerMembership && (activeRoom.viewerMembership.leftAt || activeRoom.viewerMembership.removedAt)
  );
  const authCoolingDown = authCooldownUntil > Date.now();
  const authReady = authLoaded && Boolean(authUserId);

  // Recent statuses
  const recentStatuses = useMemo(() => statuses.filter(s => !s.viewedByViewer), [statuses]);
  const viewedStatuses = useMemo(() => statuses.filter(s => s.viewedByViewer), [statuses]);

  // Load statuses
  const loadStatuses = useCallback(async () => {
    try {
      const data = await api<{ selfStatus: StatusItem | null; statuses: StatusItem[] }>("/api/external-chat/statuses");
      setSelfStatus(data.selfStatus || null);
      setStatuses(data.statuses || []);
    } catch (error) {
      console.error("Failed to load statuses:", error);
    }
  }, []);

  // Load calls history
  const loadCallsHistory = useCallback(async () => {
    try {
      const data = await api<{ calls: CallHistory[] }>("/api/external-chat/calls/history");
      setCallsHistory(data.calls || []);
    } catch (error) {
      console.error("Failed to load calls history:", error);
    }
  }, []);

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  const handleApiError = useCallback((err: unknown, fallback: string) => {
    const e = err as ApiError;
    if (e?.status === 401) {
      setAuthCooldownUntil(Date.now() + 8000);
      setError("");
      eventRef.current?.close();
      eventRef.current = null;
      return;
    }
    const message = e?.message || fallback;
    setError(message);
    pushNotification({ level: "error", title: "Action failed", message });
    const needsSetup = Boolean(e?.setupRequired);
    setSetupRequired(needsSetup);
    if (needsSetup) {
      eventRef.current?.close();
      eventRef.current = null;
      setRooms([]);
      setMessages([]);
      setIncoming([]);
      setConnections([]);
      setActiveRoomCode("");
    }
  }, [pushNotification]);

  const loadProfile = useCallback(async () => {
    if (!authLoaded || !authUserId || authCooldownUntil > Date.now()) return false;
    try {
      const data = await api<{ user: UserRow }>("/api/external-chat/profile");
      setSelfUser(data.user);
      setProfileImageUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return data.user.imageUrl || null;
      });
      return true;
    } catch (err) {
      handleApiError(err, "Failed to load profile");
      return false;
    }
  }, [authCooldownUntil, authLoaded, authUserId, handleApiError]);

  const loadConnections = useCallback(async () => {
    if (!authLoaded || !authUserId || authCooldownUntil > Date.now()) return;
    try {
      const data = await api<{ incoming: Pending[]; outgoing: Array<{ id: string; receiver: UserRow }>; connections: Connection[] }>("/api/external-chat/connections");
      setIncoming(data.incoming || []);
      setConnections(data.connections || []);
    } catch (err) {
      handleApiError(err, "Failed to load connections");
    }
  }, [authCooldownUntil, authLoaded, authUserId, handleApiError]);

  const loadRooms = useCallback(async (options?: { silent?: boolean }) => {
    if (!authLoaded || !authUserId || authCooldownUntil > Date.now()) return;
    if (!options?.silent) setLoadingRooms(true);
    try {
      const data = await api<{ rooms: Room[]; archivedRooms?: Room[] }>("/api/external-chat/rooms");
      const nextRooms = [...(data.rooms || []), ...(data.archivedRooms || [])];
      const serverHiddenCodes = nextRooms.filter((room) => Boolean(room.hiddenAt)).map((room) => room.code);
      const effectiveHidden = new Set([...hiddenRoomCodes, ...serverHiddenCodes]);
      if (serverHiddenCodes.length > 0) {
        setHiddenRoomCodes((prev) => Array.from(new Set([...prev, ...serverHiddenCodes])));
      }
      const nextVisibleRooms = nextRooms.filter((room) => !effectiveHidden.has(room.code));
      setRooms(nextRooms);
      if (!activeRoomCode && nextVisibleRooms[0]) setActiveRoomCode(nextVisibleRooms[0].code);
      if (activeRoomCode && !nextVisibleRooms.find((r) => r.code === activeRoomCode)) setActiveRoomCode(nextVisibleRooms[0]?.code || "");
      setError("");
      setSetupRequired(false);
    } catch (err) {
      handleApiError(err, "Failed to load rooms");
    } finally {
      if (!options?.silent) setLoadingRooms(false);
    }
  }, [activeRoomCode, authCooldownUntil, authLoaded, authUserId, handleApiError, hiddenRoomCodes]);

  const emit = useCallback(async (payload: unknown) => {
    if (!activeRoomCode) return;
    await fetch(`/api/external-chat/realtime/${encodeURIComponent(activeRoomCode)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
    }).catch(() => undefined);
  }, [activeRoomCode]);

  const loadMessages = useCallback(async (
    roomCode: string,
    options?: { before?: string; appendOlder?: boolean; silent?: boolean }
  ) => {
    if (!authLoaded || !authUserId || authCooldownUntil > Date.now()) return;
    if (!roomCode) return;
    const appendOlder = Boolean(options?.appendOlder);
    const list = messageListRef.current;
    const prevScrollHeight = appendOlder && list ? list.scrollHeight : 0;
    const prevScrollTop = appendOlder && list ? list.scrollTop : 0;
    if (list && !appendOlder) {
      const distanceFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
      shouldStickToBottomRef.current = distanceFromBottom < 120;
    }
    if (appendOlder) {
      setLoadingOlderMessages(true);
    } else if (!options?.silent) {
      setLoadingMessages(true);
    }
    try {
      const q = new URLSearchParams();
      if (search.trim()) q.set("search", search.trim());
      if (pinnedOnly) q.set("pinned", "1");
      if (options?.before) q.set("before", options.before);
      q.set("limit", String(MESSAGE_PAGE_SIZE));
      const data = await api<{ messages: Message[]; hasMore?: boolean; nextCursor?: string | null }>(
        `/api/external-chat/rooms/${encodeURIComponent(roomCode)}/messages?${q.toString()}`
      );
      const nextMessages = data.messages || [];
      if (appendOlder) {
        setMessages((prev) => [...nextMessages, ...prev]);
      } else {
        setMessages(nextMessages);
      }
      setMessagesHasMore(Boolean(data.hasMore));
      setMessagesNextCursor(data.nextCursor || null);
      requestAnimationFrame(() => {
        if (!messageListRef.current) return;
        if (appendOlder) {
          const nextHeight = messageListRef.current.scrollHeight;
          messageListRef.current.scrollTop = Math.max(0, nextHeight - prevScrollHeight + prevScrollTop);
          return;
        }
        if (shouldStickToBottomRef.current) {
          messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
          setPendingNewCount(0);
        }
      });
      const roomCanReceiveNew = roomsRef.current.find((room) => room.code === roomCode)?.canSend !== false;
      if (selfUserId && roomCanReceiveNew) {
        const unseenForViewer = nextMessages.filter(
          (msg) => msg.sender.id !== selfUserId && !msg.seenBy.some((s) => s.userId === selfUserId)
        );
        if (unseenForViewer.length > 0) {
          await Promise.all(
            unseenForViewer.map((msg) =>
              fetch(`/api/external-chat/messages/${msg.id}/seen`, { method: "POST" }).catch(() => undefined)
            )
          );
          await emit({ type: "seen" });
        }
      }
    } catch (err) {
      handleApiError(err, "Failed to load messages");
    } finally {
      if (appendOlder) {
        setLoadingOlderMessages(false);
      } else if (!options?.silent) {
        setLoadingMessages(false);
      }
    }
  }, [authCooldownUntil, authLoaded, authUserId, emit, handleApiError, pinnedOnly, search, selfUserId]);

  const scheduleRealtimeRefresh = useCallback(() => {
    if (!authLoaded || !authUserId || authCooldownUntil > Date.now()) return;
    if (realtimeRefreshTimerRef.current) clearTimeout(realtimeRefreshTimerRef.current);
    realtimeRefreshTimerRef.current = setTimeout(() => {
      void loadConnections();
      void loadRooms({ silent: true });
      if (activeRoomCode) {
        void loadMessages(activeRoomCode, { silent: true });
      }
    }, 420);
  }, [activeRoomCode, authCooldownUntil, authLoaded, authUserId, loadConnections, loadMessages, loadRooms]);

  // Bootstrap
  useEffect(() => {
    if (!authReady || setupRequired || authCoolingDown) return;
    let cancelled = false;
    const bootstrap = async () => {
      const profileLoaded = await loadProfile();
      if (!profileLoaded || cancelled) return;
      await Promise.all([loadConnections(), loadRooms(), loadStatuses(), loadCallsHistory()]);
    };
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [authCoolingDown, authReady, loadConnections, loadProfile, loadRooms, loadStatuses, loadCallsHistory, setupRequired]);

  useEffect(() => {
    if (!authReady || !activeRoomCode || setupRequired || authCoolingDown) return;
    void loadMessages(activeRoomCode);
  }, [activeRoomCode, authCoolingDown, authReady, loadMessages, setupRequired]);

  useEffect(() => {
    if (!authReady || !activeRoomCode || setupRequired || authCoolingDown) return;
    const t = setTimeout(() => void loadMessages(activeRoomCode, { silent: !search.trim() }), 300);
    return () => clearTimeout(t);
  }, [activeRoomCode, authCoolingDown, authReady, loadMessages, search, setupRequired]);

  useEffect(() => {
    if (!authReady || setupRequired || authCoolingDown) return;
    const timer = setInterval(() => {
      void loadConnections();
      void loadRooms({ silent: true });
      if (activeRoomCode) {
        void loadMessages(activeRoomCode, { silent: true });
      }
      void loadStatuses();
      void loadCallsHistory();
    }, 10000);
    return () => clearInterval(timer);
  }, [activeRoomCode, authCoolingDown, authReady, loadConnections, loadMessages, loadRooms, loadStatuses, loadCallsHistory, setupRequired]);

  // Realtime events
  useEffect(() => {
    if (!authReady || !activeRoomCode || setupRequired || authCoolingDown) return;
    const currentRoom = rooms.find((room) => room.code === activeRoomCode);
    if (currentRoom?.canSend === false) {
      setRealtimeConnected(true);
      eventRef.current?.close();
      eventRef.current = null;
      return;
    }
    eventRef.current?.close();
    const s = new EventSource(`/api/external-chat/realtime/${encodeURIComponent(activeRoomCode)}`);
    eventRef.current = s;
    s.onopen = () => setRealtimeConnected(true);
    s.onerror = () => setRealtimeConnected(false);
    s.onmessage = (event) => {
      let eventType = "";
      try {
        const body = JSON.parse(event.data) as { senderId?: string; payload?: { type?: string; user?: UserRow } };
        eventType = body.payload?.type || "";
        if (body.senderId && selfUserId && body.senderId !== selfUserId && body.payload?.type) {
          const titleMap: Record<string, string> = {
            message: "New message",
            reaction: "New reaction",
          };
          const title = titleMap[body.payload.type] || "New activity";
          if (body.payload.type === "message" || body.payload.type === "reaction") {
            pushNotification({
              level: "info",
              title,
              message: activeRoom?.name || "Current room",
            });
          }
        }
        if (body.payload?.type === "profile" && body.payload.user) {
          const nextUser = body.payload.user;
          setMessages((prev) =>
            prev.map((message) => ({
              ...message,
              sender: message.sender.id === nextUser.id ? { ...message.sender, ...nextUser } : message.sender,
              reactions: message.reactions?.map((reaction) =>
                reaction.user.id === nextUser.id ? { ...reaction, user: { ...reaction.user, ...nextUser } } : reaction
              ),
              seenBy: message.seenBy.map((entry) =>
                entry.userId === nextUser.id
                  ? {
                    ...entry,
                    user: {
                      ...(entry.user || { id: nextUser.id, clerkId: nextUser.clerkId, name: null, email: null }),
                      ...nextUser,
                    },
                  }
                  : entry
              ),
            }))
          );
          setConnections((prev) =>
            prev.map((connection) => ({
              ...connection,
              userA: connection.userA.id === nextUser.id ? { ...connection.userA, ...nextUser } : connection.userA,
              userB: connection.userB.id === nextUser.id ? { ...connection.userB, ...nextUser } : connection.userB,
            }))
          );
          if (selfUserId === nextUser.id) {
            setSelfUser(nextUser);
            setProfileImageUrl((prev) => {
              if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
              return nextUser.imageUrl || null;
            });
          }
        }
        // Handle incoming call
        if (body.payload?.type === "incoming_call") {
          const callData = body.payload as { callId: string; type: "audio" | "video"; livekitRoomName: string; starter: UserRow; roomCode: string };
          setIncomingCall({
            id: callData.callId,
            type: callData.type,
            livekitRoomName: callData.livekitRoomName,
            starter: callData.starter,
            roomCode: callData.roomCode,
          });
        }
      } catch {
        // Ignore malformed realtime payloads
      }
      if (eventType === "profile" || eventType === "incoming_call") return;
      if (eventType === "seen") {
        void loadMessages(activeRoomCode, { silent: true });
        return;
      }
      scheduleRealtimeRefresh();
    };
    return () => {
      s.close();
      eventRef.current = null;
    };
  }, [activeRoom?.name, activeRoomCode, authCoolingDown, authReady, loadMessages, pushNotification, scheduleRealtimeRefresh, selfUserId, setupRequired]);

  // Search users
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api<{ users: UserRow[] }>(`/api/external-chat/users?q=${encodeURIComponent(q)}`);
        setResults(data.users || []);
      } catch (err) {
        handleApiError(err, "Failed to search");
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [handleApiError, query]);

  // Local storage prefs
  useEffect(() => {
    try {
      const raw = localStorage.getItem("external-chat-drafts");
      if (raw) setDraftByRoom(JSON.parse(raw) as Record<string, string>);
    } catch {
      // ignore bad local draft cache
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("external-chat-prefs");
      if (!raw) {
        setPrefsLoaded(true);
        return;
      }
      const prefs = JSON.parse(raw) as {
        starred?: string[];
        hiddenRoomCodes?: string[];
        filterTab?: FilterTab;
        compactMode?: boolean;
        notificationSoundOn?: boolean;
        privacyModeOn?: boolean;
        bookmarkedMessageIds?: string[];
        fontScale?: "sm" | "md" | "lg";
      };
      if (Array.isArray(prefs.starred)) setStarredRoomCodes(prefs.starred);
      if (Array.isArray(prefs.hiddenRoomCodes)) setHiddenRoomCodes(prefs.hiddenRoomCodes);
      if (prefs.filterTab) setFilterTab(prefs.filterTab);
      if (typeof prefs.compactMode === "boolean") setCompactMode(prefs.compactMode);
      if (typeof prefs.notificationSoundOn === "boolean") setNotificationSoundOn(prefs.notificationSoundOn);
      if (typeof prefs.privacyModeOn === "boolean") setPrivacyModeOn(prefs.privacyModeOn);
      if (Array.isArray(prefs.bookmarkedMessageIds)) setBookmarkedMessageIds(prefs.bookmarkedMessageIds);
      if (prefs.fontScale) setFontScale(prefs.fontScale);
    } catch {
      // ignore bad local prefs
    } finally {
      setPrefsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!prefsLoaded) return;
    try {
      localStorage.setItem(
        "external-chat-prefs",
        JSON.stringify({
          starred: starredRoomCodes,
          hiddenRoomCodes,
          filterTab,
          compactMode,
          notificationSoundOn,
          privacyModeOn,
          bookmarkedMessageIds,
          fontScale,
        })
      );
    } catch {
      // ignore localStorage failures
    }
  }, [prefsLoaded, starredRoomCodes, hiddenRoomCodes, filterTab, compactMode, notificationSoundOn, privacyModeOn, bookmarkedMessageIds, fontScale]);

  useEffect(() => {
    draftByRoomRef.current = draftByRoom;
  }, [draftByRoom]);

  useEffect(() => {
    if (!activeRoomCode) return;
    const draft = draftByRoomRef.current[activeRoomCode] ?? "";
    skipNextDraftPersistRef.current = true;
    setText(draft);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [activeRoomCode, prefsLoaded]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMentionOpen(false);
        setMenuOpenForRoomCode(null);
        setMessageMenuOpenId(null);
        setActionSheetOpen(false);
        setThreadOpen(false);
        setMobileSidebarOpen(false);
        setProfileSettingsOpen(false);
        setGroupSettingsOpen(false);
        setCreateGroupOpen(false);
        setCallOverlayOpen(false);
        setHelpOpen(false);
        setLightboxImage(null);
        return;
      }
      const isMetaK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k";
      const slashFocus =
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement);
      if (!isMetaK && !slashFocus) return;
      e.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!activeRoomCode) return;
    if (skipNextDraftPersistRef.current) {
      skipNextDraftPersistRef.current = false;
      return;
    }
    setDraftByRoom((prev) => {
      const current = prev[activeRoomCode] ?? "";
      if (current === text) return prev;
      const next = { ...prev, [activeRoomCode]: text };
      try {
        localStorage.setItem("external-chat-drafts", JSON.stringify(next));
      } catch {
        // ignore storage quota issues
      }
      return next;
    });
  }, [text, activeRoomCode]);

  useEffect(() => {
    const onOnline = () => setNetworkOnline(true);
    const onOffline = () => setNetworkOnline(false);
    setNetworkOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 6000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (inAppNotifications.length === 0) return;
    const timer = setInterval(() => {
      setInAppNotifications((prev) => {
        const cutoff = Date.now() - 12000;
        return prev.filter((item) => notificationsOpen || item.createdAt >= cutoff);
      });
    }, 1500);
    return () => clearInterval(timer);
  }, [inAppNotifications.length, notificationsOpen]);

  useEffect(() => {
    if (!activeRoom || activeRoom.type !== "group") return;
    if (lastGroupSettingsRoomRef.current !== activeRoom.code) {
      setGroupSettingsTab("general");
      setGroupMemberSearch("");
      setGroupMemberSearchResults([]);
      setSelectedGroupMemberIds([]);
      lastGroupSettingsRoomRef.current = activeRoom.code;
    }
    setGroupNameDraft(activeRoom.name || "");
    setGroupDescriptionDraft(activeRoom.description || "");
    setGroupAvatarDraft((activeRoom as Room & { avatarUrl?: string | null }).avatarUrl || "");
  }, [activeRoom]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      if (realtimeRefreshTimerRef.current) clearTimeout(realtimeRefreshTimerRef.current);
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (profileImageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(profileImageUrl);
      }
    };
  }, [profileImageUrl]);

  useEffect(() => {
    setMessageSearchIndex(0);
  }, [search, activeRoomCode]);

  useEffect(() => {
    if (!messageMatches.length) return;
    if (messageSearchIndex > messageMatches.length - 1) {
      setMessageSearchIndex(messageMatches.length - 1);
    }
  }, [messageMatches, messageSearchIndex]);

  useEffect(() => {
    const id = messageMatches[messageSearchIndex];
    if (!id) return;
    const node = messageNodeRefs.current[id];
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [messageSearchIndex, messageMatches]);

  useEffect(() => {
    if (!messages.length || typeof window === "undefined") return;
    const hash = window.location.hash || "";
    const match = hash.match(/m=([^&]+)/);
    const id = match?.[1];
    if (!id) return;
    requestAnimationFrame(() => scrollToMessageById(decodeURIComponent(id)));
  }, [messages]);

  useEffect(() => {
    if (!authReady || !rooms.length || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    const invite = params.get("invite");
    if (room && rooms.some((r) => r.code === room)) {
      setActiveRoomCode(room);
    }
    if (invite && !inviteParamHandledRef.current) {
      inviteParamHandledRef.current = true;
      setInviteJoinCode(invite);
      setInviteJoinOpen(true);
      setInviteLoading(true);
      void api<InvitePreview>(`/api/external-chat/invite/join?inviteCode=${encodeURIComponent(invite)}`)
        .then((data) => setInvitePreview(data))
        .catch(() => setInvitePreview(null))
        .finally(() => setInviteLoading(false));
    }
  }, [authReady, rooms]);

  useEffect(() => {
    const urls = Array.from(new Set(messages.map((m) => firstUrl(m.content)).filter((u): u is string => Boolean(u))));
    for (const url of urls) {
      if (url in linkPreviews) continue;
      void fetch(`/api/external-chat/link-preview?url=${encodeURIComponent(url)}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((body) => {
          setLinkPreviews((prev) => ({
            ...prev,
            [url]: (body?.preview as LinkPreview | undefined) || null,
          }));
        })
        .catch(() => {
          setLinkPreviews((prev) => ({ ...prev, [url]: null }));
        });
    }
  }, [messages, linkPreviews]);

  useEffect(() => {
    const term = mentionTerm.trim();
    if (!mentionOpen || !term) {
      setMentionResults([]);
      setMentionIndex(0);
      return;
    }
    const t = setTimeout(async () => {
      setMentionLoading(true);
      try {
        const data = await api<{ users: UserRow[] }>(`/api/external-chat/users?q=${encodeURIComponent(term)}`);
        setMentionResults(data.users || []);
      } catch {
        setMentionResults([]);
      } finally {
        setMentionLoading(false);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [mentionOpen, mentionTerm]);

  useEffect(() => {
    if (mentionResults.length === 0) {
      setMentionIndex(0);
      return;
    }
    if (mentionIndex > mentionResults.length - 1) {
      setMentionIndex(mentionResults.length - 1);
    }
  }, [mentionResults, mentionIndex]);

  useEffect(() => {
    if (!messages.length) return;
    const latestId = messages[messages.length - 1]?.id || null;
    if (!latestId) return;
    if (lastSeenMessageIdRef.current && latestId !== lastSeenMessageIdRef.current && !shouldStickToBottomRef.current) {
      setPendingNewCount((n) => n + 1);
    }
    lastSeenMessageIdRef.current = latestId;
  }, [messages]);

  useEffect(() => {
    if (!createGroupOpen) return;
    const term = createGroupQuery.trim();
    if (!term) {
      setCreateGroupResults([]);
      setCreatingGroupSearch(false);
      return;
    }
    const t = setTimeout(async () => {
      setCreatingGroupSearch(true);
      try {
        const data = await api<{ users: UserRow[] }>(`/api/external-chat/users?q=${encodeURIComponent(term)}`);
        setCreateGroupResults(data.users || []);
      } catch {
        setCreateGroupResults([]);
      } finally {
        setCreatingGroupSearch(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [createGroupOpen, createGroupQuery]);

  useEffect(() => {
    if (!groupSettingsOpen || groupSettingsTab !== "members") return;
    const term = groupMemberSearch.trim();
    if (!term) {
      setGroupMemberSearchResults([]);
      setGroupMemberSearchLoading(false);
      return;
    }
    const t = setTimeout(async () => {
      setGroupMemberSearchLoading(true);
      try {
        const data = await api<{ users: UserRow[] }>(`/api/external-chat/users?q=${encodeURIComponent(term)}`);
        const currentUserIds = new Set((activeRoom?.members || []).map((member) => member.user.id));
        setGroupMemberSearchResults((data.users || []).filter((user) => !currentUserIds.has(user.id)));
      } catch {
        setGroupMemberSearchResults([]);
      } finally {
        setGroupMemberSearchLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [activeRoom?.members, groupMemberSearch, groupSettingsOpen, groupSettingsTab]);

  useEffect(() => {
    if (!groupSettingsOpen || groupSettingsTab !== "activity" || !activeRoomCode) return;
    let cancelled = false;
    setLoadingGroupActivity(true);
    void api<{ logs: ActivityLog[] }>(`/api/external-chat/rooms/${encodeURIComponent(activeRoomCode)}/activity?limit=80`)
      .then((data) => {
        if (cancelled) return;
        setGroupActivityLogs(data.logs || []);
      })
      .catch(() => {
        if (cancelled) return;
        setGroupActivityLogs([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingGroupActivity(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeRoomCode, groupSettingsOpen, groupSettingsTab]);

  // --- Functions ---

  const sendRequest = async (clerkId: string) => {
    try {
      await api("/api/external-chat/connections", { method: "POST", body: JSON.stringify({ targetClerkId: clerkId }) });
      await loadConnections();
      await loadRooms();
    } catch (e) {
      handleApiError(e, "Failed request");
    }
  };

  const toggleGroupMember = (clerkId: string) => {
    setSelectedGroupMemberIds((prev) =>
      prev.includes(clerkId) ? prev.filter((id) => id !== clerkId) : [...prev, clerkId]
    );
  };

  const createGroup = async () => {
    const name = createGroupName.trim();
    if (!name) {
      setError("Group name is required");
      return;
    }
    if (selectedGroupMemberIds.length === 0) {
      setError("Select at least one member for the group");
      return;
    }

    try {
      const data = await api<{ room: Room }>("/api/external-chat/rooms", {
        method: "POST",
        body: JSON.stringify({
          name,
          type: "group",
          memberClerkIds: selectedGroupMemberIds,
        }),
      });
      setCreateGroupOpen(false);
      setCreateGroupName("");
      setCreateGroupQuery("");
      setCreateGroupResults([]);
      setSelectedGroupMemberIds([]);
      await loadRooms();
      await loadConnections();
      setActiveRoomCode(data.room.code);
      pushNotification({ level: "success", title: "Group created", message: data.room.name });
    } catch (err) {
      handleApiError(err, "Failed to create group");
    }
  };

  const toggleArchiveRoom = async (archive: boolean, roomCodeOverride?: string) => {
    const targetRoomCode = roomCodeOverride || activeRoomCode;
    if (!targetRoomCode) return;
    try {
      await api(`/api/external-chat/rooms/${encodeURIComponent(targetRoomCode)}`, {
        method: "PATCH",
        body: JSON.stringify({ archive }),
      });
      await loadRooms();
      if (activeRoomCode === targetRoomCode) {
        await loadMessages(activeRoomCode);
      }
      pushNotification({ level: "success", title: archive ? "Group archived" : "Group unarchived" });
    } catch (err) {
      handleApiError(err, archive ? "Failed to archive group" : "Failed to unarchive group");
    }
  };

  const leaveActiveGroup = async () => {
    if (!activeRoomCode) return;
    if (!window.confirm("Leave this group? You will keep chat history but cannot send or receive new messages.")) return;
    try {
      const leavingRoomCode = activeRoomCode;
      await api(`/api/external-chat/rooms/${encodeURIComponent(activeRoomCode)}/members/leave`, {
        method: "POST",
      });
      if (activeRoomCode === leavingRoomCode) {
        setActiveRoomCode("");
        setMessages([]);
      }
      await loadRooms();
      pushNotification({ level: "info", title: "Left group", message: "You can still view old messages in read-only mode." });
    } catch (err) {
      handleApiError(err, "Failed to leave group");
    }
  };

  const addSelectedMembersToActiveGroup = async () => {
    if (!activeRoomCode) return;
    if (selectedGroupMemberIds.length === 0) {
      setError("Select users first");
      return;
    }
    try {
      await api(`/api/external-chat/rooms/${encodeURIComponent(activeRoomCode)}/members`, {
        method: "POST",
        body: JSON.stringify({ memberClerkIds: selectedGroupMemberIds }),
      });
      await emit({ type: "room_updated" });
      setSelectedGroupMemberIds([]);
      await loadRooms();
      await loadMessages(activeRoomCode);
      pushNotification({ level: "success", title: "Members added" });
    } catch (err) {
      handleApiError(err, "Failed to add members");
    }
  };

  const removeGroupMember = async (targetUserId: string) => {
    if (!activeRoomCode) return;
    if (!window.confirm("Remove this member from the group?")) return;
    try {
      await api(`/api/external-chat/rooms/${encodeURIComponent(activeRoomCode)}/members/manage`, {
        method: "DELETE",
        body: JSON.stringify({ targetUserId }),
      });
      await loadRooms();
      await loadMessages(activeRoomCode);
      pushNotification({ level: "info", title: "Member removed" });
    } catch (err) {
      handleApiError(err, "Failed to remove member");
    }
  };

  const changeGroupMemberRole = async (targetUserId: string, newRole: "admin" | "member") => {
    if (!activeRoomCode) return;
    try {
      await api(`/api/external-chat/rooms/${encodeURIComponent(activeRoomCode)}/members/manage`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "changeRole",
          targetUserId,
          newRole,
        }),
      });
      await loadRooms();
      pushNotification({ level: "success", title: newRole === "admin" ? "Admin assigned" : "Admin removed" });
    } catch (err) {
      handleApiError(err, "Failed to update role");
    }
  };

  const transferGroupOwnership = async (targetUserId: string) => {
    if (!activeRoomCode) return;
    if (!window.confirm("Transfer ownership to this member?")) return;
    try {
      await api(`/api/external-chat/rooms/${encodeURIComponent(activeRoomCode)}/members/manage`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "transfer",
          targetUserId,
        }),
      });
      await loadRooms();
      pushNotification({ level: "success", title: "Ownership transferred" });
    } catch (err) {
      handleApiError(err, "Failed to transfer ownership");
    }
  };

  const deassignSelfLeadership = async () => {
    if (!activeRoomCode) return;
    if (!window.confirm("Remove your owner/admin role and continue as a member?")) return;
    try {
      await api(`/api/external-chat/rooms/${encodeURIComponent(activeRoomCode)}/members/remove-leader`, {
        method: "POST",
      });
      await loadRooms();
      pushNotification({ level: "success", title: "Leadership removed" });
    } catch (err) {
      handleApiError(err, "Failed to deassign leadership");
    }
  };

  const saveGroupSettings = async () => {
    if (!activeRoomCode) return;
    try {
      await api(`/api/external-chat/rooms/${encodeURIComponent(activeRoomCode)}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: groupNameDraft.trim() || activeRoom?.name,
          description: groupDescriptionDraft.trim(),
          avatarUrl: groupAvatarDraft.trim() || null,
        }),
      });
      await emit({ type: "room_updated" });
      setGroupSettingsOpen(false);
      await loadRooms();
      pushNotification({ level: "success", title: "Group settings saved" });
    } catch (err) {
      handleApiError(err, "Failed to update group settings");
    }
  };

  const openInviteShareComposer = async () => {
    if (!activeRoom || activeRoom.type !== "group") return;
    try {
      const data = await api<{ inviteCode: string }>(`/api/external-chat/rooms/${encodeURIComponent(activeRoom.code)}/invite`, {
        method: "POST",
      });
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const link = `${origin}/dashboard/external-chat?invite=${encodeURIComponent(data.inviteCode)}`;
      setInviteShareText(`Hey join my group: ${link}`);
      setInviteShareOpen(true);
    } catch (err) {
      handleApiError(err, "Failed to generate group invite");
    }
  };

  const joinInviteGroup = async () => {
    if (!inviteJoinCode.trim()) return;
    try {
      const joined = await api<{ room: Room }>(`/api/external-chat/invite/join`, {
        method: "POST",
        body: JSON.stringify({ inviteCode: inviteJoinCode.trim() }),
      });
      await loadRooms({ silent: true });
      setActiveRoomCode(joined.room.code);
      setInviteJoinOpen(false);
      setInvitePreview(null);
      setInviteJoinCode("");
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("invite");
        window.history.replaceState({}, "", `${url.pathname}${url.search}`);
      }
      pushNotification({ level: "success", title: "Joined group", message: joined.room.name });
    } catch (err) {
      handleApiError(err, "Failed to join invite");
    }
  };

  const deleteChatForMe = async (roomCode: string) => {
    try {
      await api(`/api/external-chat/rooms/${encodeURIComponent(roomCode)}/visibility`, { method: "POST" });
      setHiddenRoomCodes((prev) => {
        if (prev.includes(roomCode)) return prev;
        const nextHidden = [...prev, roomCode];
        if (activeRoomCode === roomCode) {
          const nextVisible = rooms.find((room) => !nextHidden.includes(room.code));
          setActiveRoomCode(nextVisible?.code || "");
          setMessages([]);
        }
        return nextHidden;
      });
      pushNotification({ level: "success", title: "Chat removed", message: "This group is deleted from your side." });
    } catch (err) {
      handleApiError(err, "Failed to delete chat for you");
    }
  };

  const deleteGroupForEveryone = async () => {
    if (!activeRoom || activeRoom.type !== "group") return;
    if (!window.confirm("Delete this group for all members? This cannot be undone.")) return;
    try {
      await api(`/api/external-chat/rooms/${encodeURIComponent(activeRoom.code)}`, { method: "DELETE" });
      setGroupSettingsOpen(false);
      setRooms((prev) => prev.filter((room) => room.code !== activeRoom.code));
      setMessages([]);
      const nextRoom = rooms.find((room) => room.code !== activeRoom.code && !hiddenRoomCodes.includes(room.code));
      setActiveRoomCode(nextRoom?.code || "");
      pushNotification({ level: "success", title: "Group deleted", message: "Deleted for all members." });
    } catch (err) {
      handleApiError(err, "Failed to delete group");
    }
  };

  const actRequest = async (id: string, action: "accept" | "decline") => {
    try {
      const res = await api<{ result?: { roomCode?: string } }>(`/api/external-chat/connections/requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      await loadConnections();
      await loadRooms();
      if (action === "accept" && res.result?.roomCode) setActiveRoomCode(res.result.roomCode);
    } catch (e) {
      handleApiError(e, "Failed request action");
    }
  };

  const removeConnection = async (connectionId: string) => {
    try {
      await api(`/api/external-chat/connections/${connectionId}`, { method: "DELETE" });
      setMenuOpenForRoomCode(null);
      await loadConnections();
      await loadRooms();
    } catch (e) {
      handleApiError(e, "Failed to remove connection");
    }
  };

  const uploadFileAttachment = async (file: File) => {
    if (!file || !activeRoom) return;
    if (!canSendInActiveRoom) {
      setError("This conversation is read-only for you.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("roomId", activeRoom.id);
      fd.append("roomCode", activeRoom.code);
      const res = await fetch("/api/external-chat/upload", { method: "POST", body: fd });
      const body = (await res.json().catch(() => ({}))) as { attachment?: { id: string; fileName: string; downloadUrl: string }; error?: string };
      if (!res.ok || !body.attachment) throw new Error(body.error || "Upload failed");
      setAttachment(body.attachment);
    } catch (err) {
      handleApiError(err, "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFileAttachment(file);
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeRoomCode) return;
    if (!canSendInActiveRoom) {
      setError("This conversation is read-only for you.");
      return;
    }
    if (undoSend && undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      const pending = messages.find((m) => m.id === undoSend.tempId);
      if (pending) {
        const queuedPoll = pending.type === "poll" ? (pollMeta(pending.metadata) as { question: string; options: string[] } | null) : null;
        void submitQueuedMessage({
          tempId: pending.id,
          roomCode: activeRoomCode,
          content: pending.content,
          type: pending.type,
          noteColor: pending.type === "note" ? noteColorFromMetadata(pending.metadata) : undefined,
          replyToId: pending.replyToId,
          attachment: pending.attachment,
          poll: queuedPoll,
        });
      }
      setUndoSend(null);
    }
    const content = text.trim();
    const poll = messageType === "poll"
      ? { question: pollQuestion.trim(), options: pollOptions.map((x) => x.trim()).filter(Boolean) }
      : null;
    if (!content && !attachment && !poll) return;
    if (poll && (!poll.question || poll.options.length < 2)) {
      setError("Poll needs question and 2 options");
      return;
    }
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage: Message = {
      id: tempId,
      sender: selfUser || { id: "self", clerkId: "self", name: "You", email: null, imageUrl: profileImageUrl },
      content,
      type: messageType,
      metadata: poll ? { poll } : messageType === "note" ? { noteColor } : null,
      mentions: [],
      replyToId,
      editedAt: null,
      pinnedAt: null,
      createdAt: new Date().toISOString(),
      attachment: attachment || null,
      reactions: [],
      seenBy: [],
      optimistic: true,
      failed: false,
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setUndoSend({ tempId, until: Date.now() + 4000 });
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoSend((cur) => (cur?.tempId === tempId ? null : cur)), 4000);
    undoTimerRef.current = setTimeout(() => {
      void submitQueuedMessage({
        tempId,
        roomCode: activeRoomCode,
        content,
        type: messageType,
        noteColor: messageType === "note" ? noteColor : undefined,
        replyToId,
        attachment,
        poll,
      });
    }, 4000);
  };

  const mutateMessage = async (id: string, body: Record<string, unknown>) => {
    const snapshot = messages;
    if (typeof body.content === "string") {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, content: String(body.content), editedAt: new Date().toISOString() } : m
        )
      );
    }
    if (typeof body.pinned === "boolean") {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, pinnedAt: body.pinned ? new Date().toISOString() : null } : m
        )
      );
    }
    try {
      await api(`/api/external-chat/messages/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      await emit({ type: "message_mutation" });
      await loadMessages(activeRoomCode);
    } catch (err) {
      handleApiError(err, "Update failed");
      setMessages(snapshot);
    }
  };

  const retryOptimisticMessage = async (tempId: string) => {
    const msg = messages.find((m) => m.id === tempId);
    if (!msg || !activeRoomCode) return;
    if (!canSendInActiveRoom) {
      setError("This conversation is read-only for you.");
      return;
    }
    try {
      setSending(true);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, failed: false, optimistic: true } : m))
      );
      await api(`/api/external-chat/rooms/${encodeURIComponent(activeRoomCode)}/messages`, {
        method: "POST",
        body: JSON.stringify({
          content: msg.content,
          type: msg.type,
          replyToId: msg.replyToId,
          attachmentId: msg.attachment?.id || null,
          noteColor: msg.type === "note" ? noteColorFromMetadata(msg.metadata) : undefined,
          poll: msg.type === "poll" ? pollMeta(msg.metadata) : null,
        }),
      });
      await emit({ type: "message" });
      await loadRooms();
      await loadMessages(activeRoomCode);
    } catch (err) {
      handleApiError(err, "Retry failed");
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, failed: true, optimistic: false } : m))
      );
    } finally {
      setSending(false);
    }
  };

  const openThread = (message: Message) => {
    const parentId = message.replyToId || message.id;
    setThreadParentId(parentId);
    setThreadOpen(true);
  };

  const deleteMessage = async (id: string) => {
    if (id.startsWith("temp-")) {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      return;
    }
    const snapshot = messages;
    setMessages((prev) => prev.filter((m) => m.id !== id));
    try {
      await api(`/api/external-chat/messages/${id}`, { method: "DELETE" });
      await emit({ type: "delete" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setMessages(snapshot);
    }
  };

  const startLongPress = (messageId: string) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setActionSheetMessageId(messageId);
      setActionSheetOpen(true);
    }, 450);
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const onConversationTouchStart = (x: number) => {
    swipeStartXRef.current = x;
  };

  const onConversationTouchEnd = (x: number, roomCode: string) => {
    if (swipeStartXRef.current === null) return;
    const delta = x - swipeStartXRef.current;
    swipeStartXRef.current = null;
    if (delta < -70) {
      setStarredRoomCodes((prev) =>
        prev.includes(roomCode) ? prev.filter((c) => c !== roomCode) : [...prev, roomCode]
      );
      return;
    }
    if (delta > 70) {
      setMobileSidebarOpen(false);
    }
  };

  const createMeeting = () => {
    const code = Math.random().toString(36).slice(2, 8);
    setCallOverlayOpen(false);
    router.push(`/meeting/${code}`);
  };

  const joinMeeting = () => {
    const code = meetingCodeInput.trim();
    setCallOverlayOpen(false);
    if (!code) {
      router.push("/meeting");
      return;
    }
    router.push(`/meeting/${encodeURIComponent(code)}`);
  };

  const scheduleMeeting = () => {
    setCallOverlayOpen(false);
    router.push("/dashboard");
  };

  const onProfileImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file");
      return;
    }
    if (file.size > 4_000_000) {
      setError("Profile image is too large");
      return;
    }

    void (async () => {
      try {
        setSavingProfile(true);
        const imageDataUrl = await imageFileToDataUrl(file, 640, 0.82);
        const data = await api<{ user: UserRow }>("/api/external-chat/profile", {
          method: "PATCH",
          body: JSON.stringify({ imageDataUrl }),
        });
        setSelfUser(data.user);
        setProfileImageUrl((prev) => {
          if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
          return data.user.imageUrl || null;
        });
        await loadConnections();
        await loadRooms({ silent: true });
        if (activeRoomCode) await loadMessages(activeRoomCode, { silent: true });
      } catch (err) {
        handleApiError(err, "Failed to update profile");
      } finally {
        setSavingProfile(false);
        if (profileImageInputRef.current) profileImageInputRef.current.value = "";
      }
    })();
  };

  const onGroupAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file");
      return;
    }
    if (file.size > 700_000) {
      setError("Group image is too large");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const imageDataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!imageDataUrl) {
        setError("Failed to read image");
        return;
      }
      setGroupAvatarDraft(imageDataUrl);
    };
    reader.onerror = () => setError("Failed to read image");
    reader.readAsDataURL(file);
  };

  const isOwnMessage = (m: Message) => {
    if (m.sender.clerkId === "self") return true;
    if (selfUserId && m.sender.id === selfUserId) return true;
    return false;
  };

  const replyPreview = (replyToId: string | null) => {
    if (!replyToId) return null;
    const ref = messageById.get(replyToId);
    if (!ref) return "Replying to message";
    const label = userLabel(ref.sender);
    const excerpt = (ref.content || "").trim();
    if (!excerpt) return `Replying to ${label}`;
    return `Replying to ${label}: ${excerpt.slice(0, 48)}${excerpt.length > 48 ? "..." : ""}`;
  };

  const scrollToMessageById = (id: string) => {
    const node = messageNodeRefs.current[id];
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const jumpMatch = (dir: 1 | -1) => {
    if (!messageMatches.length) return;
    setMessageSearchIndex((prev) => {
      const next = (prev + dir + messageMatches.length) % messageMatches.length;
      return next;
    });
  };

  const onTextChange = (value: string) => {
    const cmd = value.trim().toLowerCase();
    if (cmd === "/poll") {
      setMessageType("poll");
      setText("");
      setMentionOpen(false);
      return;
    }
    if (cmd === "/note") {
      setMessageType("note");
      setText("");
      setMentionOpen(false);
      return;
    }
    if (cmd === "/text") {
      setMessageType("text");
      setText("");
      setMentionOpen(false);
      return;
    }
    if (cmd === "/call") {
      setCallOverlayOpen(true);
      setText("");
      setMentionOpen(false);
      return;
    }
    setText(value);
    const ta = textareaRef.current;
    if (!ta) {
      setMentionOpen(false);
      return;
    }
    const caret = ta.selectionStart ?? value.length;
    const head = value.slice(0, caret);
    const at = head.lastIndexOf("@");
    if (at < 0) {
      setMentionOpen(false);
      return;
    }
    const token = head.slice(at + 1);
    if (!token || /\s/.test(token)) {
      setMentionOpen(false);
      return;
    }
    setMentionTerm(token);
    setMentionOpen(true);
  };

  const pickMention = (user: UserRow) => {
    const ta = textareaRef.current;
    const token = mentionToken(user);
    if (!ta) {
      setText((prev) => `${prev} @${token} `);
      setMentionOpen(false);
      return;
    }
    const cursor = ta.selectionStart ?? text.length;
    const left = text.slice(0, cursor);
    const right = text.slice(cursor);
    const at = left.lastIndexOf("@");
    if (at < 0) return;
    const next = `${left.slice(0, at)}@${token} ${right}`;
    setText(next);
    setMentionOpen(false);
    requestAnimationFrame(() => {
      ta.focus();
      const caret = at + token.length + 2;
      ta.setSelectionRange(caret, caret);
    });
  };

  const onTextKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      composerFormRef.current?.requestSubmit();
      return;
    }
    if (!mentionOpen || mentionResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIndex((idx) => (idx + 1) % mentionResults.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIndex((idx) => (idx - 1 + mentionResults.length) % mentionResults.length);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      pickMention(mentionResults[mentionIndex] || mentionResults[0]);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setMentionOpen(false);
    }
  };

  const messageStatus = (m: Message) => {
    if (!isOwnMessage(m)) return null;
    if (m.failed) return <span className="inline-flex items-center gap-1 text-[11px] text-red-500">Failed</span>;
    if (m.optimistic) return <span className="inline-flex items-center gap-1 text-[11px] text-amber-500">Sending...</span>;
    if (m.seenBy.length > 0) return <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600"><CheckCheck className="h-3.5 w-3.5" /> Seen</span>;
    return <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Check className="h-3.5 w-3.5" /> Delivered</span>;
  };

  const scrollToLatest = () => {
    if (!messageListRef.current) return;
    messageListRef.current.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" });
    shouldStickToBottomRef.current = true;
    setPendingNewCount(0);
  };

  const loadOlderMessages = async () => {
    if (!activeRoomCode || !messagesHasMore || !messagesNextCursor || loadingOlderMessages) return;
    await loadMessages(activeRoomCode, { before: messagesNextCursor, appendOlder: true });
  };

  const copyMessageContent = async (m: Message) => {
    if (!m.content?.trim()) return;
    try {
      const ok = await copyToClipboard(m.content);
      if (!ok) throw new Error("Copy failed");
    } catch {
      setError("Copy failed");
    }
  };

  const undoLastSend = () => {
    if (!undoSend) return;
    setMessages((prev) => prev.filter((m) => m.id !== undoSend.tempId));
    setUndoSend(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  };

  const submitQueuedMessage = useCallback(
    async (payload: {
      tempId: string;
      roomCode: string;
      content: string;
      type: "text" | "note" | "poll";
      noteColor?: NoteColorId;
      replyToId: string | null;
      attachment: { id: string; fileName: string; downloadUrl: string } | null;
      poll: { question: string; options: string[] } | null;
    }) => {
      if (!canSendInActiveRoom) {
        setError("This conversation is read-only for you.");
        return;
      }
      try {
        setSending(true);
        await api(`/api/external-chat/rooms/${encodeURIComponent(payload.roomCode)}/messages`, {
          method: "POST",
          body: JSON.stringify({
            content: payload.content,
            type: payload.type,
            replyToId: payload.replyToId,
            attachmentId: payload.attachment?.id || null,
            noteColor: payload.type === "note" ? payload.noteColor || "amber" : undefined,
            poll: payload.poll,
          }),
        });
        setMessages((prev) => prev.filter((m) => m.id !== payload.tempId));
        setText("");
        setDraftByRoom((prev) => {
          const next = { ...prev, [payload.roomCode]: "" };
          try {
            localStorage.setItem("external-chat-drafts", JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
        setReplyToId(null);
        setAttachment(null);
        setMessageType("text");
        setPollQuestion("");
        setPollOptions(["", ""]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await emit({ type: "message" });
        await loadRooms();
        await loadMessages(payload.roomCode);
      } catch (err) {
        handleApiError(err, "Send failed");
        setMessages((prev) =>
          prev.map((m) => (m.id === payload.tempId ? { ...m, failed: true, optimistic: false } : m))
        );
      } finally {
        setSending(false);
        setUndoSend((cur) => (cur?.tempId === payload.tempId ? null : cur));
      }
    },
    [canSendInActiveRoom, emit, handleApiError, loadMessages, loadRooms]
  );

  const markRoomRead = async () => {
    if (!selfUserId) return;
    const targets = messages.filter(
      (m) => m.sender.id !== selfUserId && m.sender.clerkId !== "self" && !m.seenBy.some((s) => s.userId === selfUserId)
    );
    try {
      await Promise.all(
        targets.map((m) =>
          fetch(`/api/external-chat/messages/${m.id}/seen`, { method: "POST" }).catch(() => undefined)
        )
      );
      await loadRooms();
      await loadMessages(activeRoomCode);
    } catch (err) {
      handleApiError(err, "Failed to mark read");
    }
  };

  const toggleBookmark = (messageId: string) => {
    setBookmarkedMessageIds((prev) =>
      prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId]
    );
  };

  const openMessageActions = (messageId: string) => {
    setActionSheetMessageId(messageId);
    setActionSheetOpen(true);
  };

  const cycleFontScale = () => {
    setFontScale((prev) => (prev === "sm" ? "md" : prev === "md" ? "lg" : "sm"));
  };

  const exportCurrentChat = () => {
    if (!activeRoom) return;
    const lines = messages.map((m) => {
      const who = isOwnMessage(m) ? "You" : userLabel(m.sender);
      const when = new Date(m.createdAt).toLocaleString();
      const content = m.content || (m.attachment ? `[Attachment] ${m.attachment.fileName}` : "");
      return `[${when}] ${who}: ${content}`;
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeRoom.name || "chat"}-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const uploadRecordedAudio = async (blob: Blob) => {
    if (!activeRoom) return;
    const ext = blob.type.includes("webm")
      ? "webm"
      : blob.type.includes("ogg")
        ? "ogg"
        : blob.type.includes("mp4")
          ? "m4a"
          : blob.type.includes("wav")
            ? "wav"
            : "mp3";
    const mimeType = blob.type || (ext === "m4a" ? "audio/mp4" : ext === "ogg" ? "audio/ogg" : "audio/webm");
    const file = new File([blob], `voice-note-${Date.now()}.${ext}`, { type: mimeType });
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("roomId", activeRoom.id);
      fd.append("roomCode", activeRoom.code);
      const res = await fetch("/api/external-chat/upload", { method: "POST", body: fd });
      const body = (await res.json().catch(() => ({}))) as { attachment?: { id: string; fileName: string; downloadUrl: string }; error?: string };
      if (!res.ok || !body.attachment) throw new Error(body.error || "Upload failed");
      setAttachment(body.attachment);
      setMessageType("note");
      if (!text.trim()) setText("Voice note");
    } catch (err) {
      handleApiError(err, "Voice upload failed");
    } finally {
      setUploading(false);
    }
  };

  const toggleRecording = async () => {
    if (!canSendInActiveRoom) {
      setError("This conversation is read-only for you.");
      return;
    }
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice recording is not supported in this browser");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const mimeType = preferredAudioMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];
      setRecordingMs(0);
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) recordingChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
        setRecording(false);
        stream.getTracks().forEach((t) => t.stop());
        recordingStreamRef.current = null;
        void uploadRecordedAudio(blob);
      };
      recorder.onerror = () => {
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
        setRecording(false);
        stream.getTracks().forEach((t) => t.stop());
        recordingStreamRef.current = null;
        setError("Microphone recording failed. Please try again.");
      };
      recorder.start();
      setRecording(true);
      recordingTimerRef.current = setInterval(() => setRecordingMs((prev) => prev + 250), 250);
    } catch (err) {
      const name = err && typeof err === "object" && "name" in err ? String((err as { name?: string }).name || "") : "";
      if (name === "NotAllowedError") {
        setError("Microphone permission denied. Please allow mic access.");
      } else if (name === "NotFoundError") {
        setError("No microphone device detected.");
      } else {
        handleApiError(err, "Could not start recording");
      }
    }
  };

  const handleViewStatus = (status: StatusItem, index: number, allStatuses: StatusItem[]) => {
    setViewerStatuses(allStatuses);
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const handleStatusViewed = async (statusId: string) => {
    try {
      await api(`/api/external-chat/statuses/${statusId}/view`, { method: "POST" });
      await loadStatuses();
    } catch (error) {
      console.error("Failed to mark status viewed:", error);
    }
  };

  const handleStatusReact = async (statusId: string, emoji: string) => {
    try {
      await api(`/api/external-chat/statuses/${statusId}/reactions`, {
        method: "POST",
        body: JSON.stringify({ emoji }),
      });
      await loadStatuses();
    } catch (error) {
      console.error("Failed to react to status:", error);
    }
  };

  const handleStatusComment = async (statusId: string, content: string) => {
    try {
      await api(`/api/external-chat/statuses/${statusId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      await loadStatuses();
    } catch (error) {
      console.error("Failed to comment on status:", error);
    }
  };

  const handleStartCall = (targetUser: UserRow | null, type: "audio" | "video") => {
    setDirectCallTarget(targetUser);
    setDirectCallType(type);
    setDirectCallModalOpen(true);
    setCallOverlayOpen(false);
  };

  const handleIncomingCallAccept = () => {
    if (incomingCall) {
      router.push(`/meeting/${incomingCall.livekitRoomName}?name=${encodeURIComponent(incomingCall.starter.name || "User")}&video=${incomingCall.type === "video" ? "1" : "0"}&audio=1&direct=1`);
    }
    setIncomingCall(null);
  };

  const handleIncomingCallReject = () => {
    setIncomingCall(null);
  };

  // Render bottom navigation with WhatsApp styling
  const renderBottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-xl md:hidden">
      <div className="flex items-center justify-around py-1">
        <button
          onClick={() => setActiveTab("chats")}
          className={`flex flex-col items-center p-1 transition-colors ${activeTab === "chats" ? "text-[#25D366]" : "text-muted-foreground"
            }`}
        >
          <MessageCircleMore className="h-6 w-6" />
          <span className="text-[10px] font-medium">Chats</span>
        </button>
        <button
          onClick={() => {
            setActiveTab("status");
            void loadStatuses();
          }}
          className={`flex flex-col items-center p-1 transition-colors ${activeTab === "status" ? "text-[#25D366]" : "text-muted-foreground"
            }`}
        >
          <Circle className="h-6 w-6" />
          <span className="text-[10px] font-medium">Status</span>
        </button>
        <button
          onClick={() => {
            setActiveTab("calls");
            void loadCallsHistory();
          }}
          className={`flex flex-col items-center p-1 transition-colors ${activeTab === "calls" ? "text-[#25D366]" : "text-muted-foreground"
            }`}
        >
          <Phone className="h-6 w-6" />
          <span className="text-[10px] font-medium">Calls</span>
        </button>
        <button
          onClick={() => setActiveTab("you")}
          className={`flex flex-col items-center p-1 transition-colors ${activeTab === "you" ? "text-[#25D366]" : "text-muted-foreground"
            }`}
        >
          <div className="h-6 w-6 rounded-full bg-[#25D366]/15 flex items-center justify-center">
            <span className="text-xs font-semibold text-[#25D366]">
              {selfUser?.name?.[0] || selfUser?.email?.[0] || "U"}
            </span>
          </div>
          <span className="text-[10px] font-medium">You</span>
        </button>
      </div>
    </div>
  );

  // Setup required screen
  if (setupRequired) {
    return (
      <div className="flex h-full min-h-full items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-3xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 shadow-sm backdrop-blur">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-amber-300">External Chat Setup Required</h2>
              <p className="mt-1 text-sm text-amber-100/90">
                External chat could not connect to its Postgres backend, so the workspace is temporarily unavailable.
              </p>
            </div>
            <ThemeToggle />
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-background/40 p-4 text-sm text-amber-50">
            {error}
          </div>
          <div className="mt-4 space-y-2 text-sm text-amber-100/90">
            <p>Checks:</p>
            <p>1. Use the exact Supabase Connect string for `CHAT_DATABASE_URL`.</p>
            <p>2. If you use the pooler, the host/region and `postgres.&lt;project-ref&gt;` username must match exactly.</p>
            <p>3. If you want chat to share the primary DB, you can leave `CHAT_DATABASE_URL` unset and let it fall back to `DATABASE_URL`.</p>
          </div>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <ChatShell>
      {/* Desktop Sidebar - WhatsApp Style */}
      <ChatPanel className="relative hidden overflow-hidden rounded-[8px] border-0 bg-[#FFFFFF] dark:bg-[#111B21] p-0 shadow-[0_12px_30px_rgba(22,43,35,0.12)] xl:block">
        {/* WhatsApp Header - Dark Green */}
        <div className="bg-[#075E54] dark:bg-[#1F2C33] px-3 pb-3 pt-2 text-white">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTab("chats")}
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[12px] font-semibold text-white"
            >
              <MessageCircleMore className="h-3.5 w-3.5" />
              Chats
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("status");
                  void loadStatuses();
                }}
                className={`inline-flex h-7 items-center justify-center rounded-full px-3 text-[12px] font-medium transition-colors ${activeTab === "status" ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10"
                  }`}
              >
                <Circle className="mr-1 h-3.5 w-3.5" />
                Status
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("calls");
                  void loadCallsHistory();
                }}
                className={`inline-flex h-7 items-center justify-center rounded-full px-3 text-[12px] font-medium transition-colors ${activeTab === "calls" ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10"
                  }`}
              >
                <Phone className="mr-1 h-3.5 w-3.5" />
                Calls
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("you")}
                className={`inline-flex h-7 items-center justify-center rounded-full px-3 text-[12px] font-medium transition-colors ${activeTab === "you" ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10"
                  }`}
              >
                <CircleUser className="mr-1 h-3.5 w-3.5" />
                You
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/60" />
              <Input
                className="h-7 rounded-full border-0 bg-white/15 pl-7 pr-2 text-[11px] text-white placeholder:text-white/50 focus-visible:ring-1 focus-visible:ring-white/50"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search or start new chat"
              />
            </div>
            <button
              type="button"
              onClick={() => setCreateGroupOpen(true)}
              className="text-white/90 hover:text-white"
            >
              <PlusCircle className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="bg-[#FFFFFF] dark:bg-[#111B21] px-3 pb-16 pt-2">
          {/* Incoming Requests */}
          {incoming.length > 0 && (
            <div className="mb-3 rounded-lg border border-border/50 bg-muted/30 p-2">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Pending Requests</p>
              {incoming.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md border border-border/50 bg-background/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-[#25D366]/15 flex items-center justify-center text-xs font-semibold text-[#25D366]">
                      {r.sender.name?.[0] || r.sender.email?.[0] || "U"}
                    </div>
                    <span className="text-sm">{r.sender.name || r.sender.email || "User"}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => void actRequest(r.id, "accept")}
                      className="rounded-full bg-[#25D366] p-1.5 text-white hover:bg-[#128C7E]"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => void actRequest(r.id, "decline")}
                      className="rounded-full bg-red-500 p-1.5 text-white hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto space-y-1 pb-20">
            {loadingRooms ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : null}
            {filteredRooms.map((room) => {
              const starred = starredRoomCodes.includes(room.code);
              const lastMessage = messages.find(m => m.roomId === room.id);
              return (
                <div
                  key={room.id}
                  onClick={() => setActiveRoomCode(room.code)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[#F0F2F5] dark:hover:bg-[#2A3942] ${activeRoomCode === room.code ? "bg-[#E8F0FE] dark:bg-[#2A3942]" : ""
                    }`}
                >
                  <div className="relative h-12 w-12 flex-shrink-0">
                    <div className="h-full w-full rounded-full bg-[#25D366]/15 flex items-center justify-center text-sm font-semibold text-[#25D366] overflow-hidden">
                      {roomAvatarImage(room, selfUserId) ? (
                        <img
                          src={roomAvatarImage(room, selfUserId) || ""}
                          alt={room.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (room.name || "DM").slice(0, 2).toUpperCase()
                      )}
                    </div>
                    {room.type === "direct" && <OnlineDot />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-medium text-foreground">{room.name}</p>
                      {lastMessage && (
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="truncate text-xs text-muted-foreground">
                        {lastMessage?.content
                          ? lastMessage.content.slice(0, 30) + (lastMessage.content.length > 30 ? "..." : "")
                          : room.type === "group" ? `${room.members?.length || 0} members` : "No messages yet"}
                      </p>
                      {room.unreadCount > 0 && (
                        <span className="ml-auto rounded-full bg-[#25D366] px-2 py-0.5 text-xs text-white">
                          {room.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredRooms.length === 0 && !loadingRooms && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircleMore className="h-12 w-12 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">No conversations yet</p>
                <p className="text-xs text-muted-foreground/70">Start a new chat or create a group</p>
              </div>
            )}
          </div>
        </div>
      </ChatPanel>

      {/* Main Chat Area */}
      <ChatPanel className={`flex min-h-0 flex-col ${activeTab === "chats" ? "" : "hidden xl:flex"}`}>
        {/* Chat Header - WhatsApp Style */}
        <div className="sticky top-0 z-10 border-b border-border/60 bg-[#F0F2F5] dark:bg-[#1F2C33] p-3 backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="xl:hidden text-foreground"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#25D366]/15 text-xs font-semibold text-[#25D366]">
                  {activeRoom && roomAvatarImage(activeRoom, selfUserId) ? (
                    <img src={roomAvatarImage(activeRoom, selfUserId) || ""} alt={activeRoom.name} className="h-full w-full object-cover" />
                  ) : (
                    (activeRoom?.name || "CH").slice(0, 2).toUpperCase()
                  )}
                </div>
                {activeRoom?.type === "direct" && <OnlineDot />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{activeRoom?.name || "Select a conversation"}</p>
                <p className="text-xs text-muted-foreground">{activeRoomSubtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => {
                // Close any other modals first
                setDirectCallModalOpen(false);
                setDirectCallTarget(null);
                setCallOverlayOpen(true);
              }}>
                <Phone className="h-4 w-4" />
              </Button>
              {activeRoom ? (
                <div className="relative">
                  <Button size="sm" variant="outline" onClick={() => setMenuOpenForRoomCode((p) => p === activeRoom.code ? null : activeRoom.code)}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                  {menuOpenForRoomCode === activeRoom.code ? (
                    <div className="absolute right-0 z-20 mt-1 w-56 rounded-md border border-border bg-card p-1 shadow-lg">
                      <button
                        className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                        onClick={() => {
                          setCallOverlayOpen(true);
                          setMenuOpenForRoomCode(null);
                        }}
                      >
                        <Phone className="h-4 w-4" /> Start Call
                      </button>
                      <button
                        className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                        onClick={() => {
                          if (firstUnreadMessageId) scrollToMessageById(firstUnreadMessageId);
                          setMenuOpenForRoomCode(null);
                        }}
                      >
                        <ChevronRight className="h-4 w-4" /> Go to Unread
                      </button>
                      <button
                        className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                        onClick={() => {
                          void markRoomRead();
                          setMenuOpenForRoomCode(null);
                        }}
                      >
                        <CheckCheck className="h-4 w-4" /> Mark Read
                      </button>
                      <button
                        className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                        onClick={() => {
                          setPinnedOnly((v) => !v);
                          setMenuOpenForRoomCode(null);
                        }}
                      >
                        <Pin className="h-4 w-4" /> {pinnedOnly ? "Show All Messages" : "Show Pinned Only"}
                      </button>
                      <button
                        className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                        onClick={() => {
                          setCompactMode((v) => !v);
                          setMenuOpenForRoomCode(null);
                        }}
                      >
                        <Type className="h-4 w-4" /> {compactMode ? "Switch to Cozy" : "Switch to Compact"}
                      </button>
                      <button
                        className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                        onClick={() => {
                          cycleFontScale();
                          setMenuOpenForRoomCode(null);
                        }}
                      >
                        <Type className="h-4 w-4" /> Font Size ({fontScale.toUpperCase()})
                      </button>
                      <button
                        className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                        onClick={() => {
                          exportCurrentChat();
                          setMenuOpenForRoomCode(null);
                        }}
                      >
                        <Download className="h-4 w-4" /> Export Chat
                      </button>
                      <button
                        className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                        onClick={() => {
                          setHelpOpen(true);
                          setMenuOpenForRoomCode(null);
                        }}
                      >
                        <HelpCircle className="h-4 w-4" /> Help & Shortcuts
                      </button>
                      {activeRoom?.type !== "group" ? (
                        <button
                          className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                          onClick={() => {
                            setMenuOpenForRoomCode(null);
                            setProfileSettingsOpen(true);
                          }}
                        >
                          <Settings2 className="h-4 w-4" /> Profile Settings
                        </button>
                      ) : null}
                      {activeRoom?.type === "group" ? (
                        <button
                          className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                          onClick={() => {
                            setMenuOpenForRoomCode(null);
                            void openInviteShareComposer();
                          }}
                        >
                          <UserPlus className="h-4 w-4" /> Share Invite
                        </button>
                      ) : null}
                      {activeRoom?.type === "group" ? (
                        <button
                          className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                          onClick={() => {
                            setMenuOpenForRoomCode(null);
                            setGroupSettingsOpen(true);
                          }}
                        >
                          <Settings2 className="h-4 w-4" /> Group Settings
                        </button>
                      ) : null}
                      <button
                        className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                        onClick={() => {
                          setNotificationSoundOn((v) => !v);
                          setMenuOpenForRoomCode(null);
                        }}
                      >
                        <Bell className="h-4 w-4" /> {notificationSoundOn ? "Mute Alerts" : "Unmute Alerts"}
                      </button>
                      <button
                        className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                        onClick={() => {
                          setPrivacyModeOn((v) => !v);
                          setMenuOpenForRoomCode(null);
                        }}
                      >
                        <Shield className="h-4 w-4" /> {privacyModeOn ? "Disable Privacy" : "Enable Privacy"}
                      </button>
                      {activeRoom?.type === "direct" ? (
                        <button
                          className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                          onClick={() => {
                            const c = connections.find((x) => x.directRoom.code === activeRoom.code);
                            if (c) void removeConnection(c.id);
                          }}
                        >
                          <UserX className="h-4 w-4 text-red-600" /> Remove Connection
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          {error ? (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <span>{error}</span>
              <button type="button" onClick={() => setError("")} className="rounded px-1 hover:bg-destructive/15">Dismiss</button>
            </div>
          ) : null}
        </div>

        {/* Message List - WhatsApp Style Chat Background */}
        <div
          ref={messageListRef}
          className={`min-h-0 flex-1 overflow-y-auto p-3 ${dropActive ? "bg-primary/5" : ""} dark:bg-[#0B141A]`}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d1d8dd' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundColor: "#ECE5DD",
          }}

          onScroll={(e) => {
            const el = e.currentTarget;
            const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
            shouldStickToBottomRef.current = nearBottom;
            if (nearBottom) setPendingNewCount(0);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDropActive(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDropActive(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void uploadFileAttachment(file);
          }}
        >
          {dropActive ? (
            <div className="mb-2 rounded-lg border border-dashed border-primary/50 bg-primary/10 px-3 py-2 text-xs text-primary">
              Drop file to upload
            </div>
          ) : null}
          {messagesHasMore ? (
            <div className="mb-3 flex justify-center">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void loadOlderMessages()}
                disabled={loadingOlderMessages}
              >
                {loadingOlderMessages ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                {loadingOlderMessages ? "Loading older..." : "Load older messages"}
              </Button>
            </div>
          ) : null}
          {loadingMessages ? <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading messages...</div> : null}
          {!loadingMessages && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground/70">Start the conversation</p>
            </div>
          ) : null}
          <div className="space-y-3">
            {visibleTimelineItems.map((item) => {
              if (item.kind === "day") {
                return (
                  <div key={item.key} className="my-2 flex items-center justify-center">
                    <span className="rounded-full bg-[#FFFFFF] dark:bg-[#1F2C33] px-3 py-1 text-[11px] text-muted-foreground shadow-sm">
                      {item.label}
                    </span>
                  </div>
                );
              }
              if (item.kind === "unread") {
                return (
                  <div key={item.key} className="my-2 flex items-center gap-2">
                    <div className="h-px flex-1 bg-[#25D366]/40" />
                    <span className="text-[11px] font-medium text-[#25D366]">Unread</span>
                    <div className="h-px flex-1 bg-[#25D366]/40" />
                  </div>
                );
              }
              const m = item.message;
              const poll = pollMeta(m.metadata);
              const resolvedNoteColor = noteColorFromMetadata(m.metadata);
              const noteColorClass = NOTE_COLORS.find((entry) => entry.id === resolvedNoteColor)?.className || NOTE_COLORS[0].className;
              const own = isOwnMessage(m);
              const replyText = replyPreview(m.replyToId);
              const reactionsAgg = reactionSummary(m.reactions);
              return (
                <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                  <article
                    ref={(node) => {
                      messageNodeRefs.current[m.id] = node;
                    }}
                    className={`group inline-flex h-auto w-auto max-w-[82%] flex-col items-start rounded-2xl border ${compactMode ? "p-2.5" : "p-3"} transition ${m.type === "note"
                        ? noteColorClass
                        : own
                          ? "border-[#25D366]/35 bg-[#DCF8C6] dark:bg-[#005C4B] text-[#075E54] dark:text-white"
                          : "border-border/70 bg-[#FFFFFF] dark:bg-[#1F2C33]"
                      } ${messageMatches[messageSearchIndex] === m.id ? "ring-2 ring-amber-400/70" : ""}`}
                    onTouchStart={() => startLongPress(m.id)}
                    onTouchEnd={clearLongPress}
                    onTouchMove={clearLongPress}
                    onTouchCancel={clearLongPress}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 overflow-hidden rounded-full border border-border/70 bg-[#25D366]/15">
                          <UserAvatar
                            user={m.sender}
                            className="h-full w-full object-cover"
                            fallbackClassName="flex h-full w-full items-center justify-center text-[10px] font-semibold text-[#25D366]"
                          />
                        </div>
                        <p className="text-xs font-semibold">{own ? "You" : userLabel(m.sender)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.optimistic ? <span className="text-[10px] text-amber-500">Sending...</span> : null}
                        {m.failed ? <span className="text-[10px] text-red-500">Failed</span> : null}
                        <p className="text-[11px] text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    {m.replyToId ? (
                      <div className="mb-2 max-w-full rounded-md border border-border/60 bg-muted/35 px-2 py-1.5">
                        <div className="mb-0.5 border-l-2 border-[#25D366] pl-2">
                          <p className="text-[11px] font-semibold text-[#25D366]">
                            {messageById.get(m.replyToId)?.sender ? userLabel(messageById.get(m.replyToId)!.sender) : "Reply"}
                          </p>
                          <p className="line-clamp-1 text-[11px] text-muted-foreground">
                            {messageById.get(m.replyToId)?.content || replyText || "Message"}
                          </p>
                        </div>
                      </div>
                    ) : null}
                    <p className={`${messageTextClass} whitespace-pre-wrap break-words`}>{renderMessageContent(m.content, search)}</p>
                    {m.attachment ? (
                      isImageAttachment(m.attachment) ? (
                        <button
                          type="button"
                          onClick={() => setLightboxImage({ src: m.attachment?.downloadUrl || "", alt: m.attachment?.fileName || "image" })}
                          className="mt-2 block overflow-hidden rounded-md border border-border/70"
                        >
                          <img src={m.attachment.downloadUrl} alt={m.attachment.fileName} className="max-h-72 w-full object-cover" />
                        </button>
                      ) : isAudioAttachment(m.attachment) ? (
                        <div className="mt-2 rounded-md border border-border/70 bg-muted/25 p-2">
                          <p className="mb-1 text-xs font-medium">{m.attachment.fileName}</p>
                          <audio controls className="w-full">
                            <source src={m.attachment.downloadUrl} />
                          </audio>
                        </div>
                      ) : (
                        <a href={m.attachment.downloadUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs underline"><FileImage className="h-3.5 w-3.5" /> {m.attachment.fileName}</a>
                      )
                    ) : null}
                    {(() => {
                      const url = firstUrl(m.content);
                      const preview = url ? linkPreviews[url] : null;
                      if (!url || !preview) return null;
                      return (
                        <a
                          href={preview.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 block rounded-md border border-border/70 bg-muted/20 p-2 hover:bg-accent/50"
                        >
                          <p className="text-xs font-semibold">{preview.title}</p>
                          {preview.description ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{preview.description}</p> : null}
                          <p className="mt-1 text-[11px] text-muted-foreground">{preview.siteName || new URL(preview.url).hostname}</p>
                        </a>
                      );
                    })()}
                    {reactionsAgg.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {reactionsAgg.map((r) => (
                          <span key={`${m.id}-${r.emoji}`} className="rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-xs">
                            {r.emoji} {r.count}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {poll ? (
                      <div className="mt-2 rounded-md border border-border/70 bg-muted/40 p-2">
                        <p className="mb-1 text-xs font-semibold">{poll.question}</p>
                        <p className="mb-2 text-[11px] text-muted-foreground">
                          {(poll.options || []).reduce((sum, option) => sum + (option.voters || []).length, 0)} vote(s)
                        </p>
                        <div className="space-y-1">
                          {(poll.options || []).map((o, idx) => {
                            const totalVotes = Math.max(1, (poll.options || []).reduce((sum, option) => sum + (option.voters || []).length, 0));
                            const optionVotes = (o.voters || []).length;
                            const percent = Math.min(100, Math.round((optionVotes / totalVotes) * 100));
                            const fill = percent >= 60 ? "rgba(34,197,94,0.18)" : percent >= 35 ? "rgba(56,189,248,0.16)" : "rgba(148,163,184,0.14)";
                            return (
                              <button
                                key={`${m.id}-poll-${o.id || idx}`}
                                onClick={() => void mutateMessage(m.id, { pollVoteOptionId: o.id })}
                                className="mx-auto grid min-h-9 w-[96%] grid-cols-[minmax(0,1fr)_2.25rem] items-start gap-2 rounded border border-border px-2.5 py-1.5 text-xs hover:bg-accent"
                                style={{
                                  backgroundImage: `linear-gradient(90deg, ${fill} ${percent}%, transparent ${percent}%)`,
                                }}
                              >
                                <span className="min-w-0 whitespace-normal break-words text-left leading-5">{o.text}</span>
                                <span className="pt-0.5 text-right tabular-nums">{optionVotes}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-2 flex items-center justify-between gap-2 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                      <div className="flex items-center gap-1">
                        {m.editedAt ? <span className="text-[11px] text-muted-foreground">(edited)</span> : null}
                        {messageStatus(m)}
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="relative">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (typeof window !== "undefined" && window.innerWidth < 768) {
                                openMessageActions(m.id);
                                return;
                              }
                              setMessageMenuOpenId((cur) => (cur === m.id ? null : m.id));
                            }}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                          {messageMenuOpenId === m.id ? (
                            <div
                              className={`absolute z-30 mt-1 w-48 max-w-[min(18rem,calc(100vw-2rem))] rounded-md border border-border bg-card p-1 shadow-lg ${own ? "right-0 bottom-full mb-1 origin-bottom-right" : "left-0 bottom-full mb-1 origin-bottom-left"
                                }`}
                            >
                              <div className="mb-1 flex flex-wrap gap-1 px-1 py-1">
                                {REACTIONS.map((emoji) => (
                                  <button
                                    key={`${m.id}-menu-${emoji}`}
                                    onClick={() =>
                                      void api(`/api/external-chat/messages/${m.id}/reactions`, {
                                        method: "POST",
                                        body: JSON.stringify({ emoji }),
                                      })
                                        .then(() => emit({ type: "reaction" }))
                                        .then(() => loadMessages(activeRoomCode))
                                        .finally(() => setMessageMenuOpenId(null))
                                        .catch((e) => setError(e instanceof Error ? e.message : "Reaction failed"))
                                    }
                                    className="rounded-full border border-border px-2 py-0.5 text-xs hover:bg-accent"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                              <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { setReplyToId(m.id); setMessageMenuOpenId(null); }}><Reply className="h-4 w-4" /> Reply</button>
                              <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { openThread(m); setMessageMenuOpenId(null); }}><ChevronRight className="h-4 w-4" /> Thread</button>
                              <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { toggleBookmark(m.id); setMessageMenuOpenId(null); }}>{bookmarkedMessageIds.includes(m.id) ? <StarOff className="h-4 w-4 text-amber-500" /> : <Star className="h-4 w-4" />} {bookmarkedMessageIds.includes(m.id) ? "Unstar" : "Star"}</button>
                              <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { void copyMessageContent(m); setMessageMenuOpenId(null); }}>Copy Message</button>
                              <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { void mutateMessage(m.id, { pinned: !Boolean(m.pinnedAt) }); setMessageMenuOpenId(null); }}>{m.pinnedAt ? "Unpin" : "Pin"}</button>
                              <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { const next = window.prompt("Edit message", m.content); if (next !== null) void mutateMessage(m.id, { content: next }); setMessageMenuOpenId(null); }}>Edit</button>
                              <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm text-red-600 hover:bg-accent" onClick={() => { void deleteMessage(m.id); setMessageMenuOpenId(null); }}>Delete</button>
                            </div>
                          ) : null}
                        </div>
                        {m.failed ? (
                          <Button size="sm" variant="outline" onClick={() => void retryOptimisticMessage(m.id)}>Retry</Button>
                        ) : null}
                        <span className="text-[11px] text-muted-foreground">Seen by {m.seenBy.length}</span>
                        {m.seenBy.length > 0 ? (
                          <div className="ml-1 flex items-center -space-x-1">
                            {m.seenBy.slice(0, 3).map((s) => (
                              <span
                                key={`${m.id}-seen-${s.userId}`}
                                className="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-background bg-[#25D366]/20 text-[10px] font-semibold"
                                title={userLabel(s.user || { name: null, email: null })}
                              >
                                <UserAvatar
                                  user={s.user}
                                  className="h-full w-full object-cover"
                                  fallbackClassName="flex h-full w-full items-center justify-center text-[10px] font-semibold"
                                />
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
          {pendingNewCount > 0 ? (
            <div className="pointer-events-none sticky bottom-3 mt-2 flex justify-center">
              <Button type="button" size="sm" className="pointer-events-auto rounded-full shadow-lg" onClick={scrollToLatest}>
                {pendingNewCount} new message{pendingNewCount > 1 ? "s" : ""} · jump
              </Button>
            </div>
          ) : null}
        </div>

        {/* Composer - WhatsApp Style */}
        {!canSendInActiveRoom && activeRoom ? (
          <div className="border-t border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            {isFormerMemberInActiveRoom
              ? "You can view previous messages, but cannot send or receive new messages in this group."
              : activeRoom.archivedAt
                ? "This conversation is archived and currently read-only."
                : "This conversation is read-only for your account."}
          </div>
        ) : null}
        <form ref={composerFormRef} onSubmit={sendMessage} className="border-t border-border/60 bg-[#F0F2F5] dark:bg-[#1F2C33] p-3 backdrop-blur">
          {undoSend ? (
            <div className="mb-2 flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs">
              <span>Message sent. Undo?</span>
              <Button type="button" size="sm" variant="outline" onClick={undoLastSend}>Undo</Button>
            </div>
          ) : null}
          {replying ? (
            <div className="mb-2 flex items-start justify-between gap-2 rounded-md border border-[#25D366]/25 bg-[#25D366]/8 px-2 py-1.5">
              <div className="flex min-w-0 flex-1 items-start gap-2">
                <span className="mt-0.5 h-8 w-1 rounded bg-[#25D366]" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#25D366]">{userLabel(replying.sender)}</p>
                  <p className="truncate text-xs text-muted-foreground">{replying.content.slice(0, 90)}</p>
                </div>
              </div>
              <button type="button" onClick={() => setReplyToId(null)} className="text-xs underline">Cancel</button>
            </div>
          ) : null}
          <div className="mb-2 grid gap-2 md:grid-cols-2">
            <select value={messageType} onChange={(e) => setMessageType(e.target.value as "text" | "note" | "poll")} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="text">Text</option>
              <option value="note">Note</option>
              <option value="poll">Poll</option>
            </select>
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" className="hidden" onChange={onFile} />
              <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={uploading || !canSendInActiveRoom}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}<span className="ml-1">Attach</span>
              </Button>
            </div>
          </div>
          {attachment ? <div className="mb-2 rounded-md border border-border px-2 py-1 text-xs">Attached: {attachment.fileName}<button type="button" onClick={() => setAttachment(null)} className="ml-2 underline">Remove</button></div> : null}
          {messageType === "poll" ? (
            <div className="mb-2 space-y-2 rounded-md border border-border bg-muted/30 p-2">
              <div className="flex items-center gap-2 text-xs font-medium"><Vote className="h-4 w-4" />Poll builder</div>
              <Input value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="Poll question" />
              {pollOptions.map((opt, i) => (
                <Input key={`opt-${i}`} value={opt} onChange={(e) => setPollOptions((p) => p.map((x, idx) => (idx === i ? e.target.value : x)))} placeholder={`Option ${i + 1}`} />
              ))}
              <Button type="button" size="sm" variant="outline" onClick={() => setPollOptions((p) => [...p, ""])} disabled={!canSendInActiveRoom}>Add option</Button>
            </div>
          ) : null}
          {messageType === "note" ? (
            <div className="mb-2 rounded-md border border-border bg-muted/30 p-2">
              <p className="mb-2 text-xs font-semibold">Note Bubble Color</p>
              <div className="flex flex-wrap gap-2">
                {NOTE_COLORS.map((entry) => (
                  <button
                    key={`note-color-${entry.id}`}
                    type="button"
                    onClick={() => setNoteColor(entry.id)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${entry.className} ${noteColor === entry.id ? "ring-2 ring-primary/60" : ""}`}
                    disabled={!canSendInActiveRoom}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {["👍", "❤️", "😂", "🔥", "🙏"].map((emoji) => (
                <button
                  key={`quick-${emoji}`}
                  type="button"
                  onClick={() => setText((prev) => `${prev}${prev ? " " : ""}${emoji}`)}
                  disabled={!canSendInActiveRoom}
                  className="rounded-full border border-border/70 px-2 py-0.5 text-xs hover:bg-accent"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-muted-foreground">{activeRoomCode && draftByRoom[activeRoomCode] ? "Draft saved" : "Use /poll /note /text /call"}</span>
          </div>
          <div className="flex items-end gap-2">
            <Button
              type="button"
              variant={recording ? "destructive" : "ghost"}
              size="icon"
              className={`shrink-0 transition ${recording ? "animate-pulse" : ""}`}
              onClick={() => void toggleRecording()}
              disabled={!canSendInActiveRoom}
            >
              <Mic className="h-4 w-4" />
            </Button>
            <div className="relative flex-1">
              <Textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => onTextChange(e.target.value)}
                onKeyDown={onTextKeyDown}
                className="min-h-[54px] max-h-40 bg-[#FFFFFF] dark:bg-[#2A3942] border-[#E9EDEF] dark:border-[#2A3942] rounded-lg"
                placeholder="Type message. Use @username for mentions."
                disabled={!canSendInActiveRoom}
              />
              {mentionOpen ? (
                <div className="absolute bottom-[calc(100%+6px)] left-0 right-0 z-20 max-h-44 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg">
                  {mentionLoading ? <p className="px-2 py-1 text-xs text-muted-foreground">Searching...</p> : null}
                  {!mentionLoading && mentionResults.length === 0 ? <p className="px-2 py-1 text-xs text-muted-foreground">No matches</p> : null}
                  {mentionResults.map((u, i) => (
                    <button
                      key={`mention-${u.id}`}
                      type="button"
                      onClick={() => pickMention(u)}
                      onMouseEnter={() => setMentionIndex(i)}
                      className={`flex w-full items-center justify-between rounded px-2 py-1 text-left ${mentionIndex === i ? "bg-accent" : "hover:bg-accent"}`}
                    >
                      <span className="text-xs font-medium">{userLabel(u)}</span>
                      <span className="text-[11px] text-muted-foreground">@{mentionToken(u)}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <Button type="submit" disabled={sending || uploading || !activeRoomCode || !canSendInActiveRoom} className="bg-[#25D366] hover:bg-[#128C7E] transition-transform duration-150 active:scale-95">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          {recording ? (
            <div className="mt-2 flex items-center justify-between rounded-md border border-red-500/35 bg-red-500/10 px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={`wave-${i}`}
                    className="block w-1 rounded bg-red-500 animate-pulse"
                    style={{ height: `${8 + (i % 3) * 4}px`, animationDelay: `${i * 0.12}s` }}
                  />
                ))}
                <span className="text-xs text-red-700 dark:text-red-300">Recording {formatDuration(recordingMs)}</span>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => mediaRecorderRef.current?.stop()}>
                Stop
              </Button>
            </div>
          ) : null}
        </form>
      </ChatPanel>

      {/* Info Panel */}
      <ChatPanel className={`${infoPanelCollapsed ? "hidden" : "hidden xl:flex"} min-h-0 flex-col p-3`}>
        <div className="mb-3 border-b border-border/60 pb-3">
          <p className="text-sm font-semibold">Info Panel</p>
          <p className="text-xs text-muted-foreground">Members, media and pinned context</p>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Members</p>
          <div className="space-y-2">
            {!activeRoom?.members?.length ? <p className="text-xs text-muted-foreground">No room members loaded yet</p> : null}
            {activeRoom?.members?.map((member) => {
              const user = member.user;
              const label = user.id === selfUserId ? "You" : userLabel(user);
              const canManageThisMember = canManageMembers && user.id !== selfUserId;
              const canTransferToMember = isOwnerInActiveRoom && member.role !== "owner" && user.id !== selfUserId;
              return (
                <div key={`${activeRoom?.id}-${member.userId}`} className="flex items-center justify-between rounded-md border border-border/70 bg-muted/25 px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[#25D366]/15 text-[10px] font-semibold text-[#25D366]">
                      <UserAvatar
                        user={user}
                        className="h-full w-full object-cover"
                        fallbackClassName="flex h-full w-full items-center justify-center text-[10px] font-semibold text-[#25D366]"
                      />
                    </div>
                    <span className="text-xs">{label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="rounded-full bg-[#25D366]/15 px-2 py-0.5 text-[10px] text-[#25D366]">{member.role}</span>
                    {canManageThisMember ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void removeGroupMember(user.id)}
                        title="Remove member"
                      >
                        <UserX className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    ) : null}
                    {canManageThisMember && member.role !== "owner" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void changeGroupMemberRole(user.id, member.role === "admin" ? "member" : "admin")}
                        title={member.role === "admin" ? "Deassign admin" : "Assign admin"}
                      >
                        <Shield className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                    {canTransferToMember ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void transferGroupOwnership(user.id)}
                        title="Transfer ownership"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {activeRoom?.type === "direct" ? (
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shared Groups</p>
            <div className="space-y-2">
              {mutualGroups.length === 0 ? <p className="text-xs text-muted-foreground">No shared groups yet</p> : null}
              {mutualGroups.map((room) => (
                <button
                  key={`mutual-${room.id}`}
                  type="button"
                  onClick={() => setActiveRoomCode(room.code)}
                  className="w-full rounded-md border border-border/70 bg-muted/20 px-2 py-1.5 text-left hover:bg-accent/60"
                >
                  <p className="truncate text-xs font-medium">{room.name}</p>
                  <p className="text-[10px] text-muted-foreground">{room.members?.length || 0} members</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mentions</p>
          <div className="space-y-2">
            {mentionNotifications.length === 0 ? <p className="text-xs text-muted-foreground">No recent mentions</p> : null}
            {mentionNotifications.map((m) => (
              <button
                key={`mention-note-${m.id}`}
                type="button"
                onClick={() => scrollToMessageById(m.id)}
                className="w-full rounded-md border border-border/70 bg-muted/20 px-2 py-1.5 text-left hover:bg-accent/60"
              >
                <p className="text-[11px] font-medium">{userLabel(m.sender)}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{m.content}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Starred Messages</p>
          <div className="space-y-2">
            {bookmarkedMessages.length === 0 ? <p className="text-xs text-muted-foreground">No starred messages yet</p> : null}
            {bookmarkedMessages.slice(-6).map((m) => (
              <button
                key={`starred-${m.id}`}
                type="button"
                onClick={() => scrollToMessageById(m.id)}
                className="w-full rounded-md border border-border/70 bg-muted/20 px-2 py-1.5 text-left hover:bg-accent/60"
              >
                <p className="line-clamp-2 text-xs">{m.content || "Attachment"}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shared Media</p>
          <div className="grid grid-cols-3 gap-2">
            {sharedMedia.length === 0 ? <p className="col-span-3 text-xs text-muted-foreground">No media shared yet</p> : null}
            {sharedMedia.map((m) => (
              <a
                key={m.id}
                href={m.attachment?.downloadUrl || "#"}
                download={m.attachment?.fileName || `media-${m.id}`}
                target="_blank"
                rel="noreferrer"
                className="aspect-square rounded-md border border-border/70 bg-muted/30 p-2 hover:bg-accent/50"
              >
                <FileImage className="h-4 w-4" />
                <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{m.attachment?.fileName}</p>
              </a>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pinned Messages</p>
          <div className="space-y-2">
            {pinnedMessages.length === 0 ? <p className="text-xs text-muted-foreground">No pinned messages.</p> : null}
            {pinnedMessages.map((m) => (
              <button key={m.id} onClick={() => openThread(m)} className="w-full rounded-md border border-border/70 bg-muted/25 px-2 py-1.5 text-left hover:bg-accent/60">
                <p className="line-clamp-2 text-xs">{m.content}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </div>
      </ChatPanel>

      {/* Mobile Bottom Navigation */}
      {renderBottomNav()}

      {/* All Modals - same as before with WhatsApp colors applied where needed */}
      {/* Profile Settings */}
      <div className={`fixed inset-0 z-[55] transition ${profileSettingsOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <button
          type="button"
          aria-label="Close profile settings"
          onClick={() => setProfileSettingsOpen(false)}
          className={`absolute inset-0 bg-black/35 transition-opacity ${profileSettingsOpen ? "opacity-100" : "opacity-0"}`}
        />
        <aside className={`absolute right-0 top-0 h-full w-full max-w-sm border-l border-border/70 bg-background/95 p-4 backdrop-blur-xl transition-transform duration-300 ${profileSettingsOpen ? "translate-x-0" : "translate-x-full"}`}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Profile & Settings</p>
              <p className="text-xs text-muted-foreground">Personalize your chat experience</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setProfileSettingsOpen(false)}><X className="h-4 w-4" /></Button>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-border/70 bg-muted/25 p-3">
              <p className="text-xs font-semibold">Profile Photo</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-16 w-16 overflow-hidden rounded-full border border-border/70 bg-[#25D366]/15">
                  <UserAvatar
                    user={selfUser || { id: "self", clerkId: "self", name: "You", email: null, imageUrl: profileImageUrl }}
                    className="h-full w-full object-cover"
                    fallbackClassName="flex h-full w-full items-center justify-center text-sm font-semibold text-[#25D366]"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <input ref={profileImageInputRef} type="file" accept="image/*" className="hidden" onChange={onProfileImageChange} />
                  <Button size="sm" variant="outline" onClick={() => profileImageInputRef.current?.click()} disabled={savingProfile}>
                    <Upload className="mr-1 h-4 w-4" /> Change
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={savingProfile}
                    onClick={async () => {
                      try {
                        setSavingProfile(true);
                        const data = await api<{ user: UserRow }>("/api/external-chat/profile", {
                          method: "PATCH",
                          body: JSON.stringify({ imageDataUrl: null }),
                        });
                        setSelfUser(data.user);
                        setProfileImageUrl((prev) => {
                          if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
                          return data.user.imageUrl || null;
                        });
                        await loadConnections();
                        await loadRooms({ silent: true });
                        if (activeRoomCode) await loadMessages(activeRoomCode, { silent: true });
                      } catch (err) {
                        handleApiError(err, "Failed to update profile");
                      } finally {
                        setSavingProfile(false);
                        if (profileImageInputRef.current) profileImageInputRef.current.value = "";
                      }
                    }}
                  >
                    {savingProfile ? "Saving..." : "Remove"}
                  </Button>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/25 p-3">
              <p className="text-xs font-semibold">Notifications</p>
              <button className="mt-2 flex w-full items-center justify-between rounded-md border border-border/70 px-2 py-1.5 text-sm hover:bg-accent/60" onClick={() => setNotificationSoundOn((v) => !v)}>
                <span className="inline-flex items-center gap-2"><Bell className="h-4 w-4" /> Sound Alerts</span>
                <span className="text-xs text-muted-foreground">{notificationSoundOn ? "On" : "Off"}</span>
              </button>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/25 p-3">
              <p className="text-xs font-semibold">Privacy</p>
              <button className="mt-2 flex w-full items-center justify-between rounded-md border border-border/70 px-2 py-1.5 text-sm hover:bg-accent/60" onClick={() => setPrivacyModeOn((v) => !v)}>
                <span className="inline-flex items-center gap-2"><Shield className="h-4 w-4" /> Privacy Mode</span>
                <span className="text-xs text-muted-foreground">{privacyModeOn ? "Enabled" : "Disabled"}</span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Group Settings */}
      <div className={`fixed inset-0 z-[56] transition ${groupSettingsOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <button
          type="button"
          aria-label="Close group settings"
          onClick={() => setGroupSettingsOpen(false)}
          className={`absolute inset-0 bg-black/35 transition-opacity ${groupSettingsOpen ? "opacity-100" : "opacity-0"}`}
        />
        <aside className={`absolute right-0 top-0 h-full w-full max-w-md border-l border-border/70 bg-background/95 p-4 backdrop-blur-xl transition-transform duration-300 ${groupSettingsOpen ? "translate-x-0" : "translate-x-full"}`}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Group Settings</p>
              <p className="text-xs text-muted-foreground">Manage this group without changing your personal profile.</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setGroupSettingsOpen(false)}><X className="h-4 w-4" /></Button>
          </div>
          {!activeRoom || activeRoom.type !== "group" ? (
            <p className="text-sm text-muted-foreground">Open a group chat to edit its settings.</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-1 rounded-lg border border-border/70 bg-muted/25 p-1">
                {[
                  { id: "general", label: "General" },
                  { id: "members", label: "Members" },
                  { id: "activity", label: "Activity" },
                ].map((tab) => (
                  <button
                    key={`group-tab-${tab.id}`}
                    type="button"
                    onClick={() => setGroupSettingsTab(tab.id as "general" | "members" | "activity")}
                    className={`rounded-md px-2 py-1.5 text-xs font-medium ${groupSettingsTab === tab.id ? "bg-[#25D366] text-white" : "hover:bg-accent/70"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {groupSettingsTab === "general" ? (
                <>
                  <div className="rounded-lg border border-border/70 bg-muted/25 p-3">
                    <p className="text-xs font-semibold">Group Profile</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-14 w-14 overflow-hidden rounded-full border border-border/70 bg-[#25D366]/15">
                        {groupAvatarDraft ? (
                          <img src={groupAvatarDraft} alt={activeRoom.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-[#25D366]">
                            {(activeRoom.name || "GR").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <input ref={groupAvatarInputRef} type="file" accept="image/*" className="hidden" onChange={onGroupAvatarChange} />
                        <Button size="sm" variant="outline" onClick={() => groupAvatarInputRef.current?.click()}>
                          <Upload className="mr-1 h-4 w-4" /> Change
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setGroupAvatarDraft("")}>Remove</Button>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      <Input value={groupNameDraft} onChange={(e) => setGroupNameDraft(e.target.value)} placeholder="Group name" />
                      <Textarea value={groupDescriptionDraft} onChange={(e) => setGroupDescriptionDraft(e.target.value)} className="min-h-20" placeholder="Group description" />
                      <Button onClick={() => void saveGroupSettings()} disabled={!canManageMembers} className="bg-[#25D366] hover:bg-[#128C7E]">Save Group Profile</Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/70 bg-muted/25 p-3">
                    <p className="text-xs font-semibold">Group Actions</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {canManageMembers ? (
                        <Button size="sm" variant="outline" onClick={() => void toggleArchiveRoom(!Boolean(activeRoom.archivedAt))}>
                          {activeRoom.archivedAt ? "Unarchive" : "Archive"}
                        </Button>
                      ) : null}
                      {activeViewerRole === "owner" || activeViewerRole === "admin" ? (
                        <Button size="sm" variant="outline" onClick={() => void deassignSelfLeadership()}>Deassign My Role</Button>
                      ) : null}
                      <Button size="sm" variant="outline" onClick={() => void leaveActiveGroup()}>Leave Group</Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (!window.confirm("Delete this group chat from your side only? This will not affect other members.")) return;
                          void deleteChatForMe(activeRoom.code);
                        }}
                      >
                        Delete For Me
                      </Button>
                      {activeViewerRole === "owner" ? (
                        <Button size="sm" variant="destructive" className="col-span-2" onClick={() => void deleteGroupForEveryone()}>
                          Delete Group For Everyone
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : null}

              {groupSettingsTab === "members" ? (
                <div className="rounded-lg border border-border/70 bg-muted/25 p-3">
                  <p className="text-xs font-semibold">Add Members</p>
                  <Input
                    className="mt-2"
                    value={groupMemberSearch}
                    onChange={(e) => setGroupMemberSearch(e.target.value)}
                    placeholder="Search users to add"
                    disabled={!canManageMembers}
                  />
                  <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-md border border-border/70 p-2">
                    {!canManageMembers ? <p className="text-xs text-muted-foreground">Only owner/admin can add members.</p> : null}
                    {canManageMembers && groupMemberSearchLoading ? <p className="text-xs text-muted-foreground">Searching...</p> : null}
                    {canManageMembers && !groupMemberSearchLoading && groupMemberSearch.trim() && groupMemberSearchResults.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No eligible users found.</p>
                    ) : null}
                    {groupMemberSearchResults.map((u) => (
                      <button
                        key={`group-member-search-${u.id}`}
                        type="button"
                        onClick={() => toggleGroupMember(u.clerkId)}
                        disabled={!canManageMembers}
                        className={`flex w-full items-center justify-between rounded border px-2 py-1.5 text-left text-sm ${selectedGroupMemberIds.includes(u.clerkId) ? "border-[#25D366] bg-[#25D366]/10" : "border-border/70 hover:bg-accent/60"
                          }`}
                      >
                        <span className="truncate">{userLabel(u)}</span>
                        <span className="text-[11px] text-muted-foreground">{selectedGroupMemberIds.includes(u.clerkId) ? "Selected" : "Add"}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{selectedGroupMemberIds.length} selected</p>
                    <Button size="sm" variant="outline" disabled={!canManageMembers || selectedGroupMemberIds.length === 0} onClick={() => void addSelectedMembersToActiveGroup()} className="bg-[#25D366] hover:bg-[#128C7E] text-white">
                      Add Selected
                    </Button>
                  </div>
                </div>
              ) : null}

              {groupSettingsTab === "activity" ? (
                <div className="rounded-lg border border-border/70 bg-muted/25 p-3">
                  <p className="text-xs font-semibold">Group Activity</p>
                  <div className="mt-2 max-h-72 space-y-1.5 overflow-y-auto rounded-md border border-border/70 p-2">
                    {loadingGroupActivity ? <p className="text-xs text-muted-foreground">Loading activity...</p> : null}
                    {!loadingGroupActivity && groupActivityLogs.length === 0 ? <p className="text-xs text-muted-foreground">No activity yet.</p> : null}
                    {groupActivityLogs.map((log) => (
                      <div key={`group-activity-${log.id}`} className="rounded border border-border/70 bg-background/70 px-2 py-1.5">
                        <p className="text-xs font-medium">{log.action.replaceAll("_", " ")}</p>
                        <p className="text-[11px] text-muted-foreground">{userLabel(log.user)} • {new Date(log.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </aside>
      </div>

      {/* Create Group */}
      <div className={`fixed inset-0 z-[57] transition ${createGroupOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <button
          type="button"
          aria-label="Close create group"
          onClick={() => setCreateGroupOpen(false)}
          className={`absolute inset-0 bg-black/35 transition-opacity ${createGroupOpen ? "opacity-100" : "opacity-0"}`}
        />
        <div className={`absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 rounded-xl border border-border/70 bg-background/95 p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 ${createGroupOpen ? "-translate-y-1/2 opacity-100" : "-translate-y-[45%] opacity-0"}`}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Create Group</p>
              <p className="text-xs text-muted-foreground">Pick a name and choose the users to include.</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setCreateGroupOpen(false)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-3">
            <Input value={createGroupName} onChange={(e) => setCreateGroupName(e.target.value)} placeholder="Group name" />
            <Input
              value={createGroupQuery}
              onChange={(e) => setCreateGroupQuery(e.target.value)}
              placeholder="Search users to add..."
            />
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border/70 p-2">
              {creatingGroupSearch ? <p className="text-xs text-muted-foreground">Searching users...</p> : null}
              {!creatingGroupSearch && createGroupQuery.trim() && createGroupResults.length === 0 ? <p className="text-xs text-muted-foreground">No users found.</p> : null}
              {!createGroupQuery.trim() ? <p className="text-xs text-muted-foreground">Type a name or email to search members.</p> : null}
              {createGroupResults.map((u) => (
                <button
                  key={`group-pick-${u.id}`}
                  type="button"
                  onClick={() => toggleGroupMember(u.clerkId)}
                  className={`flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-sm ${selectedGroupMemberIds.includes(u.clerkId) ? "border-primary bg-primary/10" : "border-border/70 hover:bg-accent/60"
                    }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{userLabel(u)}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{u.email || "No email provided"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{selectedGroupMemberIds.includes(u.clerkId) ? "Selected" : "Add"}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{selectedGroupMemberIds.length} member(s) selected</p>
              <Button onClick={() => void createGroup()} disabled={!createGroupName.trim() || selectedGroupMemberIds.length === 0}>
                Create group
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Call Overlay */}
      <div className={`fixed inset-0 z-[56] transition ${callOverlayOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <button
          type="button"
          aria-label="Close call options"
          onClick={() => setCallOverlayOpen(false)}
          className={`absolute inset-0 bg-black/45 transition-opacity ${callOverlayOpen ? "opacity-100" : "opacity-0"}`}
        />
        <div className={`absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 rounded-xl border border-border/70 bg-background/95 p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 ${callOverlayOpen ? "-translate-y-1/2 opacity-100" : "-translate-y-[45%] opacity-0"}`}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Meeting Launcher</p>
              <p className="text-xs text-muted-foreground">Join, create, or schedule a meeting</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setCallOverlayOpen(false)}><X className="h-4 w-4" /></Button>
          </div>

          <div className="mb-3 space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Meeting code (optional)</label>
            <Input value={meetingCodeInput} onChange={(e) => setMeetingCodeInput(e.target.value)} placeholder="Enter code to join directly" />
          </div>

          <div className="grid grid-cols-1 gap-2">
            <Button className="justify-start gap-2" variant="outline" onClick={joinMeeting}>
              <LogIn className="h-4 w-4" /> Join Meeting
            </Button>
            <Button className="justify-start gap-2" variant="outline" onClick={createMeeting}>
              <PlusCircle className="h-4 w-4" /> Create Instant Meeting
            </Button>
            <Button className="justify-start gap-2" variant="outline" onClick={scheduleMeeting}>
              <CalendarPlus className="h-4 w-4" /> Schedule Meeting
            </Button>
            <Button className="justify-start gap-2" onClick={() => {
              setCallOverlayOpen(false);
              if (activeRoomPeer) {
                handleStartCall(activeRoomPeer, "video");
              } else {
                setDirectCallTarget(null);
                setDirectCallType("video");
                setDirectCallModalOpen(true);
              }
            }}>
              <Video className="h-4 w-4" /> Start Video Call Now
            </Button>
          </div>
        </div>
      </div>

      {/* Call Selector Modal */}
      {callOverlayOpen && (
        <CallSelectorModal
          onClose={() => setCallOverlayOpen(false)}
          onStartCall={handleStartCall}
          currentRoomType={activeRoom?.type || "direct"}
          currentRoomPeer={activeRoomPeer}
          roomMembers={activeRoom?.members}
        />
      )}

      {/* Direct Call Modal */}
      {directCallModalOpen && (
        <DirectCallModal
          roomCode={activeRoomCode}
          callType={directCallType}
          targetUser={directCallTarget}
          onClose={() => {
            setDirectCallModalOpen(false);
            setDirectCallTarget(null);
          }}
          onCallEnded={() => {
            setDirectCallModalOpen(false);
            setDirectCallTarget(null);
          }}
        />
      )}

      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onClose={() => setIncomingCall(null)}
          onAccept={handleIncomingCallAccept}
          onReject={handleIncomingCallReject}
        />
      )}

      {/* Invite Share */}
      <div className={`fixed inset-0 z-[58] transition ${inviteShareOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <button
          type="button"
          aria-label="Close invite share"
          onClick={() => setInviteShareOpen(false)}
          className={`absolute inset-0 bg-black/45 transition-opacity ${inviteShareOpen ? "opacity-100" : "opacity-0"}`}
        />
        <div className={`absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 rounded-xl border border-border/70 bg-background/95 p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 ${inviteShareOpen ? "-translate-y-1/2 opacity-100" : "-translate-y-[45%] opacity-0"}`}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Share Group Invite</p>
            <Button size="sm" variant="ghost" onClick={() => setInviteShareOpen(false)}><X className="h-4 w-4" /></Button>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">Edit the message before sharing.</p>
          <Textarea value={inviteShareText} onChange={(e) => setInviteShareText(e.target.value)} className="min-h-24" />
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  const ok = await copyToClipboard(inviteShareText);
                  if (!ok) throw new Error("Copy failed");
                  pushNotification({ level: "success", title: "Copied", message: "Invite message copied to clipboard." });
                } catch {
                  setError("Failed to copy invite message");
                }
              }}
            >
              Copy Message
            </Button>
          </div>
        </div>
      </div>

      {/* Invite Join */}
      <div className={`fixed inset-0 z-[59] transition ${inviteJoinOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <button
          type="button"
          aria-label="Close invite join"
          onClick={() => {
            setInviteJoinOpen(false);
            setInvitePreview(null);
            setInviteJoinCode("");
          }}
          className={`absolute inset-0 bg-black/45 transition-opacity ${inviteJoinOpen ? "opacity-100" : "opacity-0"}`}
        />
        <div className={`absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 rounded-xl border border-border/70 bg-background/95 p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 ${inviteJoinOpen ? "-translate-y-1/2 opacity-100" : "-translate-y-[45%] opacity-0"}`}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Join Group</p>
            <Button size="sm" variant="ghost" onClick={() => setInviteJoinOpen(false)}><X className="h-4 w-4" /></Button>
          </div>
          {inviteLoading ? <p className="text-sm text-muted-foreground">Loading group details...</p> : null}
          {!inviteLoading && invitePreview ? (
            <div className="space-y-2">
              <div className="rounded-md border border-border/70 bg-muted/20 p-2">
                <p className="text-sm font-semibold">{invitePreview.room.name}</p>
                <p className="text-xs text-muted-foreground">{invitePreview.room.description || "No description"}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{invitePreview.room.memberCount} member(s)</p>
              </div>
              {invitePreview.alreadyMember ? <p className="text-xs text-muted-foreground">You are already a member of this group.</p> : null}
              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  onClick={() => void joinInviteGroup()}
                  disabled={invitePreview.alreadyMember}
                >
                  Join Group
                </Button>
              </div>
            </div>
          ) : null}
          {!inviteLoading && !invitePreview ? <p className="text-sm text-muted-foreground">Invite is invalid or expired.</p> : null}
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className={`fixed inset-0 z-40 transition xl:hidden ${mobileSidebarOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <button
          type="button"
          aria-label="Close conversations"
          onClick={() => setMobileSidebarOpen(false)}
          className={`absolute inset-0 bg-black/35 transition-opacity ${mobileSidebarOpen ? "opacity-100" : "opacity-0"}`}
        />
        <aside className={`absolute left-0 top-0 h-full w-[86vw] max-w-sm border-r border-border/70 bg-background/95 p-3 backdrop-blur-xl transition-transform duration-300 ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Conversations</p>
            <Button size="sm" variant="ghost" onClick={() => setMobileSidebarOpen(false)}><X className="h-4 w-4" /></Button>
          </div>
          <SidebarFilterTabs active={filterTab} onChange={setFilterTab} />
          <div className="space-y-1 overflow-y-auto">
            {filteredRooms.map((room) => {
              const starred = starredRoomCodes.includes(room.code);
              return (
                <button
                  key={`mobile-${room.id}`}
                  onClick={() => {
                    setActiveRoomCode(room.code);
                    setMobileSidebarOpen(false);
                  }}
                  onTouchStart={(e) => onConversationTouchStart(e.changedTouches[0]?.clientX ?? 0)}
                  onTouchEnd={(e) => onConversationTouchEnd(e.changedTouches[0]?.clientX ?? 0, room.code)}
                  className={`chat-row-hover w-full rounded-lg border px-3 py-2 text-left transition-all ${activeRoomCode === room.code ? "chat-row-active" : "border-border/70"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                        {roomAvatarImage(room, selfUserId) ? (
                          <img src={roomAvatarImage(room, selfUserId) || ""} alt={room.name} className="h-full w-full object-cover" />
                        ) : (
                          (room.name || "DM").slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <p className="truncate text-sm font-medium">{room.name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {starred ? <Pin className="h-3.5 w-3.5 text-amber-500" /> : null}
                      {room.unreadCount > 0 ? <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">{room.unreadCount}</span> : null}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {room.archivedAt ? "Archived" : "Swipe left to star, right to close"}
                  </p>
                </button>
              );
            })}
            {archivedRooms.length > 0 ? (
              <div className="mt-3 rounded-lg border border-border/70 bg-muted/20 p-2">
                <button
                  type="button"
                  className="mb-2 flex w-full items-center justify-between text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  onClick={() => setArchivedOpen((v) => !v)}
                >
                  <span>Archived</span>
                  <ChevronRight className={`h-3.5 w-3.5 transition ${archivedOpen ? "rotate-90" : ""}`} />
                </button>
                {archivedOpen ? <div className="space-y-1">
                  {archivedRooms.map((room) => {
                    const role = room.viewerMembership?.role;
                    const canUnarchive = role === "owner" || role === "admin";
                    return (
                      <div key={`mobile-archived-${room.id}`} className="rounded-md border border-border/70 px-2 py-1.5">
                        <button
                          onClick={() => {
                            setActiveRoomCode(room.code);
                            setMobileSidebarOpen(false);
                          }}
                          className="w-full text-left"
                        >
                          <p className="truncate text-sm font-medium">{room.name}</p>
                          <p className="text-[11px] text-muted-foreground">Archived (read-only)</p>
                        </button>
                        <div className="mt-2 flex items-center gap-1">
                          {canUnarchive ? (
                            <Button size="sm" variant="outline" onClick={() => void toggleArchiveRoom(false, room.code)}>
                              Unarchive
                            </Button>
                          ) : null}
                          <Button size="sm" variant="ghost" onClick={() => void deleteChatForMe(room.code)}>
                            <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div> : null}
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      {/* Action Sheet */}
      {actionSheetOpen && actionSheetMessage ? (
        <div className="fixed inset-0 z-[60] pointer-events-auto">
          <button
            type="button"
            aria-label="Close actions"
            onClick={() => setActionSheetOpen(false)}
            className="absolute inset-0 bg-black/35"
          />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl border-t border-border/70 bg-background/95 p-3 backdrop-blur-xl md:left-1/2 md:top-1/2 md:w-[92vw] md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:shadow-2xl">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Message actions</p>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1">
                {REACTIONS.map((emoji) => (
                  <button
                    key={`sheet-${actionSheetMessage.id}-${emoji}`}
                    onClick={() =>
                      void api(`/api/external-chat/messages/${actionSheetMessage.id}/reactions`, {
                        method: "POST",
                        body: JSON.stringify({ emoji }),
                      })
                        .then(() => emit({ type: "reaction" }))
                        .then(() => loadMessages(activeRoomCode))
                        .finally(() => setActionSheetOpen(false))
                        .catch((e) => setError(e instanceof Error ? e.message : "Reaction failed"))
                    }
                    className="rounded-full border border-border px-2 py-0.5 text-xs hover:bg-accent"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => { setReplyToId(actionSheetMessage.id); setActionSheetOpen(false); }}>Reply</Button>
                <Button variant="outline" onClick={() => { openThread(actionSheetMessage); setActionSheetOpen(false); }}>Thread</Button>
                <Button variant="outline" onClick={() => { toggleBookmark(actionSheetMessage.id); setActionSheetOpen(false); }}>
                  {bookmarkedMessageIds.includes(actionSheetMessage.id) ? <StarOff className="mr-1 h-4 w-4 text-amber-500" /> : <Star className="mr-1 h-4 w-4" />}
                  {bookmarkedMessageIds.includes(actionSheetMessage.id) ? "Unstar" : "Star"}
                </Button>
                <Button variant="outline" onClick={() => { void copyMessageContent(actionSheetMessage); setActionSheetOpen(false); }}>Copy</Button>
                <Button variant="outline" onClick={() => { void mutateMessage(actionSheetMessage.id, { pinned: !Boolean(actionSheetMessage.pinnedAt) }); setActionSheetOpen(false); }}>{actionSheetMessage.pinnedAt ? "Unpin" : "Pin"}</Button>
                <Button variant="outline" onClick={() => { const next = window.prompt("Edit message", actionSheetMessage.content); if (next !== null) void mutateMessage(actionSheetMessage.id, { content: next }); setActionSheetOpen(false); }}>Edit</Button>
                <Button variant="destructive" className="col-span-2" onClick={() => { void deleteMessage(actionSheetMessage.id); setActionSheetOpen(false); }}>Delete</Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Thread Panel */}
      <div className={`fixed inset-0 z-50 transition ${threadOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <button
          type="button"
          aria-label="Close thread"
          onClick={() => setThreadOpen(false)}
          className={`absolute inset-0 bg-black/35 transition-opacity ${threadOpen ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          className={`absolute right-0 top-0 h-full w-full max-w-md border-l border-border/70 bg-background/95 p-4 backdrop-blur-xl transition-transform duration-300 ${threadOpen ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Thread</p>
              <p className="text-xs text-muted-foreground">Parent + replies</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setThreadOpen(false)}><X className="h-4 w-4" /></Button>
          </div>

          {!threadParent ? <p className="text-sm text-muted-foreground">Select a message to open thread.</p> : null}

          {threadParent ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-primary/25 bg-primary/10 p-3">
                <p className="mb-1 text-xs font-semibold">{userLabel(threadParent.sender)}</p>
                <p className="text-sm whitespace-pre-wrap">{threadParent.content}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{new Date(threadParent.createdAt).toLocaleString()}</p>
              </div>

              <div className="max-h-[calc(100vh-220px)] space-y-2 overflow-y-auto pr-1">
                {threadReplies.length === 0 ? <p className="text-xs text-muted-foreground">No replies in this thread yet.</p> : null}
                {threadReplies.map((m) => (
                  <div key={m.id} className="rounded-md border border-border/70 bg-card/40 p-2.5">
                    <p className="mb-1 text-xs font-semibold">{userLabel(m.sender)}</p>
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</p>
                      <Button size="sm" variant="ghost" onClick={() => setReplyToId(m.id)}><Reply className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      {/* Lightbox */}
      <div className={`fixed inset-0 z-[70] transition ${lightboxImage ? "pointer-events-auto" : "pointer-events-none"}`}>
        <button
          type="button"
          aria-label="Close image preview"
          onClick={() => setLightboxImage(null)}
          className={`absolute inset-0 bg-black/80 transition-opacity ${lightboxImage ? "opacity-100" : "opacity-0"}`}
        />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          {lightboxImage ? (
            <img
              src={lightboxImage.src}
              alt={lightboxImage.alt}
              className="max-h-[92vh] max-w-[92vw] rounded-lg border border-white/20 object-contain shadow-2xl"
            />
          ) : null}
        </div>
      </div>

      {/* Help */}
      <div className={`fixed inset-0 z-[68] transition ${helpOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <button
          type="button"
          aria-label="Close help"
          onClick={() => setHelpOpen(false)}
          className={`absolute inset-0 bg-black/45 transition-opacity ${helpOpen ? "opacity-100" : "opacity-0"}`}
        />
        <div className={`absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 rounded-xl border border-border/70 bg-background/95 p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 ${helpOpen ? "-translate-y-1/2 opacity-100" : "-translate-y-[45%] opacity-0"}`}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Chat Shortcuts</p>
              <p className="text-xs text-muted-foreground">Keyboard + slash commands</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setHelpOpen(false)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-2 text-sm">
            <p><kbd className="rounded border px-1.5 py-0.5 text-xs">Ctrl/Cmd+K</kbd> Focus search</p>
            <p><kbd className="rounded border px-1.5 py-0.5 text-xs">/</kbd> Focus search (outside inputs)</p>
            <p><kbd className="rounded border px-1.5 py-0.5 text-xs">Ctrl/Cmd+Enter</kbd> Send message</p>
            <p><kbd className="rounded border px-1.5 py-0.5 text-xs">Esc</kbd> Close overlays/panels</p>
          </div>
          <div className="mt-4 rounded-lg border border-border/70 bg-muted/25 p-3 text-sm">
            <p className="mb-1 text-xs font-semibold text-muted-foreground">Slash Commands</p>
            <p><code>/poll</code> create poll mode</p>
            <p><code>/note</code> switch to note mode</p>
            <p><code>/text</code> switch to text mode</p>
            <p><code>/call</code> open call launcher</p>
          </div>
        </div>
      </div>

      {/* Status Creator */}
      {creatorOpen && (
        <StatusCreator
          onClose={() => {
            setCreatorOpen(false);
            void loadStatuses();
          }}
          onPost={async (text, file, visibility) => {
            try {
              const formData = new FormData();
              formData.append("text", text || "");
              formData.append("visibility", visibility);
              if (file) {
                formData.append("file", file);
              }
              await fetch("/api/external-chat/statuses", {
                method: "POST",
                body: formData,
              });
              await loadStatuses();
              setCreatorOpen(false);
              pushNotification({ level: "success", title: "Status posted" });
            } catch (err) {
              handleApiError(err, "Failed to post status");
            }
          }}
          roomId=""
          roomCode=""
        />
      )}

      {/* Status Viewer */}
      {viewerOpen && viewerStatuses.length > 0 && (
        <StatusViewer
          statuses={viewerStatuses}
          initialIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
          onStatusViewed={handleStatusViewed}
          onReact={handleStatusReact}
          onComment={handleStatusComment}
          currentUserId={selfUserId || ""}
          onCreateStatus={() => {
            setViewerOpen(false);
            setCreatorOpen(true);
          }}
        />
      )}
    </ChatShell>
  );
}