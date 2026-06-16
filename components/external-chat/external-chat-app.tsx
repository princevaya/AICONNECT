// components/external-chat/external-chat-app.tsx - COMPLETE CORRECTED VERSION
// All issues fixed: polling loops, state management, realtime connection, calls, status feature
// Full mobile UI compatibility

"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import {
  Check,
  CheckCheck,
  Bell,
  ChevronRight,
  ChevronLeft,
  Download,
  FileImage,
  HelpCircle,
  LogIn,
  Loader2,
  LayoutDashboard,
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
  Reply,
  Search,
  Send,
  Star,
  StarOff,
  UserPlus,
  UserX,
  UserRound,
  Video,
  Vote,
  X,
  Type,
  Trash2,
  Camera,
  User,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ThemeToggle from "@/components/navigation/theme-toggle";
import { messageSyncService } from "@/services/external-chat/message-sync.service";
import DirectCallModal from "@/components/external-chat/direct-call-modal";
import StatusViewer from "@/components/external-chat/status-viewer";
import StatusTabContent from "@/components/external-chat/status-tab-content";
import IncomingCallModal from "@/components/external-chat/incoming-call-modal";
import StatusCreator from "@/components/external-chat/status-creator";
import {
  ChatListSkeleton,
  MessageSkeleton,
  MobileBottomNav,
  OnlineDot,
  SidebarFilterTabs,
  type FilterTab,
  type MobileNavTab,
} from "@/components/external-chat/chat-system";

// ============ TYPES ============
type Room = {
  id: string;
  code: string;
  name: string;
  type: "direct" | "group" | "channel";
  unreadCount: number;
  lastMessage?: { id: string; content: string; createdAt: string } | null;
  description?: string | null;
  isPrivate?: boolean;
  avatarUrl?: string | null;
  archivedAt?: string | null;
  hiddenAt?: string | null;
  canSend?: boolean;
  viewerMembership?: { role: string; leftAt?: string | null; removedAt?: string | null } | null;
  members?: Array<{ id: string; userId: string; role: string; user: UserRow }>;
};

type StatusAttachment = {
  id: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  downloadUrl: string;
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
  attachment: StatusAttachment | null;
};

type UserRow = { id: string; clerkId: string; name: string | null; email: string | null; imageUrl?: string | null };
type Pending = { id: string; sender: UserRow; receiver: UserRow };
type Connection = {
  id: string;
  userA: UserRow;
  userB: UserRow;
  directRoom: { id: string; code: string; name: string };
};
type UploadHint = {
  directUploadLimitBytes: number;
  maxMultipartUploadBytes: number;
  supportsMultipartUploads: boolean;
  recommendedChunkSizeBytes: number;
};
type CallSession = {
  id: string;
  roomId: string;
  startedBy: string;
  endedBy: string | null;
  type: "audio" | "video";
  status: "ringing" | "active" | "ended" | "missed" | "declined";
  livekitRoomName: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  starter: UserRow;
  ender?: UserRow | null;
  participants: Array<{
    id: string;
    userId: string;
    state: string;
    joinedAt?: string | null;
    leftAt?: string | null;
    user: UserRow;
  }>;
};
type CallFeed = { room: { id: string; code: string; name: string }; sessions: CallSession[] };
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
  attachment: {
    id: string;
    fileName: string;
    mimeType?: string;
    sizeBytes?: number;
    downloadUrl: string;
    transcript?: string | null;
    language?: string | null;
  } | null;
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
type NoteColorId = (typeof NOTE_COLORS)[number]["id"];

// ============ CONSTANTS ============
const REACTIONS = ["👍", "❤️", "😂", "🎉", "🔥"];
const MESSAGE_PAGE_SIZE = 60;
const TIMELINE_WINDOW_SIZE = 260;
const NOTE_COLORS = [
  { id: "amber", label: "Amber", className: "border-amber-500/40 bg-amber-500/18" },
  { id: "emerald", label: "Emerald", className: "border-emerald-500/40 bg-emerald-500/16" },
  { id: "sky", label: "Sky", className: "border-sky-500/40 bg-sky-500/16" },
  { id: "rose", label: "Rose", className: "border-rose-500/40 bg-rose-500/16" },
  { id: "violet", label: "Violet", className: "border-violet-500/40 bg-violet-500/16" },
] as const;
const STORAGE_VERSION = 2;
const MAX_STORED_TEXT_LENGTH = 5000;

// ============ HELPER FUNCTIONS ============
function normalizeStoredText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.slice(0, MAX_STORED_TEXT_LENGTH);
}

function userLabel(user: Pick<UserRow, "name" | "email">): string {
  return user.name || user.email || "Unknown user";
}

