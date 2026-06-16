import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { listTranscriptionJobs, queueTranscriptionJob } from "@/services/external-chat/transcription.service";
import { parseJson, toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await ensureExternalChatUser(userId);
    const jobs = await listTranscriptionJobs(user);
    return NextResponse.json({ jobs });
  } catch (error) {
    return toError(error, "Failed to load transcriptions", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await ensureExternalChatUser(userId);
    const body = await parseJson<{
      attachmentId?: string;
      messageId?: string;
      provider?: string;
      language?: string;
    }>(req);
    const job = await queueTranscriptionJob({
      actor: user,
      attachmentId: body?.attachmentId || null,
      messageId: body?.messageId || null,
      provider: body?.provider || "whisper",
      language: body?.language || "auto",
    });
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const status = message.includes("not found") ? 404 : message.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to queue transcription", status);
  }
}
