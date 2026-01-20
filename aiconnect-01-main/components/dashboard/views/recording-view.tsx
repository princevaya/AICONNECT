"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ArrowUpDown,
  Calendar,
  Clock,
  Download,
  PlayCircle,
  RefreshCw,
  Video,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type Recording = {
  id: string;
  egressId: string;
  roomName: string;
  status?: string | number;
  statusCode?: number;
  startedAt?: number;
  endedAt?: number;
  updatedAt?: number;
  durationSeconds?: number;
  filename?: string;
  sizeBytes?: number;
  downloadUrl?: string | null;
  streamUrl?: string | null;
  storageLocation?: string | null;
};

type RangeFilter = "all" | "week" | "month";

const FILTER_OPTIONS: { id: RangeFilter; label: string }[] = [
  { id: "all", label: "All Recordings" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
];

const STATUS_META: Record<
  string,
  { label: string; badge: string; dot: string; description: string }
> = {
  EGRESS_STARTING: {
    label: "Starting",
    badge:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
    dot: "bg-amber-500",
    description: "Preparing recorder",
  },
  EGRESS_ACTIVE: {
    label: "Recording",
    badge:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
    dot: "bg-emerald-500",
    description: "Live capture in progress",
  },
  EGRESS_ENDING: {
    label: "Wrapping up",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
    dot: "bg-sky-500",
    description: "Finalizing file",
  },
  EGRESS_COMPLETE: {
    label: "Ready",
    badge: "bg-primary/10 text-primary",
    dot: "bg-primary",
    description: "Recording available",
  },
  EGRESS_FAILED: {
    label: "Failed",
    badge: "bg-destructive/10 text-destructive",
    dot: "bg-destructive",
    description: "Recording encountered an error",
  },
  EGRESS_ABORTED: {
    label: "Canceled",
    badge:
      "bg-slate-200 text-slate-700 dark:bg-slate-900/60 dark:text-slate-200",
    dot: "bg-slate-400",
    description: "Recording was stopped",
  },
  EGRESS_LIMIT_REACHED: {
    label: "Limit reached",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
    dot: "bg-rose-500",
    description: "Limit reached",
  },
  UNKNOWN: {
    label: "Pending",
    badge: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
    description: "Status unavailable",
  },
};

const LEGACY_STATUS_META: Record<number, string> = {
  1: "EGRESS_ACTIVE",
  2: "EGRESS_ENDING",
  3: "EGRESS_COMPLETE",
  4: "EGRESS_FAILED",
  5: "EGRESS_ABORTED",
  6: "EGRESS_LIMIT_REACHED",
};

export default function RecordingView() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [activeFilter, setActiveFilter] = useState<RangeFilter>("all");
  const [sortDescending, setSortDescending] = useState(true);
  const [playingRecording, setPlayingRecording] = useState<Recording | null>(
    null
  );
  const [videoUrl, setVideoUrl] = useState("");
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const fetchRecordings = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/livekit/recordings", { cache: "no-store" });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to load recordings");
      }

      const payload = await res.json();
      const normalized = Array.isArray(payload) ? payload : [];
      setRecordings(normalized);
      setErrorMessage(null);
      setLastUpdated(Date.now());
    } catch (error) {
      console.error("Failed to load recordings", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load recordings"
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRecordings();
    const interval = setInterval(fetchRecordings, 15000);
    return () => clearInterval(interval);
  }, [fetchRecordings]);

  const handleStreamVideo = useCallback((recording: Recording) => {
    const playableUrl = recording.streamUrl ?? recording.downloadUrl;
    if (!playableUrl) {
      alert("Recording is not ready yet. Please try again later.");
      return;
    }
    setPlayingRecording(recording);
    setVideoUrl(playableUrl);
    setLoadingVideo(true);
  }, []);

  const handleDownload = useCallback((recording: Recording) => {
    if (!recording.downloadUrl) {
      alert("Download is not available yet.");
      return;
    }
    window.open(recording.downloadUrl, "_blank", "noopener,noreferrer");
  }, []);

  const filteredRecordings = useMemo(() => {
    if (activeFilter === "all") {
      return recordings;
    }

    const now = Date.now();
    const cutoff =
      activeFilter === "week"
        ? now - 7 * 24 * 60 * 60 * 1000
        : now - 30 * 24 * 60 * 60 * 1000;

    return recordings.filter((recording) => {
      const timestamp = recording.startedAt ?? recording.updatedAt;
      if (!timestamp) {
        return false;
      }
      return timestamp >= cutoff;
    });
  }, [recordings, activeFilter]);

  const sortedRecordings = useMemo(() => {
    return [...filteredRecordings].sort((a, b) => {
      const aTime = a.startedAt ?? a.updatedAt ?? 0;
      const bTime = b.startedAt ?? b.updatedAt ?? 0;
      return sortDescending ? bTime - aTime : aTime - bTime;
    });
  }, [filteredRecordings, sortDescending]);

  const stats = useMemo(() => {
    let active = 0;
    let completed = 0;

    recordings.forEach((recording) => {
      if (isActiveStatus(recording)) {
        active += 1;
      } else if (
        recording.status === "EGRESS_COMPLETE" ||
        recording.statusCode === 3
      ) {
        completed += 1;
      }
    });

    return { total: recordings.length, active, completed };
  }, [recordings]);

  const refresh = () => fetchRecordings();

  const hasRecordings = sortedRecordings.length > 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Recordings</h1>
          <p className="text-sm text-muted-foreground">
            Monitor meeting recordings, download files, and replay past
            sessions.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">{stats.active}</span>{" "}
            active
          </div>
          <div>
            <span className="font-medium text-foreground">
              {stats.completed}
            </span>{" "}
            ready
          </div>
          <div>
            <span className="font-medium text-foreground">{stats.total}</span>{" "}
            total
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((filter) => (
            <Button
              key={filter.id}
              variant={filter.id === activeFilter ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated{" "}
              {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isRefreshing}
            className="gap-1"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => setSortDescending((prev) => !prev)}
          >
            <ArrowUpDown className="h-4 w-4" />
            {sortDescending ? "Newest first" : "Oldest first"}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <LoadingState />
      ) : hasRecordings ? (
        <section className="grid gap-4">
          {sortedRecordings.map((recording) => {
            const meta = getStatusMeta(recording);
            const durationLabel = formatDuration(recording.durationSeconds);
            const startedAt = recording.startedAt;

            const date = startedAt == null ? null : new Date(startedAt);

            const isValidDate = date !== null && !Number.isNaN(date.getTime());

            const startedDate = isValidDate
              ? format(date, "PPP")
              : "Unknown date";

            const startedTime = isValidDate ? format(date, "p") : "--";

            const relative = isValidDate
              ? formatDistanceToNow(date, { addSuffix: true })
              : "Unknown";

            return (
              <Card
                key={recording.id}
                className="hover:shadow-md transition hover:border-primary/40"
              >
                <CardContent className="p-0">
                  <div className="flex flex-wrap items-center gap-4 p-4">
                    <div className="h-24 w-40 rounded-lg bg-muted flex items-center justify-center shrink-0 relative overflow-hidden">
                      <Video className="h-8 w-8 text-muted-foreground" />
                      <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-1.5 py-0.5 rounded">
                        {durationLabel}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                          {recording.roomName || "Untitled room"}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.badge}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${meta.dot}`}
                          />
                          {meta.label}
                        </span>
                      </div>
                      <h3 className="font-semibold text-base truncate">
                        {recording.filename ||
                          `Recording ${recording.egressId}`}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {startedDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {startedTime}
                        </span>
                        <span>Started {relative}</span>
                        {recording.sizeBytes && (
                          <span>{formatBytes(recording.sizeBytes)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {recording.streamUrl || recording.downloadUrl ? (
                        <>
                          <Button
                            size="sm"
                            disabled={
                              !(recording.streamUrl || recording.downloadUrl)
                            }
                            onClick={() => handleStreamVideo(recording)}
                          >
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Stream
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!recording.downloadUrl}
                            onClick={() => handleDownload(recording)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" disabled>
                          {meta.description}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      ) : (
        <EmptyState />
      )}

      <Dialog
        open={!!playingRecording}
        onOpenChange={(open) => {
          if (!open) {
            setPlayingRecording(null);
            setVideoUrl("");
            setLoadingVideo(false);
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {playingRecording?.filename || playingRecording?.roomName}
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
            {videoUrl ? (
              <>
                {loadingVideo && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 text-white">
                    Loading video...
                  </div>
                )}
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full"
                  onLoadedData={() => setLoadingVideo(false)}
                />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/70">
                Recording is not available yet.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="border-dashed">
          <CardContent className="p-6">
            <div className="flex flex-col gap-3 animate-pulse">
              <div className="h-6 w-1/3 rounded bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
              <div className="h-4 w-1/2 rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Video className="h-8 w-8 text-muted-foreground" />
        </div>
        <CardTitle>No recordings yet</CardTitle>
        <CardDescription>
          Meetings you record will appear here as soon as the files are ready.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function getStatusMeta(recording: Recording) {
  if (typeof recording.status === "string" && STATUS_META[recording.status]) {
    return STATUS_META[recording.status];
  }

  if (
    typeof recording.status === "number" &&
    STATUS_META[STATUS_META_KEY_LIST[recording.status]]
  ) {
    return STATUS_META[STATUS_META_KEY_LIST[recording.status]];
  }

  if (recording.statusCode !== undefined) {
    const key = LEGACY_STATUS_META[recording.statusCode];
    if (key && STATUS_META[key]) {
      return STATUS_META[key];
    }
  }

  return STATUS_META.UNKNOWN;
}

const STATUS_META_KEY_LIST: Record<number, string> = {
  0: "EGRESS_STARTING",
  1: "EGRESS_ACTIVE",
  2: "EGRESS_ENDING",
  3: "EGRESS_COMPLETE",
  4: "EGRESS_FAILED",
  5: "EGRESS_ABORTED",
  6: "EGRESS_LIMIT_REACHED",
};

function isActiveStatus(recording: Recording) {
  if (typeof recording.status === "string") {
    return (
      recording.status === "EGRESS_STARTING" ||
      recording.status === "EGRESS_ACTIVE" ||
      recording.status === "EGRESS_ENDING"
    );
  }

  if (typeof recording.status === "number") {
    return recording.status >= 0 && recording.status <= 2;
  }

  if (recording.statusCode !== undefined) {
    return recording.statusCode === 1 || recording.statusCode === 2;
  }

  return false;
}

function formatDuration(durationSeconds?: number) {
  if (!durationSeconds || durationSeconds <= 0) {
    return "--:--";
  }

  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = Math.floor(durationSeconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }

  return `${minutes.toString().padStart(2, "0")}m ${seconds
    .toString()
    .padStart(2, "0")}s`;
}

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) {
    return undefined;
  }

  const units = ["B", "KB", "MB", "GB"];
  let index = 0;
  let value = bytes;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
