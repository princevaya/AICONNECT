import { NextRequest } from "next/server";
import { success, failure } from "@/app/api/_utlis/response";
import {
  MeetingRecord,
  findByCode,
  markMeetingClosed,
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
    isActive: meeting.isActive,
    link: `/meeting/${meeting.code}`,
    createdAt: meeting.createdAt.toISOString(),
    updatedAt: meeting.updatedAt.toISOString(),
  };
}

/* ---------- GET ---------- */
export async function GET(
  _: NextRequest,
  { params }: { params: { code: string } }
) {
  const { code } = params;

  if (!process.env.DATABASE_URL) {
    return failure("DATABASE_URL is not configured", 500);
  }

  try {
    const meeting = await findByCode(code);

    if (!meeting) {
      return failure("Meeting not found", 404);
    }

    return success({
      meeting: toClientPayload(meeting),
    });
  } catch (error) {
    console.error("GET /api/rooms/[code] error:", error);
    return failure("Unable to load meeting", 500);
  }
}

/* ---------- DELETE ---------- */
export async function DELETE(
  _: NextRequest,
  { params }: { params: { code: string } }
) {
  const { code } = params;

  if (!process.env.DATABASE_URL) {
    return failure("DATABASE_URL is not configured", 500);
  }

  try {
    const meeting = await findByCode(code);

    if (!meeting) {
      return success({ deleted: false });
    }

    await markMeetingClosed(code);

    return success({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/rooms/[code] error:", error);
    return failure("Unable to remove meeting", 500);
  }
}
