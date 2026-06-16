import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { respondToCall } from "@/services/external-chat/calls.service";
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
    const { id } = await context.params;
    const body = await parseJson<{ action?: "accept" | "reject" }>(req);
    const action = body?.action;
    if (action !== "accept" && action !== "reject") {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }
    const user = await ensureExternalChatUser(userId);
    const call = await respondToCall(id, user, action);
    return NextResponse.json({ call });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const status = message.includes("not found") ? 404 : message.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to update call", status);
  }
}
