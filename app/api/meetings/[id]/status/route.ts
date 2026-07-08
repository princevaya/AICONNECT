import { success, failure } from "@/app/api/_utils/response";
import { findByCode } from "@/lib/meetings";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const meeting = await findByCode(id);
    if (!meeting) {
      return failure("Meeting not found", 404);
    }

    return success({
      status: meeting.status,
      allowJoinBeforeHost: meeting.allowJoinBeforeHost,
      waitingRoom: meeting.waitingRoom,
      scheduledFor: meeting.scheduledFor.toISOString(),
      endTime: meeting.endTime ? meeting.endTime.toISOString() : null,
      timezone: meeting.timezone,
      duration: meeting.duration,
      isActive: meeting.isActive,
    });
  } catch (error) {
    console.error("GET /api/meetings/[id]/status error:", error);
    return failure("Failed to retrieve status", 500);
  }
}
