import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

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
    const contentType =
      (body.contentType || "").trim() || "text/plain; charset=utf-8";

    if (!feature || !roomId || !filename || !content) {
      return NextResponse.json(
        { error: "feature, roomId, filename and content are required" },
        { status: 400 }
      );
    }

    const safeFilename = sanitizeFilename(filename);
    const key = `${sanitizeFilename(feature)}-${sanitizeFilename(roomId)}-${sanitizeFilename(userId)}-${Date.now()}-${safeFilename}`;

    const dirPath = path.join(process.cwd(), "public", "uploads", "exports");
    await fs.mkdir(dirPath, { recursive: true });
    
    const filepath = path.join(dirPath, key);
    await fs.writeFile(filepath, content, "utf8");

    const url = `/uploads/exports/${key}`;

    return NextResponse.json({ ok: true, key, url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export resource";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
