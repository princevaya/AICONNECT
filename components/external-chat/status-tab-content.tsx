// components/external-chat/status-tab-content.tsx

"use client";

import { useState, useEffect } from "react";
import { Camera, Plus, MoreVertical, Trash2, Eye, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import NextImage from "next/image";
import StatusCreator from "./status-creator";

type UserRow = { id: string; clerkId: string; name: string | null; email: string | null; imageUrl?: string | null };
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

interface StatusTabContentProps {
  userId: string;
  onViewStatus: (status: StatusItem, index: number, allStatuses: StatusItem[]) => void;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const requestInit: RequestInit = {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    credentials: "same-origin",
    cache: "no-store",
  };
  const res = await fetch(url, requestInit);
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    const e = new Error(body.error || "Request failed");
    (e as Error & { status?: number }).status = res.status;
    throw e;
  }
  return body;
}

export default function StatusTabContent({ userId, onViewStatus }: StatusTabContentProps) {
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [selfStatus, setSelfStatus] = useState<StatusItem | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [menuOpenForStatusId, setMenuOpenForStatusId] = useState<string | null>(null);

  const loadStatuses = async () => {
    setLoading(true);
    try {
      const data = await api<{ selfStatus: StatusItem | null; statuses: StatusItem[] }>("/api/external-chat/statuses");
      setSelfStatus(data.selfStatus || null);
      setStatuses(data.statuses || []);
    } catch (error) {
      console.error("Failed to load statuses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatuses();
  }, []);

  const handleDeleteStatus = async (statusId: string) => {
    if (!confirm("Delete this status?")) return;
    try {
      await api(`/api/external-chat/statuses/${statusId}`, { method: "DELETE" });
      if (selfStatus?.id === statusId) {
        setSelfStatus(null);
      } else {
        setStatuses(prev => prev.filter(s => s.id !== statusId));
      }
      setMenuOpenForStatusId(null);
    } catch (error) {
      console.error("Failed to delete status:", error);
    }
  };

  // Separate statuses into recent and viewed
  const recentStatuses = statuses.filter(s => !s.viewedByViewer);
  const viewedStatuses = statuses.filter(s => s.viewedByViewer);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-20">
      {/* My Status Section */}
      <div className="border-b border-border/60">
        <div className="px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">My Status</p>
          <div
            className="flex items-center gap-3 p-3 rounded-xl border border-border/70 bg-muted/25 cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => {
              if (selfStatus) {
                const allStatuses = selfStatus ? [selfStatus, ...statuses] : statuses;
                onViewStatus(selfStatus, 0, allStatuses);
              } else {
                setCreatorOpen(true);
              }
            }}
          >
            <div className="relative">
              <div className="h-12 w-12 rounded-full overflow-hidden bg-primary/15 flex items-center justify-center">
                {selfStatus?.attachment?.downloadUrl ? (
                  <NextImage
                    src={selfStatus.attachment.downloadUrl}
                    alt="My status"
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <Camera className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              {!selfStatus && (
                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[#25D366] flex items-center justify-center">
                  <Plus className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium">My Status</p>
              <p className="text-xs text-muted-foreground">
                {selfStatus ? `Tap to view • ${new Date(selfStatus.publishedAt).toLocaleDateString()}` : "Add a status update"}
              </p>
            </div>
            {selfStatus && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenForStatusId(menuOpenForStatusId === selfStatus.id ? null : selfStatus.id);
                  }}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
                {menuOpenForStatusId === selfStatus.id && (
                  <div className="absolute right-0 top-full mt-1 z-10 w-36 rounded-md border border-border bg-card shadow-lg">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStatus(selfStatus.id);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-accent rounded-md"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Updates Section */}
      {recentStatuses.length > 0 && (
        <div className="border-b border-border/60">
          <div className="px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Recent Updates</p>
            <div className="space-y-2">
              {recentStatuses.map((status, idx) => {
                const globalIndex = selfStatus ? idx + 1 : idx;
                return (
                  <div
                    key={status.id}
                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => {
                      const allStatuses = selfStatus ? [selfStatus, ...statuses] : statuses;
                      onViewStatus(status, globalIndex, allStatuses);
                    }}
                  >
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-primary/15 flex items-center justify-center ring-2 ring-emerald-500">
                        {status.author.imageUrl ? (
                          <NextImage
                            src={status.author.imageUrl}
                            alt={status.author.name || "User"}
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-primary">
                            {(status.author.name?.[0] || status.author.email?.[0] || "U").toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{status.author.name || status.author.email?.split("@")[0] || "User"}</p>
                      <p className="text-xs text-muted-foreground">
                        {status.text?.slice(0, 40) || (status.attachment ? "📷 Photo" : "Status update")}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Viewed Updates Section */}
      {viewedStatuses.length > 0 && (
        <div className="px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Viewed Updates</p>
          <div className="space-y-2">
            {viewedStatuses.map((status, idx) => {
              const globalIndex = selfStatus ? recentStatuses.length + idx + 1 : recentStatuses.length + idx;
              return (
                <div
                  key={status.id}
                  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors opacity-70"
                  onClick={() => {
                    const allStatuses = selfStatus ? [selfStatus, ...statuses] : statuses;
                    onViewStatus(status, globalIndex, allStatuses);
                  }}
                >
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-primary/15 flex items-center justify-center ring-1 ring-muted">
                    {status.author.imageUrl ? (
                      <NextImage
                        src={status.author.imageUrl}
                        alt={status.author.name || "User"}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-muted-foreground">
                        {(status.author.name?.[0] || status.author.email?.[0] || "U").toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-muted-foreground">{status.author.name || status.author.email?.split("@")[0] || "User"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(status.publishedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Eye className="h-3 w-3 text-muted-foreground" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selfStatus && recentStatuses.length === 0 && viewedStatuses.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-center px-4">
          <Camera className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-1">No status updates</p>
          <p className="text-xs text-muted-foreground/70">Tap "My Status" to share a photo or update</p>
        </div>
      )}

      {/* Status Creator Modal */}
      {creatorOpen && (
        <StatusCreator
          onClose={() => {
            setCreatorOpen(false);
            loadStatuses();
          }}
          onPost={async (text, file, visibility) => {
            await loadStatuses();
            setCreatorOpen(false);
          }}
          roomId=""
          roomCode=""
        />
      )}
    </div>
  );
}