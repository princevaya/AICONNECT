import { NextRequest, NextResponse } from "next/server";
import {
  MeetingRecord,
  deleteMeetingByCode,
  findByCode,
  markMeetingClosed,
} from "@/lib/meetings";

function toClientPayload(meeting: MeetingRecord) {
  return {
    id: meeting.id,
    code: meeting.code,
    title: meeting.title,
    scheduledFor: meeting.scheduledFor,
    attendees: meeting.attendees,
    notes: meeting.notes,
    status: meeting.status,
    isActive: meeting.isActive,
    link: `/meeting/${meeting.code}`,
    createdAt: meeting.createdAt,
    updatedAt: meeting.updatedAt,
  };
}

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 500 }
    );
  }

  try {
    const meeting = await findByCode(code);
    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    return NextResponse.json(toClientPayload(meeting));
  } catch (error) {
    console.error("Failed to load meeting", error);
    return NextResponse.json(
      { error: "Unable to load meeting" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 500 }
    );
  }

  try {
    const meeting = await findByCode(code);
    if (!meeting) {
      return NextResponse.json({ deleted: false }, { status: 200 });
    }

    await markMeetingClosed(code);
    await deleteMeetingByCode(code);

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Failed to delete meeting", error);
    return NextResponse.json(
      { error: "Unable to remove meeting" },
      { status: 500 }
    );
  }
}
