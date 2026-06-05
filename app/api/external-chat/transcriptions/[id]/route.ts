import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import {
  completeTranscriptionJob,
  failTranscriptionJob,
  retryTranscriptionJob,
  updateTranscriptionTranscript,
} from "@/services/external-chat/transcription.service";
import { parseJson, toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    const user = await ensureExternalChatUser(userId);
    const body = await parseJson<{
      action?: "complete" | "fail" | "retry" | "update";
      transcript?: string;
      language?: string;
      errorMessage?: string;
    }>(req);

    if (body?.action === "retry") {
      const job = await retryTranscriptionJob({ jobId: id, actor: user });
      return NextResponse.json({ job });
    }
    if (body?.action === "update") {
      if (!body.transcript?.trim()) {
        return NextResponse.json({ error: "transcript is required" }, { status: 400 });
      }
      const job = await updateTranscriptionTranscript({
        jobId: id,
        actor: user,
        transcript: body.transcript,
        language: body.language,
      });
      return NextResponse.json({ job });
    }
    if (body?.action === "fail") {
      if (!body.errorMessage?.trim()) {
        return NextResponse.json({ error: "errorMessage is required" }, { status: 400 });
      }
      const job = await failTranscriptionJob({ jobId: id, actor: user, errorMessage: body.errorMessage });
      return NextResponse.json({ job });
    }
    if (body?.action === "complete") {
      if (!body.transcript?.trim()) {
        return NextResponse.json({ error: "transcript is required" }, { status: 400 });
      }
      const job = await completeTranscriptionJob({
        jobId: id,
        actor: user,
        transcript: body.transcript,
        language: body.language,
      });
      return NextResponse.json({ job });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const status = message.includes("not found") ? 404 : message.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to update transcription job", status);
  }
}
