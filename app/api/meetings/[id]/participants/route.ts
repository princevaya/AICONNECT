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
      participants: meeting.attendees,
    });
  } catch (error) {
    console.error("GET /api/meetings/[id]/participants error:", error);
    return failure("Failed to retrieve participants", 500);
  }
}
