import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // S3 upload URL generation is disabled as files are stored locally on the server.
  return NextResponse.json(
    { error: "S3 upload URL generation is unavailable. Please use direct upload instead." },
    { status: 503 }
  );
}
