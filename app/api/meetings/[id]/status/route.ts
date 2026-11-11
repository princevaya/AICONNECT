import { success } from "@/app/api/_utils/response";
import { findByCode } from "@/lib/meetings";
import { ensureRoom } from "@/app/api/_utils/roomStore";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const roomState = ensureRoom(id);
  const effectiveAutoApprove = Boolean(roomState.settings?.autoApprove);

  try {
    const meeting = await findByCode(id);
    if (!meeting) {
      // Graceful fallback for ad-hoc / instant rooms not found in DB: require approval unless autoApprove is enabled
      return success({
        status: "Live",
        allowJoinBeforeHost: effectiveAutoApprove,
        waitingRoom: !effectiveAutoApprove,
        scheduledFor: new Date().toISOString(),
        endTime: null,
        timezone: "UTC",
        duration: "30 Minutes",
        isActive: true,
        createdBy: roomState.hostUserId ?? null,
        meetingPassword: null,
      });
    }

    return success({
      status: meeting.status,
      allowJoinBeforeHost: meeting.allowJoinBeforeHost,
      waitingRoom: meeting.waitingRoom && !effectiveAutoApprove,
      scheduledFor: meeting.scheduledFor.toISOString(),
      endTime: meeting.endTime ? meeting.endTime.toISOString() : null,
      timezone: meeting.timezone,
      duration: meeting.duration,
      isActive: meeting.isActive,
      createdBy: meeting.createdBy ?? roomState.hostUserId ?? null,
      meetingPassword: meeting.meetingPassword ?? null,
    });
  } catch (error) {
    console.error("GET /api/meetings/[id]/status error:", error);
    // Return fallback rather than failing so client UI does not loop/crash
    return success({
      status: "Live",
      allowJoinBeforeHost: effectiveAutoApprove,
      waitingRoom: !effectiveAutoApprove,
      scheduledFor: new Date().toISOString(),
      endTime: null,
      timezone: "UTC",
      duration: "30 Minutes",
      isActive: true,
      createdBy: roomState.hostUserId ?? null,
      meetingPassword: null,
    });
  }
}
