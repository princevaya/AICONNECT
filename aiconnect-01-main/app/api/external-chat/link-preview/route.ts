import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { getLinkPreview } from "@/services/external-chat/link-preview.service";
import { enforceRateLimit } from "@/services/rate-limit.service";
import { toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await ensureExternalChatUser(userId);
    const limit = await enforceRateLimit({
      routeKey: "external-chat:link-preview",
      subjectKey: user.id,
      userId: user.id,
      limit: Number(process.env.EXTERNAL_CHAT_LINK_PREVIEW_PER_MINUTE || 30),
      windowMs: 60_000,
    });

    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many preview requests" }, { status: 429 });
    }

    const preview = await getLinkPreview(req.nextUrl.searchParams.get("url") || "");
    return NextResponse.json({ preview });
  } catch (error) {
    return toError(error, "Failed to load link preview");
  }
}
