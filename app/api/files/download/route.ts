import fs from "fs";
import { Readable } from "stream";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { buildDownloadResponse, validateDownloadToken } from "@/services/chat-file.service";
import { ensureLocalUser } from "@/services/user.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const payload = validateDownloadToken(token);
    const user = await ensureLocalUser(userId);
    if (payload.userId !== user.id) {
      return NextResponse.json({ error: "Token user mismatch" }, { status: 403 });
    }

    const result = await buildDownloadResponse({
      fileId: payload.fileId,
      requestedBy: user,
    });

    if (result.mode === "redirect") {
      return NextResponse.redirect(result.signedUrl, 302);
    }

    const exists = fs.existsSync(result.file.absolutePath);
    if (!exists) {
      return NextResponse.json({ error: "Stored file not found" }, { status: 404 });
    }

    const stream = fs.createReadStream(result.file.absolutePath);
    const webStream = Readable.toWeb(stream) as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": result.file.fileType,
        "Content-Length": String(result.file.fileSize),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(result.file.name)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/files/download failed", error);
    const message = error instanceof Error ? error.message : "Download failed";
    const isForbidden =
      message.toLowerCase().includes("not allowed") ||
      message.toLowerCase().includes("mismatch");
    const isExpired = message.toLowerCase().includes("expired");
    const isNotFound = message.toLowerCase().includes("not found");
    return NextResponse.json(
      { error: message },
      { status: isForbidden ? 403 : isExpired ? 401 : isNotFound ? 404 : 500 }
    );
  }
}
