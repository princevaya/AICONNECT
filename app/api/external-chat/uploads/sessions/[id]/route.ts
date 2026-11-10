import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { getUploadProgress } from "@/services/external-chat/upload-session.service";
import { toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await ensureExternalChatUser(userId);
    const { id } = await context.params;
    const progress = await getUploadProgress({ sessionId: id, actor: user });
    return NextResponse.json(progress);
  } catch (error) {
    const m = error instanceof Error ? error.message.toLowerCase() : "";
    const status = m.includes("not found") ? 404 : m.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to fetch upload session", status);
  }
}

