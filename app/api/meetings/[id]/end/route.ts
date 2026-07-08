import { success, failure } from "@/app/api/_utils/response";
import { findByCode, endMeeting } from "@/lib/meetings";
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

    // Verify permission to end the meeting
    if (meeting.createdBy && meeting.createdBy !== userId) {
      return failure("Forbidden: Only the meeting creator can end the meeting", 403);
    }

    const ended = await endMeeting(meeting.code, userId);
    if (!ended) {
      return failure("Failed to end meeting", 500);
    }

    return success({
      ended: true,
      status: ended.status,
    });
  } catch (error) {
    console.error("POST /api/meetings/[id]/end error:", error);
    return failure("Failed to end meeting", 500);
  }
}
