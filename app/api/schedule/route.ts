import { success, failure } from "@/app/api/_utils/response";
import { MeetingRecord, listMeetings, listAllMeetings, createMeeting } from "@/lib/meetings";
import { sendMeetingInvite } from "@/lib/email";
import { auth, currentUser } from "@clerk/nextjs/server"; // ✅ ADDED

export const runtime = "nodejs";

function getScheduleErrorDetails(error: unknown) {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";

  if (!process.env.DATABASE_URL) {
    return {
      status: 503,
      message:
        "Scheduler database is not configured. Set DATABASE_URL in Vercel project environment variables.",
    };
  }

  if (
    /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|database|postgres|SASL|SSL|connection/i.test(message)
  ) {
    return {
      status: 503,
      message:
        "Scheduler database connection failed. Verify DATABASE_URL points to a reachable Postgres instance.",
    };
  }

  return {
    status: 500,
    message: null as string | null,
  };
}

/* ---------- helper ---------- */
function toClientPayload(meeting: MeetingRecord) {
  return {
    id: meeting.id,
    code: meeting.code,
    title: meeting.title,
    scheduledFor: meeting.scheduledFor.toISOString(),
    endTime: meeting.endTime ? meeting.endTime.toISOString() : null,
    attendees: meeting.attendees,
    notes: meeting.notes ?? null,
    status: meeting.status,
    isActive: meeting.isActive,
    createdBy: meeting.createdBy ?? null,
    timezone: meeting.timezone,
    duration: meeting.duration,
    hostJoinedAt: meeting.hostJoinedAt ? meeting.hostJoinedAt.toISOString() : null,
    hostLeftAt: meeting.hostLeftAt ? meeting.hostLeftAt.toISOString() : null,
    endedAt: meeting.endedAt ? meeting.endedAt.toISOString() : null,
    allowJoinBeforeHost: meeting.allowJoinBeforeHost,
    waitingRoom: meeting.waitingRoom,
    muteOnJoin: meeting.muteOnJoin ?? false,
    enableChat: meeting.enableChat ?? true,
    allowScreenSharing: meeting.allowScreenSharing ?? true,
    meetingPassword: meeting.meetingPassword ?? null,
    meetingStartedBy: meeting.meetingStartedBy ?? null,
    meetingEndedBy: meeting.meetingEndedBy ?? null,
    link: `/meeting/join?room=${meeting.code}`,
    createdAt: meeting.createdAt.toISOString(),
    updatedAt: meeting.updatedAt.toISOString(),
  };
}

/* ---------- GET /api/schedule ---------- */
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return failure("Unauthorized", 401);
    }

    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress ?? null;

    const { searchParams } = new URL(req.url);
    const showAll = searchParams.get("all") === "true";

    const meetings = showAll 
      ? await listAllMeetings(userId, userEmail) 
      : await listMeetings(userId, userEmail);
    return success({
      meetings: meetings.map(toClientPayload),
    });
  } catch (error) {
    console.error("GET /api/schedule error:", error);
    const details = getScheduleErrorDetails(error);
    return failure(details.message ?? "Failed to load meetings", details.status);
  }
}

/* ---------- POST /api/schedule ---------- */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    const body = await req.json();

    if (!body?.title || !body?.scheduledFor) {
      return failure("Invalid payload", 400);
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (title.length < 3) {
      return failure("Title must be at least 3 characters long", 400);
    }

    const scheduledDate = new Date(body.scheduledFor);
    if (isNaN(scheduledDate.getTime())) {
      return failure("Invalid scheduled date", 400);
    }

    if (scheduledDate.getTime() <= Date.now()) {
      return failure("Meeting must be scheduled in the future", 400);
    }

    const attendees: string[] = Array.isArray(body.attendees)
      ? body.attendees
      : [];

    const timezone = typeof body.timezone === "string" ? body.timezone.trim() : "UTC";
    const duration = typeof body.duration === "string" ? body.duration.trim() : "30 Minutes";

    const meeting = await createMeeting({
      title,
      scheduledFor: scheduledDate,
      attendees,
      notes: body.notes ?? null,
      createdBy: userId ?? null,
      timezone,
      duration,
      allowJoinBeforeHost: Boolean(body.allowJoinBeforeHost),
      waitingRoom: Boolean(body.waitingRoom),
      muteOnJoin: Boolean(body.muteOnJoin),
      enableChat: body.enableChat !== false,
      allowScreenSharing: body.allowScreenSharing !== false,
      meetingPassword: typeof body.meetingPassword === "string" && body.meetingPassword.trim() ? body.meetingPassword.trim() : null,
    });

    const user = await currentUser();
    const organizerName = user?.fullName || user?.firstName || user?.emailAddresses[0]?.emailAddress || "Organizer";

    // Send email invites to all attendees
    const emailResults = await Promise.allSettled(
      attendees
        .filter((a) => a.includes("@"))
        .map((email) =>
          sendMeetingInvite({
            to: email,
            title: meeting.title,
            scheduledFor: meeting.scheduledFor,
            meetingCode: meeting.code,
            notes: meeting.notes,
            timezone,
            duration,
            organizerName,
          })
        )
    );

    const emailsSent = emailResults.filter(
      (r) => r.status === "fulfilled"
    ).length;
    const emailsFailed = emailResults.filter(
      (r) => r.status === "rejected"
    ).length;

    return success(
      {
        meeting: toClientPayload(meeting),
        invites: { sent: emailsSent, failed: emailsFailed },
      },
      201
    );
  } catch (error) {
    console.error("POST /api/schedule error:", error);
    const details = getScheduleErrorDetails(error);
    return failure(details.message ?? "Failed to create meeting", details.status);
  }
}