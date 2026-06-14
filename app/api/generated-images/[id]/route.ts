import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { buildGeneratedImageDownload } from "@/services/generated-image-storage.service";
import { ensureLocalUser } from "@/services/user.service";

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
    const user = await ensureLocalUser(userId);
    const result = await buildGeneratedImageDownload({ generationId: id, requester: user });



    return new NextResponse(Readable.toWeb(result.stream) as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = /not found/i.test(message) ? 404 : /not allowed/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: status >= 500 ? "Failed to load image" : message || "Failed to load image" }, { status });
  }
}
