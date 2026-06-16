import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { uploadPartWithRetry } from "@/services/external-chat/upload-session.service";
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
    const body = await req.json();
    
    const { partNumber, chunkData } = body;
    if (!partNumber || !chunkData) {
      return NextResponse.json({ error: "partNumber and chunkData are required" }, { status: 400 });
    }
    
    const buffer = Buffer.from(chunkData, "base64");
    const result = await uploadPartWithRetry({
      sessionId: id,
      actor: user,
      partNumber,
      chunkData: buffer,
    });
    
    return NextResponse.json(result);
  } catch (error) {
    return toError(error, "Failed to retry part upload", 500);
  }
}