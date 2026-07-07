"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
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
  Keyboard,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  CalendarRange,
} from "lucide-react";

import { useUser } from "@clerk/nextjs";
import { cn, copyToClipboard } from "@/lib/utils";

type ScheduleApiMeeting = {
  id: string;
  code: string;
  title: string;
  scheduledFor: string;
  attendees: string[];
  notes?: string | null;
  status: string;
  createdBy?: string | null;
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

export default function OverviewView() {
  const router = useRouter();
  const { user } = useUser();

  const [meetingCode, setMeetingCode] = useState("");
  const [upcomingMeetings, setUpcomingMeetings] = useState<UpcomingMeeting[]>([]);
  const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(true);
  const [upcomingError, setUpcomingError] = useState<string | null>(null);

  // New states for Google Meet UI
  const [isNewMeetingDropdownOpen, setIsNewMeetingDropdownOpen] = useState(false);
  const [createdMeetingLink, setCreatedMeetingLink] = useState<string | null>(null);
  const [copiedCreatedLink, setCopiedCreatedLink] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const fetchUpcomingMeetings = useCallback(async () => {
    setIsLoadingUpcoming(true);
    setUpcomingError(null);

    try {
      const response = await fetch("/api/schedule", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load upcoming meetings");
      }

      if (!Array.isArray(payload?.meetings)) {
        throw new Error("Invalid upcoming meetings response");
      }

      setUpcomingMeetings(payload.meetings.map(normalizeMeeting));
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

  // Fetch upcoming meetings on component mount
  useEffect(() => {
    fetchUpcomingMeetings();
  }, [fetchUpcomingMeetings]);

  const upcomingPreview = useMemo(
    () => upcomingMeetings.slice(0, 3),
    [upcomingMeetings]
  );

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

  // Redirect to the schedule meeting route/tab
  const handleCreateMeetingForLater = () => {
    setIsNewMeetingDropdownOpen(false);
    router.push("/dashboard?tab=schedule");
  };

  const handleCopyCreatedLink = async (link: string) => {
    const ok = await copyToClipboard(link);
    if (ok) {
      setCopiedCreatedLink(true);
      setTimeout(() => setCopiedCreatedLink(false), 2000);
    }
  };

  const slides = [
    {
      illustration: (
        <svg viewBox="0 0 200 200" className="w-52 h-52 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="80" fill="#E8F0FE" className="dark:fill-blue-950/40" />
          <rect x="55" y="65" width="90" height="70" rx="10" fill="#4285F4" />
          <circle cx="100" cy="100" r="22" fill="white" className="dark:fill-background" />
          <path d="M92 100a8 8 0 018-8h10M108 100a8 8 0 01-8 8H90" stroke="#4285F4" strokeWidth="4" strokeLinecap="round" />
          <circle cx="75" cy="85" r="5" fill="#34A853" />
          <circle cx="125" cy="115" r="5" fill="#FBBC05" />
        </svg>
      ),
      title: "Get a link you can share",
      description: "Click New meeting to get a link you can send to people you want to meet with",
    },
    {
      illustration: (
        <svg viewBox="0 0 200 200" className="w-52 h-52 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="80" fill="#E6F4EA" className="dark:fill-green-950/40" />
          <rect x="55" y="55" width="90" height="90" rx="12" fill="#34A853" />
          <rect x="55" y="55" width="90" height="26" rx="12" fill="#1E8E3E" />
          <circle cx="100" cy="110" r="20" fill="white" className="dark:fill-background" />
          <path d="M100 98v12h10" stroke="#34A853" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ),
      title: "Plan ahead",
      description: "Click New meeting to schedule meetings and send invites to attendees",
    },
    {
      illustration: (
        <svg viewBox="0 0 200 200" className="w-52 h-52 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="80" fill="#FEF7E0" className="dark:fill-yellow-950/40" />
          <path d="M100 50L60 70v40c0 24 17 47 40 53 23-6 40-29 40-53V70l-40-20z" fill="#FBBC05" />
          <path d="M88 102l8 8 16-16" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      title: "Your meeting is safe",
      description: "No one can join a meeting unless invited or admitted by the host",
    },
  ];

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16 max-w-6xl mx-auto py-8 lg:py-16 px-4 min-h-[calc(100vh-8rem)]">
      {/* LEFT COLUMN: Controls */}
      <div className="flex-1 space-y-6 max-w-xl">
        <h1 className="text-4xl md:text-5xl font-normal leading-tight tracking-tight text-foreground/90 font-sans">
          Video calls and meetings for everyone
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground/80 font-light leading-relaxed">
          Connect, collaborate, and celebrate from anywhere with AIConnect.
        </p>

        {/* Action Row */}
        <div className="flex flex-wrap items-center gap-4 pt-4">
          {/* New Meeting Dropdown Wrapper */}
          <div className="relative">
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-6 font-medium flex items-center gap-2 text-base shadow-sm"
              onClick={() => setIsNewMeetingDropdownOpen(!isNewMeetingDropdownOpen)}
            >
              <Video className="h-5 w-5 fill-white" />
              New meeting
            </Button>

            {isNewMeetingDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setIsNewMeetingDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 mt-2 bg-popover text-popover-foreground border shadow-lg rounded-xl py-2 w-64 z-50 text-sm font-normal">
                  <button
                    onClick={handleCreateMeetingForLater}
                    className="w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center gap-3"
                  >
                    <Plus className="h-4 w-4" />
                    Create a meeting for later
                  </button>
                  <button
                    onClick={handleCreateMeeting}
                    className="w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center gap-3"
                  >
                    <Video className="h-4 w-4" />
                    Start an instant meeting
                  </button>
                  <button
                    onClick={() => {
                      setIsNewMeetingDropdownOpen(false);
                      router.push("/dashboard?tab=schedule");
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center gap-3"
                  >
                    <CalendarRange className="h-4 w-4" />
                    Schedule a meeting
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Join Code Input and Action Button */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Keyboard className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 h-5 w-5" />
              <Input
                placeholder="Enter a code or link"
                className="h-12 pl-12 pr-4 bg-background border border-input rounded-md text-base w-64 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-sans"
                value={meetingCode}
                onChange={(e) => setMeetingCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoinMeeting()}
              />
            </div>
            <button
              onClick={handleJoinMeeting}
              disabled={!meetingCode.trim()}
              className={cn(
                "h-12 px-5 font-medium rounded-md text-base transition-colors",
                meetingCode.trim()
                  ? "text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/20 font-semibold"
                  : "text-muted-foreground/40 cursor-default"
              )}
            >
              Join
            </button>
          </div>
        </div>

        <div className="h-[1px] bg-muted/80 my-8 w-full"></div>

        {/* Upcoming Meetings List Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-md font-semibold text-muted-foreground tracking-wide uppercase">
              Upcoming Meetings
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground"
              onClick={fetchUpcomingMeetings}
              disabled={isLoadingUpcoming}
            >
              <RefreshCw className={cn("h-4 w-4", isLoadingUpcoming && "animate-spin")} />
            </Button>
          </div>

          {upcomingError && (
            <div className="p-4 border rounded-lg border-destructive/20 bg-destructive/5 text-sm text-destructive flex flex-col gap-2">
              <p>Unable to load upcoming meetings.</p>
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={fetchUpcomingMeetings}
              >
                Retry
              </Button>
            </div>
          )}

          {!upcomingError && isLoadingUpcoming && (
            <div className="space-y-3">
              <div className="h-16 rounded-lg bg-muted/40 animate-pulse border border-dashed" />
              <div className="h-16 rounded-lg bg-muted/40 animate-pulse border border-dashed" />
            </div>
          )}

          {!upcomingError && !isLoadingUpcoming && upcomingPreview.length === 0 && (
            <p className="text-sm text-muted-foreground font-light">
              No meetings scheduled. Use the Schedule tab to plan ahead.
            </p>
          )}

          {!upcomingError && !isLoadingUpcoming && upcomingPreview.length > 0 && (
            <div className="space-y-3">
              {upcomingPreview.map((meeting) => {
                const isMeetingHost = !!(user && meeting.createdBy === user.id);
                return (
                  <div
                    key={meeting.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Video className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">{meeting.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {describeMeetingTime(meeting.scheduledFor)} • {summarizeAttendees(meeting.attendees)}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() =>
                        router.push(
                          isMeetingHost ? `${meeting.link}&host=true` : meeting.link
                        )
                      }
                    >
                      {isMeetingHost ? "Join as Host" : "Join"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Illustration Carousel */}
      <div className="w-full lg:w-96 flex flex-col items-center justify-center p-6 text-center select-none shrink-0">
        <div className="h-64 flex items-center justify-center">
          {slides[currentSlide].illustration}
        </div>
        <div className="mt-6 space-y-2 min-h-24">
          <h3 className="text-xl font-normal text-foreground">{slides[currentSlide].title}</h3>
          <p className="text-sm text-muted-foreground/80 max-w-xs mx-auto leading-relaxed">
            {slides[currentSlide].description}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-9 w-9 border border-input text-muted-foreground hover:text-foreground"
            onClick={prevSlide}
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  i === currentSlide ? "bg-blue-600 w-2.5 h-2.5" : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-9 w-9 border border-input text-muted-foreground hover:text-foreground"
            onClick={nextSlide}
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Copy Modal Dialog */}
      {createdMeetingLink && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground border rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-semibold mb-2">Here's the link to your meeting</h3>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Copy this link and send it to people you want to meet with. Make sure you save it so you can use it later.
            </p>
            <div className="flex gap-2 items-center bg-muted/50 border rounded-xl p-3">
              <span className="text-sm select-all break-all flex-1 font-mono text-muted-foreground/90 pl-1">
                {createdMeetingLink}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => handleCopyCreatedLink(createdMeetingLink)}
                title="Copy link"
              >
                {copiedCreatedLink ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </Button>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => setCreatedMeetingLink(null)}
                className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}