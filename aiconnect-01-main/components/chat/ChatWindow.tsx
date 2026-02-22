"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Bell, Loader2, MoreVertical, Paperclip, Pin, PinOff, Reply, Search, Send, SmilePlus, SquarePen, Trash2, Vote, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FilePreview from "@/components/chat/FilePreview";

type ChatUser = { id: string; name: string };
type PollOption = { id: string; text: string; votes: ChatUser[] };
type PollData = { question: string; options: PollOption[] };

type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  recipients: string[] | null;
  kind: "message" | "note" | "poll";
  replyToId: string | null;
  seenBy: ChatUser[];
  pinned: boolean;
  reactions: Record<string, ChatUser[]>;
  poll: PollData | null;
  file: { id: string; name: string; fileType: string; fileSize: number; downloadUrl: string } | null;
};

type ChatWireMessage =
  | { type: "chat"; message: ChatMessage }
  | { type: "delete"; messageId: string; deletedBy: string; deletedAt: string }
  | { type: "edit"; messageId: string; editedBy: string; content: string; editedAt: string }
  | { type: "seen"; messageId: string; user: ChatUser }
  | { type: "typing"; user: ChatUser; isTyping: boolean }
  | { type: "presence"; user: ChatUser; online: boolean }
  | { type: "pin"; messageId: string; pinned: boolean; by: ChatUser }
  | { type: "reaction"; messageId: string; emoji: string; user: ChatUser }
  | { type: "poll_vote"; messageId: string; optionId: string; user: ChatUser };

