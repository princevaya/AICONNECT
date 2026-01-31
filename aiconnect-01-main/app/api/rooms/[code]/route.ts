import { NextRequest, NextResponse } from "next/server";
import {
  MeetingRecord,
  findActiveByCode,
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
    return NextResponse.json(
      { success: false, error: "DATABASE_URL is not configured" },
      { status: 500 }
    );
  }

  try {
    const meeting = await findActiveByCode(code);

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: "Meeting not found or has been closed" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      meeting: toClientPayload(meeting),
    });
  } catch (error) {
    console.error("Failed to load meeting", error);
    return NextResponse.json(
      { success: false, error: "Unable to load meeting" },
      { status: 500 }
    );
  }
}

/* ---------- DELETE (soft delete) ---------- */
export async function DELETE(
  _: NextRequest,
  { params }: { params: { code: string } }
) {
  const { code } = params;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { success: false, error: "DATABASE_URL is not configured" },
      { status: 500 }
    );
  }

  try {
    const meeting = await findActiveByCode(code);

    if (!meeting) {
      return NextResponse.json(
        { success: false, deleted: false },
        { status: 404 }
      );
    }

    await markMeetingClosed(code);

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    console.error("Failed to delete meeting", error);
    return NextResponse.json(
      { success: false, error: "Unable to remove meeting" },
      { status: 500 }
    );
  }
}
