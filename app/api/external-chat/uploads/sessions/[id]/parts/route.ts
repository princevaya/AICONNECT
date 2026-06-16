import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { getUploadPartUrl } from "@/services/external-chat/upload-session.service";
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
    const body = await parseJson<{ partNumber?: number }>(req);
    if (!Number.isFinite(body?.partNumber || NaN)) {
      return NextResponse.json({ error: "partNumber is required" }, { status: 400 });
    }

    const result = await getUploadPartUrl({
      sessionId: id,
      actor: user,
      partNumber: Number(body?.partNumber),
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const status = message.includes("not found") ? 404 : message.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to create upload part url", status);
  }
}
