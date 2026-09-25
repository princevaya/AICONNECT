import { success } from "@/app/api/_utils/response";
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
      // Graceful fallback for ad-hoc / instant rooms not found in DB
      return success({
        status: "Live",
        allowJoinBeforeHost: true,
        waitingRoom: false,
        scheduledFor: new Date().toISOString(),
        endTime: null,
        timezone: "UTC",
        duration: "30 Minutes",
        isActive: true,
        createdBy: null,
        meetingPassword: null,
      });
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
      createdBy: meeting.createdBy ?? null,
      meetingPassword: meeting.meetingPassword ?? null,
    });
  } catch (error) {
    console.error("GET /api/meetings/[id]/status error:", error);
    // Return fallback rather than failing so client UI does not loop/crash
    return success({
      status: "Live",
      allowJoinBeforeHost: true,
      waitingRoom: false,
      scheduledFor: new Date().toISOString(),
      endTime: null,
      timezone: "UTC",
      duration: "30 Minutes",
      isActive: true,
      createdBy: null,
      meetingPassword: null,
    });
  }
}