function userInitials(label: string): string {
  return label.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "U";
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 || unitIndex === 0 ? Math.round(value) : value.toFixed(1)} ${units[unitIndex]}`;
}

function formatTimeLabel(value?: string | null, options?: Intl.DateTimeFormatOptions): string {
  if (!value) return "";
  return new Date(value).toLocaleTimeString(undefined, options || { hour: "numeric", minute: "2-digit" });
}

function compactDateTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return formatTimeLabel(value);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function dayLabel(value: string): string {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function reactionSummary(reactions: Array<{ emoji: string; user: UserRow }> | undefined): Array<{ emoji: string; count: number }> {
  const map = new Map<string, number>();
  for (const r of reactions || []) {
    map.set(r.emoji, (map.get(r.emoji) || 0) + 1);
  }
  return [...map.entries()].map(([emoji, count]) => ({ emoji, count }));
}

function noteColorFromMetadata(metadata: unknown): NoteColorId {
  if (!metadata || typeof metadata !== "object") return "amber";
  const value = (metadata as { noteColor?: string }).noteColor;
  return NOTE_COLORS.some((item) => item.id === value) ? (value as NoteColorId) : "amber";
}

function firstUrl(content: string): string | null {
  const match = content.match(/https?:\/\/[^\s]+/i);
  return match?.[0] || null;
}

function isImageAttachment(attachment: Message["attachment"]): boolean {
  if (!attachment) return false;
  const lower = attachment.fileName.toLowerCase();
  return lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp") || lower.endsWith(".gif");
}

function isAudioAttachment(attachment: Message["attachment"]): boolean {
  if (!attachment) return false;
  const lower = attachment.fileName.toLowerCase();
  return lower.endsWith(".mp3") || lower.endsWith(".wav") || lower.endsWith(".webm") || lower.endsWith(".ogg") || lower.endsWith(".m4a") || (attachment.mimeType || "").startsWith("audio/");
}

function mentionToken(user: UserRow): string {
  const fromName = (user.name || "").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "");
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
      <mark key={`m-${idx}`} className="rounded bg-amber-400/35 px-0.5 text-foreground">{part}</mark>
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
        <a key={`url-${idx}`} href={part} target="_blank" rel="noreferrer" className="break-all underline decoration-primary/50 underline-offset-2 hover:text-primary">
          {part}
        </a>
      );
    }
    return <span key={`txt-${idx}`}>{highlightContent(part, q)}</span>;
  });
}

async function imageFileToDataUrl(file: File, maxDimension = 720, quality = 0.82): Promise<string> {
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

function preferredAudioMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const supported = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  return supported.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function pollMeta(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return null;
  const poll = (metadata as { poll?: { question?: string; options?: Array<{ id: string; text: string; voters?: string[] }> } }).poll;
  if (!poll?.options) return null;
  return poll;
}

function roomAvatarUser(room: Room, selfUserId: string | null) {
  if (room.type !== "direct" || !selfUserId) return null;
  return room.members?.find((member) => member.user.id !== selfUserId)?.user || null;
}

function roomAvatarImage(room: Room, selfUserId: string | null) {
  const directPeer = roomAvatarUser(room, selfUserId);
  if (directPeer?.imageUrl) return directPeer.imageUrl;
  if (room.type !== "direct" && room.avatarUrl) return room.avatarUrl;
  return null;
}

function normalizeDraftStorage(raw: string | null) {
  if (!raw) return { version: STORAGE_VERSION, rooms: {} };
  try {
    const parsed = JSON.parse(raw) as Partial<{ version: number; rooms: Record<string, string> }>;
    if (parsed && typeof parsed === "object" && "version" in parsed) {
      const rooms = parsed.rooms;
      if (rooms && typeof rooms === "object" && !Array.isArray(rooms)) {
        const nextRooms: Record<string, string> = {};
        for (const [key, value] of Object.entries(rooms)) {
          if (typeof key !== "string" || !key.trim()) continue;
          const text = normalizeStoredText(value).trim();
          if (!text) continue;
          nextRooms[key] = text;
        }
        return { version: STORAGE_VERSION, rooms: nextRooms };
      }
    }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const nextRooms: Record<string, string> = {};
      for (const [key, value] of Object.entries(parsed)) {
        const text = normalizeStoredText(value).trim();
        if (!key.trim() || !text) continue;
        nextRooms[key] = text;
      }
      return { version: STORAGE_VERSION, rooms: nextRooms };
    }
  } catch { }
  return { version: STORAGE_VERSION, rooms: {} };
}

function normalizePrefsStorage(raw: string | null) {
  const base = {
    version: STORAGE_VERSION,
    starred: [] as string[],
    hiddenRoomCodes: [] as string[],
    filterTab: "all" as FilterTab,
    compactMode: false,
    notificationSoundOn: true,
    privacyModeOn: false,
    bookmarkedMessageIds: [] as string[],
    fontScale: "md" as "sm" | "md" | "lg",
    readReceiptsEnabled: true,
  };
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw);
    const allowFilterTabs = new Set<FilterTab>(["all", "unread", "groups", "starred"]);
    const allowFontScales = new Set(["sm", "md", "lg"]);
    return {
      ...base,
      starred: Array.isArray(parsed.starred) ? parsed.starred.filter((v: unknown): v is string => typeof v === "string").slice(0, 200) : [],
      hiddenRoomCodes: Array.isArray(parsed.hiddenRoomCodes) ? parsed.hiddenRoomCodes.filter((v: unknown): v is string => typeof v === "string").slice(0, 200) : [],
      filterTab: parsed.filterTab && allowFilterTabs.has(parsed.filterTab as FilterTab) ? (parsed.filterTab as FilterTab) : "all",
      compactMode: typeof parsed.compactMode === "boolean" ? parsed.compactMode : false,
      notificationSoundOn: typeof parsed.notificationSoundOn === "boolean" ? parsed.notificationSoundOn : true,
      privacyModeOn: typeof parsed.privacyModeOn === "boolean" ? parsed.privacyModeOn : false,
      bookmarkedMessageIds: Array.isArray(parsed.bookmarkedMessageIds) ? parsed.bookmarkedMessageIds.filter((v: unknown): v is string => typeof v === "string").slice(0, 400) : [],
      fontScale: parsed.fontScale && allowFontScales.has(parsed.fontScale) ? parsed.fontScale : "md",
      readReceiptsEnabled: typeof parsed.readReceiptsEnabled === "boolean" ? parsed.readReceiptsEnabled : true,
      version: STORAGE_VERSION,
    };
  } catch {
    return base;
  }
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
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

// ============ AVATAR COMPONENT ============
function UserAvatar({ user, className, fallbackClassName }: { user: Pick<UserRow, "name" | "email" | "imageUrl"> | null | undefined; className: string; fallbackClassName?: string }) {
  const label = userLabel(user || { name: null, email: null });
  if (user?.imageUrl) {
    return <NextImage src={user.imageUrl} alt={label} width={96} height={96} unoptimized className={className} />;
  }
  return <div className={fallbackClassName || className}>{userInitials(label)}</div>;
}

// ============ MAIN COMPONENT ============
export default function ExternalChatApp() {
  const router = useRouter();
  const { isLoaded: authLoaded, userId: authUserId } = useAuth();

  // ============ STATE ============
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
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [selfStatus, setSelfStatus] = useState<StatusItem | null>(null);
  const [statusViewerOpen, setStatusViewerOpen] = useState(false);
  const [statusViewerIndex, setStatusViewerIndex] = useState(0);
  const [statusViewerStatuses, setStatusViewerStatuses] = useState<StatusItem[]>([]);
  const [statusCreatorOpen, setStatusCreatorOpen] = useState(false);
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
  const [callUserSearchQuery, setCallUserSearchQuery] = useState("");
  const [callUserSearchResults, setCallUserSearchResults] = useState<UserRow[]>([]);
  const [callUserSearchLoading, setCallUserSearchLoading] = useState(false);
  const [callSelectedUser, setCallSelectedUser] = useState<UserRow | null>(null);
  const [callTypeSelection, setCallTypeSelection] = useState<"audio" | "video">("audio");
  const [pendingMessage, setPendingMessage] = useState<{
    tempId: string;
    content: string;
    type: "text" | "note" | "poll";
    noteColor?: NoteColorId;
    replyToId: string | null;
    attachment: { id: string; fileName: string; downloadUrl: string } | null;
    poll: { question: string; options: string[] } | null;
    timeoutId: ReturnType<typeof setTimeout> | null;
  } | null>(null);
  const [uploadHint, setUploadHint] = useState<UploadHint | null>(null);
  const [callFeed, setCallFeed] = useState<CallFeed | null>(null);
  const [callLoading, setCallLoading] = useState(false);
  const [callActionBusy, setCallActionBusy] = useState(false);
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState(true);
  const [messageType, setMessageType] = useState<"text" | "note" | "poll">("text");
  const [text, setText] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [noteColor, setNoteColor] = useState<NoteColorId>("amber");
  const [attachment, setAttachment] = useState<{ id: string; fileName: string; downloadUrl: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeMobileTabState, setActiveMobileTabState] = useState<"chats" | "status" | "calls" | "profile">("chats");
  const [activeDesktopTabState, setActiveDesktopTabState] = useState<"chats" | "calls" | "status" | "profile">("chats");
  const [initialized, setInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [directCallOpen, setDirectCallOpen] = useState(false);
  const [directCallTarget, setDirectCallTarget] = useState<UserRow | null>(null);
  const [directCallType, setDirectCallType] = useState<"audio" | "video">("audio");

  // ============ CALL STATE VARIABLES ============
  const [incomingCall, setIncomingCall] = useState<{
    id: string;
    type: "audio" | "video";
    livekitRoomName: string;
    starter: { id: string; name: string | null; email: string | null; imageUrl?: string | null };
    roomCode: string;
  } | null>(null);
  const [rejectedCallIds, setRejectedCallIds] = useState<Set<string>>(new Set());
  const [processedCallIds, setProcessedCallIds] = useState<Set<string>>(new Set());
  const [isCallInProgress, setIsCallInProgress] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [lastCallCheckTime, setLastCallCheckTime] = useState(0);

  // ============ REFS ============
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  const composerFormRef = useRef<HTMLFormElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const profileDrawerRef = useRef<HTMLDivElement | null>(null);
  const groupDrawerRef = useRef<HTMLDivElement | null>(null);
  const callOverlayRef = useRef<HTMLDivElement | null>(null);
  const threadDrawerRef = useRef<HTMLDivElement | null>(null);
  const mobileDrawerRef = useRef<HTMLDivElement | null>(null);
  const helpDialogRef = useRef<HTMLDivElement | null>(null);
  const inviteShareRef = useRef<HTMLDivElement | null>(null);
  const inviteJoinRef = useRef<HTMLDivElement | null>(null);
  const draftByRoomRef = useRef<Record<string, string>>({});
  const draftPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomsRef = useRef<Room[]>([]);
  const skipNextDraftPersistRef = useRef(false);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const messageNodeRefs = useRef<Record<string, HTMLElement | null>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSeenMessageIdRef = useRef<string | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const eventRef = useRef<EventSource | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeStartXRef = useRef<number | null>(null);
  const lastGroupSettingsRoomRef = useRef<string | null>(null);
  const inviteParamHandledRef = useRef(false);
  const callFeedBootstrappedRef = useRef(false);
  const lastCallSnapshotRef = useRef(new Map<string, string>());
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const lastMessageLoadTimeRef = useRef<Record<string, number>>({});
  const hashHandledRef = useRef(false);

  // ============ CLEANUP STALE CALLS ON MOUNT ============
  useEffect(() => {
    const cleanupStaleCalls = async () => {
      try {
        await fetch("/api/external-chat/calls/cleanup", { method: "POST" });
      } catch (error) {
        console.error("Failed to cleanup stale calls:", error);
      }
    };
    cleanupStaleCalls();
  }, []);

  // ============ RESET CALL STATES ON MOUNT ============
  useEffect(() => {
    setDirectCallOpen(false);
    setIncomingCall(null);
    setIsCallInProgress(false);
  }, []);

  // ============ MEMOIZED VALUES ============
  const activeRoom = useMemo(() => rooms.find((r) => r.code === activeRoomCode) || null, [rooms, activeRoomCode]);
  const selfUserId = selfUser?.id || null;
  const activeRoomPeer = useMemo(() => {
    if (!activeRoom || activeRoom.type !== "direct" || !selfUserId) return null;
    return activeRoom.members?.find((member) => member.user.id !== selfUserId)?.user || null;
  }, [activeRoom, selfUserId]);
  const replying = useMemo(() => (replyToId ? messages.find((m) => m.id === replyToId) || null : null), [messages, replyToId]);
  const visibleRooms = useMemo(() => rooms.filter((room) => !hiddenRoomCodes.includes(room.code)), [rooms, hiddenRoomCodes]);
  const archivedRooms = useMemo(() => visibleRooms.filter((room) => Boolean(room.archivedAt)), [visibleRooms]);

  const filteredMessages = useMemo(() => {
    if (!search.trim()) return messages.filter(m => m && m.sender);
    const term = search.trim().toLowerCase();
    return messages.filter(m => m && m.sender && m.content?.toLowerCase().includes(term));
  }, [messages, search]);

  const filteredRooms = useMemo(() => {
    return visibleRooms.filter((room) => {
      if (room.archivedAt) return false;
      if (filterTab === "unread") return room.unreadCount > 0;
      if (filterTab === "groups") return room.type === "group";
      if (filterTab === "starred") return starredRoomCodes.includes(room.code);
      return true;
    });
  }, [visibleRooms, filterTab, starredRoomCodes]);

  const sharedMedia = useMemo(() => messages.filter((m) => m && m.attachment && Boolean(m.attachment)).slice(-6), [messages]);
  const messageMatches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [] as string[];
    return filteredMessages.filter((m) => m && m.content && m.content.toLowerCase().includes(term)).map((m) => m.id);
  }, [filteredMessages, search]);

  const mentionNotifications = useMemo(() => {
    if (!selfUserId) return [] as Message[];
    return filteredMessages
      .filter((m) => m && m.mentions && m.mentions.length > 0)
      .filter((m) => m.sender && m.sender.id !== selfUserId)
      .slice(-5)
      .reverse();
  }, [filteredMessages, selfUserId]);

  const firstUnreadMessageId = useMemo(() => {
    if (!selfUserId) return null;
    const found = filteredMessages.find((m) =>
      m &&
      m.sender &&
      m.sender.id !== selfUserId &&
      m.sender.clerkId !== "self" &&
      m.seenBy &&
      !m.seenBy.some((s) => s && s.userId === selfUserId)
    );
    return found?.id || null;
  }, [filteredMessages, selfUserId]);

  const timelineItems = useMemo(() => {
    const items: Array<{ kind: "day"; key: string; label: string } | { kind: "unread"; key: string } | { kind: "message"; key: string; message: Message }> = [];
    let lastDay = "";
    for (const m of filteredMessages) {
      if (!m || !m.createdAt) continue;
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
  }, [filteredMessages, firstUnreadMessageId]);

  const visibleTimelineItems = useMemo(() => {
    if (search.trim() || pinnedOnly) return timelineItems;
    const offset = Math.max(0, timelineItems.length - TIMELINE_WINDOW_SIZE);
    return timelineItems.slice(offset);
  }, [timelineItems, search, pinnedOnly]);

  const bookmarkedMessages = useMemo(() =>
    filteredMessages.filter((m) => m && bookmarkedMessageIds.includes(m.id)),
    [filteredMessages, bookmarkedMessageIds]
  );

  const mutualGroups = useMemo(() => {
    if (!selfUserId || !activeRoomPeer) return [] as Room[];
    return rooms.filter((room) =>
      room.type === "group" &&
      room.members?.some((member) => member.user.id === selfUserId) &&
      room.members?.some((member) => member.user.id === activeRoomPeer.id)
    );
  }, [activeRoomPeer, rooms, selfUserId]);

  const messageTextClass = fontScale === "sm" ? "text-[13px]" : fontScale === "lg" ? "text-[15px]" : "text-sm";
  const pinnedMessages = useMemo(() =>
    filteredMessages.filter((m) => m && m.pinnedAt).slice(-4),
    [filteredMessages]
  );

  const actionSheetMessage = useMemo(() =>
    (actionSheetMessageId ? filteredMessages.find((m) => m && m.id === actionSheetMessageId) || null : null),
    [filteredMessages, actionSheetMessageId]
  );

  const threadParent = useMemo(() =>
    (threadParentId ? filteredMessages.find((m) => m && m.id === threadParentId) || null : null),
    [filteredMessages, threadParentId]
  );

  const threadReplies = useMemo(() =>
    (threadParentId ? filteredMessages.filter((m) => m && m.replyToId === threadParentId) : []),
    [filteredMessages, threadParentId]
  );

  const messageById = useMemo(() => {
    const map = new Map<string, Message>();
    for (const m of filteredMessages) {
      if (m && m.id) map.set(m.id, m);
    }
    return map;
  }, [filteredMessages]);

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

  // ============ NOTIFICATION HELPER ============
  const pushNotification = useCallback((entry: Omit<InAppNotification, "id" | "createdAt">) => {
    const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setInAppNotifications((prev) => [{ ...entry, id, createdAt: Date.now() }, ...prev].slice(0, 30));
  }, []);

  // ============ API ERROR HANDLER ============
  const handleApiError = useCallback((err: unknown, fallback: string) => {
    const e = err as ApiError;
    if (e?.status === 401) {
      setAuthCooldownUntil(Date.now() + 8000);
      setError("");
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

  // ============ PROFILE IMAGE CHANGE ============
  const onProfileImageChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
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
      } catch (err) {
        handleApiError(err, "Failed to update profile");
      } finally {
        setSavingProfile(false);
        if (profileImageInputRef.current) profileImageInputRef.current.value = "";
      }
    })();
  }, [handleApiError]);

  // ============ GROUP AVATAR CHANGE ============
  const onGroupAvatarChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
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
  }, []);

  // ============ LOAD FUNCTIONS ============
  const loadProfile = useCallback(async (): Promise<boolean> => {
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

  const loadStatuses = useCallback(async () => {
    if (!authReady || authCoolingDown) return;
    try {
      const data = await api<{ selfStatus: StatusItem | null; statuses: StatusItem[] }>("/api/external-chat/statuses");
      setSelfStatus(data.selfStatus || null);
      setStatuses(data.statuses || []);
    } catch (err) {
      handleApiError(err, "Failed to load statuses");
    }
  }, [authReady, authCoolingDown, handleApiError]);

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

  const loadCallFeed = useCallback(async () => {
    if (!activeRoomCode) return;
    setCallLoading(true);
    try {
      const data = await api<CallFeed>(`/api/external-chat/calls?roomCode=${encodeURIComponent(activeRoomCode)}`);
      if (callFeedBootstrappedRef.current) {
        const previousSnapshot = lastCallSnapshotRef.current;
        const nextSnapshot = new Map<string, string>();
        for (const call of data.sessions || []) {
          nextSnapshot.set(call.id, call.status);
          const previousStatus = previousSnapshot.get(call.id);
          const statusChanged = previousStatus && previousStatus !== call.status;
          const newCall = !previousStatus;
          if (selfUserId && (newCall || statusChanged) && call.startedBy !== selfUserId) {
            const isIncoming = call.status === "ringing" && call.participants.some((participant) => participant.userId === selfUserId);
            if (isIncoming) {
              pushNotification({
                level: "info",
                title: `${call.type === "video" ? "Video" : "Audio"} call ringing`,
                message: `${userLabel(call.starter)} is calling now`,
              });
            }
            if (call.status === "missed") {
              pushNotification({
                level: "info",
                title: "Missed call",
                message: `${userLabel(call.starter)} call timed out`,
              });
            }
            if (call.status === "declined") {
              pushNotification({
                level: "info",
                title: "Call declined",
                message: `${userLabel(call.starter)} call was declined`,
              });
            }
          }
        }
        lastCallSnapshotRef.current = nextSnapshot;
      } else {
        lastCallSnapshotRef.current = new Map((data.sessions || []).map((call) => [call.id, call.status]));
        callFeedBootstrappedRef.current = true;
      }
      setCallFeed(data);
    } catch (err) {
      handleApiError(err, "Failed to load call history");
    } finally {
      setCallLoading(false);
    }
  }, [activeRoomCode, handleApiError, pushNotification, selfUserId]);

  const loadMessages = useCallback(async (roomCode: string, options?: { before?: string; appendOlder?: boolean; silent?: boolean }) => {
    if (!authLoaded || !authUserId || authCooldownUntil > Date.now()) return;
    if (!roomCode) return;

    const now = Date.now();
    const lastLoad = lastMessageLoadTimeRef.current[roomCode] || 0;
    if (options?.silent && (now - lastLoad) < 3000) {
      return;
    }
    lastMessageLoadTimeRef.current[roomCode] = now;

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
      const nextMessages = (data.messages || []).filter(m => m && m.sender);

      setMessages((prev) => {
        if (appendOlder) {
          const existingIds = new Set(prev.map(m => m && m.id).filter(Boolean));
          const uniqueNewMessages = nextMessages.filter(m => !existingIds.has(m.id));
          if (uniqueNewMessages.length === 0) return prev;
          return [...uniqueNewMessages, ...prev];
        } else {
          if (prev.length === nextMessages.length &&
            prev.every((m, i) => m && m.id === nextMessages[i]?.id && m.content === nextMessages[i]?.content)) {
            return prev;
          }
          return nextMessages;
        }
      });

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
    } catch (err) {
      if (!options?.silent) handleApiError(err, "Failed to load messages");
    } finally {
      if (appendOlder) {
        setLoadingOlderMessages(false);
      } else if (!options?.silent) {
        setLoadingMessages(false);
      }
    }
  }, [authCooldownUntil, authLoaded, authUserId, handleApiError, pinnedOnly, search]);

  const loadUploadHint = useCallback(async () => {
    try {
      const data = await api<UploadHint>("/api/external-chat/uploads/sessions");
      setUploadHint(data);
    } catch {
      setUploadHint(null);
    }
  }, []);

  // ============ STATUS HANDLERS ============
  const handleStatusViewed = useCallback(async (statusId: string) => {
    await api(`/api/external-chat/statuses/${statusId}/view`, { method: "POST" });
    setStatuses(prev => prev.map(s =>
      s.id === statusId ? { ...s, viewedByViewer: true, viewerCount: s.viewerCount + 1 } : s
    ));
  }, []);

  const handleStatusReact = useCallback(async (statusId: string, emoji: string) => {
    await api(`/api/external-chat/statuses/${statusId}/reactions`, { method: "POST", body: JSON.stringify({ emoji }) });
    setStatuses(prev => prev.map(s => {
      if (s.id !== statusId) return s;
      const existingReaction = s.reactions.find(r => r.emoji === emoji);
      if (existingReaction) {
        return {
          ...s,
          reactions: s.reactions.map(r =>
            r.emoji === emoji ? { ...r, count: r.count + 1, viewerReacted: true } : r
          ),
        };
      }
      return {
        ...s,
        reactions: [...s.reactions, { emoji, count: 1, viewerReacted: true }],
      };
    }));
  }, []);

  const handleStatusComment = useCallback(async (statusId: string, content: string) => {
    await api(`/api/external-chat/statuses/${statusId}/comments`, { method: "POST", body: JSON.stringify({ content }) });
  }, []);

  const handlePostStatus = useCallback(async (text: string | null, file: File | null, visibility: "public" | "contacts" | "private") => {
    let attachmentId: string | null = null;

    if (file && activeRoom) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("roomId", activeRoom.id);
      formData.append("roomCode", activeRoomCode);
      const uploadRes = await fetch("/api/external-chat/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (uploadData.attachment) attachmentId = uploadData.attachment.id;
    }

    await api("/api/external-chat/statuses", {
      method: "POST",
      body: JSON.stringify({ text, attachmentId, visibility }),
    });

    await loadStatuses();
  }, [activeRoom, activeRoomCode, loadStatuses]);

  // ============ CALL USER SEARCH EFFECT ============
  useEffect(() => {
    if (!activeRoom) return;
    const q = callUserSearchQuery.trim();
    if (!q || activeRoom?.type === "direct") {
      setCallUserSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setCallUserSearchLoading(true);
      try {
        const data = await api<{ users: UserRow[] }>(`/api/external-chat/users?q=${encodeURIComponent(q)}`);
        const filtered = (data.users || []).filter(user => user.id !== selfUserId);
        setCallUserSearchResults(filtered);
      } catch {
        setCallUserSearchResults([]);
      } finally {
        setCallUserSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [callUserSearchQuery, activeRoom, selfUserId]);

  // ============ SINGLE INITIAL LOAD ============
  useEffect(() => {
    if (!authReady || setupRequired || authCoolingDown || initialized) return;
    let cancelled = false;

    const initialize = async () => {
      if (cancelled) return;
      setLoadingRooms(true);
      try {
        const profileLoaded = await loadProfile();
        if (!profileLoaded || cancelled) return;

        await Promise.all([
          loadRooms({ silent: true }),
          loadConnections(),
          loadStatuses(),
        ]);
        if (cancelled) return;
        setInitialized(true);
      } catch (err) {
        if (!cancelled) handleApiError(err, "Failed to initialize chat");
      } finally {
        if (!cancelled) setLoadingRooms(false);
      }
    };
    initialize();
    return () => { cancelled = true; };
  }, [authReady, setupRequired, authCoolingDown, initialized, loadProfile, loadRooms, loadConnections, loadStatuses, handleApiError]);

  // ============ LOAD UPLOAD HINT ============
  useEffect(() => {
    if (!authReady) return;
    loadUploadHint();
  }, [authReady, loadUploadHint]);

  // ============ LOAD MESSAGES ON ROOM CHANGE ============
  useEffect(() => {
    if (!authReady || !activeRoomCode || setupRequired || authCoolingDown || !initialized) return;
    loadMessages(activeRoomCode);
  }, [activeRoomCode, authReady, setupRequired, authCoolingDown, initialized, loadMessages]);

  // ============ LOAD OLDER MESSAGES ============
  const loadOlderMessages = useCallback(async () => {
    if (!activeRoomCode || !messagesHasMore || !messagesNextCursor || loadingOlderMessages) return;
    await loadMessages(activeRoomCode, { before: messagesNextCursor, appendOlder: true });
  }, [activeRoomCode, messagesHasMore, messagesNextCursor, loadingOlderMessages, loadMessages]);

  // ============ SINGLE REALTIME CONNECTION ============
  useEffect(() => {
    if (!authReady || !activeRoomCode || setupRequired || authCoolingDown || !initialized) return;

    const currentRoom = rooms.find((room) => room.code === activeRoomCode);
    if (currentRoom?.canSend === false) {
      setRealtimeConnected(true);
      return;
    }

    if (eventRef.current) {
      eventRef.current.close();
      eventRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    let mounted = true;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const baseDelay = 3000;

    const connect = () => {
      if (!mounted) return;

      const es = new EventSource(`/api/external-chat/realtime/${encodeURIComponent(activeRoomCode)}`);
      eventRef.current = es;

      let heartbeatMissed = 0;
      const heartbeatInterval = setInterval(() => {
        if (!mounted) {
          clearInterval(heartbeatInterval);
          return;
        }
        if (es.readyState === EventSource.OPEN) {
          heartbeatMissed = 0;
        } else if (es.readyState === EventSource.CLOSED) {
          heartbeatMissed++;
          if (heartbeatMissed >= 3) {
            clearInterval(heartbeatInterval);
            es.close();
            if (mounted && reconnectAttempts < maxReconnectAttempts) {
              const delay = Math.min(baseDelay * Math.pow(1.5, reconnectAttempts), 30000);
              setTimeout(() => {
                reconnectAttempts++;
                connect();
              }, delay);
            }
          }
        }
      }, 20000);
      heartbeatIntervalRef.current = heartbeatInterval;

      es.onopen = () => {
        if (mounted) {
          setRealtimeConnected(true);
          reconnectAttempts = 0;
        }
      };

      es.onerror = () => {
        if (mounted) setRealtimeConnected(false);
      };

      es.onmessage = (event) => {
        if (!mounted) return;

        try {
          const body = JSON.parse(event.data) as {
            senderId?: string;
            payload?: {
              type?: string;
              user?: UserRow;
              status?: StatusItem;
              statusId?: string;
            }
          };
          const eventType = body.payload?.type || "";

          if (eventType === "message" || eventType === "reaction" || eventType === "delete") {
            messageSyncService.scheduleRefresh(async () => {
              if (mounted && activeRoomCode) {
                await loadMessages(activeRoomCode, { silent: true });
              }
            }, { priority: 'low' });
          } else if (eventType === "room_updated" || eventType === "member_added" || eventType === "member_removed") {
            messageSyncService.scheduleRefresh(async () => {
              if (mounted) {
                await loadRooms({ silent: true });
                if (activeRoomCode) {
                  await loadMessages(activeRoomCode, { silent: true });
                }
              }
            }, { priority: 'high' });
          } else if (eventType === "status_new" && body.payload?.status) {
            const newStatus = body.payload.status as StatusItem;
            if (newStatus.userId !== selfUserId) {
              setStatuses(prev => [newStatus, ...prev]);
              pushNotification({
                level: "info",
                title: "New Status",
                message: `${userLabel(newStatus.author)} added a status`,
              });
            } else {
              setSelfStatus(newStatus);
            }
          } else if (eventType === "status_viewed" && body.payload?.statusId) {
            const statusId = body.payload.statusId;
            setStatuses(prev => prev.map(s =>
              s.id === statusId ? { ...s, viewedByViewer: true, viewerCount: s.viewerCount + 1 } : s
            ));
          } else if (eventType === "status_reacted" && body.payload?.statusId) {
            const statusId = body.payload.statusId;
            setStatuses(prev => prev.map(s =>
              s.id === statusId ? { ...s } : s
            ));
          } else if (eventType === "profile" && body.payload?.user) {
            const user = body.payload.user;
            if (user && mounted && selfUserId === user.id) {
              setSelfUser(prev => prev?.id === user.id ? { ...prev, ...user } : prev);
              setProfileImageUrl(user.imageUrl || null);
            }
          }
        } catch (error) {
          console.error("Failed to parse realtime message:", error);
        }
      };
    };

    connect();

    return () => {
      mounted = false;
      if (eventRef.current) {
        eventRef.current.close();
        eventRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      messageSyncService.reset();
    };
  }, [activeRoomCode, authReady, setupRequired, authCoolingDown, initialized, rooms, loadMessages, loadRooms, selfUserId, pushNotification]);

  // ============ LOAD CALL FEED ONLY WHEN OVERLAY OPENS ============
  useEffect(() => {
    if (callOverlayOpen && activeRoomCode && authReady && initialized) {
      loadCallFeed();
    }
  }, [callOverlayOpen, activeRoomCode, authReady, initialized, loadCallFeed]);

  // ============ MARK MESSAGES AS SEEN ============
  useEffect(() => {
    if (!selfUserId || !activeRoomCode || !initialized) return;
    const unseenMessages = filteredMessages.filter(
      (m) => m && m.sender && m.sender.id !== selfUserId && m.sender.clerkId !== "self" && m.seenBy && !m.seenBy.some((s) => s && s.userId === selfUserId)
    );
    if (unseenMessages.length > 0) {
      const timer = setTimeout(() => {
        unseenMessages.slice(0, 10).forEach((m) => {
          if (m && m.id) {
            fetch(`/api/external-chat/messages/${m.id}/seen`, { method: "POST" }).catch(() => { });
          }
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [filteredMessages, selfUserId, activeRoomCode, initialized]);

  // ============ POLLING FOR ACTIVE CALLS ============
  useEffect(() => {
    if (!authReady || !initialized) return;

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    let mounted = true;

    const checkForActiveCall = async () => {
      if (!mounted) return;

      const now = Date.now();
      if (now - lastCallCheckTime < 3000) return;
      setLastCallCheckTime(now);

      try {
        const response = await fetch("/api/external-chat/calls/receiver");
        const data = await response.json();

        if (data.activeCall &&
          data.activeCall.status === "ringing" &&
          !incomingCall &&
          !rejectedCallIds.has(data.activeCall.id) &&
          !processedCallIds.has(data.activeCall.id)) {

          if (!directCallOpen && !callOverlayOpen) {
            setProcessedCallIds(prev => new Set([...prev, data.activeCall.id]));
            setIncomingCall({
              id: data.activeCall.id,
              type: data.activeCall.type,
              livekitRoomName: data.activeCall.livekitRoomName,
              starter: data.activeCall.starter,
              roomCode: data.activeCall.room.code,
            });
          }
        }
      } catch (error) {
        console.error("Failed to check for active call:", error);
      }
    };

    checkForActiveCall();
    pollingIntervalRef.current = setInterval(checkForActiveCall, 5000);

    return () => {
      mounted = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [authReady, initialized, incomingCall, rejectedCallIds, processedCallIds, directCallOpen, callOverlayOpen, lastCallCheckTime]);

  // ============ CLEANUP ON UNMOUNT ============
  useEffect(() => {
    return () => {
      setIncomingCall(null);
      setDirectCallOpen(false);
      setIsCallInProgress(false);
      setRejectedCallIds(new Set());
      setProcessedCallIds(new Set());
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // ============ DRAFT STORAGE ============
  useEffect(() => {
    draftByRoomRef.current = draftByRoom;
  }, [draftByRoom]);

  useEffect(() => {
    if (!activeRoomCode || !initialized) return;
    const draft = draftByRoomRef.current[activeRoomCode] ?? "";
    skipNextDraftPersistRef.current = true;
    setText(draft);
  }, [activeRoomCode, initialized]);

  useEffect(() => {
    if (!activeRoomCode) return;
    if (skipNextDraftPersistRef.current) {
      skipNextDraftPersistRef.current = false;
      return;
    }
    if (draftPersistTimerRef.current) clearTimeout(draftPersistTimerRef.current);
    draftPersistTimerRef.current = setTimeout(() => {
      setDraftByRoom((prev) => {
        const current = prev[activeRoomCode] ?? "";
        const nextText = normalizeStoredText(text);
        if (current === nextText) return prev;
        const next = { ...prev, [activeRoomCode]: nextText };
        try {
          localStorage.setItem("external-chat-drafts", JSON.stringify({ version: STORAGE_VERSION, rooms: next }));
        } catch { }
        return next;
      });
    }, 500);
    return () => {
      if (draftPersistTimerRef.current) clearTimeout(draftPersistTimerRef.current);
    };
  }, [text, activeRoomCode]);

  // ============ PREFS LOADING ============
  useEffect(() => {
    try {
      const raw = localStorage.getItem("external-chat-prefs");
      const prefs = normalizePrefsStorage(raw);
      setStarredRoomCodes(prefs.starred);
      setHiddenRoomCodes(prefs.hiddenRoomCodes);
      setFilterTab(prefs.filterTab);
      setCompactMode(prefs.compactMode);
      setNotificationSoundOn(prefs.notificationSoundOn);
      setPrivacyModeOn(prefs.privacyModeOn);
      setBookmarkedMessageIds(prefs.bookmarkedMessageIds);
      setFontScale(prefs.fontScale);
      setReadReceiptsEnabled(prefs.readReceiptsEnabled);
    } catch { }
    setPrefsLoaded(true);
  }, []);

  useEffect(() => {
    if (!prefsLoaded) return;
    try {
      localStorage.setItem("external-chat-prefs", JSON.stringify({
        version: STORAGE_VERSION,
        starred: starredRoomCodes,
        hiddenRoomCodes,
        filterTab,
        compactMode,
        notificationSoundOn,
        privacyModeOn,
        bookmarkedMessageIds,
        fontScale,
        readReceiptsEnabled,
      }));
    } catch { }
  }, [prefsLoaded, starredRoomCodes, hiddenRoomCodes, filterTab, compactMode, notificationSoundOn, privacyModeOn, bookmarkedMessageIds, fontScale, readReceiptsEnabled]);

  // ============ TEXTAREA AUTO-RESIZE ============
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [text]);

  // ============ NETWORK STATUS ============
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

  // ============ ESCAPE KEY HANDLER ============
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
        setStatusViewerOpen(false);
        setStatusCreatorOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ============ ERROR TIMEOUT ============
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 6000);
    return () => clearTimeout(t);
  }, [error]);

  // ============ GROUP SETTINGS INIT ============
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

  // ============ CLEANUP ============
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (draftPersistTimerRef.current) clearTimeout(draftPersistTimerRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (eventRef.current) eventRef.current.close();
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (profileImageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(profileImageUrl);
      }
    };
  }, [profileImageUrl]);

  // ============ USER SEARCH ============
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

  // ============ MENTION SEARCH ============
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

  // ============ LINK PREVIEWS ============
  useEffect(() => {
    const urls = Array.from(new Set(messages.map((m) => firstUrl(m.content)).filter((u): u is string => Boolean(u))));
    for (const url of urls) {
      if (url in linkPreviews) continue;
      void fetch(`/api/external-chat/link-preview?url=${encodeURIComponent(url)}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((body) => {
          setLinkPreviews((prev) => ({ ...prev, [url]: (body?.preview as LinkPreview | undefined) || null }));
        })
        .catch(() => {
          setLinkPreviews((prev) => ({ ...prev, [url]: null }));
        });
    }
  }, [messages, linkPreviews]);

  // ============ CREATE GROUP SEARCH ============
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

  // ============ GROUP MEMBER SEARCH ============
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

  // ============ GROUP ACTIVITY LOGS ============
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
    return () => { cancelled = true; };
  }, [activeRoomCode, groupSettingsOpen, groupSettingsTab]);

  // ============ SCROLL TO MESSAGE FROM URL HASH ============
  useEffect(() => {
    if (!filteredMessages.length || typeof window === "undefined" || hashHandledRef.current) return;
    const hash = window.location.hash || "";
    const match = hash.match(/m=([^&]+)/);
    const id = match?.[1];
    if (!id) return;
    hashHandledRef.current = true;
    setTimeout(() => {
      scrollToMessageById(decodeURIComponent(id));
    }, 500);
  }, [filteredMessages]);

  // ============ UI HELPER FUNCTIONS ============
  const scrollToMessageById = useCallback((id: string) => {
    const node = messageNodeRefs.current[id];
    if (node) node.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const scrollToLatest = useCallback(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" });
      setPendingNewCount(0);
    }
  }, []);

  const isOwnMessage = useCallback((m: Message) => {
    if (m.sender.clerkId === "self") return true;
    if (selfUserId && m.sender.id === selfUserId) return true;
    return false;
  }, [selfUserId]);

  const messageStatus = useCallback((m: Message) => {
    if (!isOwnMessage(m)) return null;
    if (m.failed) return <span className="inline-flex items-center gap-1 text-[11px] text-red-500">Failed</span>;
    if (m.optimistic) return <span className="inline-flex items-center gap-1 text-[11px] text-amber-500">Sending...</span>;
    if (m.seenBy.length > 0) return <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600"><CheckCheck className="h-3.5 w-3.5" /> Seen</span>;
    return <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Check className="h-3.5 w-3.5" /> Delivered</span>;
  }, [isOwnMessage]);

  const jumpMatch = useCallback((dir: 1 | -1) => {
    if (!messageMatches.length) return;
    setMessageSearchIndex((prev) => (prev + dir + messageMatches.length) % messageMatches.length);
  }, [messageMatches.length]);

  const toggleBookmark = useCallback((messageId: string) => {
    setBookmarkedMessageIds((prev) => prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId]);
  }, []);

  const startExternalChatCallWithUser = useCallback(async (type: "audio" | "video", targetUser: UserRow) => {
    if (!activeRoomCode || !activeRoom) return;
    if (isCallInProgress) return;

    if (incomingCall) {
      setError("You have an incoming call. Answer or decline it first.");
      return;
    }

    setIsCallInProgress(true);

    try {
      setCallActionBusy(true);
      const payload = {
        roomCode: activeRoomCode,
        type,
        participantUserIds: [targetUser.id],
      };
      const response = await api<{ call: CallSession }>("/api/external-chat/calls", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await api(`/api/external-chat/calls/${response.call.id}/join`, { method: "POST" });
      setCallOverlayOpen(false);
      setCallSelectedUser(null);
      setCallUserSearchQuery("");
      router.push(`/external-chat/calls/${encodeURIComponent(response.call.id)}`);
    } catch (err) {
      handleApiError(err, "Failed to start call");
    } finally {
      setCallActionBusy(false);
      setIsCallInProgress(false);
    }
  }, [activeRoomCode, activeRoom, router, handleApiError, isCallInProgress, incomingCall]);

  const deleteMessage = useCallback(async (id: string) => {
    if (id.startsWith("temp-")) {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      return;
    }
    const snapshot = messages;
    setMessages((prev) => prev.filter((m) => m.id !== id));
    try {
      await api(`/api/external-chat/messages/${id}`, { method: "DELETE" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setMessages(snapshot);
    }
  }, [messages]);

  const copyMessageContent = useCallback(async (m: Message) => {
    if (!m.content?.trim()) return;
    try {
      await navigator.clipboard.writeText(m.content);
    } catch {
      setError("Copy failed");
    }
  }, []);

  const retryOptimisticMessage = useCallback(async (tempId: string) => {
    const msg = messages.find((m) => m.id === tempId);
    if (!msg || !activeRoomCode) return;
    if (!canSendInActiveRoom) {
      setError("This conversation is read-only for you.");
      return;
    }
    try {
      setSending(true);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, failed: false, optimistic: true } : m)));
      await api(`/api/external-chat/rooms/${encodeURIComponent(activeRoomCode)}/messages`, {
        method: "POST",
        body: JSON.stringify({
          content: msg.content,
          type: msg.type,
          replyToId: msg.replyToId,
          attachmentId: msg.attachment?.id || null,
          noteColor: msg.type === "note" ? noteColorFromMetadata(msg.metadata) : undefined,
          poll: msg.type === "poll" ? pollMeta(msg.metadata) : null,
          mentions: msg.mentions || [],
        }),
      });
      await loadMessages(activeRoomCode);
    } catch (err) {
      handleApiError(err, "Retry failed");
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, failed: true, optimistic: false } : m)));
    } finally {
      setSending(false);
    }
  }, [activeRoomCode, canSendInActiveRoom, messages, handleApiError, loadMessages]);

  const mutateMessage = useCallback(async (id: string, body: Record<string, unknown>) => {
    const snapshot = messages;
    if (typeof body.content === "string") {
      setMessages((prev) => prev.map((m) => m.id === id ? { ...m, content: String(body.content), editedAt: new Date().toISOString() } : m));
    }
    if (typeof body.pinned === "boolean") {
      setMessages((prev) => prev.map((m) => m.id === id ? { ...m, pinnedAt: body.pinned ? new Date().toISOString() : null } : m));
    }
    try {
      await api(`/api/external-chat/messages/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      await loadMessages(activeRoomCode);
    } catch (err) {
      handleApiError(err, "Update failed");
      setMessages(snapshot);
    }
  }, [activeRoomCode, messages, handleApiError, loadMessages]);

  const openThread = useCallback((message: Message) => {
    const parentId = message.replyToId || message.id;
    setThreadParentId(parentId);
    setThreadOpen(true);
  }, []);

  const replyPreview = useCallback((replyToId: string | null) => {
    if (!replyToId) return null;
    const ref = messageById.get(replyToId);
    if (!ref) return "Replying to message";
    const label = userLabel(ref.sender);
    const excerpt = (ref.content || "").trim();
    if (!excerpt) return `Replying to ${label}`;
    return `Replying to ${label}: ${excerpt.slice(0, 48)}${excerpt.length > 48 ? "..." : ""}`;
  }, [messageById]);

  const roomPreviewText = useCallback((room: Room) => {
    const draft = draftByRoom[room.code]?.trim();
    if (draft) return `Draft: ${draft}`;
    const last = room.lastMessage?.content?.trim();
    if (last) return last;
    if (room.type === "group") return room.description?.trim() || "Group conversation";
    return room.description?.trim() || "Start a conversation";
  }, [draftByRoom]);

  const markRoomRead = useCallback(async () => {
    if (!selfUserId) return;
    const targets = filteredMessages.filter((m) => m.sender.id !== selfUserId && m.sender.clerkId !== "self" && !m.seenBy.some((s) => s.userId === selfUserId));
    try {
      await Promise.all(targets.map((m) => fetch(`/api/external-chat/messages/${m.id}/seen`, { method: "POST" }).catch(() => undefined)));
      await loadRooms({ silent: true });
      await loadMessages(activeRoomCode);
    } catch (err) {
      handleApiError(err, "Failed to mark read");
    }
  }, [selfUserId, filteredMessages, activeRoomCode, loadRooms, loadMessages, handleApiError]);

  const exportCurrentChat = useCallback(() => {
    if (!activeRoom) return;
    const lines = filteredMessages.map((m) => {
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
  }, [activeRoom, filteredMessages, isOwnMessage]);

  const cycleFontScale = useCallback(() => {
    setFontScale((prev) => (prev === "sm" ? "md" : prev === "md" ? "lg" : "sm"));
  }, []);

  const toggleArchiveRoom = useCallback(async (archive: boolean, roomCodeOverride?: string) => {
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
  }, [activeRoomCode, loadRooms, loadMessages, handleApiError, pushNotification]);

  const deleteChatForMe = useCallback(async (roomCode: string) => {
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
      pushNotification({ level: "success", title: "Chat removed", message: "This chat is deleted from your side." });
    } catch (err) {
      handleApiError(err, "Failed to delete chat for you");
    }
  }, [activeRoomCode, rooms, handleApiError, pushNotification]);

  // ============ FILE UPLOAD ============
  const uploadFileAttachment = useCallback(async (file: File) => {
    if (!file || !activeRoom) return null;
    if (!canSendInActiveRoom) {
      setError("This conversation is read-only for you.");
      return;
    }
    setUploading(true);
    try {
      const directLimit = uploadHint?.directUploadLimitBytes || 25 * 1024 * 1024;
      let attachment: { id: string; fileName: string; downloadUrl: string } | null = null;

      if (file.size > directLimit) {
        const chunkSize = Math.max(5 * 1024 * 1024, uploadHint?.recommendedChunkSizeBytes || 8 * 1024 * 1024);
        if (!uploadHint?.supportsMultipartUploads) throw new Error("Large file uploads not configured");

        const sessionResponse = await api<{ session: { id: string }; totalChunks: number; chunkSizeBytes: number; uploadMode: "multipart" }>(
          "/api/external-chat/uploads/sessions",
          {
            method: "POST",
            body: JSON.stringify({
              roomCode: activeRoom.code,
              fileName: file.name,
              mimeType: file.type || "application/octet-stream",
              totalSizeBytes: file.size,
              chunkSizeBytes: chunkSize,
            }),
          }
        );

        const parts: Array<{ partNumber: number; etag: string; sizeBytes: number }> = [];
        for (let partNumber = 1; partNumber <= sessionResponse.totalChunks; partNumber++) {
          const start = (partNumber - 1) * sessionResponse.chunkSizeBytes;
          const end = Math.min(file.size, start + sessionResponse.chunkSizeBytes);
          const chunk = file.slice(start, end);
          const uploadPart = await api<{ sessionId: string; partNumber: number; uploadUrl: string }>(
            `/api/external-chat/uploads/sessions/${sessionResponse.session.id}/parts`,
            { method: "POST", body: JSON.stringify({ partNumber }) }
          );
          const putRes = await fetch(uploadPart.uploadUrl, {
            method: "PUT",
            body: chunk,
            headers: { "Content-Type": file.type || "application/octet-stream" },
          });
          if (!putRes.ok) throw new Error(`Chunk ${partNumber} upload failed`);
          const etag = (putRes.headers.get("etag") || "").replace(/^W\//, "").replaceAll('"', "");
          parts.push({ partNumber, etag, sizeBytes: chunk.size });
        }

        const complete = await api<{ attachment?: { id: string; fileName: string; downloadUrl: string } }>(
          `/api/external-chat/uploads/sessions/${sessionResponse.session.id}/complete`,
          { method: "POST", body: JSON.stringify({ parts }) }
        );
        attachment = complete.attachment || null;
      } else {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("roomId", activeRoom.id);
        fd.append("roomCode", activeRoom.code);
        const res = await fetch("/api/external-chat/upload", { method: "POST", body: fd });
        const body = (await res.json().catch(() => ({}))) as { attachment?: { id: string; fileName: string; downloadUrl: string }; error?: string };
        if (!res.ok || !body.attachment) throw new Error(body.error || "Upload failed");
        attachment = body.attachment;
      }
      if (!attachment) throw new Error("Upload failed");
      setAttachment(attachment);
      return attachment;
    } catch (err) {
      handleApiError(err, "Upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  }, [activeRoom, canSendInActiveRoom, uploadHint, handleApiError]);

  const onFile = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFileAttachment(file);
  }, [uploadFileAttachment]);

  // ============ VOICE RECORDING ============
  const toggleRecording = useCallback(async () => {
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = preferredAudioMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];
      setRecordingMs(0);
      recorder.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) recordingChunksRef.current.push(ev.data); };
      recorder.onstop = async () => {
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
        setRecording(false);
        stream.getTracks().forEach((t) => t.stop());
        recordingStreamRef.current = null;
        const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: "audio/webm" });
        const att = await uploadFileAttachment(file);
        if (att) {
          setAttachment(att);
          setMessageType("note");
          if (!text.trim()) setText("Voice note");
        }
      };
      recorder.start();
      setRecording(true);
      recordingTimerRef.current = setInterval(() => setRecordingMs((prev) => prev + 250), 250);
    } catch (err) {
      const name = err && typeof err === "object" && "name" in err ? String((err as { name?: string }).name || "") : "";
      if (name === "NotAllowedError") setError("Microphone permission denied");
      else if (name === "NotFoundError") setError("No microphone device detected");
      else handleApiError(err, "Could not start recording");
    }
  }, [canSendInActiveRoom, recording, uploadFileAttachment, handleApiError]);

  // ============ MESSAGE SENDING ============
  const sendMessage = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!activeRoomCode || !canSendInActiveRoom) return;
    const content = text.trim();
    if (!content && !attachment) return;
    setSending(true);
    try {
      const response = await api<{ message: Message }>(`/api/external-chat/rooms/${encodeURIComponent(activeRoomCode)}/messages`, {
        method: "POST",
        body: JSON.stringify({
          content,
          type: messageType,
          replyToId,
          attachmentId: attachment?.id || null,
          noteColor: messageType === "note" ? noteColor : undefined,
          poll: messageType === "poll" ? { question: pollQuestion.trim(), options: pollOptions.filter(o => o.trim()) } : null,
        }),
      });
      setMessages(prev => [...prev, response.message]);
      setText("");
      setReplyToId(null);
      setAttachment(null);
      setMessageType("text");
      setPollQuestion("");
      setPollOptions(["", ""]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      handleApiError(err, "Failed to send message");
    } finally {
      setSending(false);
    }
  }, [activeRoomCode, canSendInActiveRoom, text, attachment, messageType, replyToId, noteColor, pollQuestion, pollOptions, handleApiError]);

  const onTextChange = useCallback((value: string) => {
    const cmd = value.trim().toLowerCase();
    if (cmd === "/poll") { setMessageType("poll"); setText(""); setMentionOpen(false); return; }
    if (cmd === "/note") { setMessageType("note"); setText(""); setMentionOpen(false); return; }
    if (cmd === "/text") { setMessageType("text"); setText(""); setMentionOpen(false); return; }
    setText(value);
    const ta = textareaRef.current;
    if (!ta) { setMentionOpen(false); return; }
    const caret = ta.selectionStart ?? value.length;
    const head = value.slice(0, caret);
    const at = head.lastIndexOf("@");
    if (at < 0) { setMentionOpen(false); return; }
    const token = head.slice(at + 1);
    if (!token || /\s/.test(token)) { setMentionOpen(false); return; }
    setMentionTerm(token);
    setMentionOpen(true);
  }, []);

  const pickMention = useCallback((user: UserRow) => {
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
  }, [text]);

  const onTextKeyDown = useCallback((e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      composerFormRef.current?.requestSubmit();
      return;
    }
    if (!mentionOpen || mentionResults.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((idx) => (idx + 1) % mentionResults.length); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((idx) => (idx - 1 + mentionResults.length) % mentionResults.length); return; }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); pickMention(mentionResults[mentionIndex] || mentionResults[0]); return; }
    if (e.key === "Escape") { e.preventDefault(); setMentionOpen(false); }
  }, [mentionOpen, mentionResults, mentionIndex, pickMention]);

  // ============ CALL FUNCTIONS ============
  const startExternalChatCall = useCallback(async (type: "audio" | "video") => {
    if (!activeRoomCode || !activeRoom) return;
    if (isCallInProgress) return;

    if (incomingCall) {
      setError("You have an incoming call. Answer or decline it first.");
      return;
    }

    setIsCallInProgress(true);

    if (activeRoom.type === "direct" && activeRoomPeer) {
      setDirectCallTarget(activeRoomPeer);
      setDirectCallType(type);
      setDirectCallOpen(true);
      setCallOverlayOpen(false);
      setIsCallInProgress(false);
      return;
    }

    try {
      setCallActionBusy(true);
      const payload = {
        roomCode: activeRoomCode,
        type,
        participantUserIds: activeRoom.members?.map((member) => member.userId) || [],
      };
      const response = await api<{ call: CallSession }>("/api/external-chat/calls", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await api(`/api/external-chat/calls/${response.call.id}/join`, { method: "POST" });
      setCallOverlayOpen(false);
      router.push(`/external-chat/calls/${encodeURIComponent(response.call.id)}`);
    } catch (err) {
      handleApiError(err, "Failed to start call");
    } finally {
      setCallActionBusy(false);
      setIsCallInProgress(false);
    }
  }, [activeRoomCode, activeRoom, activeRoomPeer, router, handleApiError, isCallInProgress, incomingCall]);

  const openCallRoom = useCallback(async (call: CallSession) => {
    try {
      setCallActionBusy(true);
      await api(`/api/external-chat/calls/${call.id}/join`, { method: "POST" });
      setCallOverlayOpen(false);
      router.push(`/external-chat/calls/${encodeURIComponent(call.id)}`);
    } catch (err) {
      handleApiError(err, "Failed to join call");
    } finally {
      setCallActionBusy(false);
    }
  }, [router, handleApiError]);

  const respondToCallSession = useCallback(async (call: CallSession, action: "accept" | "reject") => {
    try {
      setCallActionBusy(true);
      await api(`/api/external-chat/calls/${call.id}/respond`, { method: "POST", body: JSON.stringify({ action }) });
      if (action === "accept") await api(`/api/external-chat/calls/${call.id}/join`, { method: "POST" });
      await loadCallFeed();
      if (action === "accept") {
        setCallOverlayOpen(false);
        router.push(`/external-chat/calls/${encodeURIComponent(call.id)}`);
      }
    } catch (err) {
      handleApiError(err, action === "accept" ? "Failed to accept call" : "Failed to decline call");
    } finally {
      setCallActionBusy(false);
    }
  }, [router, handleApiError, loadCallFeed]);

  const endCallSession = useCallback(async (callId: string) => {
    try {
      setCallActionBusy(true);
      await api(`/api/external-chat/calls/${callId}/end`, { method: "POST" });
      await loadCallFeed();
    } catch (err) {
      handleApiError(err, "Failed to end call");
    } finally {
      setCallActionBusy(false);
    }
  }, [handleApiError, loadCallFeed]);

  // ============ HANDLE REJECT CALL ============
  const handleRejectCall = useCallback((callId: string) => {
    setRejectedCallIds(prev => new Set([...prev, callId]));
    setIncomingCall(null);
    setProcessedCallIds(prev => {
      const next = new Set(prev);
      next.delete(callId);
      return next;
    });
  }, []);

  const joinMeeting = useCallback(() => {
    const code = meetingCodeInput.trim();
    setCallOverlayOpen(false);
    if (!code) {
      if (activeRoomCode) { router.push(`/meeting/join?room=${encodeURIComponent(activeRoomCode)}`); return; }
      router.push("/meeting");
      return;
    }
    router.push(`/meeting/join?room=${encodeURIComponent(code)}`);
  }, [meetingCodeInput, activeRoomCode, router]);

  // ============ GROUP MANAGEMENT FUNCTIONS ============
  const sendRequest = useCallback(async (clerkId: string) => {
    try {
      await api("/api/external-chat/connections", { method: "POST", body: JSON.stringify({ targetClerkId: clerkId }) });
      await loadConnections();
      await loadRooms();
    } catch (e) {
      handleApiError(e, "Failed request");
    }
  }, [loadConnections, loadRooms, handleApiError]);

  const toggleGroupMember = useCallback((clerkId: string) => {
    setSelectedGroupMemberIds((prev) => prev.includes(clerkId) ? prev.filter((id) => id !== clerkId) : [...prev, clerkId]);
  }, []);

  const createGroup = useCallback(async () => {
    const name = createGroupName.trim();
    if (!name) { setError("Group name is required"); return; }
    if (selectedGroupMemberIds.length === 0) { setError("Select at least one member for the group"); return; }
    try {
      const data = await api<{ room: Room }>("/api/external-chat/rooms", {
        method: "POST",
        body: JSON.stringify({ name, type: "group", memberClerkIds: selectedGroupMemberIds }),
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
  }, [createGroupName, selectedGroupMemberIds, loadRooms, loadConnections, handleApiError, pushNotification]);

  const actRequest = useCallback(async (id: string, action: "accept" | "decline") => {
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
  }, [loadConnections, loadRooms, handleApiError]);

  const removeConnection = useCallback(async (connectionId: string) => {
    try {
      await api(`/api/external-chat/connections/${connectionId}`, { method: "DELETE" });
      setMenuOpenForRoomCode(null);
      await loadConnections();
      await loadRooms();
    } catch (e) {
      handleApiError(e, "Failed to remove connection");
    }
  }, [loadConnections, loadRooms, handleApiError]);

  const leaveActiveGroup = useCallback(async () => {
    if (!activeRoomCode) return;
    if (!window.confirm("Leave this group? You will keep chat history but cannot send or receive new messages.")) return;
    try {
      const leavingRoomCode = activeRoomCode;
      await api(`/api/external-chat/rooms/${encodeURIComponent(activeRoomCode)}/members/leave`, { method: "POST" });
      if (activeRoomCode === leavingRoomCode) { setActiveRoomCode(""); setMessages([]); }
      await loadRooms();
      pushNotification({ level: "info", title: "Left group", message: "You can still view old messages in read-only mode." });
    } catch (err) {
      handleApiError(err, "Failed to leave group");
    }
  }, [activeRoomCode, loadRooms, handleApiError, pushNotification]);

  const addSelectedMembersToActiveGroup = useCallback(async () => {
    if (!activeRoomCode) return;
    if (selectedGroupMemberIds.length === 0) { setError("Select users first"); return; }
    try {
      await api(`/api/external-chat/rooms/${encodeURIComponent(activeRoomCode)}/members`, {
        method: "POST",
        body: JSON.stringify({ memberClerkIds: selectedGroupMemberIds }),
      });
      setSelectedGroupMemberIds([]);
      await loadRooms();
      await loadMessages(activeRoomCode);
      pushNotification({ level: "success", title: "Members added" });
    } catch (err) {
      handleApiError(err, "Failed to add members");
    }
  }, [activeRoomCode, selectedGroupMemberIds, loadRooms, loadMessages, handleApiError, pushNotification]);

  const removeGroupMember = useCallback(async (targetUserId: string) => {
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
  }, [activeRoomCode, loadRooms, loadMessages, handleApiError, pushNotification]);

  const changeGroupMemberRole = useCallback(async (targetUserId: string, newRole: "admin" | "member") => {
    if (!activeRoomCode) return;
    try {
      await api(`/api/external-chat/rooms/${encodeURIComponent(activeRoomCode)}/members/manage`, {
        method: "PATCH",
        body: JSON.stringify({ action: "changeRole", targetUserId, newRole }),
      });
      await loadRooms();
      pushNotification({ level: "success", title: newRole === "admin" ? "Admin assigned" : "Admin removed" });
    } catch (err) {
      handleApiError(err, "Failed to update role");
    }
  }, [activeRoomCode, loadRooms, handleApiError, pushNotification]);

  const transferGroupOwnership = useCallback(async (targetUserId: string) => {
    if (!activeRoomCode) return;
    if (!window.confirm("Transfer ownership to this member?")) return;
    try {
      await api(`/api/external-chat/rooms/${encodeURIComponent(activeRoomCode)}/members/manage`, {
        method: "PATCH",
        body: JSON.stringify({ action: "transfer", targetUserId }),
      });
      await loadRooms();
      pushNotification({ level: "success", title: "Ownership transferred" });
    } catch (err) {
      handleApiError(err, "Failed to transfer ownership");
    }
  }, [activeRoomCode, loadRooms, handleApiError, pushNotification]);

  const deassignSelfLeadership = useCallback(async () => {
    if (!activeRoomCode) return;
    if (!window.confirm("Remove your owner/admin role and continue as a member?")) return;
    try {
      await api(`/api/external-chat/rooms/${encodeURIComponent(activeRoomCode)}/members/remove-leader`, { method: "POST" });
      await loadRooms();
      pushNotification({ level: "success", title: "Leadership removed" });
    } catch (err) {
      handleApiError(err, "Failed to deassign leadership");
    }
  }, [activeRoomCode, loadRooms, handleApiError, pushNotification]);

  const saveGroupSettings = useCallback(async () => {
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
      setGroupSettingsOpen(false);
      await loadRooms();
      pushNotification({ level: "success", title: "Group settings saved" });
    } catch (err) {
      handleApiError(err, "Failed to update group settings");
    }
  }, [activeRoomCode, groupNameDraft, groupDescriptionDraft, groupAvatarDraft, activeRoom, loadRooms, handleApiError, pushNotification]);

  const openInviteShareComposer = useCallback(async () => {
    if (!activeRoom || activeRoom.type !== "group") return;
    try {
      const data = await api<{ inviteCode: string }>(`/api/external-chat/rooms/${encodeURIComponent(activeRoom.code)}/invite`, { method: "POST" });
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const link = `${origin}/dashboard/external-chat?invite=${encodeURIComponent(data.inviteCode)}`;
      setInviteShareText(`Hey join my group: ${link}`);
      setInviteShareOpen(true);
    } catch (err) {
      handleApiError(err, "Failed to generate group invite");
    }
  }, [activeRoom, handleApiError]);

  const joinInviteGroup = useCallback(async () => {
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
  }, [inviteJoinCode, loadRooms, handleApiError, pushNotification]);

  const deleteGroupForEveryone = useCallback(async () => {
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
  }, [activeRoom, rooms, hiddenRoomCodes, handleApiError, pushNotification]);

  // ============ TOUCH HANDLERS ============
  const onConversationTouchStart = useCallback((x: number) => { swipeStartXRef.current = x; }, []);
  const onConversationTouchEnd = useCallback((x: number, roomCode: string) => {
    if (swipeStartXRef.current === null) return;
    const delta = x - swipeStartXRef.current;
    swipeStartXRef.current = null;
    if (delta < -70) {
      setStarredRoomCodes((prev) => prev.includes(roomCode) ? prev.filter((c) => c !== roomCode) : [...prev, roomCode]);
    } else if (delta > 70) {
      setMobileSidebarOpen(false);
    }
  }, []);

  const startLongPress = useCallback((messageId: string) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setActionSheetMessageId(messageId);
      setActionSheetOpen(true);
    }, 450);
  }, []);
  const clearLongPress = useCallback(() => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); }, []);

  // ============ NAVIGATION HANDLERS ============
  const handleMobileNavChange = useCallback((tab: "chats" | "status" | "calls" | "profile") => {
    if (tab === "chats") {
      setActiveMobileTabState("chats");
      setProfileSettingsOpen(false);
      setCallOverlayOpen(false);
      setMobileSidebarOpen(true);
    } else if (tab === "calls") {
      setActiveMobileTabState("calls");
      setMobileSidebarOpen(false);
      setProfileSettingsOpen(false);
      setCallOverlayOpen(true);
    } else if (tab === "status") {
      setActiveMobileTabState("status");
      setMobileSidebarOpen(false);
      setProfileSettingsOpen(false);
      setCallOverlayOpen(false);
    } else {
      setActiveMobileTabState("profile");
      setMobileSidebarOpen(false);
      setCallOverlayOpen(false);
      setProfileSettingsOpen(true);
    }
  }, []);

  const handleDesktopNavChange = useCallback((tab: "chats" | "calls" | "status" | "profile") => {
    setActiveDesktopTabState(tab);
    if (tab === "calls") {
      setCallOverlayOpen(true);
    } else {
      setCallOverlayOpen(false);
    }
    setProfileSettingsOpen(tab === "profile");
    setMobileSidebarOpen(false);
  }, []);

  // ============ SETUP REQUIRED SCREEN ============
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
          <div className="rounded-xl border border-amber-500/20 bg-background/40 p-4 text-sm text-amber-50">{error}</div>
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

  // ============ MAIN RENDER ============
  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      {/* Desktop Layout */}
      <div className="hidden md:flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Navigation Rail */}
        <nav className="flex w-16 flex-col items-center border-r border-border bg-background/60 backdrop-blur flex-shrink-0">
          <div className="flex h-full flex-col items-center gap-2 py-3">
            <button type="button" onClick={() => handleDesktopNavChange("chats")}
              className={`w-10 rounded-2xl px-0 py-3 text-xs transition ${activeDesktopTabState === "chats" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent/60"}`}>
              <MessageSquare className="mx-auto h-4 w-4" />
            </button>
            <button type="button" onClick={() => handleDesktopNavChange("status")}
              className={`w-10 rounded-2xl px-0 py-3 text-xs transition relative ${activeDesktopTabState === "status" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent/60"}`}>
              <Camera className="mx-auto h-4 w-4" />
              {statuses.filter(s => !s.viewedByViewer && s.userId !== selfUserId).length > 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-500" />
              )}
            </button>
            <button type="button" onClick={() => handleDesktopNavChange("calls")}
              className={`w-10 rounded-2xl px-0 py-3 text-xs transition ${activeDesktopTabState === "calls" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent/60"}`}>
              <Phone className="mx-auto h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDesktopNavChange("profile")}
              className={`w-10 rounded-2xl px-0 py-3 text-xs transition ${activeDesktopTabState === "profile" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent/60"}`}
            >
              <UserRound className="mx-auto h-4 w-4" />
            </button>
          </div>
        </nav>

        {/* Chats Sidebar */}
        {activeDesktopTabState === "chats" && (
          <aside className="flex w-80 flex-col border-r border-border flex-shrink-0">
            <div className="flex h-full flex-col overflow-y-auto p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <p className="text-sm font-semibold">Conversations</p>
                </div>
                <ThemeToggle />
              </div>

              <div className="mb-3 rounded-lg border border-border/70 bg-muted/25 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 overflow-hidden rounded-full border border-border/70 bg-primary/15">
                      <UserAvatar user={selfUser || { id: "self", clerkId: "self", name: "You", email: null, imageUrl: profileImageUrl }}
                        className="h-full w-full object-cover" fallbackClassName="flex h-full w-full items-center justify-center text-xs font-semibold text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">My Profile</p>
                      <p className="text-[11px] text-muted-foreground">Account & preferences</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleDesktopNavChange("profile")}>
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mb-3 space-y-2 rounded-lg border border-border/70 bg-muted/35 p-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users..." />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setCreateGroupOpen(true)}>
                    <PlusCircle className="mr-1 h-4 w-4" /> Group
                  </Button>
                </div>
                <div className="max-h-36 space-y-1 overflow-y-auto">
                  {searching && <p className="text-xs text-muted-foreground">Searching...</p>}
                  {results.map((u) => (
                    <div key={u.id} className="flex items-center justify-between rounded-md border border-border/70 bg-card/65 px-2 py-1.5">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{userLabel(u)}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{u.email || "No email provided"}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant={selectedGroupMemberIds.includes(u.clerkId) ? "default" : "outline"} onClick={() => toggleGroupMember(u.clerkId)}>
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => sendRequest(u.clerkId)}>
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedGroupMemberIds.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">{selectedGroupMemberIds.length} selected for group creation</p>
                )}
              </div>

              <SidebarFilterTabs active={filterTab} onChange={setFilterTab} />

              <div className="mb-3 rounded-md border border-border/70 bg-muted/25 p-2">
                <p className="mb-1 text-xs font-semibold">Incoming Requests</p>
                <div className="max-h-28 space-y-1 overflow-y-auto">
                  {incoming.length === 0 && <p className="text-[11px] text-muted-foreground">No pending requests</p>}
                  {incoming.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded border border-border/70 px-2 py-1">
                      <p className="truncate text-xs">{userLabel(r.sender)}</p>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => actRequest(r.id, "accept")}><Check className="h-4 w-4 text-emerald-600" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => actRequest(r.id, "decline")}><X className="h-4 w-4 text-red-600" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-3 rounded-md border border-border/70 bg-muted/25 p-2">
                <p className="mb-1 text-xs font-semibold">Starred Messages</p>
                <div className="max-h-28 space-y-1 overflow-y-auto">
                  {bookmarkedMessages.length === 0 && <p className="text-[11px] text-muted-foreground">No starred messages</p>}
                  {bookmarkedMessages.slice(-3).reverse().map((m) => (
                    <button key={`sidebar-starred-${m.id}`} type="button" onClick={() => scrollToMessageById(m.id)}
                      className="w-full rounded border border-border/70 px-2 py-1 text-left hover:bg-accent/60">
                      <p className="line-clamp-2 text-xs">{m.content || "Attachment"}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {loadingRooms ? <ChatListSkeleton /> : null}
                {filteredRooms.map((room) => {
                  const starred = starredRoomCodes.includes(room.code);
                  const preview = roomPreviewText(room);
                  return (
                    <div key={room.id} role="button" tabIndex={0} onClick={() => setActiveRoomCode(room.code)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveRoomCode(room.code); } }}
                      className={`chat-row-hover w-full cursor-pointer rounded-[1.45rem] border px-3 py-3 text-left transition-all ${activeRoomCode === room.code ? "chat-row-active shadow-sm" : "border-border/70"}`}>
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-primary/15 text-sm font-semibold text-primary">
                            {roomAvatarImage(room, selfUserId) ? (
                              <NextImage src={roomAvatarImage(room, selfUserId) || ""} alt={room.name} width={48} height={48} unoptimized className="h-full w-full object-cover" />
                            ) : (room.name || "DM").slice(0, 2).toUpperCase()}
                          </div>
                          <OnlineDot />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{room.name}</p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {room.type === "group" ? "Group" : "Direct"} chat{room.archivedAt ? " · Archived" : ""}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <span className="text-[11px] text-muted-foreground">{compactDateTime(room.lastMessage?.createdAt || null)}</span>
                              <button type="button" onClick={(e) => { e.stopPropagation(); setStarredRoomCodes((prev) => prev.includes(room.code) ? prev.filter((c) => c !== room.code) : [...prev, room.code]); }}
                                className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                                <Pin className={`h-3.5 w-3.5 ${starred ? "text-amber-500" : ""}`} />
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <p className={`line-clamp-2 min-w-0 text-[13px] text-muted-foreground`}>{preview}</p>
                            {room.unreadCount > 0 && (
                              <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">{room.unreadCount}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {archivedRooms.length > 0 && (
                  <div className="mt-3 rounded-lg border border-border/70 bg-muted/20 p-2">
                    <button type="button" className="mb-2 flex w-full items-center justify-between text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground" onClick={() => setArchivedOpen((v) => !v)}>
                      <span>Archived</span>
                      <ChevronRight className={`h-3.5 w-3.5 transition ${archivedOpen ? "rotate-90" : ""}`} />
                    </button>
                    {archivedOpen && archivedRooms.map((room) => {
                      const role = room.viewerMembership?.role;
                      const canUnarchive = role === "owner" || role === "admin";
                      return (
                        <div key={`archived-${room.id}`} className="rounded-md border border-border/70 bg-card/50 p-2 mb-1">
                          <button type="button" onClick={() => setActiveRoomCode(room.code)} className="w-full text-left">
                            <p className="truncate text-sm font-medium">{room.name}</p>
                            <p className="text-[11px] text-muted-foreground">Read-only archived chat</p>
                          </button>
                          <div className="mt-2 flex items-center gap-1">
                            {canUnarchive && <Button size="sm" variant="outline" onClick={() => toggleArchiveRoom(false, room.code)}>Unarchive</Button>}
                            <Button size="sm" variant="ghost" onClick={() => deleteChatForMe(room.code)}><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete For Me</Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* CHATS TAB */}
          {activeDesktopTabState === "chats" && activeRoom && (
            <main className="flex-1 flex flex-col min-h-0 bg-background">
              <div className="flex h-full flex-col">
                {/* Chat Header */}
                <div className="sticky top-0 z-10 border-b border-border/60 bg-background/85 px-3 py-3 backdrop-blur flex-shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-xs font-semibold text-primary">
                          {roomAvatarImage(activeRoom, selfUserId) ? (
                            <NextImage src={roomAvatarImage(activeRoom, selfUserId) || ""} alt={activeRoom.name} width={36} height={36} unoptimized className="h-full w-full object-cover" />
                          ) : (activeRoom.name || "CH").slice(0, 2).toUpperCase()}
                        </div>
                        <OnlineDot />
                      </div>
                      <div>
                        <p className="text-base font-semibold md:text-lg">{activeRoom.name}</p>
                        <p className="text-[11px] text-muted-foreground md:text-xs">{activeRoomSubtitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="hidden rounded-2xl sm:inline-flex" onClick={() => router.push("/dashboard")}>
                        <LayoutDashboard className="mr-1 h-4 w-4" /> Dashboard
                      </Button>
                      <div className="relative">
                        <Button size="sm" variant="outline" onClick={() => setNotificationsOpen((v) => !v)}>
                          <Bell className="h-4 w-4" />
                        </Button>
                        {inAppNotifications.length > 0 && (
                          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                            {inAppNotifications.length > 9 ? "9+" : inAppNotifications.length}
                          </span>
                        )}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setCallOverlayOpen(true)}><Phone className="h-4 w-4" /></Button>
                      {activeRoom && (
                        <div className="relative">
                          <Button size="sm" variant="outline" onClick={() => setMenuOpenForRoomCode((p) => p === activeRoom.code ? null : activeRoom.code)}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                          {menuOpenForRoomCode === activeRoom.code && (
                            <div className="absolute right-0 z-20 mt-1 w-56 rounded-md border border-border bg-card p-1 shadow-lg">
                              <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { setCallOverlayOpen(true); setMenuOpenForRoomCode(null); }}><Phone className="h-4 w-4" /> Start Call</button>
                              <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { if (firstUnreadMessageId) scrollToMessageById(firstUnreadMessageId); setMenuOpenForRoomCode(null); }}><ChevronRight className="h-4 w-4" /> Go to Unread</button>
                              <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { markRoomRead(); setMenuOpenForRoomCode(null); }}><CheckCheck className="h-4 w-4" /> Mark Read</button>
                              <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { setPinnedOnly((v) => !v); setMenuOpenForRoomCode(null); }}><Pin className="h-4 w-4" /> {pinnedOnly ? "Show All Messages" : "Show Pinned Only"}</button>
                              <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { setCompactMode((v) => !v); setMenuOpenForRoomCode(null); }}><Type className="h-4 w-4" /> {compactMode ? "Switch to Cozy" : "Switch to Compact"}</button>
                              <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { cycleFontScale(); setMenuOpenForRoomCode(null); }}><Type className="h-4 w-4" /> Font Size ({fontScale.toUpperCase()})</button>
                              <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { exportCurrentChat(); setMenuOpenForRoomCode(null); }}><Download className="h-4 w-4" /> Export Chat</button>
                              <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { setHelpOpen(true); setMenuOpenForRoomCode(null); }}><HelpCircle className="h-4 w-4" /> Help & Shortcuts</button>
                              {activeRoom?.type !== "group" && <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { setMenuOpenForRoomCode(null); handleDesktopNavChange("profile"); }}><Settings2 className="h-4 w-4" /> Profile Settings</button>}
                              {activeRoom?.type === "group" && <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { setMenuOpenForRoomCode(null); openInviteShareComposer(); }}><UserPlus className="h-4 w-4" /> Share Invite</button>}
                              {activeRoom?.type === "group" && <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { setMenuOpenForRoomCode(null); setGroupSettingsOpen(true); }}><Settings2 className="h-4 w-4" /> Group Settings</button>}
                              <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { setNotificationSoundOn((v) => !v); setMenuOpenForRoomCode(null); }}><Bell className="h-4 w-4" /> {notificationSoundOn ? "Mute Alerts" : "Unmute Alerts"}</button>
                              <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { setPrivacyModeOn((v) => !v); setMenuOpenForRoomCode(null); }}><Shield className="h-4 w-4" /> {privacyModeOn ? "Disable Privacy" : "Enable Privacy"}</button>
                              {activeRoom?.type === "direct" && <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { const c = connections.find((x) => x.directRoom.code === activeRoom.code); if (c) removeConnection(c.id); }}><UserX className="h-4 w-4 text-red-600" /> Remove Connection</button>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {notificationsOpen && (
                    <div className="mt-2 rounded-md border border-border/70 bg-card/95 p-2 shadow-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notifications</p>
                        {inAppNotifications.length > 0 && <button className="text-[11px] text-muted-foreground underline" onClick={() => setInAppNotifications([])}>Clear all</button>}
                      </div>
                      <div className="max-h-40 space-y-1 overflow-y-auto">
                        {inAppNotifications.length === 0 && <p className="text-xs text-muted-foreground">No notifications</p>}
                        {inAppNotifications.map((item) => (
                          <div key={item.id} className={`rounded border px-2 py-1.5 text-xs ${item.level === "error" ? "border-red-500/30 bg-red-500/10" : item.level === "success" ? "border-emerald-500/30 bg-emerald-500/10" : "border-border/70 bg-muted/25"}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div><p className="font-medium">{item.title}</p>{item.message && <p className="text-muted-foreground">{item.message}</p>}</div>
                              <button onClick={() => setInAppNotifications(prev => prev.filter(n => n.id !== item.id))}><X className="h-3.5 w-3.5" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input ref={searchInputRef} className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search messages..." />
                  </div>

                  {search.trim() && (
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/25 px-2 py-1.5">
                      <p className="text-xs text-muted-foreground">{messageMatches.length ? `${messageSearchIndex + 1}/${messageMatches.length} matches` : "No matches"}</p>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => jumpMatch(-1)} disabled={!messageMatches.length}><ChevronLeft className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => jumpMatch(1)} disabled={!messageMatches.length}><ChevronRight className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  )}

                  {pinnedMessages.length > 0 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {pinnedMessages.map((m) => (
                        <button key={`pin-${m.id}`} onClick={() => scrollToMessageById(m.id)} className="inline-flex max-w-[220px] shrink-0 items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-1 text-xs hover:bg-amber-500/20">
                          <Pin className="h-3 w-3 text-amber-500" />
                          <span className="truncate">{m.content || "Pinned attachment"}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Bars */}
                {!networkOnline && <div className="border-t border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">You are offline. Messages will sync once connection returns.</div>}
                {networkOnline && !realtimeConnected && <div className="border-t border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">Realtime disconnected. Reconnecting…</div>}
                {error && (
                  <div className="flex items-center justify-between gap-2 border-t border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    <span>{error}</span>
                    <button onClick={() => setError("")} className="rounded px-1 hover:bg-destructive/15">Dismiss</button>
                  </div>
                )}

                {/* Message List */}
                <div ref={messageListRef} className="flex-1 overflow-y-auto px-3 py-3 md:px-4"
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
                    if (el.scrollTop < 120 && messagesHasMore && !loadingOlderMessages) loadOlderMessages();
                    if (nearBottom) setPendingNewCount(0);
                  }}>
                  {messagesHasMore && (
                    <div className="mb-3 flex justify-center">
                      <Button size="sm" variant="outline" onClick={() => loadOlderMessages()} disabled={loadingOlderMessages}>
                        {loadingOlderMessages && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                        {loadingOlderMessages ? "Loading older..." : "Load older messages"}
                      </Button>
                    </div>
                  )}
                  {loadingMessages ? <MessageSkeleton /> : null}
                  {!loadingMessages && filteredMessages.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">No messages yet. Send a message to start the conversation.</p>}
                  <div className="space-y-3">
                    {visibleTimelineItems.map((item) => {
                      if (item.kind === "day") {
                        return (
                          <div key={item.key} className="sticky top-2 z-[1] my-3 flex items-center justify-center">
                            <span className="rounded-full border border-border/70 bg-background/90 px-3 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur">{item.label}</span>
                          </div>
                        );
                      }
                      if (item.kind === "unread") {
                        return (
                          <div key={item.key} className="my-2 flex items-center gap-2">
                            <div className="h-px flex-1 bg-primary/40" />
                            <span className="text-[11px] font-medium text-primary">Unread</span>
                            <div className="h-px flex-1 bg-primary/40" />
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
                          <article ref={(node) => { messageNodeRefs.current[m.id] = node; }}
                            className={`group inline-flex h-auto w-auto max-w-[85%] flex-col items-start rounded-[1.35rem] border ${compactMode ? "p-2.5" : "p-3"} transition md:max-w-[65%] ${m.type === "note" ? noteColorClass : own ? "border-primary/35 bg-primary/12" : "border-border/70 bg-card/35"} ${messageMatches[messageSearchIndex] === m.id ? "ring-2 ring-amber-400/70" : ""}`}>
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 overflow-hidden rounded-full border border-border/70 bg-primary/15">
                                  <UserAvatar user={m.sender} className="h-full w-full object-cover" fallbackClassName="flex h-full w-full items-center justify-center text-[10px] font-semibold text-primary" />
                                </div>
                                <p className="text-xs font-semibold">{own ? "You" : userLabel(m.sender)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {m.optimistic && <span className="text-[10px] text-amber-500">Sending...</span>}
                                {m.failed && <span className="text-[10px] text-red-500">Failed</span>}
                                <p className="text-[11px] text-muted-foreground">{formatTimeLabel(m.createdAt)}</p>
                              </div>
                            </div>
                            {m.replyToId && (
                              <div className="mb-2 max-w-full rounded-md border border-border/60 bg-muted/35 px-2 py-1.5">
                                <div className="mb-0.5 border-l-2 border-primary pl-2">
                                  <p className="text-[11px] font-semibold text-primary">{messageById.get(m.replyToId)?.sender ? userLabel(messageById.get(m.replyToId)!.sender) : "Reply"}</p>
                                  <p className="line-clamp-1 text-[11px] text-muted-foreground">{messageById.get(m.replyToId)?.content || replyText || "Message"}</p>
                                </div>
                              </div>
                            )}
                            <p className={`${messageTextClass} whitespace-pre-wrap break-words`}>{renderMessageContent(m.content, search)}</p>
                            {m.attachment && (isImageAttachment(m.attachment) ? (
                              <button onClick={() => setLightboxImage({ src: m.attachment!.downloadUrl, alt: m.attachment!.fileName })} className="mt-2 block overflow-hidden rounded-md border border-border/70">
                                <NextImage src={m.attachment.downloadUrl} alt={m.attachment.fileName} width={1024} height={768} unoptimized className="max-h-72 w-full object-cover" />
                              </button>
                            ) : isAudioAttachment(m.attachment) ? (
                              <div className="mt-2 rounded-md border border-border/70 bg-muted/25 p-2">
                                <p className="mb-1 text-xs font-medium">{m.attachment.fileName}</p>
                                <audio controls className="w-full"><source src={m.attachment.downloadUrl} /></audio>
                                {m.attachment.transcript && <p className="mt-2 rounded-md bg-background/70 px-2 py-1 text-[11px] text-muted-foreground">{m.attachment.transcript}</p>}
                              </div>
                            ) : (
                              <a href={m.attachment.downloadUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs underline"><FileImage className="h-3.5 w-3.5" /> {m.attachment.fileName}</a>
                            ))}
                            {(() => {
                              const url = firstUrl(m.content);
                              const preview = url ? linkPreviews[url] : null;
                              if (!url || !preview) return null;
                              return (
                                <a href={preview.url} target="_blank" rel="noreferrer" className="mt-2 block rounded-md border border-border/70 bg-muted/20 p-2 hover:bg-accent/50">
                                  <p className="text-xs font-semibold">{preview.title}</p>
                                  {preview.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{preview.description}</p>}
                                  <p className="mt-1 text-[11px] text-muted-foreground">{preview.siteName || new URL(preview.url).hostname}</p>
                                </a>
                              );
                            })()}
                            {reactionsAgg.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {reactionsAgg.map((r) => (<span key={`${m.id}-${r.emoji}`} className="rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-xs">{r.emoji} {r.count}</span>))}
                              </div>
                            )}
                            {poll && (
                              <div className="mt-2 rounded-md border border-border/70 bg-muted/40 p-2">
                                <p className="mb-1 text-xs font-semibold">{poll.question}</p>
                                <p className="mb-2 text-[11px] text-muted-foreground">{(poll.options || []).reduce((sum, option) => sum + (option.voters || []).length, 0)} vote(s)</p>
                                <div className="space-y-1">
                                  {(poll.options || []).map((o, idx) => {
                                    const totalVotes = Math.max(1, (poll.options || []).reduce((sum, option) => sum + (option.voters || []).length, 0));
                                    const optionVotes = (o.voters || []).length;
                                    const percent = Math.min(100, Math.round((optionVotes / totalVotes) * 100));
                                    const fill = percent >= 60 ? "rgba(34,197,94,0.18)" : percent >= 35 ? "rgba(56,189,248,0.16)" : "rgba(148,163,184,0.14)";
                                    return (
                                      <button key={`${m.id}-poll-${o.id || idx}`} onClick={() => mutateMessage(m.id, { pollVoteOptionId: o.id })} className="mx-auto grid min-h-9 w-[96%] grid-cols-[minmax(0,1fr)_2.25rem] items-start gap-2 rounded border border-border px-2.5 py-1.5 text-xs hover:bg-accent" style={{ backgroundImage: `linear-gradient(90deg, ${fill} ${percent}%, transparent ${percent}%)` }}>
                                        <span className="min-w-0 whitespace-normal break-words text-left leading-5">{o.text}</span>
                                        <span className="pt-0.5 text-right tabular-nums">{optionVotes}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            <div className="mt-2 flex items-center justify-between gap-2 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                              <div className="flex items-center gap-1">
                                {m.editedAt && <span className="text-[11px] text-muted-foreground">(edited)</span>}
                                {messageStatus(m)}
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="relative">
                                  <Button size="sm" variant="ghost" onClick={() => setMessageMenuOpenId((cur) => (cur === m.id ? null : m.id))}><MoreVertical className="h-4 w-4" /></Button>
                                  {messageMenuOpenId === m.id && (
                                    <div className={`absolute z-30 mt-1 w-48 max-w-[min(18rem,calc(100vw-2rem))] rounded-md border border-border bg-card p-1 shadow-lg ${own ? "right-0 bottom-full mb-1 origin-bottom-right" : "left-0 bottom-full mb-1 origin-bottom-left"}`}>
                                      <div className="mb-1 flex flex-wrap gap-1 px-1 py-1">
                                        {REACTIONS.map((emoji) => (<button key={`${m.id}-menu-${emoji}`} onClick={() => api(`/api/external-chat/messages/${m.id}/reactions`, { method: "POST", body: JSON.stringify({ emoji }) }).then(() => loadMessages(activeRoomCode)).finally(() => setMessageMenuOpenId(null)).catch((e) => setError(e instanceof Error ? e.message : "Reaction failed"))} className="rounded-full border border-border px-2 py-0.5 text-xs hover:bg-accent">{emoji}</button>))}
                                      </div>
                                      <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { setReplyToId(m.id); setMessageMenuOpenId(null); }}><Reply className="h-4 w-4" /> Reply</button>
                                      <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { openThread(m); setMessageMenuOpenId(null); }}><ChevronRight className="h-4 w-4" /> Thread</button>
                                      <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { toggleBookmark(m.id); setMessageMenuOpenId(null); }}>{bookmarkedMessageIds.includes(m.id) ? <StarOff className="h-4 w-4 text-amber-500" /> : <Star className="h-4 w-4" />} {bookmarkedMessageIds.includes(m.id) ? "Unstar" : "Star"}</button>
                                      <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { copyMessageContent(m); setMessageMenuOpenId(null); }}>Copy Message</button>
                                      <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { mutateMessage(m.id, { pinned: !Boolean(m.pinnedAt) }); setMessageMenuOpenId(null); }}>{m.pinnedAt ? "Unpin" : "Pin"}</button>
                                      <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { const next = window.prompt("Edit message", m.content); if (next !== null) mutateMessage(m.id, { content: next }); setMessageMenuOpenId(null); }}>Edit</button>
                                      <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm text-red-600 hover:bg-accent" onClick={() => { deleteMessage(m.id); setMessageMenuOpenId(null); }}>Delete</button>
                                    </div>
                                  )}
                                </div>
                                {m.failed && <Button size="sm" variant="outline" onClick={() => retryOptimisticMessage(m.id)}>Retry</Button>}
                                <span className="text-[11px] text-muted-foreground">Seen by {m.seenBy.length}</span>
                                {m.seenBy.length > 0 && (
                                  <div className="ml-1 flex items-center -space-x-1">
                                    {m.seenBy.slice(0, 3).map((s) => (
                                      <span key={`${m.id}-seen-${s.userId}`} className="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-background bg-primary/20 text-[10px] font-semibold" title={userLabel(s.user || { name: null, email: null })}>
                                        <UserAvatar user={s.user} className="h-full w-full object-cover" fallbackClassName="flex h-full w-full items-center justify-center text-[10px] font-semibold" />
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </article>
                        </div>
                      );
                    })}
                  </div>
                  {pendingNewCount > 0 && (
                    <div className="pointer-events-none sticky bottom-3 mt-2 flex justify-center">
                      <Button size="sm" className="pointer-events-auto rounded-full shadow-lg" onClick={scrollToLatest}>{pendingNewCount} new message{pendingNewCount > 1 ? "s" : ""} · jump</Button>
                    </div>
                  )}
                </div>

                {/* Read-only Notice */}
                {!canSendInActiveRoom && activeRoom && (
                  <div className="border-t border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                    {isFormerMemberInActiveRoom ? "You can view previous messages, but cannot send or receive new messages in this group." : activeRoom.archivedAt ? "This conversation is archived and currently read-only." : "This conversation is read-only for your account."}
                  </div>
                )}

                {/* Message Composer */}
                <form ref={composerFormRef} onSubmit={sendMessage} className="border-t border-border/60 bg-background/88 px-3 py-3 backdrop-blur flex-shrink-0">
                  {pendingMessage && (
                    <div className="mb-2 flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs">
                      <span>Message ready to send. Undo?</span>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => {
                          if (pendingMessage.timeoutId) clearTimeout(pendingMessage.timeoutId);
                          setMessages((prev) => prev.filter((m) => m.id !== pendingMessage.tempId));
                          setPendingMessage(null);
                        }}>Undo</Button>
                        <Button type="button" size="sm" variant="default" onClick={() => {
                          if (pendingMessage.timeoutId) clearTimeout(pendingMessage.timeoutId);
                          setPendingMessage(null);
                        }}>Send Now</Button>
                      </div>
                    </div>
                  )}
                  {replying && (
                    <div className="mb-2 flex items-start justify-between gap-2 rounded-md border border-primary/25 bg-primary/8 px-2 py-1.5">
                      <div className="flex min-w-0 flex-1 items-start gap-2">
                        <span className="mt-0.5 h-8 w-1 rounded bg-primary" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-primary">{userLabel(replying.sender)}</p>
                          <p className="truncate text-xs text-muted-foreground">{replying.content.slice(0, 90)}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setReplyToId(null)} className="text-xs underline">Cancel</button>
                    </div>
                  )}
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
                  {uploadHint && <p className="mb-2 text-[11px] text-muted-foreground">Direct uploads: {formatBytes(uploadHint.directUploadLimitBytes)}. Large files use multipart uploads up to {formatBytes(uploadHint.maxMultipartUploadBytes)}.</p>}
                  {attachment && <div className="mb-2 rounded-md border border-border px-2 py-1 text-xs">Attached: {attachment.fileName}<button type="button" onClick={() => setAttachment(null)} className="ml-2 underline">Remove</button></div>}
                  {messageType === "poll" && (
                    <div className="mb-2 space-y-2 rounded-md border border-border bg-muted/30 p-2">
                      <div className="flex items-center gap-2 text-xs font-medium"><Vote className="h-4 w-4" />Poll builder</div>
                      <Input value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="Poll question" />
                      {pollOptions.map((opt, i) => (<Input key={`opt-${i}`} value={opt} onChange={(e) => setPollOptions((p) => p.map((x, idx) => (idx === i ? e.target.value : x)))} placeholder={`Option ${i + 1}`} />))}
                      <Button type="button" size="sm" variant="outline" onClick={() => setPollOptions((p) => [...p, ""])} disabled={!canSendInActiveRoom}>Add option</Button>
                    </div>
                  )}
                  {messageType === "note" && (
                    <div className="mb-2 rounded-md border border-border bg-muted/30 p-2">
                      <p className="mb-2 text-xs font-semibold">Note Bubble Color</p>
                      <div className="flex flex-wrap gap-2">
                        {NOTE_COLORS.map((entry) => (<button key={`note-color-${entry.id}`} type="button" onClick={() => setNoteColor(entry.id)} className={`rounded-full border px-2.5 py-1 text-xs ${entry.className} ${noteColor === entry.id ? "ring-2 ring-primary/60" : ""}`} disabled={!canSendInActiveRoom}>{entry.label}</button>))}
                      </div>
                    </div>
                  )}
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {["👍", "❤️", "😂", "🔥", "🙏"].map((emoji) => (<button key={`quick-${emoji}`} type="button" onClick={() => setText((prev) => `${prev}${prev ? " " : ""}${emoji}`)} disabled={!canSendInActiveRoom} className="rounded-full border border-border/70 px-2 py-0.5 text-xs hover:bg-accent">{emoji}</button>))}
                    </div>
                    <span className="text-[11px] text-muted-foreground">{activeRoomCode && draftByRoom[activeRoomCode] ? "Draft saved" : "Use /poll /note /text"}</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <Button type="button" variant={recording ? "destructive" : "ghost"} size="icon" className={`shrink-0 transition ${recording ? "animate-pulse" : ""}`} onClick={() => toggleRecording()} disabled={!canSendInActiveRoom}><Mic className="h-4 w-4" /></Button>
                    <div className="relative flex-1">
                      <Textarea ref={textareaRef} value={text} onChange={(e) => onTextChange(e.target.value)} onKeyDown={onTextKeyDown} className="min-h-[54px] max-h-40 rounded-[1.4rem] border-border/60 bg-background/90 px-4 py-3" placeholder="Type message. Use @username for mentions." disabled={!canSendInActiveRoom} />
                      {mentionOpen && (
                        <div className="absolute bottom-[calc(100%+6px)] left-0 right-0 z-20 max-h-44 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg">
                          {mentionLoading && <p className="px-2 py-1 text-xs text-muted-foreground">Searching...</p>}
                          {!mentionLoading && mentionResults.length === 0 && <p className="px-2 py-1 text-xs text-muted-foreground">No matches</p>}
                          {mentionResults.map((u, i) => (<button key={`mention-${u.id}`} type="button" onClick={() => pickMention(u)} onMouseEnter={() => setMentionIndex(i)} className={`flex w-full items-center justify-between rounded px-2 py-1 text-left ${mentionIndex === i ? "bg-accent" : "hover:bg-accent"}`}><span className="text-xs font-medium">{userLabel(u)}</span><span className="text-[11px] text-muted-foreground">@{mentionToken(u)}</span></button>))}
                        </div>
                      )}
                    </div>
                    <Button type="submit" disabled={sending || uploading || !activeRoomCode || !canSendInActiveRoom} className="h-12 rounded-2xl px-4 transition-transform duration-150 active:scale-95">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
                  </div>
                  {recording && (
                    <div className="mt-2 flex items-center justify-between rounded-md border border-red-500/35 bg-red-500/10 px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        {[0, 1, 2, 3, 4].map((i) => (<span key={`wave-${i}`} className="block w-1 rounded bg-red-500 animate-pulse" style={{ height: `${8 + (i % 3) * 4}px`, animationDelay: `${i * 0.12}s` }} />))}
                        <span className="text-xs text-red-700 dark:text-red-300">Recording {formatDuration(recordingMs)}</span>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={() => mediaRecorderRef.current?.stop()}>Stop</Button>
                    </div>
                  )}
                </form>
              </div>
            </main>
          )}

          {/* STATUS TAB */}
          {activeDesktopTabState === "status" && (
            <div className="flex-1 flex flex-col bg-background overflow-hidden">
              <div className="sticky top-0 z-10 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Status</h2>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <StatusTabContent
                  userId={selfUserId || ""}
                  onViewStatus={(status, index, allStatuses) => {
                    setStatusViewerStatuses(allStatuses);
                    setStatusViewerIndex(index);
                    setStatusViewerOpen(true);
                  }}
                />
              </div>
            </div>
          )}

          {/* CALLS TAB */}
          {activeDesktopTabState === "calls" && (
            <div className="flex-1 flex flex-col bg-background overflow-hidden">
              <div className="sticky top-0 z-10 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Calls</h2>
                  <Button size="sm" variant="outline" onClick={() => setCallOverlayOpen(true)}>New Call</Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {callLoading && !callFeed && <div className="text-sm text-muted-foreground">Loading calls...</div>}
                {!callLoading && !callFeed && <div className="text-sm text-muted-foreground">No calls yet.</div>}
                {callFeed?.sessions && (() => {
                  const sortedSessions = [...callFeed.sessions].sort((a, b) =>
                    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
                  );

                  const activeCalls = sortedSessions.filter(c => c.status === "active" || c.status === "ringing");
                  const pastCalls = sortedSessions.filter(c => c.status !== "active" && c.status !== "ringing");

                  return (
                    <div className="space-y-6">
                      {activeCalls.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-2">Active</h3>
                          <div className="space-y-2">
                            {activeCalls.map((call) => (
                              <button
                                key={call.id}
                                onClick={() => openCallRoom(call)}
                                className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-left hover:bg-accent/50 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                      {call.type === "video" ? <Video className="h-5 w-5 text-emerald-500" /> : <Phone className="h-5 w-5 text-emerald-500" />}
                                    </div>
                                    <div>
                                      <p className="font-semibold">{call.type === "video" ? "Video Call" : "Audio Call"}</p>
                                      <p className="text-xs text-muted-foreground">{call.status === "active" ? "In progress" : "Ringing..."} • {new Date(call.startedAt).toLocaleTimeString()}</p>
                                    </div>
                                  </div>
                                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {pastCalls.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-2">Recent</h3>
                          <div className="space-y-2">
                            {pastCalls.slice(0, 20).map((call) => {
                              const isMissed = call.status === "missed";
                              const isDeclined = call.status === "declined";
                              const isOutgoing = call.startedBy === selfUserId;
                              const statusIcon = isMissed ? "❌" : isDeclined ? "🚫" : isOutgoing ? "📞" : "📞";
                              const statusColor = isMissed ? "text-red-500" : isDeclined ? "text-orange-500" : "text-muted-foreground";
                              const duration = call.durationSeconds ? `${Math.floor(call.durationSeconds / 60)}:${(call.durationSeconds % 60).toString().padStart(2, "0")}` : null;
                              return (
                                <button key={call.id} onClick={() => openCallRoom(call)} className="w-full rounded-xl border border-border/70 bg-card/50 p-3 text-left hover:bg-accent/50 transition-colors">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded-full bg-muted/30 flex items-center justify-center">
                                        {call.type === "video" ? <Video className="h-5 w-5 text-muted-foreground" /> : <Phone className="h-5 w-5 text-muted-foreground" />}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2"><p className="font-semibold">{call.type === "video" ? "Video Call" : "Audio Call"}</p><span className={`text-xs ${statusColor}`}>{statusIcon} {call.status}</span></div>
                                        <p className="text-xs text-muted-foreground">{new Date(call.startedAt).toLocaleDateString()} at {new Date(call.startedAt).toLocaleTimeString()}{duration && ` • ${duration}`}</p>
                                        <p className="text-xs text-muted-foreground">{call.participants.length} participant(s)</p>
                                      </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* PROFILE TAB */}
          {activeDesktopTabState === "profile" && (
            <div className="flex-1 flex flex-col bg-background overflow-hidden">
              <div className="sticky top-0 z-10 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Profile</h2>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="h-24 w-24 overflow-hidden rounded-full border border-border/70 bg-primary/15">
                      <UserAvatar user={selfUser || { id: "self", clerkId: "self", name: "You", email: null, imageUrl: profileImageUrl }} className="h-full w-full object-cover" fallbackClassName="flex h-full w-full items-center justify-center text-2xl font-semibold text-primary" />
                    </div>
                    <input ref={profileImageInputRef} type="file" accept="image/*" className="hidden" onChange={onProfileImageChange} />
                    <Button size="sm" variant="outline" onClick={() => profileImageInputRef.current?.click()} disabled={savingProfile}><Upload className="mr-1 h-4 w-4" /> Change Photo</Button>
                    <div className="w-full space-y-2">
                      <p className="text-lg font-semibold">{selfUser?.name || "You"}</p>
                      <p className="text-sm text-muted-foreground">{selfUser?.email}</p>
                    </div>
                  </div>
                  <div className="border-t border-border/60 pt-4 space-y-3">
                    <button className="flex w-full items-center justify-between rounded-md border border-border/70 px-3 py-2 text-sm" onClick={() => setNotificationSoundOn((v) => !v)}><span>Sound Alerts</span><span className="text-xs text-muted-foreground">{notificationSoundOn ? "On" : "Off"}</span></button>
                    <button className="flex w-full items-center justify-between rounded-md border border-border/70 px-3 py-2 text-sm" onClick={() => setPrivacyModeOn((v) => !v)}><span>Privacy Mode</span><span className="text-xs text-muted-foreground">{privacyModeOn ? "Enabled" : "Disabled"}</span></button>
                    <button className="flex w-full items-center justify-between rounded-md border border-border/70 px-3 py-2 text-sm" onClick={() => setCompactMode((v) => !v)}><span>Compact View</span><span className="text-xs text-muted-foreground">{compactMode ? "On" : "Off"}</span></button>
                    <button className="flex w-full items-center justify-between rounded-md border border-border/70 px-3 py-2 text-sm" onClick={cycleFontScale}><span>Font Size</span><span className="text-xs text-muted-foreground">{fontScale === "sm" ? "Small" : fontScale === "md" ? "Medium" : "Large"}</span></button>
                    <button className="flex w-full items-center justify-between rounded-md border border-border/70 px-3 py-2 text-sm" onClick={() => setReadReceiptsEnabled((v) => !v)}><span>Read Receipts</span><span className="text-xs text-muted-foreground">{readReceiptsEnabled ? "On" : "Off"}</span></button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Panel */}
        {!infoPanelCollapsed && activeDesktopTabState === "chats" && activeRoom && (
          <aside className="hidden xl:flex w-80 flex-col border-l border-border flex-shrink-0">
            {/* Info panel content - same as original, omitted for brevity */}
            <div className="flex h-full flex-col overflow-y-auto p-3">
              <div className="mb-3 border-b border-border/60 pb-3"><p className="text-sm font-semibold">Info Panel</p><p className="text-xs text-muted-foreground">Members, media and pinned context</p></div>
              <div className="mb-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Members</p><div className="space-y-2">...</div></div>
            </div>
          </aside>
        )}
      </div>

      {/* MOBILE LAYOUT - FIXED WITH BOTTOM PADDING */}
      <div className="flex flex-col md:hidden flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto pb-[5.5rem]">
          {activeMobileTabState === "chats" && activeRoom && (
            <div className="flex flex-col h-full">
              <div className="sticky top-0 z-10 border-b border-border/60 bg-background/85 px-3 py-3 backdrop-blur flex-shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" onClick={() => setMobileSidebarOpen(true)}>
                      <PanelLeft className="h-5 w-5" />
                    </Button>
                    <div>
                      <p className="text-base font-semibold">{activeRoom.name}</p>
                      <p className="text-[11px] text-muted-foreground">{activeRoomSubtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setCallOverlayOpen(true)}>
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setMenuOpenForRoomCode((p) => p === activeRoom.code ? null : activeRoom.code)}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search messages..." />
                </div>
              </div>
              <div ref={messageListRef} className="flex-1 overflow-y-auto px-3 py-3">
                {filteredMessages.map((m) => {
                  const own = isOwnMessage(m);
                  return (
                    <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"} mb-3`}>
                      <div className={`max-w-[85%] rounded-[1.35rem] border p-3 ${own ? "border-primary/35 bg-primary/12" : "border-border/70 bg-card/35"}`}>
                        <p className="text-xs font-semibold mb-1">{own ? "You" : userLabel(m.sender)}</p>
                        <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{formatTimeLabel(m.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={sendMessage} className="border-t border-border/60 bg-background/95 px-3 py-3 flex-shrink-0">
                <div className="flex items-end gap-2">
                  <div className="relative flex-1">
                    <Textarea
                      ref={textareaRef}
                      value={text}
                      onChange={(e) => onTextChange(e.target.value)}
                      className="min-h-[40px] max-h-24 rounded-2xl border-border/60 bg-background/90 px-3 py-2 text-sm resize-none"
                      placeholder="Type a message..."
                      rows={1}
                      disabled={!canSendInActiveRoom}
                    />
                    {mentionOpen && (
                      <div className="absolute bottom-[calc(100%+6px)] left-0 right-0 z-20 max-h-44 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg">
                        {mentionLoading && <p className="px-2 py-1 text-xs text-muted-foreground">Searching...</p>}
                        {!mentionLoading && mentionResults.length === 0 && <p className="px-2 py-1 text-xs text-muted-foreground">No matches</p>}
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
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={sending || !canSendInActiveRoom}
                    size="icon"
                    className="h-10 w-10 rounded-full flex-shrink-0"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                {/* Optional: Add quick reaction buttons for mobile */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    {["👍", "❤️", "😂", "🔥"].map((emoji) => (
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
                  <Button
                    type="button"
                    variant={recording ? "destructive" : "ghost"}
                    size="icon"
                    className={`h-8 w-8 rounded-full ${recording ? "animate-pulse" : ""}`}
                    onClick={() => toggleRecording()}
                    disabled={!canSendInActiveRoom}
                  >
                    <Mic className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {recording && (
                  <div className="mt-2 flex items-center justify-between rounded-md border border-red-500/35 bg-red-500/10 px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <span key={`wave-${i}`} className="block w-1 rounded bg-red-500 animate-pulse" style={{ height: `${8 + (i % 3) * 4}px`, animationDelay: `${i * 0.12}s` }} />
                      ))}
                      <span className="text-xs text-red-700 dark:text-red-300">Recording {formatDuration(recordingMs)}</span>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={() => mediaRecorderRef.current?.stop()}>Stop</Button>
                  </div>
                )}
              </form>
            </div>
          )}
          {activeMobileTabState === "status" && (
            <div className="flex flex-col h-full">
              <div className="sticky top-0 z-10 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Status</h2>
                  <Button size="sm" variant="outline" onClick={() => setStatusCreatorOpen(true)}>
                    <Camera className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <StatusTabContent
                  userId={selfUserId || ""}
                  onViewStatus={(status, index, allStatuses) => {
                    setStatusViewerStatuses(allStatuses);
                    setStatusViewerIndex(index);
                    setStatusViewerOpen(true);
                  }}
                />
              </div>
            </div>
          )}
          {activeMobileTabState === "calls" && (
            <div className="flex flex-col h-full">
              <div className="sticky top-0 z-10 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Calls</h2>
                  <Button size="sm" variant="outline" onClick={() => setCallOverlayOpen(true)}>
                    <Phone className="h-4 w-4 mr-1" />
                    New
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {callLoading && !callFeed && <div className="text-sm text-muted-foreground">Loading calls...</div>}
                {!callLoading && !callFeed && <div className="text-sm text-muted-foreground">No calls yet.</div>}
                {callFeed?.sessions && (() => {
                  const sortedSessions = [...callFeed.sessions].sort((a, b) =>
                    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
                  );
                  const activeCalls = sortedSessions.filter(c => c.status === "active" || c.status === "ringing");
                  const pastCalls = sortedSessions.filter(c => c.status !== "active" && c.status !== "ringing");
                  return (
                    <div className="space-y-6">
                      {activeCalls.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-2">Active</h3>
                          <div className="space-y-2">
                            {activeCalls.map((call) => (
                              <button key={call.id} onClick={() => openCallRoom(call)} className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-left">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    {call.type === "video" ? <Video className="h-5 w-5 text-emerald-500" /> : <Phone className="h-5 w-5 text-emerald-500" />}
                                  </div>
                                  <div>
                                    <p className="font-semibold">{call.type === "video" ? "Video Call" : "Audio Call"}</p>
                                    <p className="text-xs text-muted-foreground">{call.status === "active" ? "In progress" : "Ringing..."}</p>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {pastCalls.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-2">Recent</h3>
                          <div className="space-y-2">
                            {pastCalls.slice(0, 15).map((call) => (
                              <button key={call.id} onClick={() => openCallRoom(call)} className="w-full rounded-xl border border-border/70 bg-card/50 p-3 text-left">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-muted/30 flex items-center justify-center">
                                    {call.type === "video" ? <Video className="h-5 w-5 text-muted-foreground" /> : <Phone className="h-5 w-5 text-muted-foreground" />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold text-sm">{call.type === "video" ? "Video Call" : "Audio Call"}</p>
                                      <span className="text-xs text-muted-foreground capitalize">{call.status}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{new Date(call.startedAt).toLocaleDateString()}</p>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
          {activeMobileTabState === "profile" && (
            <div className="flex flex-col h-full">
              <div className="sticky top-0 z-10 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur flex-shrink-0">
                <h2 className="text-lg font-semibold">Profile</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="h-24 w-24 overflow-hidden rounded-full border border-border/70 bg-primary/15">
                      <UserAvatar user={selfUser || { id: "self", clerkId: "self", name: "You", email: null, imageUrl: profileImageUrl }} className="h-full w-full object-cover" fallbackClassName="flex h-full w-full items-center justify-center text-2xl font-semibold text-primary" />
                    </div>
                    <input ref={profileImageInputRef} type="file" accept="image/*" className="hidden" onChange={onProfileImageChange} />
                    <Button size="sm" variant="outline" onClick={() => profileImageInputRef.current?.click()} disabled={savingProfile}>
                      <Upload className="mr-1 h-4 w-4" /> Change Photo
                    </Button>
                    <div className="w-full space-y-1">
                      <p className="text-lg font-semibold">{selfUser?.name || "You"}</p>
                      <p className="text-sm text-muted-foreground">{selfUser?.email}</p>
                    </div>
                  </div>
                  <div className="border-t border-border/60 pt-4 space-y-3">
                    <button className="flex w-full items-center justify-between rounded-md border border-border/70 px-3 py-2 text-sm" onClick={() => setNotificationSoundOn((v) => !v)}>
                      <span>Sound Alerts</span>
                      <span className="text-xs text-muted-foreground">{notificationSoundOn ? "On" : "Off"}</span>
                    </button>
                    <button className="flex w-full items-center justify-between rounded-md border border-border/70 px-3 py-2 text-sm" onClick={() => setPrivacyModeOn((v) => !v)}>
                      <span>Privacy Mode</span>
                      <span className="text-xs text-muted-foreground">{privacyModeOn ? "Enabled" : "Disabled"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <MobileBottomNav active={activeMobileTabState} onChange={handleMobileNavChange} />
      </div>

      {/* Other modals - same as original */}
      {profileSettingsOpen && (<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"><div className="w-[92vw] max-w-sm rounded-xl border border-border/70 bg-background/95 p-4 shadow-2xl"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">Profile Settings</p><Button size="sm" variant="ghost" onClick={() => setProfileSettingsOpen(false)}><X className="h-4 w-4" /></Button></div><div className="space-y-3"><div className="flex items-center gap-3"><div className="h-16 w-16 overflow-hidden rounded-full border border-border/70 bg-primary/15"><UserAvatar user={selfUser || { id: "self", clerkId: "self", name: "You", email: null, imageUrl: profileImageUrl }} className="h-full w-full object-cover" fallbackClassName="flex h-full w-full items-center justify-center text-sm font-semibold text-primary" /></div><input ref={profileImageInputRef} type="file" accept="image/*" className="hidden" onChange={onProfileImageChange} /><Button size="sm" variant="outline" onClick={() => profileImageInputRef.current?.click()} disabled={savingProfile}><Upload className="mr-1 h-4 w-4" /> Change Photo</Button></div><button className="flex w-full items-center justify-between rounded-md border border-border/70 px-2 py-1.5 text-sm" onClick={() => setNotificationSoundOn((v) => !v)}><span>Sound Alerts</span><span className="text-xs text-muted-foreground">{notificationSoundOn ? "On" : "Off"}</span></button><button className="flex w-full items-center justify-between rounded-md border border-border/70 px-2 py-1.5 text-sm" onClick={() => setPrivacyModeOn((v) => !v)}><span>Privacy Mode</span><span className="text-xs text-muted-foreground">{privacyModeOn ? "Enabled" : "Disabled"}</span></button></div></div></div>)}

      {groupSettingsOpen && activeRoom && activeRoom.type === "group" && (<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"><div className="w-[92vw] max-w-md rounded-xl border border-border/70 bg-background/95 p-4 shadow-2xl"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">Group Settings</p><Button size="sm" variant="ghost" onClick={() => setGroupSettingsOpen(false)}><X className="h-4 w-4" /></Button></div><div className="space-y-3"><div className="flex items-center gap-3"><div className="h-14 w-14 overflow-hidden rounded-full border border-border/70 bg-primary/15">{groupAvatarDraft ? <NextImage src={groupAvatarDraft} alt={activeRoom.name} width={56} height={56} unoptimized className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-primary">{(activeRoom.name || "GR").slice(0, 2).toUpperCase()}</div>}</div><div className="flex flex-wrap gap-2"><input ref={groupAvatarInputRef} type="file" accept="image/*" className="hidden" onChange={onGroupAvatarChange} /><Button size="sm" variant="outline" onClick={() => groupAvatarInputRef.current?.click()}><Upload className="mr-1 h-4 w-4" /> Change</Button><Button size="sm" variant="ghost" onClick={() => setGroupAvatarDraft("")}>Remove</Button></div></div><Input value={groupNameDraft} onChange={(e) => setGroupNameDraft(e.target.value)} placeholder="Group name" /><Textarea value={groupDescriptionDraft} onChange={(e) => setGroupDescriptionDraft(e.target.value)} placeholder="Group description" className="min-h-20" /><div className="flex gap-2"><Button onClick={saveGroupSettings} disabled={!canManageMembers}>Save Settings</Button><Button variant="destructive" onClick={() => leaveActiveGroup()}>Leave Group</Button></div></div></div></div>)}

      {createGroupOpen && (<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"><div className="w-[92vw] max-w-md rounded-xl border border-border/70 bg-background/95 p-4 shadow-2xl"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">Create Group</p><Button size="sm" variant="ghost" onClick={() => setCreateGroupOpen(false)}><X className="h-4 w-4" /></Button></div><div className="space-y-3"><Input value={createGroupName} onChange={(e) => setCreateGroupName(e.target.value)} placeholder="Group name" /><Input value={createGroupQuery} onChange={(e) => setCreateGroupQuery(e.target.value)} placeholder="Search users to add..." /><div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border/70 p-2">{creatingGroupSearch && <p className="text-xs text-muted-foreground">Searching...</p>}{!creatingGroupSearch && createGroupQuery.trim() && createGroupResults.length === 0 && <p className="text-xs text-muted-foreground">No users found.</p>}{createGroupResults.map((u) => (<button key={`group-pick-${u.id}`} type="button" onClick={() => toggleGroupMember(u.clerkId)} className={`flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-sm ${selectedGroupMemberIds.includes(u.clerkId) ? "border-primary bg-primary/10" : "border-border/70 hover:bg-accent/60"}`}><span>{userLabel(u)}</span><span className="text-xs text-muted-foreground">{selectedGroupMemberIds.includes(u.clerkId) ? "Selected" : "Add"}</span></button>))}</div><Button onClick={createGroup} disabled={!createGroupName.trim() || selectedGroupMemberIds.length === 0}>Create Group</Button></div></div></div>)}

      {incomingCall && (<IncomingCallModal call={incomingCall} onClose={() => setIncomingCall(null)} onAccept={() => { setIncomingCall(null); setProcessedCallIds(prev => { const next = new Set(prev); next.delete(incomingCall.id); return next; }); }} onReject={() => handleRejectCall(incomingCall.id)} />)}

      {mobileSidebarOpen && (<div className="fixed inset-0 z-40 md:hidden"><button className="absolute inset-0 bg-black/35" onClick={() => setMobileSidebarOpen(false)} /><aside className="absolute left-0 top-0 h-full w-[86vw] max-w-sm border-r border-border/70 bg-background/95 p-3 backdrop-blur-xl"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">Conversations</p><Button size="sm" variant="ghost" onClick={() => setMobileSidebarOpen(false)}><X className="h-4 w-4" /></Button></div><SidebarFilterTabs active={filterTab} onChange={setFilterTab} /><div className="mt-3 space-y-2 overflow-y-auto max-h-[calc(100vh-100px)]">{filteredRooms.map((room) => (<button key={room.id} onClick={() => { setActiveRoomCode(room.code); setMobileSidebarOpen(false); }} className={`w-full rounded-lg border p-3 text-left ${activeRoomCode === room.code ? "border-primary bg-primary/10" : "border-border/70"}`}><p className="truncate text-sm font-medium">{room.name}</p><p className="text-[11px] text-muted-foreground">{room.type === "group" ? "Group" : "Direct"} chat</p></button>))}</div></aside></div>)}

      {actionSheetOpen && actionSheetMessage && (<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"><div className="w-[92vw] max-w-md rounded-xl border border-border/70 bg-background/95 p-4 shadow-2xl"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">Message Actions</p><Button size="sm" variant="ghost" onClick={() => setActionSheetOpen(false)}><X className="h-4 w-4" /></Button></div><div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => { setReplyToId(actionSheetMessage.id); setActionSheetOpen(false); }}>Reply</Button><Button variant="outline" onClick={() => { openThread(actionSheetMessage); setActionSheetOpen(false); }}>Thread</Button><Button variant="outline" onClick={() => { toggleBookmark(actionSheetMessage.id); setActionSheetOpen(false); }}>Bookmark</Button><Button variant="outline" onClick={() => { copyMessageContent(actionSheetMessage); setActionSheetOpen(false); }}>Copy</Button><Button variant="destructive" onClick={() => { deleteMessage(actionSheetMessage.id); setActionSheetOpen(false); }}>Delete</Button></div></div></div>)}

      {threadOpen && threadParent && (<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"><div className="w-[92vw] max-w-md rounded-xl border border-border/70 bg-background/95 p-4 shadow-2xl"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">Thread</p><Button size="sm" variant="ghost" onClick={() => setThreadOpen(false)}><X className="h-4 w-4" /></Button></div><div className="mb-3 p-3 rounded-lg bg-muted/25"><p className="text-xs font-semibold">{userLabel(threadParent.sender)}</p><p className="text-sm">{threadParent.content}</p></div><div className="space-y-2 max-h-64 overflow-y-auto">{threadReplies.map((reply) => (<div key={reply.id} className="p-3 rounded-lg border border-border/70"><p className="text-xs font-semibold">{userLabel(reply.sender)}</p><p className="text-sm">{reply.content}</p></div>))}</div><form onSubmit={(e) => { e.preventDefault(); sendMessage(e); }} className="mt-3 flex gap-2"><Input placeholder="Write a reply..." value={text} onChange={(e) => setText(e.target.value)} className="flex-1" /><Button type="submit" disabled={sending}>Send</Button></form></div></div>)}

      {lightboxImage && (<div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setLightboxImage(null)}><NextImage src={lightboxImage.src} alt={lightboxImage.alt} width={800} height={600} unoptimized className="max-h-[90vh] max-w-[90vw] object-contain" /></div>)}

      {helpOpen && (<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"><div className="w-[92vw] max-w-md rounded-xl border border-border/70 bg-background/95 p-4 shadow-2xl"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">Keyboard Shortcuts</p><Button size="sm" variant="ghost" onClick={() => setHelpOpen(false)}><X className="h-4 w-4" /></Button></div><div className="space-y-2 text-sm"><p><kbd className="rounded border px-1.5 py-0.5 text-xs">Ctrl/Cmd+K</kbd> Focus search</p><p><kbd className="rounded border px-1.5 py-0.5 text-xs">Ctrl/Cmd+Enter</kbd> Send message</p><p><kbd className="rounded border px-1.5 py-0.5 text-xs">Esc</kbd> Close overlays</p></div><div className="mt-4 rounded-lg border border-border/70 bg-muted/25 p-3"><p className="mb-1 text-xs font-semibold text-muted-foreground">Slash Commands</p><p><code>/poll</code> create poll mode</p><p><code>/note</code> switch to note mode</p><p><code>/text</code> switch to text mode</p></div></div></div>)}
    </div>
  );
}