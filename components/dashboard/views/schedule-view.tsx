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
  Key,
  Settings,
  AlertCircle,
  Video,
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
  const [waitingRoom, setWaitingRoom] = useState(false);
  const [muteOnJoin, setMuteOnJoin] = useState(false);
  const [enableChat, setEnableChat] = useState(true);
  const [allowScreenSharing, setAllowScreenSharing] = useState(true);
  const [hasPassword, setHasPassword] = useState(false);
  const [meetingPassword, setMeetingPassword] = useState("");

  const [lastScheduled, setLastScheduled] = useState<ScheduledMeeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [cardCopyState, setCardCopyState] = useState<Record<string, "idle" | "copied">>({});

  // Extensive timezones support
  const allTimezones = useMemo(() => {
    if (typeof Intl !== "undefined" && typeof (Intl as any).supportedValuesOf === "function") {
      try {
        const list = (Intl as any).supportedValuesOf("timeZone") as string[];
        if (list && list.length > 0) return list;
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
    } catch (err: any) {
      setGlobalError(err.message);
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
      setWaitingRoom(false);
      setMuteOnJoin(false);
      setEnableChat(true);
      setAllowScreenSharing(true);
      setHasPassword(false);
      setMeetingPassword("");
      setSelectedHour("10");
      setSelectedMinute("00");
      setSelectedPeriod("AM");
    } catch (err: any) {
      setFormError(err.message);
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
    setWaitingRoom(false);
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
  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            Schedule Meeting
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plan secure meetings, manage invitations, and configure lobby room options.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-full text-xs font-semibold">
            <CalendarCheck className="h-4 w-4 text-indigo-500" />
            {meetings.length} scheduled
          </span>
          <span className="flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-full text-xs font-semibold">
            <Users className="h-4 w-4 text-purple-500" />
            {totalAttendees} attendees
          </span>
          <Button variant="outline" size="sm" onClick={fetchMeetings} className="h-8 hover:bg-secondary">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </header>

      {globalError && (
        <div className="flex items-center gap-2 border border-red-200 bg-red-50 p-3 rounded-lg text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>Error loading: {globalError}</span>
        </div>
      )}

      <section className="grid gap-8 lg:grid-cols-[380px_1fr]">
        
        {/* Left Side: Calendar & Selected Date List */}
        <div className="space-y-6">
          <Card className="shadow-lg border border-border/80">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold">Select Date</CardTitle>
              <CardDescription>Choose a day to see schedule</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                className="rounded-md border p-1"
              />

              {meetingsForDate.length > 0 && (
                <div className="mt-6 w-full space-y-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Meetings on {format(selectedDate, "MMM d, yyyy")}:
                  </p>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {meetingsForDate.map((m) => {
                      const badgeColor =
                        m.status === "Live"
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : m.status === "WaitingForHost"
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          : m.status === "Completed"
                          ? "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                          : m.status === "Cancelled"
                          ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                          : "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";

                      return (
                        <div key={m.id} className="border border-border/60 rounded-xl p-3 bg-secondary/20 hover:bg-secondary/40 transition-colors space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-sm truncate">{m.title}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                              {m.status}
                            </span>
                          </div>
                          
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p className="flex items-center gap-1 font-medium text-foreground/80">
                              <Clock className="h-3 w-3" />
                              {formatViewerTime(m.scheduledFor)}
                            </p>
                            {m.notes && <p className="truncate italic">"{m.notes}"</p>}
                            <p className="truncate">👥 {m.attendees.join(", ") || "No attendees"}</p>
                          </div>

                          <div className="flex gap-2 pt-2 border-t border-border/40 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCardCopyLink(m.code)}
                              className="h-7 text-[11px] px-2"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              {cardCopyState[m.code] === "copied" ? "Copied!" : "Copy link"}
                            </Button>
                            {m.status !== "Completed" && m.status !== "Cancelled" && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  window.location.href = `/meeting/join?room=${m.code}&host=true`;
                                }}
                                className="h-7 text-[11px] px-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                              >
                                Join Host
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Redesigned Scheduler Form */}
        <div className="space-y-6">
          <Card className="shadow-lg border border-border/80">
            <CardHeader className="bg-secondary/10 pb-4 border-b">
              <CardTitle className="text-lg font-bold">New Meeting Schedule</CardTitle>
              <CardDescription>
                Configure duration, timezones, calendar invitations, and permissions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">

              {/* Title & Description */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Meeting Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Weekly Product Sync"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="focus-visible:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Description
                  </label>
                  <Input
                    placeholder="e.g. Review deliverables and checklist"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="focus-visible:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Date, Time, Duration & Timezone Fields Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Selected Date
                  </label>
                  <Input
                    type="text"
                    value={format(selectedDate, "eeee, MMMM d, yyyy")}
                    disabled
                    className="bg-secondary/45 font-medium text-foreground cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5 h-10 w-full">
                    <select
                      value={selectedHour}
                      onChange={(e) => setSelectedHour(e.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((hr) => (
                        <option key={hr} value={hr}>{hr}</option>
                      ))}
                    </select>
                    <span className="text-muted-foreground font-bold">:</span>
                    <select
                      value={selectedMinute}
                      onChange={(e) => setSelectedMinute(e.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map((mn) => (
                        <option key={mn} value={mn}>{mn}</option>
                      ))}
                    </select>
                    <select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Duration
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    {duration === "Custom" && (
                      <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in-50 duration-200">
                        <Input
                          type="number"
                          value={customDuration}
                          onChange={(e) => setCustomDuration(e.target.value)}
                          className="w-20 h-10 focus-visible:ring-indigo-500"
                          placeholder="Min"
                        />
                        <span className="text-xs text-muted-foreground font-semibold">Min</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Timezone <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsTzDropdownOpen(!isTzDropdownOpen)}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left hover:bg-secondary/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <span className="truncate">{timezone}</span>
                      <span className="text-muted-foreground text-xs">▼</span>
                    </button>
                    {isTzDropdownOpen && (
                      <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-lg backdrop-blur-sm">
                        <Input
                          placeholder="Search timezone..."
                          value={tzSearch}
                          onChange={(e) => setTzSearch(e.target.value)}
                          className="mb-2 h-9 text-xs focus-visible:ring-indigo-500"
                          autoFocus
                        />
                        <div className="space-y-0.5 max-h-[180px] overflow-y-auto">
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
                                className={`flex w-full items-center rounded px-2 py-1.5 text-xs text-left hover:bg-indigo-500 hover:text-white transition-colors ${
                                  timezone === tz ? "bg-indigo-500/10 text-indigo-500 font-semibold" : ""
                                }`}
                              >
                                {tz}
                              </button>
                            ))
                          ) : (
                            <p className="p-2 text-xs text-muted-foreground text-center">No timezones found.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Attendees / Invite list */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Invite Participants
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter email address and press Enter"
                    value={attendeeInput}
                    onChange={(e) => setAttendeeInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddAttendee())}
                    className="focus-visible:ring-indigo-500"
                  />
                  <Button variant="outline" onClick={handleAddAttendee} className="h-10 hover:bg-secondary">
                    Add
                  </Button>
                </div>
                {attendeeList.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2 bg-secondary/10 p-2 rounded-lg border">
                    {attendeeList.map((email) => (
                      <span
                        key={email}
                        className="flex items-center gap-1 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-2 py-1 rounded-full text-xs font-medium"
                      >
                        {email}
                        <button
                          type="button"
                          onClick={() => handleRemoveAttendee(email)}
                          className="hover:text-red-500 hover:bg-red-50 rounded-full p-0.5 transition-colors ml-1"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Each participant receives a rich calendar invitation containing the room links and .ics file.
                </p>
              </div>

              {/* Options panel */}
              <div className="border border-border/80 rounded-xl p-4 space-y-4 bg-secondary/10">
                <div className="flex items-center gap-1.5 border-b pb-2">
                  <Settings className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">Meeting Settings & Options</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowJoinBeforeHost}
                      onChange={(e) => setAllowJoinBeforeHost(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="text-xs">
                      <p className="font-semibold">Allow Join Before Host</p>
                      <p className="text-muted-foreground text-[10px]">Let attendees enter early</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waitingRoom}
                      onChange={(e) => setWaitingRoom(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="text-xs">
                      <p className="font-semibold">Waiting Room</p>
                      <p className="text-muted-foreground text-[10px]">Approve joiners manually</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={muteOnJoin}
                      onChange={(e) => setMuteOnJoin(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="text-xs">
                      <p className="font-semibold">Mute on Join</p>
                      <p className="text-muted-foreground text-[10px]">Mute mics automatically</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableChat}
                      onChange={(e) => setEnableChat(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="text-xs">
                      <p className="font-semibold">Enable Chat</p>
                      <p className="text-muted-foreground text-[10px]">Allow text messages</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowScreenSharing}
                      onChange={(e) => setAllowScreenSharing(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="text-xs">
                      <p className="font-semibold">Allow Screen Sharing</p>
                      <p className="text-muted-foreground text-[10px]">Let users share slides</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasPassword}
                      onChange={(e) => setHasPassword(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="text-xs">
                      <p className="font-semibold">Meeting Password</p>
                      <p className="text-muted-foreground text-[10px]">Protect with password passcode</p>
                    </div>
                  </label>
                </div>

                {hasPassword && (
                  <div className="flex gap-2 items-center bg-background border p-2 rounded-lg max-w-sm mt-2 transition-all">
                    <Key className="h-4 w-4 text-amber-500 shrink-0" />
                    <Input
                      type="password"
                      placeholder="Enter passcode/password"
                      value={meetingPassword}
                      onChange={(e) => setMeetingPassword(e.target.value)}
                      className="h-8 text-xs focus-visible:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {formError && (
                <div className="flex items-center gap-2 border border-red-200 bg-red-50 p-3 rounded-lg text-xs text-red-700 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="hover:bg-secondary h-10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleScheduleMeeting}
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-10 px-6"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Scheduling...
                    </>
                  ) : (
                    "Schedule Meeting"
                  )}
                </Button>
              </div>

              {/* Result Summary */}
              {lastScheduled && (
                <div className="border border-emerald-200 p-4 rounded-xl space-y-3 bg-emerald-500/[0.03] transition-all">
                  <p className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5">
                    <Check className="h-5 w-5 bg-emerald-500 text-white rounded-full p-0.5" />
                    Meeting Scheduled Successfully!
                  </p>
                  
                  <div className="text-xs text-muted-foreground space-y-1.5 bg-secondary/20 p-3 rounded-lg border">
                    <p className="font-bold text-foreground">{lastScheduled.title}</p>
                    <p>🕒 {formatViewerTime(lastScheduled.scheduledFor)} ({timezone})</p>
                    {lastScheduled.notes && <p>📝 Note: "{lastScheduled.notes}"</p>}
                    <p>👥 Invites dispatched to: {lastScheduled.attendees.join(", ")}</p>
                    <p className="pt-1.5 font-mono text-[10px] break-all border-t mt-2 select-all">
                      Link: {resolveLink(lastScheduled.link)}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyLink(lastScheduled.link)}
                      className="h-8 text-xs hover:bg-secondary"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      {copyState === "copied" ? "Copied!" : "Copy link"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        window.location.href = `/meeting/join?room=${lastScheduled.code}&host=true`;
                      }}
                      className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      Join as Host
                    </Button>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}