type Props = {
  roomId: string;
  isOpen?: boolean;
  onUnreadCountChange?: (count: number) => void;
  onParticipantsChange?: (participants: Array<{ id: string; name: string }>) => void;
  participantId?: string;
  participantName?: string;
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 * 1024 * 1024;
const REACTION_OPTIONS = [
  { key: "Like", emoji: "\u{1F44D}" },
  { key: "Love", emoji: "\u{2764}\u{FE0F}" },
  { key: "Haha", emoji: "\u{1F602}" },
  { key: "Party", emoji: "\u{1F389}" },
  { key: "Wow", emoji: "\u{1F62E}" },
];

const formatTime = (isoDate: string) => new Date(isoDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const createMessageId = () => (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const normalizeMentionToken = (token: string) => token.trim().toLowerCase().replace(/^@+/, "").replace(/[^a-z0-9._-]/g, "");
const extractMentions = (text: string) => (text.match(/@[a-zA-Z0-9._-]+/g) ?? []).map(normalizeMentionToken).filter(Boolean);
const mentionTokenFromLabel = (label: string) => normalizeMentionToken(label.replace(/\s+/g, "_"));

function getMentionDraft(value: string) {
  const match = value.match(/(?:^|\s)@([a-zA-Z0-9._-]*)$/);
  return match ? match[1] : null;
}

function renderMentions(text: string) {
  const parts = text.split(/(@[a-zA-Z0-9._-]+)/g);
  return parts.map((part, idx) =>
    part.startsWith("@") ? <span key={`${part}-${idx}`} className="font-semibold text-indigo-300">{part}</span> : <span key={`${part}-${idx}`}>{part}</span>
  );
}

async function parseApiBody(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json().catch(() => ({}));
  const text = await response.text().catch(() => "");
  if (text.toLowerCase().includes("<!doctype html")) return { error: "Server returned an internal error page. Please check server logs." };
  return { error: text || `Request failed with status ${response.status}` };
}

function toggleReactionEntry(reactions: Record<string, ChatUser[]>, emoji: string, user: ChatUser) {
  const next = { ...reactions };
  const current = next[emoji] ?? [];
  next[emoji] = current.some((entry) => entry.id === user.id) ? current.filter((entry) => entry.id !== user.id) : [...current, user];
  return next;
}

function applyPollVote(poll: PollData, optionId: string, voter: ChatUser) {
  const nextOptions = poll.options.map((option) => ({ ...option, votes: option.votes.filter((entry) => entry.id !== voter.id) }));
  const target = nextOptions.find((option) => option.id === optionId);
  if (target) target.votes = [...target.votes, voter];
  return { ...poll, options: nextOptions };
}

export default function ChatWindow({
  roomId,
  isOpen = true,
  onUnreadCountChange,
  onParticipantsChange,
  participantId,
  participantName,
}: Props) {
  const { user, isLoaded } = useUser();
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingExpiryRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastPresenceSeenRef = useRef<Record<string, number>>({});
  const fallbackIdRef = useRef(
    `guest-${typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Date.now()}`
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState("");
  const [audience, setAudience] = useState<"everyone" | "selected">("everyone");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [messageKind, setMessageKind] = useState<"message" | "note">("message");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [onlineUsers, setOnlineUsers] = useState<Record<string, string>>({});
  const [mentionAlerts, setMentionAlerts] = useState<string[]>([]);
  const [showPollComposer, setShowPollComposer] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [openMenuMessageId, setOpenMenuMessageId] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const meId = useMemo(
    () => participantId || user?.id || fallbackIdRef.current,
    [participantId, user?.id]
  );
  const meName = useMemo(
    () =>
      participantName?.trim() ||
      user?.fullName ||
      user?.emailAddresses[0]?.emailAddress ||
      user?.id ||
      "You",
    [participantName, user]
  );
  const me = useMemo<ChatUser>(() => ({ id: meId, name: meName }), [meId, meName]);

  const participantOptions = useMemo(
    () =>
      Object.entries(onlineUsers)
        .filter(([id]) => id !== meId)
        .map(([identity, label]) => ({ identity, label })),
    [onlineUsers, meId]
  );
  const messageMap = useMemo(() => { const map = new Map<string, ChatMessage>(); for (const entry of messages) map.set(entry.id, entry); return map; }, [messages]);
  const pinnedMessages = useMemo(() => messages.filter((entry) => entry.pinned && !entry.deletedAt), [messages]);
  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((entry) => (`${entry.content} ${entry.file?.name ?? ""} ${entry.senderName} ${entry.poll ? `${entry.poll.question} ${entry.poll.options.map((o) => o.text).join(" ")}` : ""}`).toLowerCase().includes(q));
  }, [messages, searchQuery]);
  const mentionCandidates = useMemo(() => {
    const base = [
      { token: "all", label: "All participants" },
      { token: mentionTokenFromLabel(meName), label: meName },
      ...participantOptions.map((participant) => ({
        token: mentionTokenFromLabel(participant.label),
        label: participant.label,
      })),
    ];
    const dedup = new Map<string, { token: string; label: string }>();
    for (const option of base) dedup.set(option.token, option);
    const items = Array.from(dedup.values());
    if (!mentionQuery.trim()) return items;
    const q = normalizeMentionToken(mentionQuery);
    return items.filter((item) => item.token.includes(q) || item.label.toLowerCase().includes(q));
  }, [meName, mentionQuery, participantOptions]);
  useEffect(() => {
    setSelectedRecipients((prev) => prev.filter((id) => participantOptions.some((participant) => participant.identity === id)));
  }, [participantOptions]);

  useEffect(() => {
    lastPresenceSeenRef.current[meId] = Date.now();
    setOnlineUsers((prev) => ({ ...prev, [meId]: meName }));
  }, [meId, meName]);

  useEffect(() => {
    if (isOpen && unreadCount !== 0) {
      setUnreadCount(0);
    }
  }, [isOpen, unreadCount]);

  useEffect(() => {
    onUnreadCountChange?.(unreadCount);
  }, [onUnreadCountChange, unreadCount]);

  useEffect(() => {
    onParticipantsChange?.(
      Object.entries(onlineUsers).map(([id, name]) => ({ id, name }))
    );
  }, [onlineUsers, onParticipantsChange]);

  const publishData = useCallback(
    async (payload: ChatWireMessage, _reliable = true) => {
      const response = await fetch(`/api/realtime/${encodeURIComponent(roomId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: meId, payload }),
      });
      return response.ok;
    },
    [meId, roomId]
  );

  const notifyMention = useCallback((sender: string, content: string) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const body = content || "You were mentioned in chat.";
    if (Notification.permission === "granted") {
      new Notification(`${sender} mentioned you`, { body });
      return;
    }
    if (Notification.permission === "default") {
      void Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          new Notification(`${sender} mentioned you`, { body });
        }
      });
    }
  }, []);

  useEffect(() => {
    const handleIncoming = (parsed: ChatWireMessage) => {
      try {
        if (parsed.type === "chat") {
          if (parsed.message.recipients && !parsed.message.recipients.includes(meId)) return;
          setMessages((prev) => (prev.some((entry) => entry.id === parsed.message.id) ? prev : [...prev, parsed.message]));
          if (parsed.message.senderId !== meId) {
            void publishData({ type: "seen", messageId: parsed.message.id, user: me });
            const mentions = extractMentions(parsed.message.content);
            const meTokens = [normalizeMentionToken(meId), normalizeMentionToken(meName.split(" ")[0] ?? "")].filter(Boolean);
            if (!isOpen) {
              setUnreadCount((prev) => prev + 1);
            }
            const isMentioned = mentions.includes("all") || mentions.some((mention) => meTokens.includes(mention));
            if (isMentioned) {
              setMentionAlerts((prev) => [`${parsed.message.senderName} mentioned you: ${parsed.message.content || "(file/poll)"}`, ...prev].slice(0, 6));
              notifyMention(parsed.message.senderName, parsed.message.content);
            }
          }
          return;
        }
        if (parsed.type === "delete") {
          setMessages((prev) => prev.map((entry) => (entry.id === parsed.messageId ? { ...entry, deletedAt: parsed.deletedAt, content: "Message deleted" } : entry)));
          return;
        }
        if (parsed.type === "edit") {
          setMessages((prev) => prev.map((entry) => (entry.id === parsed.messageId ? { ...entry, content: parsed.content, editedAt: parsed.editedAt } : entry)));
          return;
        }
        if (parsed.type === "seen") {
          setMessages((prev) => prev.map((entry) => {
            if (entry.id !== parsed.messageId) return entry;
            if (entry.seenBy.some((userEntry) => userEntry.id === parsed.user.id)) return entry;
            return { ...entry, seenBy: [...entry.seenBy, parsed.user] };
          }));
          return;
        }
        if (parsed.type === "typing") {
          if (parsed.user.id === meId) return;
          if (parsed.isTyping) {
            setTypingUsers((prev) => ({ ...prev, [parsed.user.id]: parsed.user.name }));
            const existing = typingExpiryRef.current[parsed.user.id];
            if (existing) clearTimeout(existing);
            typingExpiryRef.current[parsed.user.id] = setTimeout(() => setTypingUsers((prev) => {
              const next = { ...prev };
              delete next[parsed.user.id];
              return next;
            }), 1800);
          } else {
            setTypingUsers((prev) => {
              const next = { ...prev };
              delete next[parsed.user.id];
              return next;
            });
          }
          return;
        }
        if (parsed.type === "presence") {
          const now = Date.now();
          setOnlineUsers((prev) => {
            const next = { ...prev };
            if (parsed.online) {
              next[parsed.user.id] = parsed.user.name;
              lastPresenceSeenRef.current[parsed.user.id] = now;
            } else {
              delete next[parsed.user.id];
              delete lastPresenceSeenRef.current[parsed.user.id];
            }
            return next;
          });
          return;
        }
        if (parsed.type === "pin") {
          setMessages((prev) => prev.map((entry) => (entry.id === parsed.messageId ? { ...entry, pinned: parsed.pinned } : entry)));
          return;
        }
        if (parsed.type === "reaction") {
          setMessages((prev) => prev.map((entry) => (entry.id === parsed.messageId ? { ...entry, reactions: toggleReactionEntry(entry.reactions, parsed.emoji, parsed.user) } : entry)));
          return;
        }
        if (parsed.type === "poll_vote") {
          setMessages((prev) => prev.map((entry) => (entry.id === parsed.messageId && entry.poll ? { ...entry, poll: applyPollVote(entry.poll, parsed.optionId, parsed.user) } : entry)));
        }
      } catch {
        // Ignore non-chat payloads.
      }
    };

    const source = new EventSource(`/api/realtime/${encodeURIComponent(roomId)}`);
    eventSourceRef.current = source;

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as {
          senderId?: string;
          payload?: ChatWireMessage;
        };
        if (!data.payload) return;
        if (data.senderId === meId) return;
        handleIncoming(data.payload);
      } catch {
        // Ignore malformed events.
      }
    };

    return () => {
      source.close();
      eventSourceRef.current = null;
      Object.values(typingExpiryRef.current).forEach(clearTimeout);
      typingExpiryRef.current = {};
    };
  }, [me, meId, meName, publishData, isOpen, notifyMention, roomId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredMessages]);

  useEffect(() => {
    if (!meId) return;
    const PRESENCE_HEARTBEAT_MS = 4000;
    const PRESENCE_STALE_MS = 14000;

    const publishPresence = () => {
      const now = Date.now();
      lastPresenceSeenRef.current[meId] = now;
      setOnlineUsers((prev) => ({ ...prev, [meId]: meName }));
      void publishData({ type: "presence", user: me, online: true });
    };

    publishPresence();

    const heartbeat = setInterval(() => {
      publishPresence();
    }, PRESENCE_HEARTBEAT_MS);

    const reapStale = setInterval(() => {
      const now = Date.now();
      setOnlineUsers((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const id of Object.keys(next)) {
          const seenAt = lastPresenceSeenRef.current[id];
          if (!seenAt) continue;
          if (now - seenAt > PRESENCE_STALE_MS) {
            delete next[id];
            delete lastPresenceSeenRef.current[id];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, PRESENCE_HEARTBEAT_MS);

    return () => {
      clearInterval(heartbeat);
      clearInterval(reapStale);
      delete lastPresenceSeenRef.current[meId];
      void publishData({ type: "presence", user: me, online: false });
    };
  }, [me, meId, publishData]);

  const publishTyping = (isTyping: boolean) => {
    if (!meId) return;
    void publishData({ type: "typing", user: me, isTyping }, false);
  };

  const handleMessageInputChange = (value: string) => {
    setMessage(value);
    const draft = getMentionDraft(value);
    if (draft !== null) {
      setMentionQuery(draft);
      setShowMentionPicker(true);
    } else {
      setShowMentionPicker(false);
      setMentionQuery("");
    }
    publishTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => publishTyping(false), 1200);
  };

  const selectMention = (token: string) => {
    const next = message.replace(/(?:^|\s)@[a-zA-Z0-9._-]*$/, (matched) => {
      const prefix = matched.startsWith(" ") ? " " : "";
      return `${prefix}@${token} `;
    });
    setMessage(next);
    setShowMentionPicker(false);
    setMentionQuery("");
  };

  const uploadSelectedFile = async () => {
    if (!selectedFile) return null;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("roomId", roomId);
      const response = await fetch("/api/chat/upload", { method: "POST", body: formData });
      const body = (await parseApiBody(response)) as { error?: string; file?: { id: string; name: string; fileType: string; fileSize: number; downloadUrl: string } };
      if (!response.ok || !body.file) throw new Error(body.error || "Failed to upload file");
      return body.file;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFilePick = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    if (nextFile.size > MAX_FILE_SIZE_BYTES) {
      setError("File exceeds 5 TB limit");
      return;
    }
    setSelectedFile(nextFile);
    setError("");
  };

  const buildPollPayload = (): PollData | null => {
    if (!showPollComposer) return null;
    const cleanQuestion = pollQuestion.trim();
    const cleanOptions = pollOptions.map((entry) => entry.trim()).filter(Boolean);
    if (!cleanQuestion || cleanOptions.length < 2) {
      setError("Poll needs a question and at least 2 options.");
      return null;
    }
    return { question: cleanQuestion, options: cleanOptions.map((text) => ({ id: createMessageId(), text, votes: [] })) };
  };
  const sendMessage = async () => {
    if (!isLoaded || !user?.id) {
      setError("Please sign in to use chat.");
      return;
    }

    const content = message.trim();
    const poll = buildPollPayload();
    if (!content && !selectedFile && !poll) return;

    setSendingMessage(true);
    setError("");
    try {
      const uploadedFile = await uploadSelectedFile();
      const nextMessage: ChatMessage = {
        id: createMessageId(),
        senderId: meId,
        senderName: meName,
        content,
        createdAt: new Date().toISOString(),
        editedAt: null,
        deletedAt: null,
        recipients: audience === "everyone" ? null : Array.from(new Set([meId, ...selectedRecipients])),
        kind: poll ? "poll" : messageKind,
        replyToId,
        seenBy: [me],
        pinned: false,
        reactions: {},
        poll,
        file: uploadedFile,
      };

      const sent = await publishData({ type: "chat", message: nextMessage });
      if (!sent) throw new Error("Connection lost. Reconnect and try again.");
      setMessages((prev) => [...prev, nextMessage]);
      setMessage("");
      setSelectedFile(null);
      setReplyToId(null);
      setShowPollComposer(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      setShowMentionPicker(false);
      setMentionQuery("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      publishTyping(false);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const deleteMessageForMe = (messageId: string) => {
    setMessages((prev) => prev.filter((entry) => entry.id !== messageId));
  };

  const deleteMessageForEveryone = async (messageId: string) => {
    const existing = messages.find((entry) => entry.id === messageId);
    if (!existing || existing.senderId !== meId) return;
    const deletedAt = new Date().toISOString();
    await publishData({ type: "delete", messageId, deletedBy: meId, deletedAt });
    setMessages((prev) => prev.map((entry) => (entry.id === messageId ? { ...entry, deletedAt, content: "Message deleted" } : entry)));
  };

  const startEditMessage = (entry: ChatMessage) => {
    if (entry.senderId !== meId || entry.deletedAt) return;
    setEditingMessageId(entry.id);
    setEditingContent(entry.content);
  };

  const saveEditMessage = async () => {
    if (!editingMessageId) return;
    const newContent = editingContent.trim();
    if (!newContent) return;
    const editedAt = new Date().toISOString();
    await publishData({ type: "edit", messageId: editingMessageId, editedBy: meId, content: newContent, editedAt });
    setMessages((prev) => prev.map((entry) => (entry.id === editingMessageId ? { ...entry, content: newContent, editedAt } : entry)));
    setEditingMessageId(null);
    setEditingContent("");
  };

  const togglePinMessage = async (messageId: string) => {
    const existing = messages.find((entry) => entry.id === messageId);
    if (!existing) return;
    const nextPinned = !existing.pinned;
    await publishData({ type: "pin", messageId, pinned: nextPinned, by: me });
    setMessages((prev) => prev.map((entry) => (entry.id === messageId ? { ...entry, pinned: nextPinned } : entry)));
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    await publishData({ type: "reaction", messageId, emoji, user: me }, false);
    setMessages((prev) => prev.map((entry) => (entry.id === messageId ? { ...entry, reactions: toggleReactionEntry(entry.reactions, emoji, me) } : entry)));
  };

  const votePoll = async (messageId: string, optionId: string) => {
    await publishData({ type: "poll_vote", messageId, optionId, user: me });
    setMessages((prev) => prev.map((entry) => (entry.id === messageId && entry.poll ? { ...entry, poll: applyPollVote(entry.poll, optionId, me) } : entry)));
  };

  const typingNames = Object.values(typingUsers);
  const onlineCount = Object.keys(onlineUsers).length;

  return (
    <section className="h-full min-w-0 flex flex-col bg-background text-foreground">
      <div className="space-y-2 border-b border-border bg-card px-2 py-2 sm:px-3 sm:py-3 md:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div>
            <p className="text-sm font-semibold">Meeting Chat</p>
            <p className="max-w-[52vw] truncate text-xs text-muted-foreground sm:max-w-[18rem]">{roomId}</p>
          </div>
          <p className="text-xs text-emerald-600">{onlineCount} online</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search messages, files, polls" className="pl-8" />
        </div>
      </div>

      {mentionAlerts.length > 0 ? (
        <div className="border-b border-amber-200 bg-amber-50 px-2 py-2 sm:px-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-700 flex items-center gap-1"><Bell className="h-3.5 w-3.5" /> Mentions</p>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setMentionAlerts([])}>Clear</Button>
          </div>
          <div className="mt-1 space-y-1">
            {mentionAlerts.map((alert, index) => <p key={`${alert}-${index}`} className="text-xs text-amber-700 truncate">{alert}</p>)}
          </div>
        </div>
      ) : null}

      {error ? <p className="bg-red-500/10 px-4 py-2 text-xs text-red-600 dark:text-red-300">{error}</p> : null}
      {pinnedMessages.length > 0 ? (
        <div className="border-b border-border bg-muted/40 px-2 py-2 sm:px-4">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">Pinned</p>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {pinnedMessages.map((entry) => (
              <button key={`pin-${entry.id}`} type="button" onClick={() => document.getElementById(`msg-${entry.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} className="w-full rounded border border-border bg-card px-2 py-1 text-left text-xs hover:bg-accent">
                <span className="font-semibold mr-1">{entry.senderName}:</span>
                <span className="truncate inline-block max-w-[16rem] align-bottom">{entry.content || entry.file?.name || "(poll)"}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-x-hidden overflow-y-auto px-2 py-3 space-y-3 md:px-3 md:py-4">
        {!isLoaded ? <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading chat...</div> : null}

        {filteredMessages.map((entry) => {
          const isMine = entry.senderId === meId;
          const replyTarget = entry.replyToId ? messageMap.get(entry.replyToId) : null;
          const hasDeleted = Boolean(entry.deletedAt);

          return (
            <div id={`msg-${entry.id}`} key={entry.id} className={`flex min-w-0 ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`min-w-0 max-w-[98%] rounded-2xl px-2.5 py-2 shadow-sm sm:max-w-[92%] sm:px-3 md:max-w-[82%] ${isMine ? "bg-blue-600 text-white" : "bg-card text-card-foreground border border-border"}`}>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <p className={`text-[11px] ${isMine ? "text-blue-100" : "text-muted-foreground"}`}>{entry.senderName}</p>
                  <p className={`text-[11px] ${isMine ? "text-blue-100" : "text-muted-foreground"}`}>{formatTime(entry.createdAt)}</p>
                </div>

                {entry.kind === "note" ? <p className={`mb-1 inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${isMine ? "bg-blue-500 text-white" : "bg-amber-100 text-amber-800"}`}>Note</p> : null}
                {entry.replyToId && replyTarget ? <div className={`mb-2 rounded border px-2 py-1 text-xs ${isMine ? "border-blue-300/40 bg-blue-500/30" : "border-border bg-muted/40"}`}><p className="font-semibold">Reply to {replyTarget.senderName}</p><p className="truncate">{replyTarget.content || replyTarget.file?.name || "(poll)"}</p></div> : null}

                {editingMessageId === entry.id ? (
                  <div className="mb-2 flex gap-2">
                    <Input value={editingContent} onChange={(e) => setEditingContent(e.target.value)} className="h-8" />
                    <Button size="sm" onClick={() => void saveEditMessage()}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingMessageId(null)}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <>
                    {entry.content ? <p className="text-sm whitespace-pre-wrap">{renderMentions(entry.content)}</p> : null}
                    {entry.poll ? (
                      <div className={`mt-2 rounded-lg border p-2 ${isMine ? "border-blue-300/40 bg-blue-500/20" : "border-border bg-muted/40"}`}>
                        <p className="mb-2 break-words text-xs font-semibold">
                          Poll: {entry.poll.question}
                        </p>
                        <div className="space-y-1">
                          {entry.poll.options.map((option) => {
                            const voted = option.votes.some((vote) => vote.id === meId);
                            return <button key={option.id} type="button" onClick={() => void votePoll(entry.id, option.id)} className={`w-full flex items-center justify-between text-left rounded px-2 py-1 text-xs border ${voted ? "border-emerald-500 bg-emerald-50 text-slate-900 dark:bg-emerald-500/20 dark:text-emerald-100" : "border-border bg-card text-card-foreground"}`}><span className="min-w-0 flex-1 break-words pr-2">{option.text}</span><span className="shrink-0">{option.votes.length}</span></button>;
                          })}
                        </div>
                      </div>
                    ) : null}
                    {entry.file ? <div className="mt-2"><FilePreview file={entry.file} /></div> : null}
                  </>
                )}

                <div className={`mt-1 flex items-center gap-2 flex-wrap text-[11px] ${isMine ? "text-blue-100" : "text-muted-foreground"}`}>
                  {entry.editedAt ? <span>(edited)</span> : null}
                  {entry.recipients ? <span>Private message</span> : null}
                  {hasDeleted ? <span>Deleted</span> : null}
                  {isMine && entry.seenBy.length > 1 ? <span>Seen by {entry.seenBy.filter((u) => u.id !== meId).map((u) => u.name).join(", ")}</span> : null}
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1 flex-wrap">
                    {REACTION_OPTIONS.map((option) => {
                      const count = entry.reactions[option.key]?.length ?? 0;
                      if (count <= 0) return null;
                      return (
                        <span
                          key={`${entry.id}-summary-${option.key}`}
                          className={`rounded-full px-2 py-0.5 text-[11px] border ${isMine ? "border-blue-200/40 bg-blue-500/30 text-white" : "border-border bg-muted/40 text-foreground"}`}
                        >
                          {option.emoji} {count}
                        </span>
                      );
                    })}
                  </div>

                  <div className="flex max-w-full items-center gap-1 overflow-x-auto pb-1">
                    {!hasDeleted ? (
                      <>
                        <Button type="button" variant="ghost" size="sm" className={`h-8 px-2 ${isMine ? "text-white hover:bg-blue-700" : ""}`} onClick={() => setReplyToId(entry.id)}>
                          <Reply className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className={`h-8 px-2 ${isMine ? "text-white hover:bg-blue-700" : ""}`} onClick={() => void togglePinMessage(entry.id)}>
                          {entry.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                        </Button>
                      </>
                    ) : null}
                    {isMine ? (
                      <>
                        {!hasDeleted ? (
                          <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-white hover:bg-blue-700" onClick={() => startEditMessage(entry)}>
                            <SquarePen className="h-4 w-4" />
                          </Button>
                        ) : null}
                        <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-white hover:bg-blue-700" onClick={() => deleteMessageForMe(entry.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {!hasDeleted ? (
                          <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-white hover:bg-blue-700 whitespace-nowrap" onClick={() => void deleteMessageForEveryone(entry.id)}>
                            Delete all
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={`h-8 px-2 whitespace-nowrap ${isMine ? "text-white hover:bg-blue-700" : ""}`}
                        onClick={() => deleteMessageForMe(entry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete for me
                      </Button>
                    )}

                    <div className="relative">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={`h-8 px-2 ${isMine ? "text-white hover:bg-blue-700" : ""}`}
                        onClick={() => setOpenMenuMessageId((prev) => (prev === entry.id ? null : entry.id))}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>

                    {openMenuMessageId === entry.id ? (
                      <div className="absolute right-0 z-30 mt-1 w-44 rounded-md border border-border bg-card p-2 text-card-foreground shadow-lg sm:w-48 md:w-52">
                        {!hasDeleted ? (
                          <>
                            <p className="px-2 py-1 text-[11px] text-muted-foreground">Reactions</p>
                            <div className="flex items-center gap-1 overflow-x-auto">
                              {REACTION_OPTIONS.map((option) => (
                                <Button
                                  key={`${entry.id}-menu-${option.key}`}
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => { void toggleReaction(entry.id, option.key); setOpenMenuMessageId(null); }}
                                >
                                  {option.emoji}
                                </Button>
                              ))}
                            </div>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {typingNames.length > 0 ? <p className="px-1 text-xs text-muted-foreground">{typingNames.join(", ")} typing...</p> : null}
        <div ref={endRef} />
      </div>
      <div className="border-t border-border bg-card p-2 md:p-3">
        <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto] lg:items-center">
          <label className="text-xs text-muted-foreground lg:justify-self-end">Type</label>
          <select value={messageKind} onChange={(event) => setMessageKind(event.target.value as "message" | "note")} className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs">
            <option value="message">Message</option>
            <option value="note">Note</option>
          </select>

          <label className="text-xs text-muted-foreground lg:justify-self-end">Send to</label>
          <select value={audience} onChange={(event) => setAudience(event.target.value as "everyone" | "selected")} className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs">
            <option value="everyone">Everyone</option>
            <option value="selected">Selected participants</option>
          </select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 w-full sm:w-auto lg:justify-self-start"
            onClick={() => setShowPollComposer((prev) => !prev)}
          >
            <Vote className="h-4 w-4 shrink-0" /> Poll
          </Button>
        </div>

        {audience === "selected" ? (
          <div className="mb-2 max-h-24 overflow-y-auto rounded-md border border-border bg-muted/40 p-2">
            {participantOptions.length === 0 ? <p className="text-xs text-muted-foreground">No other participants available</p> : (
              <div className="space-y-1">
                {participantOptions.map((participant) => {
                  const checked = selectedRecipients.includes(participant.identity);
                  return (
                    <label key={participant.identity} className="flex items-center gap-2 text-xs text-foreground">
                      <input type="checkbox" checked={checked} onChange={(event) => setSelectedRecipients((prev) => event.target.checked ? Array.from(new Set([...prev, participant.identity])) : prev.filter((id) => id !== participant.identity))} />
                      <span className="truncate">{participant.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {replyToId ? (
          <div className="mb-2 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700 flex items-center justify-between">
            <span>Replying to {messageMap.get(replyToId)?.senderName ?? "message"}</span>
            <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setReplyToId(null)}><X className="h-3 w-3" /></Button>
          </div>
        ) : null}

        {showPollComposer ? (
           <div className="mb-2 max-h-52 space-y-2 overflow-y-auto rounded-md border border-border bg-muted/40 p-2">
            <Input
              placeholder="Poll question"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              className="w-full"
            />
            {pollOptions.map((option, idx) => (
              <div key={`poll-option-${idx}`} className="flex min-w-0 items-center gap-2">
                <Input
                  placeholder={`Option ${idx + 1}`}
                  value={option}
                  onChange={(e) =>
                    setPollOptions((prev) =>
                      prev.map((entry, i) => (i === idx ? e.target.value : entry))
                    )
                  }
                  className="min-w-0 flex-1"
                />
                {pollOptions.length > 2 ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => setPollOptions((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setPollOptions((prev) => [...prev, ""])}
            >
              <SmilePlus className="h-4 w-4" /> Add option
            </Button>
          </div>
        ) : null}

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFilePick} />
          <Button type="button" variant="outline" size="sm" className="h-9 w-full sm:w-auto" disabled={sendingMessage || uploadingFile} onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="mr-1 h-4 w-4" />
            Upload file (max 5 TB)
          </Button>
        </div>

        {selectedFile ? (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
            <span className="truncate pr-2 min-w-0">{selectedFile.name}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>Remove</Button>
          </div>
        ) : null}

        {showMentionPicker && mentionCandidates.length > 0 ? (
          <div className="mb-2 max-h-40 overflow-y-auto rounded-md border border-border bg-card shadow-sm">
            {mentionCandidates.map((candidate) => (
              <button
                key={`mention-${candidate.token}`}
                type="button"
                className="w-full px-3 py-2 text-left text-xs hover:bg-accent"
                onClick={() => selectMention(candidate.token)}
              >
                @{candidate.token} <span className="text-muted-foreground">({candidate.label})</span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Input
            value={message}
            onChange={(event) => handleMessageInputChange(event.target.value)}
            placeholder={messageKind === "note" ? "Write a note" : "Type a message. Use @name for mentions"}
            disabled={sendingMessage || uploadingFile}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void sendMessage(); } }}
          />
          <Button type="button" onClick={() => void sendMessage()} disabled={sendingMessage || uploadingFile || (audience === "selected" && selectedRecipients.length === 0)} className="h-9 shrink-0 bg-blue-600 text-white hover:bg-blue-700">
            {sendingMessage || uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </section>
  );
}
