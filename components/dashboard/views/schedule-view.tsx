"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, isSameDay } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  CalendarCheck,
  Copy,
  RefreshCw,
  Users,
  Clock,
  Loader2,
  Check,
  CalendarDays,
  ChevronDown,
  Globe,
  Key,
  Settings,
  ShieldCheck,
  AlertCircle,
  Video,
  X,
} from "lucide-react";
import { copyToClipboard } from "@/lib/utils";

/* ---------------- types ---------------- */
interface ScheduleApiMeeting {
  id: string;
  code: string;
  title: string;
  scheduledFor: string;
  endTime?: string | null;
  attendees: string[];
  notes?: string | null;
  status: string;
  isActive: boolean;
  createdBy?: string | null;
  timezone: string;
  duration: string;
  allowJoinBeforeHost: boolean;
  waitingRoom: boolean;
  muteOnJoin: boolean;
  enableChat: boolean;
  allowScreenSharing: boolean;
  meetingPassword?: string | null;
  link: string;
  createdAt: string;
  updatedAt: string;
}

interface ScheduledMeeting extends Omit<ScheduleApiMeeting, "scheduledFor"> {
  scheduledFor: Date;
}

/* ---------------- helpers ---------------- */
const normalizeMeeting = (m: ScheduleApiMeeting): ScheduledMeeting => ({
  ...m,
  scheduledFor: new Date(m.scheduledFor),
});

const upsertMeeting = (meetings: ScheduledMeeting[], incoming: ScheduledMeeting) => {
  const idx = meetings.findIndex((m) => m.id === incoming.id);
  if (idx !== -1) {
    const clone = [...meetings];
    clone[idx] = incoming;
    return clone;
  }
  return [...meetings, incoming];
};

function getUtcDate(year: number, month: number, day: number, hour: number, minute: number, tz: string): Date {
  let utcEstimate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  for (let i = 0; i < 3; i++) {
    const formatted = formatter.formatToParts(utcEstimate);
    const parts: Record<string, string> = {};
    formatted.forEach(p => { parts[p.type] = p.value; });
    
    const lYear = parseInt(parts.year);
    const lMonth = parseInt(parts.month);
    const lDay = parseInt(parts.day);
    const lHour = parseInt(parts.hour) === 24 ? 0 : parseInt(parts.hour);
    const lMinute = parseInt(parts.minute);
    
    const localEstimate = Date.UTC(lYear, lMonth - 1, lDay, lHour, lMinute);
    const targetLocal = Date.UTC(year, month - 1, day, hour, minute);
    
    const diff = targetLocal - localEstimate;
    if (diff === 0) break;
    utcEstimate = new Date(utcEstimate.getTime() + diff);
  }
  
  return utcEstimate;
}

