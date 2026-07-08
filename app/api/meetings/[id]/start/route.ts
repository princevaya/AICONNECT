import { success, failure } from "@/app/api/_utils/response";
import { findByCode, startMeeting } from "@/lib/meetings";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

export async function POST(
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

    // Verify creator permission to start the meeting
    if (meeting.createdBy && meeting.createdBy !== userId) {
      return failure("Forbidden: Only the meeting creator can start the meeting", 403);
    }

    const started = await startMeeting(meeting.code, userId);
    if (!started) {
      return failure("Failed to start meeting", 500);
    }

    return success({
      started: true,
      status: started.status,
    });
  } catch (error) {
    console.error("POST /api/meetings/[id]/start error:", error);
    return failure("Failed to start meeting", 500);
  }
}
