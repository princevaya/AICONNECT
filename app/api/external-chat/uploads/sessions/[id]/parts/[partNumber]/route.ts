import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { uploadPartStream } from "@/services/external-chat/upload-session.service";
import { toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handlePartUpload(
  req: NextRequest,
  context: { params: Promise<{ id: string; partNumber: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await ensureExternalChatUser(userId);
    const { id, partNumber } = await context.params;
    const parsedPart = Number.parseInt(partNumber, 10);
    if (!Number.isFinite(parsedPart) || parsedPart < 1) {
      return NextResponse.json({ error: "Invalid partNumber" }, { status: 400 });
    }
    if (!req.body) {
      return NextResponse.json({ error: "Chunk body is required" }, { status: 400 });
    }

    const result = await uploadPartStream({
      sessionId: id,
      actor: user,
      partNumber: parsedPart,
      body: req.body,
    });

    return NextResponse.json(result, {
      headers: {
        ETag: `"${result.etag}"`,
      },
    });
  } catch (error) {
    const m = error instanceof Error ? error.message.toLowerCase() : "";
    const status = m.includes("not found")
      ? 404
      : m.includes("not allowed")
        ? 403
        : m.includes("invalid") || m.includes("empty") || m.includes("exceeds") || m.includes("closed") || m.includes("expired")
          ? 400
          : 500;
    return toError(error, "Failed to upload chunk", status);
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string; partNumber: string }> }
) {
  return handlePartUpload(req, context);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string; partNumber: string }> }
) {
  return handlePartUpload(req, context);
}

