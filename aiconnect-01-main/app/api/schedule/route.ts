import { NextRequest } from "next/server";
import { success, failure } from "@/app/api/_utils/response";
import {
  MeetingRecord,
  listMeetings,
  createMeeting,
} from "@/lib/meetings";

/* ---------- helper ---------- */
function toClientPayload(meeting: MeetingRecord) {
  return {
    id: meeting.id,
    code: meeting.code,
    title: meeting.title,
    scheduledFor: meeting.scheduledFor.toISOString(),
    attendees: meeting.attendees,
    notes: meeting.notes ?? null,
    status: meeting.status,
    link: `/meeting/${meeting.code}`, // relative link only
    createdAt: meeting.createdAt.toISOString(),
    updatedAt: meeting.updatedAt.toISOString(),
  };
}

/* ---------- GET /api/schedule ---------- */
export async function GET() {
  try {
    const meetings = await listMeetings();

    return success({
      meetings: meetings.map(toClientPayload),
    });
  } catch (error) {
    console.error("GET /api/schedule error:", error);
    return failure("Failed to load meetings", 500);
  }
}

/* ---------- POST /api/schedule ---------- */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body?.title || !body?.scheduledFor) {
      return failure("Invalid payload", 400);
    }

    const title =
      typeof body.title === "string" ? body.title.trim() : "";

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

    const meeting = await createMeeting({
      title,
      scheduledFor: scheduledDate,
      attendees: Array.isArray(body.attendees) ? body.attendees : [],
      notes: body.notes ?? null,
    });

    return success(
      {
        meeting: toClientPayload(meeting),
      },
      201
    );
  } catch (error) {
    console.error("POST /api/schedule error:", error);
    return failure("Failed to create meeting", 500);
  }
}
