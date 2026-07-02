"use client";

import React, { useCallback, useMemo, useState } from "react";
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
  ImageIcon,
  Loader2,
  MessageSquareText,
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

  return isToday(date)
    ? `Today, ${format(date, "p")}`
    : format(date, "PP p");
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

  const [upcomingMeetings, setUpcomingMeetings] = useState<UpcomingMeeting[]>([]);
  const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(true);
  const [upcomingError, setUpcomingError] = useState<string | null>(null);


  const handleCreateMeeting = () => {
    if (!user) return;
    router.push("/meeting/create");
  };

  const handleJoinMeeting = () => {
    const raw = meetingCode.trim();
    if (!raw) return;

    let room = raw;
    try {
      const parsed = new URL(raw);
      const roomFromQuery = parsed.searchParams.get("room");
      if (roomFromQuery) {
        room = roomFromQuery.trim();
      } else {
        const parts = parsed.pathname.split("/").filter(Boolean);
        const meetingIndex = parts.findIndex((p) => p === "meeting");
        if (meetingIndex >= 0 && parts[meetingIndex + 1] && parts[meetingIndex + 1] !== "join") {
          room = parts[meetingIndex + 1].trim();
        }
      }
    } catch {
      // Keep raw value when it is not a valid URL.
    }

    if (!room) return;
    router.push(`/meeting/join?room=${encodeURIComponent(room)}`);
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

      if (!Array.isArray(payload?.data)) {
        throw new Error("Invalid upcoming meetings response");
      }

      setUpcomingMeetings(payload.data.map(normalizeMeeting));

    } catch (error) {

      console.error(error);

      setUpcomingError(
        error instanceof Error
          ? error.message
          : "Unable to load upcoming meetings"
      );

    } finally {

      setIsLoadingUpcoming(false);

    }

  }, []);


  const upcomingPreview = useMemo(
    () => upcomingMeetings.slice(0, 3),
    [upcomingMeetings]
  );


  return (

    <div className="space-y-8">

      <header className="flex items-center justify-between">

        <div>

          <h1 className="text-2xl font-semibold">
            Welcome back!
          </h1>

          <p className="text-sm text-muted-foreground">
            Start or join a meeting in seconds
          </p>

        </div>

      </header>



      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">


        {/* CREATE MEETING */}
        <Card className="border-2 hover:border-primary/50 transition-colors">

          <CardHeader>

            <div className="flex items-center gap-3">

              <div className="p-3 rounded-lg bg-primary/10">
                <Video className="h-6 w-6 text-primary"/>
              </div>

              <div>
                <CardTitle>New Meeting</CardTitle>
                <CardDescription>
                  Start an instant meeting
                </CardDescription>
              </div>

            </div>

          </CardHeader>


          <CardContent className="space-y-4">

            <p className="text-sm text-muted-foreground">
              Create a new meeting room and share the link
            </p>

            <Button
              className="w-full"
              size="lg"
              onClick={handleCreateMeeting}
            >
              <Plus className="mr-2 h-5 w-5"/>
              Create Meeting
            </Button>

          </CardContent>

        </Card>



        {/* JOIN MEETING */}
        <Card className="border-2 hover:border-primary/50 transition-colors">

          <CardHeader>

            <div className="flex items-center gap-3">

              <div className="p-3 rounded-lg bg-blue-500/10">
                <Users className="h-6 w-6 text-blue-600"/>
              </div>

              <div>
                <CardTitle>Join Meeting</CardTitle>
                <CardDescription>
                  Enter a meeting code
                </CardDescription>
              </div>

            </div>

          </CardHeader>


          <CardContent className="space-y-4">

            <Input
              className="h-11"
              value={meetingCode}
              onChange={(e) => setMeetingCode(e.target.value)}
            />

            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={handleJoinMeeting}
            >
              Join
            </Button>

          </CardContent>

        </Card>

      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <ImageIcon className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <CardTitle>3D Image Generator</CardTitle>
                <CardDescription>Create visual assets from your dashboard</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generate polished 3D-style concepts, product visuals, and presentation-ready imagery without leaving AIConnect.
            </p>
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => router.push("/dashboard/3d-image-generator")}
            >
              <ImageIcon className="mr-2 h-5 w-5" />
              Open Generator
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-sky-500/10">
                <MessageSquareText className="h-6 w-6 text-sky-600" />
              </div>
              <div>
                <CardTitle>External Chat</CardTitle>
                <CardDescription>Manage conversations and shared files</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Jump into your external collaboration hub for direct messages, room workflows, attachments, and realtime updates.
            </p>
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => router.push("/dashboard/external-chat")}
            >
              <MessageSquareText className="mr-2 h-5 w-5" />
              Open External Chat
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