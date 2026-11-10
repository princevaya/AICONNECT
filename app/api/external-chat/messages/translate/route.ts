import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { translateMessageContent, SUPPORTED_LANGUAGES } from "@/services/external-chat/translation.service";
import { parseJson, toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ languages: SUPPORTED_LANGUAGES });
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const actor = await ensureExternalChatUser(userId);
    const body = await parseJson<{
      messageId?: string;
      text?: string;
      targetLanguage?: string;
    }>(req);

    const targetLanguage = body?.targetLanguage?.trim() || "en";
    const result = await translateMessageContent({
      actor,
      messageId: body?.messageId,
      text: body?.text,
      targetLanguage,
    });

    return NextResponse.json(result);
  } catch (error) {
    const m = error instanceof Error ? error.message.toLowerCase() : "";
    const status = m.includes("not found")
      ? 404
      : m.includes("not allowed")
        ? 403
        : m.includes("unsupported") || m.includes("required") || m.includes("long")
          ? 400
          : 503;
    return toError(error, "Failed to translate message", status);
  }
}

