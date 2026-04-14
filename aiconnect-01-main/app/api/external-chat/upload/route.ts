import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { uploadAttachment } from "@/services/external-chat/storage.service";
import { enforceRateLimit } from "@/services/rate-limit.service";
import { toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const form = await req.formData();
    const file = form.get("file");
    const roomId = form.get("roomId");
    const roomCode = form.get("roomCode");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (typeof roomId !== "string" || !roomId.trim()) {
      return NextResponse.json({ error: "roomId is required" }, { status: 400 });
    }
    if (typeof roomCode !== "string" || !roomCode.trim()) {
      return NextResponse.json({ error: "roomCode is required" }, { status: 400 });
    }
    const user = await ensureExternalChatUser(userId);
    const rateLimit = await enforceRateLimit({
      routeKey: "external-chat:upload",
      subjectKey: user.id,
      userId: user.id,
      limit: Number(process.env.EXTERNAL_CHAT_UPLOADS_PER_MINUTE || 10),
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many uploads. Please wait before trying again." }, { status: 429 });
    }
    const attachment = await uploadAttachment({
      file,
      roomId: roomId.trim(),
      roomCode: roomCode.trim(),
      uploader: user,
    });
    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    const m = error instanceof Error ? error.message.toLowerCase() : "";
    const status =
      m.includes("required") || m.includes("empty") || m.includes("limit") || m.includes("allowed")
        ? 400
        : m.includes("not allowed")
          ? 403
          : 500;
    return toError(error, "Failed to upload", status);
  }
}

