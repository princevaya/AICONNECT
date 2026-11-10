// components/external-chat/status-tab-content.tsx

"use client";

import { useState, useEffect } from "react";
import { Camera, Plus, MoreVertical, Trash2, Eye, ChevronRight, Loader2, Users } from "lucide-react";
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
  attachment: { id: string; fileName: string; mimeType?: string; downloadUrl: string } | null;
};

type StatusInsightViewer = {
  user?: UserRow;
  viewer?: UserRow;
  viewedAt: string;
};

interface StatusTabContentProps {
  userId: string;
  onViewStatus: (status: StatusItem, index: number, allStatuses: StatusItem[]) => void;
}

function formatRemainingExpiry(expiresAt: string): string {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return "Expired";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m left`;
  const hours = Math.floor(mins / 60);
  return `${hours}h left`;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const requestInit: RequestInit = {
    ...init,
    headers: isFormData ? init?.headers : { "Content-Type": "application/json", ...(init?.headers || {}) },
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
  const [selfStatuses, setSelfStatuses] = useState<StatusItem[]>([]);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [menuOpenForStatusId, setMenuOpenForStatusId] = useState<string | null>(null);
  const [insightsStatusId, setInsightsStatusId] = useState<string | null>(null);
  const [insightsViewers, setInsightsViewers] = useState<StatusInsightViewer[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const selfStatus = selfStatuses[0] || null;
  const allCombinedStatuses = [...selfStatuses, ...statuses];

  const loadStatuses = async () => {
    setLoading(true);
    try {
      const data = await api<{
        selfStatus: StatusItem | null;
        selfStatuses?: StatusItem[];
        statuses: StatusItem[];
      }>("/api/external-chat/statuses");
      const own = data.selfStatuses && data.selfStatuses.length > 0
        ? data.selfStatuses
        : data.selfStatus
          ? [data.selfStatus]
          : [];
      setSelfStatuses(own);
      setStatuses(data.statuses || []);
    } catch (error) {
      console.error("Failed to load statuses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatuses();
  }, [userId]);

  const handleDeleteStatus = async (statusId: string) => {
    if (!confirm("Delete this status?")) return;
    try {
      await api(`/api/external-chat/statuses/${statusId}`, { method: "DELETE" });
      setSelfStatuses((prev) => prev.filter((s) => s.id !== statusId));
      setStatuses((prev) => prev.filter((s) => s.id !== statusId));
      setMenuOpenForStatusId(null);
      if (insightsStatusId === statusId) {
        setInsightsStatusId(null);
        setInsightsViewers([]);
      }
    } catch (error) {
      console.error("Failed to delete status:", error);
    }
  };

  const handleOpenInsights = async (statusId: string) => {
    setMenuOpenForStatusId(null);
    setInsightsStatusId(statusId);
    setLoadingInsights(true);
    try {
      const data = await api<{ viewers?: StatusInsightViewer[] }>(`/api/external-chat/statuses/${statusId}/insights`);
      setInsightsViewers(data.viewers || []);
    } catch (error) {
      console.error("Failed to load status viewers:", error);
      setInsightsViewers([]);
    } finally {
      setLoadingInsights(false);
    }
  };

  const handlePostStatus = async (
    text: string | null,
    file: File | null,
    visibility: "public" | "contacts" | "private",
  ) => {
    let attachmentId: string | undefined;
    if (file) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("scope", "status");
      const uploadRes = await api<{ attachment: { id: string } }>("/api/external-chat/upload", {
        method: "POST",
        body: fd,
      });
      attachmentId = uploadRes.attachment.id;
    }

    await api<{ status: StatusItem }>("/api/external-chat/statuses", {
      method: "POST",
      body: JSON.stringify({
        text: text || undefined,
        attachmentId,
        visibility,
      }),
    });

    await loadStatuses();
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
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">My Status (24h)</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setCreatorOpen(true)}
              className="h-7 gap-1 px-2 text-xs border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10"
            >
              <Plus className="h-3.5 w-3.5" /> Add Story
            </Button>
          </div>

          {selfStatuses.length === 0 ? (
            <div
              className="flex items-center gap-3 p-3 rounded-xl border border-border/70 bg-muted/25 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setCreatorOpen(true)}
            >
              <div className="relative">
                <div className="h-12 w-12 rounded-full overflow-hidden bg-primary/15 flex items-center justify-center">
                  <Camera className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[#25D366] flex items-center justify-center">
                  <Plus className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-medium">My Status</p>
                <p className="text-xs text-muted-foreground">Tap to share a 24-hour story update</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {selfStatuses.map((ownItem, ownIndex) => (
                <div
                  key={ownItem.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/70 bg-muted/25 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => onViewStatus(ownItem, ownIndex, allCombinedStatuses)}
                >
                  <div className="relative shrink-0">
                    <div className="h-11 w-11 rounded-full overflow-hidden bg-primary/15 flex items-center justify-center ring-2 ring-[#25D366]">
                      {ownItem.attachment?.downloadUrl ? (
                        <NextImage
                          src={ownItem.attachment.downloadUrl}
                          alt="My status"
                          width={44}
                          height={44}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <Camera className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {ownItem.text || ownItem.attachment?.fileName || "My Story Update"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ownItem.viewerCount} view{ownItem.viewerCount === 1 ? "" : "s"} • {formatRemainingExpiry(ownItem.expiresAt)}
                    </p>
                  </div>
                  <div className="relative shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenForStatusId(menuOpenForStatusId === ownItem.id ? null : ownItem.id);
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    {menuOpenForStatusId === ownItem.id && (
                      <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-md border border-border bg-card shadow-lg">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenInsights(ownItem.id);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-t-md"
                        >
                          <Users className="h-4 w-4" />
                          Viewers ({ownItem.viewerCount})
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStatus(ownItem.id);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-accent rounded-b-md"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {insightsStatusId && (
            <div className="mt-3 rounded-xl border border-border/70 bg-background/80 p-3 text-xs">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-foreground">Story Viewers</span>
                <button
                  type="button"
                  onClick={() => setInsightsStatusId(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Close
                </button>
              </div>
              {loadingInsights ? (
                <div className="flex items-center gap-2 text-muted-foreground py-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading viewers...
                </div>
              ) : insightsViewers.length === 0 ? (
                <p className="text-muted-foreground">No views yet.</p>
              ) : (
                <ul className="space-y-1.5 max-h-36 overflow-y-auto">
                  {insightsViewers.map((entry, i) => {
                    const person = entry.user || entry.viewer;
                    return (
                      <li key={`${person?.id || "v"}-${i}`} className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium text-foreground">
                          {person?.name || person?.email || person?.clerkId || "User"}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {new Date(entry.viewedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent Updates Section */}
      {recentStatuses.length > 0 && (
        <div className="border-b border-border/60">
          <div className="px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Recent Updates</p>
            <div className="space-y-2">
              {recentStatuses.map((status, idx) => {
                const globalIndex = selfStatuses.length + statuses.findIndex((s) => s.id === status.id);
                return (
                  <div
                    key={status.id}
                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => onViewStatus(status, globalIndex >= 0 ? globalIndex : selfStatuses.length + idx, allCombinedStatuses)}
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
                            unoptimized
                          />
                        ) : (
                          <span className="text-sm font-semibold text-primary">
                            {(status.author.name?.[0] || status.author.email?.[0] || "U").toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{status.author.name || status.author.email?.split("@")[0] || "User"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {status.text?.slice(0, 40) || (status.attachment ? "Photo / Video" : "Status update")} • {formatRemainingExpiry(status.expiresAt)}
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
            {viewedStatuses.map((status) => {
              const globalIndex = selfStatuses.length + statuses.findIndex((s) => s.id === status.id);
              return (
                <div
                  key={status.id}
                  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors opacity-75"
                  onClick={() => onViewStatus(status, Math.max(0, globalIndex), allCombinedStatuses)}
                >
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-primary/15 flex items-center justify-center ring-1 ring-muted">
                    {status.author.imageUrl ? (
                      <NextImage
                        src={status.author.imageUrl}
                        alt={status.author.name || "User"}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-sm font-semibold text-muted-foreground">
                        {(status.author.name?.[0] || status.author.email?.[0] || "U").toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-muted-foreground truncate">{status.author.name || status.author.email?.split("@")[0] || "User"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(status.publishedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {formatRemainingExpiry(status.expiresAt)}
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
          <p className="text-muted-foreground mb-1">No active status updates</p>
          <p className="text-xs text-muted-foreground/70">Tap &quot;Add Story&quot; to share a 24-hour update</p>
        </div>
      )}

      {/* Status Creator Modal */}
      {creatorOpen && (
        <StatusCreator
          onClose={() => setCreatorOpen(false)}
          onPost={handlePostStatus}
        />
      )}
    </div>
  );
}