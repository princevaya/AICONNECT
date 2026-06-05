import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { joinCall } from "@/services/external-chat/calls.service";
import { toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await ensureExternalChatUser(userId);
    const { id } = await context.params;
    const result = await joinCall(id, user);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const status = message.includes("not found") ? 404 : message.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to join call", status);
  }
}
