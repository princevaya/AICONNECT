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
} from "lucide-react";

/* ---------------- constants ---------------- */
const TIME_OPTIONS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
];

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

interface ScheduledMeeting
  extends Omit<ScheduleApiMeeting, "scheduledFor"> {
  scheduledFor: Date;
}

/* ---------------- helpers ---------------- */
const normalizeMeeting = (m: ScheduleApiMeeting): ScheduledMeeting => ({
  ...m,
  scheduledFor: new Date(m.scheduledFor),
});

const upsertMeeting = (
  meetings: ScheduledMeeting[],
  incoming: ScheduledMeeting
) => {
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
  const [selectedTime, setSelectedTime] = useState("10:00");
  const [title, setTitle] = useState("Team Strategy Sync");
  const [attendees, setAttendees] = useState("team@company.com");
  const [lastScheduled, setLastScheduled] =
    useState<ScheduledMeeting | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [copyState, setCopyState] =
    useState<"idle" | "copied" | "error">("idle");

  /* ---------- SAFE GET ---------- */
  const fetchMeetings = useCallback(async () => {
    setIsLoading(true);
    setGlobalError(null);

    try {
      const res = await fetch("/api/schedule", { cache: "no-store" });
      const text = await res.text();

      if (!text.trim().startsWith("{")) {
        throw new Error("Schedule API returned invalid response");
      }

      const payload = JSON.parse(text);

      if (!payload.success) {
        throw new Error(payload.error || "Failed to load meetings");
      }

      setMeetings(payload.meetings.map(normalizeMeeting));
    } catch (err: any) {
      setGlobalError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  /* ---------- SAFE POST ---------- */
  const handleScheduleMeeting = async () => {
    setFormError(null);
    setIsSubmitting(true);

    try {
      const [h, m] = selectedTime.split(":").map(Number);
      const scheduled = new Date(selectedDate);
      scheduled.setHours(h, m, 0, 0);

      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          scheduledFor: scheduled.toISOString(),
          attendees: attendees.split(",").map((a) => a.trim()),
        }),
      });

      const text = await res.text();

      if (!text.trim().startsWith("{")) {
        throw new Error("Schedule API returned invalid response");
      }

      const payload = JSON.parse(text);

      if (!payload.success) {
        throw new Error(payload.error || "Failed to schedule meeting");
      }

      const meeting = normalizeMeeting(payload.meeting);
      setMeetings((prev) => upsertMeeting(prev, meeting));
      setLastScheduled(meeting);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---------- helpers ---------- */
  const resolveLink = (link: string) =>
    link.startsWith("http")
      ? link
      : `${window.location.origin}${link}`;

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(resolveLink(link));
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
    }
  };

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

      {globalError && (
        <div className="text-sm text-destructive">{globalError}</div>
      )}

      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Select a date</CardTitle>
            <CardDescription>
              Choose a day to view or add meetings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule a meeting</CardTitle>
            <CardDescription>
              Generate a meeting link and notify participants
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />

            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full border rounded p-2"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>

            <Input
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
            />

            {formError && (
              <div className="text-sm text-destructive">{formError}</div>
            )}

            <Button onClick={handleScheduleMeeting} disabled={isSubmitting}>
              Generate link & schedule
            </Button>

            {lastScheduled && (
              <div className="border p-3 rounded space-y-2">
                <code className="block text-sm">
                  {resolveLink(lastScheduled.link)}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyLink(lastScheduled.link)}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  {copyState === "copied" ? "Copied" : "Copy link"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
