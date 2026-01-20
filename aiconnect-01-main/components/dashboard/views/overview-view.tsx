"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, isToday } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Video,
  Plus,
  Calendar,
  Users,
  PlayCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { useUser } from "@clerk/nextjs";

type ScheduleApiMeeting = {
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
};

type UpcomingMeeting = Omit<ScheduleApiMeeting, "scheduledFor"> & {
  scheduledFor: Date;
};

const normalizeMeeting = (meeting: ScheduleApiMeeting): UpcomingMeeting => {
  const scheduledDate = new Date(meeting.scheduledFor);
  return {
    ...meeting,
    scheduledFor: Number.isNaN(scheduledDate.getTime())
      ? new Date()
      : scheduledDate,
  };
};

const describeMeetingTime = (date: Date) => {
  if (Number.isNaN(date.getTime())) {
    return "Date pending";
  }

  return isToday(date) ? `Today, ${format(date, "p")}` : format(date, "PP p");
};

const summarizeAttendees = (attendees: string[]) => {
  if (!attendees || attendees.length === 0) {
    return "No attendees yet";
  }

  if (attendees.length === 1) {
    return attendees[0];
  }

  return `${attendees[0]} + ${attendees.length - 1} more`;
};

export default function OverviewView({
  setActiveView,
}: {
  setActiveView: (view: "overview" | "recording" | "schedule") => void;
}) {
  const router = useRouter();
  const { user } = useUser();
  const [meetingCode, setMeetingCode] = useState("");
  const [upcomingMeetings, setUpcomingMeetings] = useState<UpcomingMeeting[]>(
    []
  );
  const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(true);
  const [upcomingError, setUpcomingError] = useState<string | null>(null);

  const handleCreateMeeting = () => {
    if (!user) return;
    // Generate a random meeting code
    const randomCode = Math.random().toString(36).substring(2, 10);
    router.push(`/meeting/${randomCode}`);
  };

  const handleJoinMeeting = () => {
    if (meetingCode.trim()) {
      router.push(`/meeting/${meetingCode.trim()}`);
    }
  };

  const fetchUpcomingMeetings = useCallback(async () => {
    setIsLoadingUpcoming(true);
    setUpcomingError(null);
    try {
      const response = await fetch("/api/schedule", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load upcoming meetings");
      }
      setUpcomingMeetings(payload.map(normalizeMeeting));
    } catch (error) {
      console.error("Failed to load upcoming meetings", error);
      setUpcomingError(
        error instanceof Error
          ? error.message
          : "Unable to load upcoming meetings"
      );
    } finally {
      setIsLoadingUpcoming(false);
    }
  }, []);

  useEffect(() => {
    fetchUpcomingMeetings();
  }, [fetchUpcomingMeetings]);

  const upcomingPreview = useMemo(
    () => upcomingMeetings.slice(0, 3),
    [upcomingMeetings]
  );

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Welcome back!</h1>
          <p className="text-sm text-muted-foreground">
            Start or join a meeting in seconds
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create New Meeting Card */}
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Video className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>New Meeting</CardTitle>
                <CardDescription>Start an instant meeting</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create a new meeting room and share the link with your team or
              clients
            </p>
            <Button className="w-full" size="lg" onClick={handleCreateMeeting}>
              <Plus className="mr-2 h-5 w-5" />
              Create Meeting
            </Button>
          </CardContent>
        </Card>

        {/* Join Meeting Card */}
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>Join Meeting</CardTitle>
                <CardDescription>Enter a meeting code</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Enter meeting code or link"
                className="h-11"
                value={meetingCode}
                onChange={(e) => setMeetingCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoinMeeting()}
              />
            </div>
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={handleJoinMeeting}
              disabled={!meetingCode.trim()}
            >
              Join
            </Button>
          </CardContent>
        </Card>

        {/* Schedule Interview Card */}
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500/10">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle>Schedule Meeting</CardTitle>
                <CardDescription>Plan for later</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Plan a future session with calendar integration and smart
              reminders
            </p>
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => setActiveView("schedule")}
            >
              <Calendar className="mr-2 h-5 w-5" />
              Schedule
            </Button>
          </CardContent>
        </Card>

        {/* Recent Recordings Card */}
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <PlayCircle className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <CardTitle>Recordings</CardTitle>
                <CardDescription>View past sessions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Access and review all your recorded meeting sessions
            </p>
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => setActiveView("recording")}
            >
              <PlayCircle className="mr-2 h-5 w-5" />
              View Recordings
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Upcoming Meetings */}
      <section>
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Upcoming Meetings</CardTitle>
              <CardDescription>Your scheduled sessions</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={fetchUpcomingMeetings}
              disabled={isLoadingUpcoming}
            >
              {isLoadingUpcoming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingError && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <p>{upcomingError}</p>
                <Button
                  variant="link"
                  className="px-0 text-destructive underline-offset-4"
                  onClick={fetchUpcomingMeetings}
                >
                  Try again
                </Button>
              </div>
            )}

            {!upcomingError && isLoadingUpcoming && (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`upcoming-skeleton-${index}`}
                    className="h-20 rounded-lg border border-dashed bg-muted/40 animate-pulse"
                  />
                ))}
              </div>
            )}

            {!upcomingError &&
              !isLoadingUpcoming &&
              upcomingPreview.length === 0 && (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No upcoming meetings found. Schedule one to see it here.
                </div>
              )}

            {!upcomingError &&
              !isLoadingUpcoming &&
              upcomingPreview.length > 0 && (
                <div className="space-y-4">
                  {upcomingPreview.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Video className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{meeting.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {describeMeetingTime(meeting.scheduledFor)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {summarizeAttendees(meeting.attendees)}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => router.push(meeting.link)}
                      >
                        Join
                      </Button>
                    </div>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
