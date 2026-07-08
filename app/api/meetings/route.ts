import { success, failure } from "@/app/api/_utils/response";
import { createMeeting, listAllMeetings, listMeetings } from "@/lib/meetings";
import { sendMeetingInvite } from "@/lib/email";
import { auth, currentUser } from "@clerk/nextjs/server";

export const runtime = "nodejs";

function toClientPayload(m: any) {
  return {
    id: m.id,
    code: m.code,
    title: m.title,
    scheduledFor: m.scheduledFor.toISOString(),
    endTime: m.endTime ? m.endTime.toISOString() : null,
    attendees: m.attendees,
    notes: m.notes ?? null,
    status: m.status,
    isActive: m.isActive,
    createdBy: m.createdBy ?? null,
    timezone: m.timezone,
    duration: m.duration,
    hostJoinedAt: m.hostJoinedAt ? m.hostJoinedAt.toISOString() : null,
    hostLeftAt: m.hostLeftAt ? m.hostLeftAt.toISOString() : null,
    endedAt: m.endedAt ? m.endedAt.toISOString() : null,
    allowJoinBeforeHost: m.allowJoinBeforeHost,
    waitingRoom: m.waitingRoom,
    muteOnJoin: m.muteOnJoin ?? false,
    enableChat: m.enableChat ?? true,
    allowScreenSharing: m.allowScreenSharing ?? true,
    meetingPassword: m.meetingPassword ?? null,
    meetingStartedBy: m.meetingStartedBy ?? null,
    meetingEndedBy: m.meetingEndedBy ?? null,
    link: `/meeting/join?room=${m.code}`,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

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
    console.error("GET /api/meetings error:", error);
    return failure("Failed to load meetings", 500);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return failure("Unauthorized", 401);
    }

    const user = await currentUser();
    const organizerName = user?.fullName || user?.firstName || user?.emailAddresses[0]?.emailAddress || "Organizer";

    const body = await req.json();

    if (!body?.title || !body?.scheduledFor) {
      return failure("Missing required fields: title and scheduledFor are mandatory", 400);
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (title.length < 3) {
      return failure("Title must be at least 3 characters long", 400);
    }

    // Timezone validation
    const timezone = typeof body.timezone === "string" ? body.timezone.trim() : "UTC";
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      return failure(`Invalid timezone database code: ${timezone}`, 400);
    }

    const scheduledDate = new Date(body.scheduledFor);
    if (isNaN(scheduledDate.getTime())) {
      return failure("Invalid scheduled date format", 400);
    }

    // Enforce scheduled meeting not in past (with a 2-minute grace threshold for clock skew)
    if (scheduledDate.getTime() + 120000 <= Date.now()) {
      return failure("Meeting must be scheduled in the future", 400);
    }

    const duration = typeof body.duration === "string" ? body.duration.trim() : "30 Minutes";

    // Participants validation & deduplication
    const rawAttendees = Array.isArray(body.attendees) ? body.attendees : [];
    const attendeesSet = new Set<string>();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of rawAttendees) {
      const cleanEmail = typeof email === "string" ? email.trim() : "";
      if (!cleanEmail) continue;
      if (!emailRegex.test(cleanEmail)) {
        return failure(`Invalid email address format: ${cleanEmail}`, 400);
      }
      attendeesSet.add(cleanEmail);
    }
    const attendees = Array.from(attendeesSet);

    const notes = typeof body.notes === "string" ? body.notes.trim() : (typeof body.description === "string" ? body.description.trim() : null);

    const meeting = await createMeeting({
      title,
      scheduledFor: scheduledDate,
      attendees,
      notes,
      createdBy: userId,
      timezone,
      duration,
      allowJoinBeforeHost: Boolean(body.allowJoinBeforeHost),
      waitingRoom: Boolean(body.waitingRoom),
      muteOnJoin: Boolean(body.muteOnJoin),
      enableChat: body.enableChat !== false,
      allowScreenSharing: body.allowScreenSharing !== false,
      meetingPassword: typeof body.meetingPassword === "string" && body.meetingPassword.trim() ? body.meetingPassword.trim() : null,
      status: "Scheduled",
    });

    const clientMeeting = toClientPayload(meeting);

    // Send email invites to all attendees
    const emailResults = await Promise.allSettled(
      attendees.map((email) =>
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

    const emailsSent = emailResults.filter((r) => r.status === "fulfilled").length;
    const emailsFailed = emailResults.filter((r) => r.status === "rejected").length;

    return success(
      {
        meeting: clientMeeting,
        invites: { sent: emailsSent, failed: emailsFailed },
      },
      201
    );
  } catch (error) {
    console.error("POST /api/meetings error:", error);
    return failure("Failed to create meeting", 500);
  }
}
