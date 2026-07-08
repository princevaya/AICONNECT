import { success, failure } from "@/app/api/_utils/response";
import { findByCode, updateMeeting } from "@/lib/meetings";
import { auth, clerkClient } from "@clerk/nextjs/server";

export const runtime = "nodejs";

function toClientPayload(m: any, organizerName: string) {
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
    organizer: organizerName,
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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    if (!userId) {
      return failure("Unauthorized", 401);
    }

    const meeting = await findByCode(id);
    if (!meeting) {
      return failure("Meeting not found", 404);
    }

    let organizerName = "Organizer";
    if (meeting.createdBy) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(meeting.createdBy);
        organizerName = user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress || "Organizer";
      } catch (e) {
        console.warn("Failed to fetch organizer from Clerk:", e);
      }
    }

    return success({
      meeting: toClientPayload(meeting, organizerName),
    });
  } catch (error) {
    console.error("GET /api/meetings/[id] error:", error);
    return failure("Failed to retrieve meeting", 500);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    if (!userId) {
      return failure("Unauthorized", 401);
    }

    const meeting = await findByCode(id);
    if (!meeting) {
      return failure("Meeting not found", 404);
    }

    // Verify creator permission
    if (meeting.createdBy && meeting.createdBy !== userId) {
      return failure("Forbidden: You are not the organizer of this meeting", 403);
    }

    const body = await req.json();
    const payload: any = {};

    if (body.title !== undefined) {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (title.length < 3) {
        return failure("Title must be at least 3 characters long", 400);
      }
      payload.title = title;
    }

    if (body.scheduledFor !== undefined) {
      const scheduledDate = new Date(body.scheduledFor);
      if (isNaN(scheduledDate.getTime())) {
        return failure("Invalid scheduled date format", 400);
      }
      // grace check for clock skew
      if (scheduledDate.getTime() + 120000 <= Date.now()) {
        return failure("Meeting must be scheduled in the future", 400);
      }
      payload.scheduledFor = scheduledDate;
    }

    if (body.timezone !== undefined) {
      const timezone = typeof body.timezone === "string" ? body.timezone.trim() : "UTC";
      try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
      } catch {
        return failure(`Invalid timezone database code: ${timezone}`, 400);
      }
      payload.timezone = timezone;
    }

    if (body.duration !== undefined) {
      payload.duration = typeof body.duration === "string" ? body.duration.trim() : "30 Minutes";
    }

    if (body.attendees !== undefined) {
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
      payload.attendees = Array.from(attendeesSet);
    }

    if (body.notes !== undefined || body.description !== undefined) {
      payload.notes = body.notes !== undefined ? body.notes : body.description;
    }

    if (body.allowJoinBeforeHost !== undefined) payload.allowJoinBeforeHost = Boolean(body.allowJoinBeforeHost);
    if (body.waitingRoom !== undefined) payload.waitingRoom = Boolean(body.waitingRoom);
    if (body.muteOnJoin !== undefined) payload.muteOnJoin = Boolean(body.muteOnJoin);
    if (body.enableChat !== undefined) payload.enableChat = Boolean(body.enableChat);
    if (body.allowScreenSharing !== undefined) payload.allowScreenSharing = Boolean(body.allowScreenSharing);
    
    if (body.meetingPassword !== undefined) {
      payload.meetingPassword = typeof body.meetingPassword === "string" && body.meetingPassword.trim() ? body.meetingPassword.trim() : null;
    }

    const updated = await updateMeeting(meeting.code, payload);
    if (!updated) {
      return failure("Failed to update meeting", 500);
    }

    let organizerName = "Organizer";
    if (updated.createdBy) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(updated.createdBy);
        organizerName = user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress || "Organizer";
      } catch {}
    }

    return success({
      meeting: toClientPayload(updated, organizerName),
    });
  } catch (error) {
    console.error("PATCH /api/meetings/[id] error:", error);
    return failure("Failed to update meeting", 500);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    if (!userId) {
      return failure("Unauthorized", 401);
    }

    const meeting = await findByCode(id);
    if (!meeting) {
      return failure("Meeting not found", 404);
    }

    if (meeting.createdBy && meeting.createdBy !== userId) {
      return failure("Forbidden: You are not the organizer of this meeting", 403);
    }

    // Mark cancelled & inactive
    const updated = await updateMeeting(meeting.code, {
      status: "Cancelled",
    });

    if (!updated) {
      return failure("Failed to cancel meeting", 500);
    }

    return success({
      cancelled: true,
      meeting: toClientPayload(updated, "Organizer"),
    });
  } catch (error) {
    console.error("DELETE /api/meetings/[id] error:", error);
    return failure("Failed to cancel meeting", 500);
  }
}
