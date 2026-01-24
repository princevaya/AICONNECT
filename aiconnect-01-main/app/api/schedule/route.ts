import { NextResponse } from "next/server";
import {
  MeetingRecord,
  createMeeting,
  listMeetings,
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
    link: `/meeting/${meeting.code}`, // ✅ RELATIVE LINK ONLY
    createdAt: meeting.createdAt.toISOString(),
    updatedAt: meeting.updatedAt.toISOString(),
  };
}

/* ---------- GET ---------- */
export async function GET() {
  try {
    const meetings = await listMeetings();
    return NextResponse.json({
      success: true,
      meetings: meetings.map(toClientPayload),
    });
  } catch (err) {
    console.error("GET /api/schedule error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load meetings" },
      { status: 500 }
    );
  }
}

/* ---------- POST ---------- */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    /*---if (!body.title || !body.scheduledFor) {
      return NextResponse.json(
        { success: false, error: "Invalid payload" },
        { status: 400 }
      );
    } replaced by me with down below---*/

    const title =
  typeof body.title === "string" ? body.title.trim() : "";

if (title.length < 3) {
  return NextResponse.json(
    { success: false, error: "Title must be at least 3 characters long" },
    { status: 400 }
  );
}

const scheduledDate = new Date(body.scheduledFor);
if (isNaN(scheduledDate.getTime())) {
  return NextResponse.json(
    { success: false, error: "Invalid scheduled date" },
    { status: 400 }
  );
}

if (scheduledDate.getTime() <= Date.now()) {
  return NextResponse.json(
    { success: false, error: "Meeting must be scheduled in the future" },
    { status: 400 }
  );
}
    /*---end replaced by me---*/

    const meeting = await createMeeting({
      /*title: body.title.trim(),(changed)*/
      title,
      scheduledFor: scheduledDate,
      attendees: Array.isArray(body.attendees) ? body.attendees : [],
      notes: body.notes,
    });

    return NextResponse.json(
      { success: true, meeting: toClientPayload(meeting) },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/schedule error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create meeting" },
      { status: 500 }
    );
  }
}
