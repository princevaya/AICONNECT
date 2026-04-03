import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { listConnectionState, requestConnection } from "@/services/external-chat/connections.service";
import { enforceRateLimit } from "@/services/rate-limit.service";
import { parseJson, toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await ensureExternalChatUser(userId);
    const data = await listConnectionState(user);
    return NextResponse.json(data);
  } catch (error) {
    return toError(error, "Failed to load connections");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await parseJson<{ targetClerkId?: string; message?: string }>(req);
    const targetClerkId = body?.targetClerkId?.trim() || "";
    if (!targetClerkId) {
      return NextResponse.json({ error: "targetClerkId is required" }, { status: 400 });
    }
    const user = await ensureExternalChatUser(userId);
    const limit = await enforceRateLimit({
      routeKey: "external-chat:connection-request",
      subjectKey: user.id,
      userId: user.id,
      limit: Number(process.env.EXTERNAL_CHAT_CONNECTION_REQUESTS_PER_HOUR || 25),
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many connection requests" }, { status: 429 });
    }
    const result = await requestConnection(user, targetClerkId, body?.message);
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    const lower = error instanceof Error ? error.message.toLowerCase() : "";
    const status =
      lower.includes("not found") || lower.includes("cannot") || lower.includes("already")
        ? 400
        : lower.includes("not allowed")
          ? 403
          : 500;
    return toError(error, "Failed to send request", status);
  }
}
