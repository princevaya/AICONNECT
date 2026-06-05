import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { processQueuedTranscriptions } from "@/services/external-chat/transcription.service";
import { parseJson, toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await ensureExternalChatUser(userId);
    const body = await parseJson<{ limit?: number }>(req);
    const result = await processQueuedTranscriptions({
      actor: user,
      limit: body?.limit,
    });
    return NextResponse.json(result);
  } catch (error) {
    return toError(error, "Failed to process transcription queue");
  }
}
