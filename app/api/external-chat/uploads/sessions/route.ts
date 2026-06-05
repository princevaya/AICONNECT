import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { createUploadSessionHint, startUploadSession } from "@/services/external-chat/upload-session.service";
import { parseJson, toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hint = await createUploadSessionHint();
    return NextResponse.json(hint);
  } catch (error) {
    return toError(error, "Failed to load upload session hints", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await ensureExternalChatUser(userId);
    const body = await parseJson<{
      roomCode?: string;
      fileName?: string;
      mimeType?: string;
      totalSizeBytes?: number;
      chunkSizeBytes?: number;
    }>(req);
    if (!body?.roomCode?.trim()) return NextResponse.json({ error: "roomCode is required" }, { status: 400 });
    if (!body?.fileName?.trim()) return NextResponse.json({ error: "fileName is required" }, { status: 400 });
    if (!body?.mimeType?.trim()) return NextResponse.json({ error: "mimeType is required" }, { status: 400 });
    if (!Number.isFinite(body.totalSizeBytes || NaN)) {
      return NextResponse.json({ error: "totalSizeBytes is required" }, { status: 400 });
    }

    const result = await startUploadSession({
      roomCode: body.roomCode.trim(),
      actor: user,
      fileName: body.fileName.trim(),
      mimeType: body.mimeType.trim(),
      totalSizeBytes: Number(body.totalSizeBytes),
      chunkSizeBytes: body.chunkSizeBytes,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const status =
      message.includes("not found")
        ? 404
        : message.includes("not allowed")
          ? 403
          : message.includes("multipart") || message.includes("limited")
            ? 400
            : 500;
    return toError(error, "Failed to start upload session", status);
  }
}