/* ================= COMPONENT ================= */
export default function ScheduleView() {
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Time and field inputs
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedHour, setSelectedHour] = useState("10");
  const [selectedMinute, setSelectedMinute] = useState("00");
  const [selectedPeriod, setSelectedPeriod] = useState("AM");
  const [duration, setDuration] = useState("30 Minutes");
  const [customDuration, setCustomDuration] = useState("45");
  
  // Timezone states
  const detectedTz = useMemo(() => {
    return typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  }, []);
  const [timezone, setTimezone] = useState(detectedTz);
  const [tzSearch, setTzSearch] = useState("");
  const [isTzDropdownOpen, setIsTzDropdownOpen] = useState(false);

  // Participants inputs
  const [attendeeInput, setAttendeeInput] = useState("");
  const [attendeeList, setAttendeeList] = useState<string[]>([]);
  
  // Options inputs
  const [allowJoinBeforeHost, setAllowJoinBeforeHost] = useState(false);
  const [waitingRoom, setWaitingRoom] = useState(true);
  const [muteOnJoin, setMuteOnJoin] = useState(false);
  const [enableChat, setEnableChat] = useState(true);
  const [allowScreenSharing, setAllowScreenSharing] = useState(true);
  const [hasPassword, setHasPassword] = useState(false);
  const [meetingPassword, setMeetingPassword] = useState("");
  const [scheduleListTab, setScheduleListTab] = useState<"day" | "all">("day");

  const [lastScheduled, setLastScheduled] = useState<ScheduledMeeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [cardCopyState, setCardCopyState] = useState<Record<string, "idle" | "copied">>({});

  // Extensive timezones support
  const allTimezones = useMemo(() => {
    if (typeof Intl !== "undefined") {
      try {
        const intlWithSupportedValues = Intl as unknown as {
          supportedValuesOf?: (key: string) => string[];
        };
        if (typeof intlWithSupportedValues.supportedValuesOf === "function") {
          const list = intlWithSupportedValues.supportedValuesOf("timeZone");
          if (list && list.length > 0) return list;
        }
      } catch {}
    }
    return [
      "UTC", "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Asia/Bangkok",
      "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Madrid",
      "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Toronto",
      "Australia/Sydney", "Australia/Melbourne", "Africa/Johannesburg"
    ];
  }, []);

  const filteredTzs = useMemo(() => {
    const q = tzSearch.toLowerCase().trim();
    if (!q) return allTimezones;
    return allTimezones.filter(tz => tz.toLowerCase().includes(q));
  }, [allTimezones, tzSearch]);

  /* ---------- FETCH ---------- */
  const fetchMeetings = useCallback(async () => {
    setIsLoading(true);
    setGlobalError(null);
    try {
      const res = await fetch("/api/meetings?all=true", { cache: "no-store" });
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.error || "Failed to load");
      setMeetings(payload.meetings.map(normalizeMeeting));
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  /* ---------- ADD ATTENDEE ---------- */
  const handleAddAttendee = () => {
    const email = attendeeInput.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormError("Please enter a valid email address");
      return;
    }
    if (attendeeList.includes(email)) {
      setFormError("Email already added");
      return;
    }
    setAttendeeList((prev) => [...prev, email]);
    setAttendeeInput("");
    setFormError(null);
  };

  const handleRemoveAttendee = (email: string) => {
    setAttendeeList((prev) => prev.filter((a) => a !== email));
  };

  /* ---------- SUBMIT ---------- */
  const handleScheduleMeeting = async () => {
    setFormError(null);

    if (!title.trim()) return setFormError("Please enter a meeting title");

    let h = parseInt(selectedHour);
    const m = parseInt(selectedMinute);
    const period = selectedPeriod;
    if (isNaN(h) || h < 1 || h > 12 || isNaN(m) || m < 0 || m > 59) {
      return setFormError("Please enter a valid time");
    }

    if (period === "PM" && h < 12) {
      h += 12;
    } else if (period === "AM" && h === 12) {
      h = 0;
    }

    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth() + 1;
    const day = selectedDate.getDate();

    // Compute UTC time using our iterative tz parser
    const utcDate = getUtcDate(year, month, day, h, m, timezone);

    // Enforce scheduled meeting not in past (with a 2-minute skew grace)
    if (utcDate.getTime() + 120000 <= Date.now()) {
      return setFormError("Meeting cannot be scheduled in the past");
    }

    const finalDuration = duration === "Custom" ? `${customDuration} Minutes` : duration;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          scheduledFor: utcDate.toISOString(),
          timezone,
          duration: finalDuration,
          attendees: attendeeList,
          allowJoinBeforeHost,
          waitingRoom,
          muteOnJoin,
          enableChat,
          allowScreenSharing,
          meetingPassword: hasPassword ? meetingPassword.trim() : null,
        }),
      });

      const payload = await res.json();
      if (!payload.success) throw new Error(payload.error || "Failed to schedule");

      const meeting = normalizeMeeting(payload.meeting);
      setMeetings((prev) => upsertMeeting(prev, meeting));
      setLastScheduled(meeting);

      // Reset fields
      setTitle("");
      setDescription("");
      setAttendeeList([]);
      setAllowJoinBeforeHost(false);
      setWaitingRoom(true);
      setMuteOnJoin(false);
      setEnableChat(true);
      setAllowScreenSharing(true);
      setHasPassword(false);
      setMeetingPassword("");
      setSelectedHour("10");
      setSelectedMinute("00");
      setSelectedPeriod("AM");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to schedule");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---------- COPY LINK ---------- */
  const resolveLink = (link: string) =>
    link.startsWith("http") ? link : `${window.location.origin}${link}`;

  const handleCopyLink = async (link: string) => {
    try {
      const ok = await copyToClipboard(resolveLink(link));
      if (!ok) throw new Error("Copy failed");
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
    }
  };

  const handleCardCopyLink = async (code: string) => {
    try {
      const link = `${window.location.origin}/meeting/join?room=${code}`;
      const ok = await copyToClipboard(link);
      if (!ok) throw new Error("Copy failed");
      setCardCopyState((prev) => ({ ...prev, [code]: "copied" }));
      setTimeout(() => setCardCopyState((prev) => ({ ...prev, [code]: "idle" })), 2000);
    } catch {
      // silent
    }
  };

  /* ---------- CANCEL / RESET ---------- */
  const handleCancel = () => {
    setTitle("");
    setDescription("");
    setAttendeeList([]);
    setAllowJoinBeforeHost(false);
    setWaitingRoom(true);
    setMuteOnJoin(false);
    setEnableChat(true);
    setAllowScreenSharing(true);
    setHasPassword(false);
    setMeetingPassword("");
    setSelectedHour("10");
    setSelectedMinute("00");
    setSelectedPeriod("AM");
    setFormError(null);
  };

  /* ---------- DERIVED ---------- */
  const meetingsForDate = useMemo(
    () => meetings.filter((m) => isSameDay(m.scheduledFor, selectedDate)),
    [meetings, selectedDate]
  );

  const totalAttendees = useMemo(
    () => meetings.reduce((s, m) => s + m.attendees.length, 0),
    [meetings]
  );

  const viewerTz = useMemo(() => {
    return typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  }, []);

  const formatViewerTime = (utcDate: Date) => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: viewerTz,
      }).format(utcDate);
    } catch {
      return format(utcDate, "hh:mm a");
    }
  };

  /* ================= UI ================= */
  const displayedSidebarMeetings =
    scheduleListTab === "all"
      ? meetings.filter((m) => m.status !== "Completed" && m.status !== "Cancelled")
      : meetingsForDate;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-blue-500 border border-blue-500/20">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Schedule Meeting
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Plan secure meetings, send calendar invites, and manage waiting room approvals.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/50 px-3 py-1.5 font-medium text-foreground/90">
            <CalendarCheck className="h-3.5 w-3.5 text-blue-500" />
            {meetings.length} scheduled
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/50 px-3 py-1.5 font-medium text-foreground/90">
            <Users className="h-3.5 w-3.5 text-emerald-500" />
            {totalAttendees} attendees
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMeetings}
            disabled={isLoading}
            className="h-8 rounded-full border-border/70 px-3 text-xs hover:bg-muted"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      {globalError && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Error loading meetings: {globalError}</span>
        </div>
      )}

      <section className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* Left Side: Compact Calendar & Schedule Feed */}
        <Card className="border-border/80 bg-card/90 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Select Date</CardTitle>
            <CardDescription className="text-xs">
              Pick a date to schedule or inspect meetings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                className="rounded-xl border border-border/70 bg-background/60 p-2"
              />
            </div>

            <div className="border-t border-border/60 pt-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex rounded-lg bg-muted/70 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setScheduleListTab("day")}
                    className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                      scheduleListTab === "day"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {format(selectedDate, "MMM d")} ({meetingsForDate.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleListTab("all")}
                    className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                      scheduleListTab === "all"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All Upcoming
                  </button>
                </div>
              </div>

              {displayedSidebarMeetings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-5 text-center">
                  <p className="text-xs font-medium text-muted-foreground">
                    {scheduleListTab === "all"
                      ? "No upcoming meetings scheduled."
                      : `No meetings on ${format(selectedDate, "MMM d, yyyy")}.`}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground/75">
                    Fill the form to schedule a meeting for this day.
                  </p>
                </div>
              ) : (
                <div className="max-h-[320px] space-y-2.5 overflow-y-auto pr-1">
                  {displayedSidebarMeetings.map((m) => {
                    const badgeColor =
                      m.status === "Live"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/25"
                        : m.status === "WaitingForHost"
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/25"
                        : m.status === "Completed"
                        ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/25"
                        : m.status === "Cancelled"
                        ? "bg-rose-500/10 text-rose-500 border-rose-500/25"
                        : "bg-blue-500/10 text-blue-500 border-blue-500/25";

                    return (
                      <div
                        key={m.id}
                        className="rounded-xl border border-border/70 bg-muted/25 p-3 transition-colors hover:bg-muted/45 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">{m.title}</p>
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeColor}`}>
                            {m.status}
                          </span>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p className="flex items-center gap-1.5 font-medium text-foreground/85">
                            <Clock className="h-3.5 w-3.5 text-blue-500" />
                            <span>
                              {scheduleListTab === "all" ? `${format(m.scheduledFor, "MMM d")} · ` : ""}
                              {formatViewerTime(m.scheduledFor)} · {m.duration}
                            </span>
                          </p>
                          {m.notes && <p className="truncate italic">&quot;{m.notes}&quot;</p>}
                          <p className="truncate text-[11px]">
                            {m.attendees.length > 0 ? m.attendees.join(", ") : "No attendees yet"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 border-t border-border/50 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCardCopyLink(m.code)}
                            className="h-7 px-2.5 text-[11px]"
                          >
                            <Copy className="mr-1 h-3 w-3" />
                            {cardCopyState[m.code] === "copied" ? "Copied!" : "Copy link"}
                          </Button>
                          {m.status !== "Completed" && m.status !== "Cancelled" && (
                            <Button
                              size="sm"
                              onClick={() => {
                                window.location.href = `/meeting/join?room=${m.code}&host=true`;
                              }}
                              className="h-7 bg-blue-600 px-2.5 text-[11px] text-white hover:bg-blue-700"
                            >
                              <Video className="mr-1 h-3 w-3" />
                              Join Host
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Side: Clean Scheduler Form */}
        <Card className="border-border/80 bg-card/90 shadow-sm">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <CardTitle className="text-lg font-semibold">New Meeting Schedule</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Configure duration, timezone, invitations, and host moderation controls.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            {/* Title & Description */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Meeting Title <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. Weekly Product Sync"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-10 rounded-lg border-border/80 bg-background/70"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </label>
                <Input
                  placeholder="e.g. Review deliverables and checklist"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-10 rounded-lg border-border/80 bg-background/70"
                />
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Selected Date
                </label>
                <div className="relative flex items-center">
                  <CalendarDays className="pointer-events-none absolute left-3 h-4 w-4 text-blue-500" />
                  <Input
                    type="text"
                    value={format(selectedDate, "eeee, MMMM d, yyyy")}
                    readOnly
                    className="h-10 rounded-lg border-border/80 bg-muted/40 pl-9 font-medium text-foreground focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Start Time <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-[1fr_auto_1fr_84px] items-center gap-1.5">
                  <div className="relative">
                    <select
                      aria-label="Hour"
                      value={selectedHour}
                      onChange={(e) => setSelectedHour(e.target.value)}
                      className="h-10 w-full appearance-none rounded-lg border border-border/80 bg-background/70 pl-3 pr-7 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    >
                      {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((hr) => (
                        <option key={hr} value={hr}>{hr}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <span className="text-center font-semibold text-muted-foreground">:</span>
                  <div className="relative">
                    <select
                      aria-label="Minute"
                      value={selectedMinute}
                      onChange={(e) => setSelectedMinute(e.target.value)}
                      className="h-10 w-full appearance-none rounded-lg border border-border/80 bg-background/70 pl-3 pr-7 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    >
                      {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map((mn) => (
                        <option key={mn} value={mn}>{mn}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <div className="relative">
                    <select
                      aria-label="AM or PM"
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                      className="h-10 w-full appearance-none rounded-lg border border-border/80 bg-background/70 pl-3 pr-7 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>

            {/* Duration & Timezone */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Duration
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select
                      aria-label="Meeting duration"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="h-10 w-full appearance-none rounded-lg border border-border/80 bg-background/70 pl-3 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    >
                      <option value="15 Minutes">15 Minutes</option>
                      <option value="30 Minutes">30 Minutes</option>
                      <option value="45 Minutes">45 Minutes</option>
                      <option value="1 Hour">1 Hour</option>
                      <option value="1 Hour 30 Minutes">1 Hour 30 Minutes</option>
                      <option value="2 Hours">2 Hours</option>
                      <option value="3 Hours">3 Hours</option>
                      <option value="Custom">Custom</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  {duration === "Custom" && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Input
                        type="number"
                        value={customDuration}
                        onChange={(e) => setCustomDuration(e.target.value)}
                        className="h-10 w-20 rounded-lg border-border/80"
                        placeholder="Min"
                      />
                      <span className="text-xs font-medium text-muted-foreground">Min</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Timezone <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsTzDropdownOpen((v) => !v)}
                    className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-border/80 bg-background/70 px-3 text-left text-sm font-medium transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{timezone}</span>
                    </span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isTzDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isTzDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsTzDropdownOpen(false)}
                      />
                      <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-xl">
                        <Input
                          placeholder="Search timezone..."
                          value={tzSearch}
                          onChange={(e) => setTzSearch(e.target.value)}
                          className="mb-2 h-9 text-xs"
                          autoFocus
                        />
                        <div className="max-h-[190px] space-y-0.5 overflow-y-auto">
                          {filteredTzs.length > 0 ? (
                            filteredTzs.map((tz) => (
                              <button
                                key={tz}
                                type="button"
                                onClick={() => {
                                  setTimezone(tz);
                                  setIsTzDropdownOpen(false);
                                  setTzSearch("");
                                }}
                                className={`flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-blue-600 hover:text-white ${
                                  timezone === tz ? "bg-blue-500/15 font-semibold text-blue-500" : ""
                                }`}
                              >
                                {tz}
                              </button>
                            ))
                          ) : (
                            <p className="p-2 text-center text-xs text-muted-foreground">No timezones found.</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Attendees */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Invite Participants
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter email address and press Enter"
                  value={attendeeInput}
                  onChange={(e) => setAttendeeInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddAttendee())}
                  className="h-10 rounded-lg border-border/80 bg-background/70"
                />
                <Button variant="outline" type="button" onClick={handleAddAttendee} className="h-10 shrink-0 rounded-lg px-4">
                  Add
                </Button>
              </div>
              {attendeeList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 rounded-xl border border-border/60 bg-muted/20 p-2.5">
                  {attendeeList.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-500"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => handleRemoveAttendee(email)}
                        aria-label={`Remove ${email}`}
                        className="rounded-full p-0.5 hover:bg-destructive/15 hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Each participant receives a calendar invitation with room links and an .ics attachment.
              </p>
            </div>

            {/* Settings & Security */}
            <div className="rounded-xl border border-border/70 bg-muted/15 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Meeting Settings &amp; Moderation
                  </span>
                </div>
                {waitingRoom && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
                    <ShieldCheck className="h-3 w-3" /> Host Approval On
                  </span>
                )}
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {[
                  {
                    checked: waitingRoom,
                    onChange: setWaitingRoom,
                    title: "Waiting Room",
                    desc: "Require host approval before entry",
                  },
                  {
                    checked: allowJoinBeforeHost,
                    onChange: setAllowJoinBeforeHost,
                    title: "Allow Join Before Host",
                    desc: "Let attendees enter lobby early",
                  },
                  {
                    checked: muteOnJoin,
                    onChange: setMuteOnJoin,
                    title: "Mute on Join",
                    desc: "Start attendees with mic muted",
                  },
                  {
                    checked: enableChat,
                    onChange: setEnableChat,
                    title: "Enable Chat",
                    desc: "Allow in-meeting text messages",
                  },
                  {
                    checked: allowScreenSharing,
                    onChange: setAllowScreenSharing,
                    title: "Allow Screen Sharing",
                    desc: "Permit participants to share screen",
                  },
                  {
                    checked: hasPassword,
                    onChange: setHasPassword,
                    title: "Meeting Passcode",
                    desc: "Require password to enter room",
                  },
                ].map((opt) => (
                  <label
                    key={opt.title}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${
                      opt.checked
                        ? "border-blue-500/40 bg-blue-500/5"
                        : "border-border/60 bg-background/40 hover:bg-muted/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={opt.checked}
                      onChange={(e) => opt.onChange(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded accent-blue-600"
                    />
                    <div className="min-w-0 text-xs">
                      <p className="font-semibold text-foreground">{opt.title}</p>
                      <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              {hasPassword && (
                <div className="flex max-w-sm items-center gap-2 rounded-lg border border-border/80 bg-background p-2">
                  <Key className="h-4 w-4 shrink-0 text-amber-500" />
                  <Input
                    type="password"
                    placeholder="Enter meeting passcode"
                    value={meetingPassword}
                    onChange={(e) => setMeetingPassword(e.target.value)}
                    className="h-8 border-0 bg-transparent text-xs focus-visible:ring-0"
                  />
                </div>
              )}
            </div>

            {formError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Submit Row */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-border/60 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="h-10 rounded-lg px-4"
              >
                Reset
              </Button>
              <Button
                type="button"
                onClick={handleScheduleMeeting}
                disabled={isSubmitting}
                className="h-10 rounded-lg bg-blue-600 px-6 font-semibold text-white hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  "Schedule Meeting"
                )}
              </Button>
            </div>

            {/* Result Summary */}
            {lastScheduled && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-500">
                  <Check className="h-4 w-4 rounded-full bg-emerald-500 p-0.5 text-white" />
                  Meeting Scheduled Successfully!
                </p>

                <div className="space-y-1.5 rounded-lg border border-border/60 bg-background/60 p-3 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">{lastScheduled.title}</p>
                  <p>
                    {formatViewerTime(lastScheduled.scheduledFor)} ({timezone}) · {lastScheduled.duration}
                  </p>
                  {lastScheduled.notes && <p className="italic">&quot;{lastScheduled.notes}&quot;</p>}
                  {lastScheduled.attendees.length > 0 && (
                    <p>Invites sent to: {lastScheduled.attendees.join(", ")}</p>
                  )}
                  <p className="mt-2 select-all break-all border-t border-border/50 pt-2 font-mono text-[10px]">
                    {resolveLink(lastScheduled.link)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyLink(lastScheduled.link)}
                    className="h-8 text-xs"
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    {copyState === "copied" ? "Copied!" : "Copy link"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      window.location.href = `/meeting/join?room=${lastScheduled.code}&host=true`;
                    }}
                    className="h-8 bg-blue-600 text-xs text-white hover:bg-blue-700"
                  >
                    <Video className="mr-1.5 h-3.5 w-3.5" />
                    Join as Host
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}