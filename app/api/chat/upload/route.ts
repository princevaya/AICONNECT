import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureChatRoom, upsertParticipant } from "@/services/chat.service";
import { uploadChatFile } from "@/services/chat-file.service";
import { ensureLocalUser } from "@/services/user.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  try {
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const roomId = formData.get("roomId");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (typeof roomId !== "string") {
      return NextResponse.json({ error: "roomId is required" }, { status: 400 });
    }
    const roomCode = roomId.trim();
    if (!roomCode) return NextResponse.json({ error: "roomId is required" }, { status: 400 });

    const user = await ensureLocalUser(userId);
    const room = await ensureChatRoom({ roomCode, createdBy: user });
    await upsertParticipant({ roomCode, user });
    const uploaded = await uploadChatFile({
      file,
      uploadedBy: user,
      roomId: room.id,
    });

    return NextResponse.json({ file: uploaded }, { status: 201 });
  } catch (error) {
    console.error("POST /api/chat/upload failed", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    const prismaCode =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code || "")
        : "";
    const status =
      message.toLowerCase().includes("required") || message.toLowerCase().includes("allowed")
        ? 400
        : message.toLowerCase().includes("unauthorized")
          ? 401
          : prismaCode === "P1001" || message.toLowerCase().includes("can't reach database server")
            ? 503
          : message.toLowerCase().includes("authentication failed")
            ? 503
          : 500;
    const errorMessage =
      prismaCode === "P1001"
        ? "Database is unreachable. Use Supabase pooler URL in DATABASE_URL or enable direct S3 chat uploads."
        : message;
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
