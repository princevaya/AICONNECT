import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { abortUploadSession } from "@/services/external-chat/upload-session.service";
import { toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await ensureExternalChatUser(userId);
    const { id } = await params;
    
    const result = await abortUploadSession({ sessionId: id, actor: user });
    return NextResponse.json(result);
  } catch (error) {
    return toError(error, "Failed to abort upload", 500);
  }
}