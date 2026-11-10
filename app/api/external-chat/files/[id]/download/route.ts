import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { buildAttachmentDownload } from "@/services/external-chat/storage.service";
import { toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    const user = await ensureExternalChatUser(userId);
    const rangeHeader = req.headers.get("range");
    const result = await buildAttachmentDownload({
      attachmentId: id,
      requester: user,
      rangeHeader,
    });

    if (result.mode === "redirect") {
      return NextResponse.redirect(result.signedUrl);
    }

    const chunkLength = result.totalBytes === 0 ? 0 : result.end - result.start + 1;
    const headers: Record<string, string> = {
      "Content-Type": result.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(result.fileName)}"`,
      "Content-Length": String(chunkLength),
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
    };

    if (result.checksum) {
      headers["ETag"] = `"${result.checksum}"`;
      headers["X-Checksum-Sha256"] = result.checksum;
    }

    if (result.isPartial) {
      headers["Content-Range"] = `bytes ${result.start}-${result.end}/${result.totalBytes}`;
    }

    return new NextResponse(Readable.toWeb(result.stream) as BodyInit, {
      status: result.isPartial ? 206 : 200,
      headers,
    });
  } catch (error) {
    const m = error instanceof Error ? error.message.toLowerCase() : "";
    const status = m.includes("not found") || m.includes("missing") ? 404 : m.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to download", status);
  }
}
