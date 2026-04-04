"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import {
  Bookmark,
  BookmarkCheck,
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
  MessageSquare,
  Mic,
  MoreVertical,
  PanelLeft,
  Paperclip,
  Pin,
  PinOff,
  Pencil,
  Upload,
  Phone,
  PlusCircle,
  Settings2,
  Shield,
  Reply,
  Search,
  Send,
  Trash2,
  UserPlus,
  UserX,
  Video,
  Vote,
  X,
  Type,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ThemeToggle from "@/components/navigation/theme-toggle";
import { ChatPanel, ChatShell, OnlineDot, SidebarFilterTabs, type FilterTab } from "@/components/external-chat/chat-system";

type Room = { id: string; code: string; name: string; type: "direct" | "group" | "channel"; unreadCount: number };
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

const REACTIONS = ["👍", "❤️", "😂", "🎉", "🔥"];

async function api<T>(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string; setupRequired?: boolean };
  if (!res.ok) {
    const e = new Error(body.error || "Request failed");
    (e as Error & { setupRequired?: boolean }).setupRequired = body.setupRequired;
    throw e;
  }
  return body;
}

type ApiError = Error & { setupRequired?: boolean };

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

function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function reactionSummary(reactions: Array<{ emoji: string; user: UserRow }> | undefined) {
  const map = new Map<string, number>();
  for (const r of reactions || []) {
    map.set(r.emoji, (map.get(r.emoji) || 0) + 1);
  }
  return [...map.entries()].map(([emoji, count]) => ({ emoji, count }));
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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeRoomCode, setActiveRoomCode] = useState("");
  const [search, setSearch] = useState("");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState("");
  const [setupRequired, setSetupRequired] = useState(false);

  const [incoming, setIncoming] = useState<Pending[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [messageSearchIndex, setMessageSearchIndex] = useState(0);
  const [menuOpenForRoomCode, setMenuOpenForRoomCode] = useState<string | null>(null);
  const [messageMenuOpenId, setMessageMenuOpenId] = useState<string | null>(null);
  const [infoPanelCollapsed, setInfoPanelCollapsed] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [starredRoomCodes, setStarredRoomCodes] = useState<string[]>([]);
  const [threadParentId, setThreadParentId] = useState<string | null>(null);
  const [threadOpen, setThreadOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [actionSheetMessageId, setActionSheetMessageId] = useState<string | null>(null);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
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
  const [attachment, setAttachment] = useState<{ id: string; fileName: string; downloadUrl: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const composerFormRef = useRef<HTMLFormElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const draftByRoomRef = useRef<Record<string, string>>({});
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
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeStartXRef = useRef<number | null>(null);

  const activeRoom = useMemo(() => rooms.find((r) => r.code === activeRoomCode) || null, [rooms, activeRoomCode]);
  const replying = useMemo(() => (replyToId ? messages.find((m) => m.id === replyToId) || null : null), [messages, replyToId]);
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (filterTab === "unread") return room.unreadCount > 0;
      if (filterTab === "groups") return room.type === "group";
      if (filterTab === "starred") return starredRoomCodes.includes(room.code);
      return true;
    });
  }, [rooms, filterTab, starredRoomCodes]);
  const sharedMedia = useMemo(
    () => messages.filter((m) => Boolean(m.attachment)).slice(-6),
    [messages]
  );
  const selfUserId = selfUser?.id || null;
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
  const bookmarkedMessages = useMemo(
    () => messages.filter((m) => bookmarkedMessageIds.includes(m.id)),
    [messages, bookmarkedMessageIds]
  );
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
    if (activeRoom.type === "group") return "Group chat";
    if (activeRoom.type === "channel") return "Channel";
    return "Direct chat";
  }, [activeRoom]);

  const handleApiError = useCallback((err: unknown, fallback: string) => {
    const e = err as ApiError;
    setError(e?.message || fallback);
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
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const data = await api<{ user: UserRow }>("/api/external-chat/profile");
      setSelfUser(data.user);
      setProfileImageUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return data.user.imageUrl || null;
      });
    } catch (err) {
      handleApiError(err, "Failed to load profile");
    }
  }, [handleApiError]);

  const loadConnections = useCallback(async () => {
    try {
      const data = await api<{ incoming: Pending[]; outgoing: Array<{ id: string; receiver: UserRow }>; connections: Connection[] }>("/api/external-chat/connections");
      setIncoming(data.incoming || []);
      setConnections(data.connections || []);
    } catch (err) {
      handleApiError(err, "Failed to load connections");
    }
  }, [handleApiError]);

  const loadRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const data = await api<{ rooms: Room[] }>("/api/external-chat/rooms");
      const nextRooms = data.rooms || [];
      setRooms(nextRooms);
      if (!activeRoomCode && nextRooms[0]) setActiveRoomCode(nextRooms[0].code);
      if (activeRoomCode && !nextRooms.find((r) => r.code === activeRoomCode)) setActiveRoomCode(nextRooms[0]?.code || "");
      setError("");
      setSetupRequired(false);
    } catch (err) {
      handleApiError(err, "Failed to load rooms");
    } finally {
      setLoadingRooms(false);
    }
  }, [activeRoomCode, handleApiError]);

  const emit = useCallback(async (payload: unknown) => {
    if (!activeRoomCode) return;
    await fetch(`/api/external-chat/realtime/${encodeURIComponent(activeRoomCode)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
    }).catch(() => undefined);
  }, [activeRoomCode]);

  const loadMessages = useCallback(async (roomCode: string) => {
    if (!roomCode) return;
    const list = messageListRef.current;
    if (list) {
      const distanceFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
      shouldStickToBottomRef.current = distanceFromBottom < 120;
    }
    setLoadingMessages(true);
    try {
      const q = new URLSearchParams();
      if (search.trim()) q.set("search", search.trim());
      if (pinnedOnly) q.set("pinned", "1");
      const data = await api<{ messages: Message[] }>(`/api/external-chat/rooms/${encodeURIComponent(roomCode)}/messages?${q.toString()}`);
      setMessages(data.messages || []);
      requestAnimationFrame(() => {
        if (!messageListRef.current) return;
        if (shouldStickToBottomRef.current) {
          messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
          setPendingNewCount(0);
        }
      });
      if (selfUserId) {
        const unseenForViewer = (data.messages || []).filter(
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
      setLoadingMessages(false);
    }
  }, [emit, handleApiError, pinnedOnly, search, selfUserId]);

  useEffect(() => {
    if (setupRequired) return;
    void loadProfile();
    void loadConnections();
    void loadRooms();
  }, [loadConnections, loadProfile, loadRooms, setupRequired]);

  useEffect(() => {
    if (!activeRoomCode || setupRequired) return;
    void loadMessages(activeRoomCode);
  }, [activeRoomCode, loadMessages, setupRequired]);

  useEffect(() => {
    if (!activeRoomCode || setupRequired) return;
    const t = setTimeout(() => void loadMessages(activeRoomCode), 300);
    return () => clearTimeout(t);
  }, [activeRoomCode, loadMessages, search, setupRequired]);

  useEffect(() => {
    if (!activeRoomCode || setupRequired) return;
    eventRef.current?.close();
    const s = new EventSource(`/api/external-chat/realtime/${encodeURIComponent(activeRoomCode)}`);
    eventRef.current = s;
    s.onopen = () => setRealtimeConnected(true);
    s.onerror = () => setRealtimeConnected(false);
    s.onmessage = (event) => {
      try {
        const body = JSON.parse(event.data) as { senderId?: string; payload?: { type?: string; user?: UserRow } };
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
      } catch {
        // Ignore malformed realtime payloads and fall back to full reloads.
      }
      void loadConnections();
      void loadRooms();
      void loadMessages(activeRoomCode);
    };
    return () => {
      s.close();
      eventRef.current = null;
    };
  }, [activeRoomCode, loadConnections, loadMessages, loadRooms, selfUserId, setupRequired]);

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
        filterTab?: FilterTab;
        compactMode?: boolean;
        notificationSoundOn?: boolean;
        privacyModeOn?: boolean;
        bookmarkedMessageIds?: string[];
        fontScale?: "sm" | "md" | "lg";
      };
      if (Array.isArray(prefs.starred)) setStarredRoomCodes(prefs.starred);
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
  }, [prefsLoaded, starredRoomCodes, filterTab, compactMode, notificationSoundOn, privacyModeOn, bookmarkedMessageIds, fontScale]);

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
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
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
    if (!rooms.length || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (!room) return;
    if (rooms.some((r) => r.code === room)) {
      setActiveRoomCode(room);
    }
  }, [rooms]);

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

  const sendRequest = async (clerkId: string) => {
    try {
      await api("/api/external-chat/connections", { method: "POST", body: JSON.stringify({ targetClerkId: clerkId }) });
      await loadConnections();
      await loadRooms();
    } catch (e) {
      handleApiError(e, "Failed request");
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
      metadata: poll ? { poll } : null,
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
    try {
      setSending(true);
      await api(`/api/external-chat/rooms/${encodeURIComponent(activeRoomCode)}/messages`, {
        method: "POST",
        body: JSON.stringify({
          content,
          type: messageType,
          replyToId,
          attachmentId: attachment?.id || null,
          poll,
        }),
      });
      setText("");
      setDraftByRoom((prev) => {
        if (!activeRoomCode) return prev;
        const next = { ...prev, [activeRoomCode]: "" };
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
      await loadMessages(activeRoomCode);
      setUndoSend((cur) => (cur?.tempId === tempId ? null : cur));
    } catch (err) {
      handleApiError(err, "Send failed");
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, failed: true, optimistic: false } : m))
      );
    } finally {
      setSending(false);
    }
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
    if (file.size > 550_000) {
      setError("Profile image is too large");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const imageDataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!imageDataUrl) {
        setError("Failed to read image");
        return;
      }

      try {
        setSavingProfile(true);
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
        await loadRooms();
        if (activeRoomCode) await loadMessages(activeRoomCode);
      } catch (err) {
        handleApiError(err, "Failed to update profile");
      } finally {
        setSavingProfile(false);
        if (profileImageInputRef.current) profileImageInputRef.current.value = "";
      }
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

  const copyMessageContent = async (m: Message) => {
    if (!m.content?.trim()) return;
    try {
      await navigator.clipboard.writeText(m.content);
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
    const ext = blob.type.includes("webm") ? "webm" : blob.type.includes("wav") ? "wav" : "mp3";
    const file = new File([blob], `voice-note-${Date.now()}.${ext}`, { type: blob.type || "audio/webm" });
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
      const recorder = new MediaRecorder(stream);
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
        setRecording(false);
        stream.getTracks().forEach((t) => t.stop());
        recordingStreamRef.current = null;
        void uploadRecordedAudio(blob);
      };
      recorder.start();
      setRecording(true);
      recordingTimerRef.current = setInterval(() => setRecordingMs((prev) => prev + 250), 250);
    } catch (err) {
      handleApiError(err, "Could not start recording");
    }
  };

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

  return (
    <ChatShell>
      <ChatPanel className="hidden p-3 xl:block">
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
                <UserAvatar
                  user={selfUser || { id: "self", clerkId: "self", name: "You", email: null, imageUrl: profileImageUrl }}
                  className="h-full w-full object-cover"
                  fallbackClassName="flex h-full w-full items-center justify-center text-xs font-semibold text-primary"
                />
              </div>
              <div>
                <p className="text-xs font-semibold">My Profile</p>
                <p className="text-[11px] text-muted-foreground">Account & preferences</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setProfileSettingsOpen(true)}>
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mb-3 space-y-2 rounded-lg border border-border/70 bg-muted/35 p-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users..." />
          </div>
          <div className="max-h-36 space-y-1 overflow-y-auto">
            {searching ? <p className="text-xs text-muted-foreground">Searching...</p> : null}
            {results.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-md border border-border/70 bg-card/65 px-2 py-1.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{userLabel(u)}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{u.email || "No email provided"}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => void sendRequest(u.clerkId)}>
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <SidebarFilterTabs active={filterTab} onChange={setFilterTab} />

        <div className="mb-3 rounded-md border border-border/70 bg-muted/25 p-2">
          <p className="mb-1 text-xs font-semibold">Incoming Requests</p>
          <div className="max-h-28 space-y-1 overflow-y-auto">
            {incoming.length === 0 ? <p className="text-[11px] text-muted-foreground">No pending requests</p> : null}
            {incoming.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded border border-border/70 px-2 py-1">
                <p className="truncate text-xs">{userLabel(r.sender)}</p>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => void actRequest(r.id, "accept")}><Check className="h-4 w-4 text-emerald-600" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => void actRequest(r.id, "decline")}><X className="h-4 w-4 text-red-600" /></Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="max-h-[calc(100%-330px)] space-y-1 overflow-y-auto pr-1">
          {loadingRooms ? <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading chats...</div> : null}
          {filteredRooms.map((room) => {
            const starred = starredRoomCodes.includes(room.code);
            return (
              <div
                key={room.id}
                role="button"
                tabIndex={0}
                onClick={() => setActiveRoomCode(room.code)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveRoomCode(room.code);
                  }
                }}
                onTouchStart={(e) => onConversationTouchStart(e.changedTouches[0]?.clientX ?? 0)}
                onTouchEnd={(e) => onConversationTouchEnd(e.changedTouches[0]?.clientX ?? 0, room.code)}
                className={`chat-row-hover w-full rounded-lg border px-3 py-2 text-left transition-all ${activeRoomCode === room.code ? "chat-row-active" : "border-border/70"} cursor-pointer`}
              >
                <div className="flex items-start gap-2">
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                      {(room.name || "DM").slice(0, 2).toUpperCase()}
                    </div>
                    <OnlineDot />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{room.name}</p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStarredRoomCodes((prev) =>
                              prev.includes(room.code) ? prev.filter((c) => c !== room.code) : [...prev, room.code]
                            );
                          }}
                          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          <Pin className={`h-3.5 w-3.5 ${starred ? "text-amber-500" : ""}`} />
                        </button>
                        {room.unreadCount > 0 ? <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">{room.unreadCount}</span> : null}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{room.type === "group" ? "Group" : "Direct"} chat</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ChatPanel>

      <ChatPanel className={`flex min-h-0 flex-col ${infoPanelCollapsed ? "xl:col-span-2" : ""}`}>
        <div className="sticky top-0 z-10 border-b border-border/60 bg-background/75 p-3 backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="xl:hidden"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {(activeRoom?.name || "CH").slice(0, 2).toUpperCase()}
                </div>
                <OnlineDot />
              </div>
              <div>
                <p className="text-sm font-semibold">{activeRoom?.name || "Select a conversation"}</p>
                <p className="text-xs text-muted-foreground">{activeRoomSubtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={infoPanelCollapsed ? "outline" : "default"}
                className="hidden xl:inline-flex"
                onClick={() => setInfoPanelCollapsed((v) => !v)}
              >
                {infoPanelCollapsed ? "Show Info" : "Hide Info"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setCallOverlayOpen(true)}>
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
                      <button
                        className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                        onClick={() => {
                          setMenuOpenForRoomCode(null);
                          setProfileSettingsOpen(true);
                        }}
                      >
                        <Settings2 className="h-4 w-4" /> Profile Settings
                      </button>
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
                      <button
                        className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                        onClick={() => {
                          const c = connections.find((x) => x.directRoom.code === activeRoom.code);
                          if (c) void removeConnection(c.id);
                        }}
                      >
                        <UserX className="h-4 w-4 text-red-600" /> Remove Connection
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <div className="mt-3 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input ref={searchInputRef} className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search messages..." />
          </div>
          {search.trim() ? (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/25 px-2 py-1.5">
              <p className="text-xs text-muted-foreground">
                {messageMatches.length ? `${messageSearchIndex + 1}/${messageMatches.length} matches` : "No matches"}
              </p>
              <div className="flex items-center gap-1">
                <Button type="button" size="icon" variant="ghost" onClick={() => jumpMatch(-1)} disabled={!messageMatches.length}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => jumpMatch(1)} disabled={!messageMatches.length}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
          {pinnedMessages.length > 0 ? (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {pinnedMessages.map((m) => (
                <button
                  key={`pin-${m.id}`}
                  type="button"
                  onClick={() => scrollToMessageById(m.id)}
                  className="inline-flex max-w-[220px] shrink-0 items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-1 text-xs hover:bg-amber-500/20"
                >
                  <Pin className="h-3 w-3 text-amber-500" />
                  <span className="truncate">{m.content || "Pinned attachment"}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {!networkOnline ? <div className="border-t border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">You are offline. Messages will sync once connection returns.</div> : null}
        {networkOnline && !realtimeConnected ? <div className="border-t border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">Realtime disconnected. Reconnecting…</div> : null}
        {error ? (
          <div className="flex items-center justify-between gap-2 border-t border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} className="rounded px-1 hover:bg-destructive/15">Dismiss</button>
          </div>
        ) : null}

        <div
          ref={messageListRef}
          className={`min-h-0 flex-1 overflow-y-auto p-3 ${dropActive ? "bg-primary/5" : ""}`}
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
          {loadingMessages ? <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading messages...</div> : null}
          {!loadingMessages && messages.length === 0 ? <p className="text-sm text-muted-foreground">No messages yet.</p> : null}
          <div className="space-y-3">
            {timelineItems.map((item) => {
              if (item.kind === "day") {
                return (
                  <div key={item.key} className="my-2 flex items-center justify-center">
                    <span className="rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-[11px] text-muted-foreground">{item.label}</span>
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
              const own = isOwnMessage(m);
              const replyText = replyPreview(m.replyToId);
              const reactionsAgg = reactionSummary(m.reactions);
              return (
                <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                  <article
                    ref={(node) => {
                      messageNodeRefs.current[m.id] = node;
                    }}
                    className={`group inline-flex h-auto w-auto max-w-[82%] flex-col items-start rounded-2xl border ${compactMode ? "p-2.5" : "p-3"} transition ${
                      own
                        ? "border-primary/35 bg-primary/12"
                        : "border-border/70 bg-card/35"
                    } ${messageMatches[messageSearchIndex] === m.id ? "ring-2 ring-amber-400/70" : ""}`}
                    onTouchStart={() => startLongPress(m.id)}
                    onTouchEnd={clearLongPress}
                    onTouchMove={clearLongPress}
                    onTouchCancel={clearLongPress}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 overflow-hidden rounded-full border border-border/70 bg-primary/15">
                          <UserAvatar
                            user={m.sender}
                            className="h-full w-full object-cover"
                            fallbackClassName="flex h-full w-full items-center justify-center text-[10px] font-semibold text-primary"
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
                        <div className="mb-0.5 border-l-2 border-primary pl-2">
                          <p className="text-[11px] font-semibold text-primary">
                            {messageById.get(m.replyToId)?.sender ? userLabel(messageById.get(m.replyToId)!.sender) : "Reply"}
                          </p>
                          <p className="line-clamp-1 text-[11px] text-muted-foreground">
                            {messageById.get(m.replyToId)?.content || replyText || "Message"}
                          </p>
                        </div>
                      </div>
                    ) : null}
                    <p className={`${messageTextClass} whitespace-pre-wrap break-words`}>{highlightContent(m.content, search)}</p>
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
                        <p className="mb-2 text-xs font-semibold">{poll.question}</p>
                        <div className="space-y-1">
                          {(poll.options || []).map((o) => (
                            <button key={o.id} onClick={() => void mutateMessage(m.id, { pollVoteOptionId: o.id })} className="flex w-full items-center justify-between rounded border border-border px-2 py-1 text-xs hover:bg-accent">
                              <span>{o.text}</span><span>{(o.voters || []).length}</span>
                            </button>
                          ))}
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
                        <Button size="sm" variant="ghost" onClick={() => setMessageMenuOpenId((cur) => (cur === m.id ? null : m.id))}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                        {messageMenuOpenId === m.id ? (
                          <div className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-border bg-card p-1 shadow-lg">
                            <div className="mb-1 flex flex-wrap gap-1 px-1 py-1">
                              {REACTIONS.map((emoji) => (
                                <button
                                  key={`${m.id}-menu-${emoji}`}
                                  onClick={() => void api(`/api/external-chat/messages/${m.id}/reactions`, { method: "POST", body: JSON.stringify({ emoji }) }).then(() => emit({ type: "reaction" })).then(() => loadMessages(activeRoomCode)).catch((e) => setError(e instanceof Error ? e.message : "Reaction failed"))}
                                  className="rounded-full border border-border px-2 py-0.5 text-xs hover:bg-accent"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                            <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { setReplyToId(m.id); setMessageMenuOpenId(null); }}><Reply className="h-4 w-4" /> Reply</button>
                            <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { openThread(m); setMessageMenuOpenId(null); }}><ChevronRight className="h-4 w-4" /> Thread</button>
                            <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { toggleBookmark(m.id); setMessageMenuOpenId(null); }}>{bookmarkedMessageIds.includes(m.id) ? <BookmarkCheck className="h-4 w-4 text-amber-500" /> : <Bookmark className="h-4 w-4" />} {bookmarkedMessageIds.includes(m.id) ? "Unbookmark" : "Bookmark"}</button>
                            <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { void copyMessageContent(m); setMessageMenuOpenId(null); }}><span className="text-xs">Copy</span> Message</button>
                            <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { void mutateMessage(m.id, { pinned: !Boolean(m.pinnedAt) }); setMessageMenuOpenId(null); }}>{m.pinnedAt ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />} {m.pinnedAt ? "Unpin" : "Pin"}</button>
                            <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent" onClick={() => { const next = window.prompt("Edit message", m.content); if (next !== null) void mutateMessage(m.id, { content: next }); setMessageMenuOpenId(null); }}><Pencil className="h-4 w-4" /> Edit</button>
                            <button className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm text-red-600 hover:bg-accent" onClick={() => { void deleteMessage(m.id); setMessageMenuOpenId(null); }}><Trash2 className="h-4 w-4" /> Delete</button>
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
                              className="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-background bg-primary/20 text-[10px] font-semibold"
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
          {text.trim() ? (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
              </span>
              <span>You are typing...</span>
            </div>
          ) : null}
        </div>

        <form ref={composerFormRef} onSubmit={sendMessage} className="border-t border-border/60 bg-background/75 p-3 backdrop-blur">
          {undoSend ? (
            <div className="mb-2 flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs">
              <span>Message sent. Undo?</span>
              <Button type="button" size="sm" variant="outline" onClick={undoLastSend}>Undo</Button>
            </div>
          ) : null}
          {replying ? (
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
          ) : null}
          <div className="mb-2 grid gap-2 md:grid-cols-2">
            <select value={messageType} onChange={(e) => setMessageType(e.target.value as "text" | "note" | "poll")} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="text">Text</option>
              <option value="note">Note</option>
              <option value="poll">Poll</option>
            </select>
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" className="hidden" onChange={onFile} />
              <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
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
              <Button type="button" size="sm" variant="outline" onClick={() => setPollOptions((p) => [...p, ""])}>Add option</Button>
            </div>
          ) : null}
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {["👍", "❤️", "😂", "🔥", "🙏"].map((emoji) => (
                <button
                  key={`quick-${emoji}`}
                  type="button"
                  onClick={() => setText((prev) => `${prev}${prev ? " " : ""}${emoji}`)}
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
            >
              <Mic className="h-4 w-4" />
            </Button>
            <div className="relative flex-1">
              <Textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => onTextChange(e.target.value)}
                onKeyDown={onTextKeyDown}
                className="min-h-[54px] max-h-40"
                placeholder="Type message. Use @username for mentions."
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
            <Button type="submit" disabled={sending || uploading || !activeRoomCode} className="transition-transform duration-150 active:scale-95">
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

      <ChatPanel className={`${infoPanelCollapsed ? "hidden" : "hidden xl:flex"} min-h-0 flex-col p-3`}>
        <div className="mb-3 border-b border-border/60 pb-3">
          <p className="text-sm font-semibold">Info Panel</p>
          <p className="text-xs text-muted-foreground">Members, media and pinned context</p>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Members</p>
          <div className="space-y-2">
            {connections.slice(0, 6).map((c) => {
              const user = c.directRoom.code === activeRoomCode ? c.userB : c.userA;
              const label = userLabel(user);
              return (
                <div key={c.id} className="flex items-center justify-between rounded-md border border-border/70 bg-muted/25 px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                      <UserAvatar
                        user={user}
                        className="h-full w-full object-cover"
                        fallbackClassName="flex h-full w-full items-center justify-center text-[10px] font-semibold text-primary"
                      />
                    </div>
                    <span className="text-xs">{label}</span>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-600">Online</span>
                </div>
              );
            })}
          </div>
        </div>

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
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bookmarks</p>
          <div className="space-y-2">
            {bookmarkedMessages.length === 0 ? <p className="text-xs text-muted-foreground">No bookmarks yet</p> : null}
            {bookmarkedMessages.slice(-6).map((m) => (
              <button
                key={`bookmark-${m.id}`}
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
              <a key={m.id} href={m.attachment?.downloadUrl || "#"} className="aspect-square rounded-md border border-border/70 bg-muted/30 p-2 hover:bg-accent/50">
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
                <div className="h-16 w-16 overflow-hidden rounded-full border border-border/70 bg-primary/15">
                  <UserAvatar
                    user={selfUser || { id: "self", clerkId: "self", name: "You", email: null, imageUrl: profileImageUrl }}
                    className="h-full w-full object-cover"
                    fallbackClassName="flex h-full w-full items-center justify-center text-sm font-semibold text-primary"
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
                        await loadRooms();
                        if (activeRoomCode) await loadMessages(activeRoomCode);
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
            <Button className="justify-start gap-2" onClick={createMeeting}>
              <Video className="h-4 w-4" /> Start Video Call Now
            </Button>
          </div>
        </div>
      </div>

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
                    <p className="truncate text-sm font-medium">{room.name}</p>
                    <div className="flex items-center gap-1">
                      {starred ? <Pin className="h-3.5 w-3.5 text-amber-500" /> : null}
                      {room.unreadCount > 0 ? <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">{room.unreadCount}</span> : null}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Swipe left to star, right to close</p>
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      <div className={`fixed inset-0 z-[60] transition ${actionSheetOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <button
          type="button"
          aria-label="Close actions"
          onClick={() => setActionSheetOpen(false)}
          className={`absolute inset-0 bg-black/35 transition-opacity ${actionSheetOpen ? "opacity-100" : "opacity-0"}`}
        />
        <div className={`absolute bottom-0 left-0 right-0 rounded-t-2xl border-t border-border/70 bg-background/95 p-3 backdrop-blur-xl transition-transform duration-300 ${actionSheetOpen ? "translate-y-0" : "translate-y-full"}`}>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Message actions</p>
          {!actionSheetMessage ? <p className="text-sm text-muted-foreground">No message selected.</p> : null}
          {actionSheetMessage ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => { setReplyToId(actionSheetMessage.id); setActionSheetOpen(false); }}>Reply</Button>
              <Button variant="outline" onClick={() => { openThread(actionSheetMessage); setActionSheetOpen(false); }}>Thread</Button>
              <Button variant="outline" onClick={() => { void mutateMessage(actionSheetMessage.id, { pinned: !Boolean(actionSheetMessage.pinnedAt) }); setActionSheetOpen(false); }}>{actionSheetMessage.pinnedAt ? "Unpin" : "Pin"}</Button>
              <Button variant="outline" onClick={() => { const next = window.prompt("Edit message", actionSheetMessage.content); if (next !== null) void mutateMessage(actionSheetMessage.id, { content: next }); setActionSheetOpen(false); }}>Edit</Button>
              <Button variant="destructive" className="col-span-2" onClick={() => { void deleteMessage(actionSheetMessage.id); setActionSheetOpen(false); }}>Delete</Button>
            </div>
          ) : null}
        </div>
      </div>

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
    </ChatShell>
  );
}
