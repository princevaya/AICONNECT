// components/external-chat/status-viewer.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, MessageCircle, Send, Camera, User, Eye, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import NextImage from "next/image";

type UserRow = { id: string; clerkId: string; name: string | null; email: string | null; imageUrl?: string | null };
type StatusAttachment = {
  id: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  downloadUrl: string;
};
type StatusComment = {
  id: string;
  content: string;
  createdAt: string;
  author: UserRow;
};
type StatusReaction = {
  emoji: string;
  userId: string;
  user: UserRow;
  createdAt: string;
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

interface StatusViewerProps {
  statuses: StatusItem[];
  initialIndex: number;
  onClose: () => void;
  onStatusViewed: (statusId: string) => void;
  onReact: (statusId: string, emoji: string) => void;
  onComment: (statusId: string, content: string) => void;
  onCreateStatus?: () => void;
  currentUserId: string;
}

export default function StatusViewer({
  statuses,
  initialIndex,
  onClose,
  onStatusViewed,
  onReact,
  onComment,
  onCreateStatus,
  currentUserId,
}: StatusViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<StatusComment[]>([]);
  const [reactions, setReactions] = useState<StatusReaction[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingReactions, setLoadingReactions] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const status = statuses[currentIndex];
  const isOwnStatus = status?.userId === currentUserId;

  // Load comments when comments panel opens
  useEffect(() => {
    if (!status || !showComments) return;
    setLoadingComments(true);
    fetch(`/api/external-chat/statuses/${status.id}/comments`)
      .then(res => res.json())
      .then(data => setComments(data.comments || []))
      .catch(console.error)
      .finally(() => setLoadingComments(false));
  }, [status, showComments]);

  // Load reactions
  useEffect(() => {
    if (!status) return;
    setLoadingReactions(true);
    fetch(`/api/external-chat/statuses/${status.id}/reactions`)
      .then(res => res.json())
      .then(data => setReactions(data.reactions || []))
      .catch(console.error)
      .finally(() => setLoadingReactions(false));
  }, [status]);

  // Mark as viewed
  useEffect(() => {
    if (!status || status.viewedByViewer || isOwnStatus) return;
    onStatusViewed(status.id);
  }, [status, onStatusViewed, isOwnStatus]);

  // Pause video when comments are open
  useEffect(() => {
    if (showComments) {
      setIsPaused(true);
    }
  }, [showComments]);

  // Progress bar animation
  useEffect(() => {
    if (!status || isPaused || showComments) return;

    setProgress(0);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    const duration = status.attachment?.mimeType?.startsWith("video/") ? 30000 : 5000;
    const interval = 100;
    const step = (interval / duration) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          nextStatus();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [currentIndex, isPaused, showComments, status]);

  // Video playback control
  useEffect(() => {
    if (!videoRef.current || !status?.attachment?.mimeType?.startsWith("video/")) return;
    if (isPaused || showComments) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(console.error);
    }
  }, [isPaused, showComments, status]);

  const nextStatus = () => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowComments(false);
      setCommentText("");
    } else {
      onClose();
    }
  };

  const prevStatus = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowComments(false);
      setCommentText("");
    }
  };

  const handleReact = async (emoji: string) => {
    if (!status) return;
    await onReact(status.id, emoji);
    // Refresh reactions
    const res = await fetch(`/api/external-chat/statuses/${status.id}/reactions`);
    const data = await res.json();
    setReactions(data.reactions || []);
  };

  const handleComment = async () => {
    if (!status || !commentText.trim()) return;
    try {
      const response = await fetch(`/api/external-chat/statuses/${status.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      const data = await response.json();
      if (response.ok) {
        setComments(prev => [data.comment, ...prev]);
        setCommentText("");
        onComment(status.id, commentText.trim());
      }
    } catch (error) {
      console.error("Failed to comment:", error);
    }
  };

  // Group reactions by emoji for display
  const groupedReactions = reactions.reduce((acc, r) => {
    const existing = acc.find(a => a.emoji === r.emoji);
    if (existing) {
      existing.count++;
      existing.users.push(r.user);
    } else {
      acc.push({ emoji: r.emoji, count: 1, users: [r.user] });
    }
    return acc;
  }, [] as Array<{ emoji: string; count: number; users: UserRow[] }>);

  // If no statuses
  if (statuses.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
        <div className="w-[92vw] max-w-md rounded-2xl border border-border/70 bg-background/95 p-6 text-center shadow-2xl">
          <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Status Updates</h3>
          <p className="text-sm text-muted-foreground mb-4">
            There are no status updates to show right now.
          </p>
          {onCreateStatus && (
            <Button onClick={onCreateStatus}>Add Your Status</Button>
          )}
        </div>
      </div>
    );
  }

  if (!status) return null;

  const isVideo = status.attachment?.mimeType?.startsWith("video/");
  const isImage = status.attachment?.mimeType?.startsWith("image/");

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Navigation buttons */}
      {currentIndex > 0 && (
        <button
          onClick={prevStatus}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}
      {currentIndex < statuses.length - 1 && (
        <button
          onClick={nextStatus}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
        {statuses.map((_, idx) => (
          <div
            key={idx}
            className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width: idx < currentIndex ? "100%" : idx === currentIndex ? `${progress}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Status content */}
      <div
        className="absolute inset-0 flex items-center justify-center cursor-pointer"
        onClick={() => !showComments && setIsPaused(!isPaused)}
      >
        {isVideo && status.attachment && (
          <video
            ref={videoRef}
            src={status.attachment.downloadUrl}
            className="max-h-full max-w-full object-contain"
            autoPlay
            playsInline
            muted={false}
          />
        )}
        {isImage && status.attachment && (
          <NextImage
            src={status.attachment.downloadUrl}
            alt="Status"
            width={800}
            height={800}
            className="max-h-full max-w-full object-contain"
            unoptimized
          />
        )}
        {status.text && !isVideo && !isImage && (
          <div className="max-w-[80%] text-center">
            <p className="text-white text-2xl">{status.text}</p>
          </div>
        )}
      </div>

      {/* Header info */}
      <div className="absolute top-4 left-4 right-20 z-10 flex items-center gap-3">
        <div className="h-12 w-12 rounded-full overflow-hidden bg-white/20">
          {status.author.imageUrl ? (
            <NextImage
              src={status.author.imageUrl}
              alt={status.author.name || "User"}
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-white text-lg font-semibold">
              {(status.author.name?.[0] || status.author.email?.[0] || "U").toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <p className="text-white font-semibold">{status.author.name || status.author.email || "User"}</p>
          <p className="text-white/70 text-xs">
            {new Date(status.publishedAt).toLocaleTimeString()} • {status.viewerCount} views
          </p>
        </div>
      </div>

      {/* Reactions display */}
      {groupedReactions.length > 0 && (
        <div className="absolute bottom-32 left-0 right-0 z-10 flex justify-center">
          <div className="flex flex-wrap gap-2 bg-black/50 rounded-full px-4 py-2">
            {groupedReactions.map((reaction, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <span className="text-xl">{reaction.emoji}</span>
                <span className="text-white text-xs">{reaction.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="absolute bottom-20 left-0 right-0 z-10 flex justify-center gap-4">
        <div className="flex gap-2 bg-black/50 rounded-full p-2">
          {["👍", "❤️", "😂", "😮", "😢"].map(emoji => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-2xl transition-colors"
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={() => setShowComments(!showComments)}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Comments panel - pauses status when open */}
      {showComments && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/90 backdrop-blur-xl rounded-t-2xl max-h-[60vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-white font-semibold">Comments</h3>
            <button onClick={() => setShowComments(false)} className="text-white/70">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingComments && <p className="text-white/50 text-center">Loading...</p>}
            {!loadingComments && comments.length === 0 && (
              <p className="text-white/50 text-center">No comments yet</p>
            )}
            {comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <div className="h-8 w-8 rounded-full overflow-hidden bg-white/20 flex-shrink-0">
                  {comment.author.imageUrl ? (
                    <NextImage
                      src={comment.author.imageUrl}
                      alt=""
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-white text-xs font-semibold">
                      {(comment.author.name?.[0] || comment.author.email?.[0] || "U").toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm">
                    <span className="font-semibold">{comment.author.name || comment.author.email || "User"}</span>
                    {" "}{comment.content}
                  </p>
                  <p className="text-white/50 text-xs mt-1">
                    {new Date(comment.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-white/10 flex gap-2">
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Send a message..."
              className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
              onKeyDown={(e) => e.key === "Enter" && handleComment()}
            />
            <Button onClick={handleComment} size="icon" className="bg-white/10 hover:bg-white/20">
              <Send className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>
      )}

      {/* Pause indicator */}
      {isPaused && !showComments && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
            <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-white border-b-[12px] border-b-transparent ml-1" />
          </div>
        </div>
      )}
    </div>
  );
}