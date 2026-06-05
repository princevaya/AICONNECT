import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { completeUploadSession } from "@/services/external-chat/upload-session.service";
import { parseJson, toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await ensureExternalChatUser(userId);
    const { id } = await context.params;
    const body = await parseJson<{ parts?: Array<{ partNumber?: number; etag?: string; sizeBytes?: number }> }>(req);
    const parts = (body?.parts || [])
      .map((part) => ({
        partNumber: Number(part.partNumber || 0),
        etag: String(part.etag || "").trim(),
        sizeBytes: part.sizeBytes,
      }))
      .filter((part) => part.partNumber > 0 && Boolean(part.etag));

    const result = await completeUploadSession({
      sessionId: id,
      actor: user,
      parts,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const status = message.includes("not found") ? 404 : message.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to complete upload session", status);
  }
}
