import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { searchUsers } from "@/services/external-chat/connections.service";
import { enforceRateLimit } from "@/services/rate-limit.service";
import { toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const q = req.nextUrl.searchParams.get("q") || "";
    if (!q.trim()) return NextResponse.json({ users: [] });
    const user = await ensureExternalChatUser(userId);
    const limit = await enforceRateLimit({
      routeKey: "external-chat:user-search",
      subjectKey: user.id,
      userId: user.id,
      limit: Number(process.env.EXTERNAL_CHAT_SEARCHES_PER_MINUTE || 45),
      windowMs: 60_000,
    });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many search requests" }, { status: 429 });
    }
    const users = await searchUsers(user, q);
    return NextResponse.json({ users });
  } catch (error) {
    return toError(error, "Failed to search users");
  }
}
