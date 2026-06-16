import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import {
  acceptConnectionRequest,
  declineConnectionRequest,
} from "@/services/external-chat/connections.service";
import { parseJson, toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    const body = await parseJson<{ action?: "accept" | "decline" }>(req);
    const action = body?.action;
    if (!action) return NextResponse.json({ error: "action is required" }, { status: 400 });

    const user = await ensureExternalChatUser(userId);
    if (action === "accept") {
      const result = await acceptConnectionRequest(user, id);
      return NextResponse.json({ success: true, result });
    }
    await declineConnectionRequest(user, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const lower = error instanceof Error ? error.message.toLowerCase() : "";
    const status = lower.includes("not found") ? 404 : lower.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to handle request", status);
  }
}
