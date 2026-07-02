import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const egressId =
    typeof body?.egressId === "string" ? body.egressId : undefined;

  if (!egressId) {
    return NextResponse.json(
      { error: "egressId is required" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    egressId,
    status: "EGRESS_COMPLETE",
    statusCode: 3, // COMPLETE
  });
}
