import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { buildAttachmentDownload } from "@/services/external-chat/storage.service";
import { toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    const user = await ensureExternalChatUser(userId);
    const result = await buildAttachmentDownload({ attachmentId: id, requester: user });

    if (result.mode === "redirect") {
      return NextResponse.redirect(result.signedUrl);
    }

    return new NextResponse(Readable.toWeb(result.stream) as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(result.fileName)}"`,
      },
    });
  } catch (error) {
    const m = error instanceof Error ? error.message.toLowerCase() : "";
    const status = m.includes("not found") ? 404 : m.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to download", status);
  }
}

