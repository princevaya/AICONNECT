import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { writeStorageFile, storageRelativePath } from "@/lib/local-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportBody = {
  feature?: string;
  roomId?: string;
  filename?: string;
  content?: string;
  contentType?: string;
};

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as ExportBody;
    const feature = (body.feature || "").trim();
    const roomId = (body.roomId || "").trim();
    const filename = (body.filename || "").trim();
    const content = body.content || "";

    if (!feature || !roomId || !filename || !content) {
      return NextResponse.json(
        { error: "feature, roomId, filename and content are required" },
        { status: 400 }
      );
    }

    const safeFilename = sanitizeFilename(filename);
    const key = storageRelativePath(
      "uploads",
      `${sanitizeFilename(feature)}-${sanitizeFilename(roomId)}-${sanitizeFilename(userId)}-${Date.now()}-${safeFilename}`
    );

    await writeStorageFile(key, Buffer.from(content, "utf8"));
    const url = `/api/files/download?token=${encodeURIComponent(key)}`; // wait, we can reuse primary file download or create a custom path, let's return the path. Wait, /api/files/download requires a token, let's check how primary downloads are retrieved.

    return NextResponse.json({ ok: true, key, url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export resource";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
