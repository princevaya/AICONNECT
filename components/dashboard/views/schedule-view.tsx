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
import { CalendarCheck, Copy, RefreshCw, Users } from "lucide-react";

/* ---------------- types ---------------- */
interface ScheduleApiMeeting {
  id: string;
  code: string;
  title: string;
  scheduledFor: string;
  attendees: string[];
  notes?: string | null;
  status: string;
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

/* ================= COMPONENT ================= */
export default function ScheduleView() {
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedHour, setSelectedHour] = useState("10");
  const [selectedMinute, setSelectedMinute] = useState("00");
  const [title, setTitle] = useState("");
  const [attendeeInput, setAttendeeInput] = useState("");
  const [attendeeList, setAttendeeList] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [lastScheduled, setLastScheduled] = useState<ScheduledMeeting | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  // ✅ Track copy state per card individually
  const [cardCopyState, setCardCopyState] = useState<Record<string, "idle" | "copied">>({});

  /* ---------- FETCH ---------- */
  const fetchMeetings = useCallback(async () => {
    setIsLoading(true);
    setGlobalError(null);
    try {
      const res = await fetch("/api/schedule?all=true", { cache: "no-store" });
      const text = await res.text();
      if (!text.trim().startsWith("{")) throw new Error("Invalid response");
      const payload = JSON.parse(text);
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
    const email = attendeeInput.trim();
    if (!email.includes("@")) {
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
    if (attendeeList.length === 0) return setFormError("Please add at least one attendee");

    const h = parseInt(selectedHour);
    const m = parseInt(selectedMinute);
    if (isNaN(h) || h < 0 || h > 23) return setFormError("Enter a valid hour (0–23)");
    if (isNaN(m) || m < 0 || m > 59) return setFormError("Enter a valid minute (0–59)");

    setIsSubmitting(true);
    try {
      const scheduled = new Date(selectedDate);
      scheduled.setHours(h, m, 0, 0);

      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          scheduledFor: scheduled.toISOString(),
          attendees: attendeeList,
          notes: notes.trim() || null,
        }),
      });

      const text = await res.text();
      if (!text.trim().startsWith("{")) throw new Error("Invalid response");
      const payload = JSON.parse(text);
      if (!payload.success) throw new Error(payload.error || "Failed to schedule");

      const meeting = normalizeMeeting(payload.meeting);
      setMeetings((prev) => upsertMeeting(prev, meeting));
      setLastScheduled(meeting);

      // Reset form
      setTitle("");
      setAttendeeList([]);
      setNotes("");
      setSelectedHour("10");
      setSelectedMinute("00");
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
      await navigator.clipboard.writeText(resolveLink(link));
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
    }
  };

  // ✅ Copy link for individual meeting cards
  const handleCardCopyLink = async (code: string) => {
    try {
      const link = `${window.location.origin}/meeting/${code}`;
      await navigator.clipboard.writeText(link);
      setCardCopyState((prev) => ({ ...prev, [code]: "copied" }));
      setTimeout(() => setCardCopyState((prev) => ({ ...prev, [code]: "idle" })), 2000);
    } catch {
      // silent fail
    }
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

  /* ================= UI ================= */
  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Schedule</h1>
          <p className="text-sm text-muted-foreground">
            Plan upcoming meetings, share links, and keep everyone in sync
          </p>
        </div>
        <div className="flex gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarCheck className="h-4 w-4" />
            {meetings.length} scheduled
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {totalAttendees} attendees
          </span>
          <Button variant="outline" size="sm" onClick={fetchMeetings}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </header>

      {globalError && <div className="text-sm text-destructive">{globalError}</div>}

      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">

        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle>Select a date</CardTitle>
            <CardDescription>Choose a day to view or add meetings</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
            />

            {meetingsForDate.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">
                  {meetingsForDate.length} meeting(s) on {format(selectedDate, "MMM d")}:
                </p>
                {meetingsForDate.map((m) => (
                  <div key={m.id} className="border rounded p-2 text-sm space-y-1">
                    <p className="font-medium">{m.title}</p>
                    <p className="text-muted-foreground">
                      🕐 {format(m.scheduledFor, "hh:mm a")}
                    </p>
                    <p className="text-muted-foreground">
                      👥 {m.attendees.join(", ")}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      m.status === "scheduled" ? "bg-blue-100 text-blue-700" :
                      m.status === "live" ? "bg-green-100 text-green-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {m.status}
                    </span>

                    {/* ✅ ALWAYS VISIBLE — persistent Copy Link + Join as Host */}
                    <div className="flex gap-2 pt-1 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCardCopyLink(m.code)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        {cardCopyState[m.code] === "copied" ? "Copied!" : "Copy link"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          window.location.href = `/meeting/join?room=${m.code}&host=true`;
                        }}
                      >
                        Join as Host
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule Form */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule a meeting</CardTitle>
            <CardDescription>
              Fill in details and invite participants via email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Title */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Meeting Title</label>
              <Input
                placeholder="e.g. Team Standup, Project Review"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Time */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Meeting Time</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={23}
                  placeholder="HH"
                  value={selectedHour}
                  onChange={(e) => setSelectedHour(e.target.value)}
                  className="w-20 px-3 py-2 rounded-md border border-input bg-background text-foreground text-center text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-xl font-bold text-foreground">:</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  placeholder="MM"
                  value={selectedMinute}
                  onChange={(e) => setSelectedMinute(e.target.value)}
                  className="w-20 px-3 py-2 rounded-md border border-input bg-background text-foreground text-center text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm text-muted-foreground">24hr format (0–23 : 0–59)</span>
              </div>
            </div>

            {/* Attendees */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Add Attendees</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter email e.g. john@gmail.com"
                  value={attendeeInput}
                  onChange={(e) => setAttendeeInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddAttendee()}
                />
                <Button variant="outline" onClick={handleAddAttendee}>
                  Add
                </Button>
              </div>
              {attendeeList.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {attendeeList.map((email) => (
                    <span
                      key={email}
                      className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full text-xs"
                    >
                      {email}
                      <button
                        onClick={() => handleRemoveAttendee(email)}
                        className="text-muted-foreground hover:text-destructive ml-1"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Press Enter or click Add. Each attendee receives an email invite.
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Input
                placeholder="e.g. Bring your updates, agenda link..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {formError && (
              <div className="text-sm text-destructive">{formError}</div>
            )}

            <Button
              onClick={handleScheduleMeeting}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Scheduling..." : "Generate link & schedule"}
            </Button>

            {/* Result */}
            {lastScheduled && (
              <div className="border p-3 rounded space-y-2 bg-muted/30">
                <p className="text-sm font-medium text-green-600">
                  ✅ Meeting scheduled! Invites sent to {lastScheduled.attendees.length} attendee(s)
                </p>
                <code className="block text-sm break-all">
                  {resolveLink(lastScheduled.link)}
                </code>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyLink(lastScheduled.link)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    {copyState === "copied" ? "Copied!" : "Copy link"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      window.location.href = `/meeting/join?room=${lastScheduled.code}&host=true`;
                    }}
                  >
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