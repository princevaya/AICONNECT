import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { InterviewSessionStatus } from "@prisma/client";
import {
  getInterviewSessionById,
  updateInterviewReadiness,
} from "@/services/interview.service";
import { ensureLocalUser } from "@/services/user.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(_: NextRequest, context: Context) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await ensureLocalUser(clerkUserId);
    const { sessionId } = await context.params;
    const session = await getInterviewSessionById(sessionId, user.id);

    if (!session) {
      return NextResponse.json({ error: "Interview session not found" }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error("[interview/session] get failed", error);
    const message = error instanceof Error ? error.message : "Failed to load interview session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
      | { micReady?: boolean; cameraReady?: boolean; status?: InterviewSessionStatus }
      | null;

    const user = await ensureLocalUser(clerkUserId);
    const { sessionId } = await context.params;
    const session = await updateInterviewReadiness({
      sessionId,
      userId: user.id,
      micReady: typeof body?.micReady === "boolean" ? body.micReady : undefined,
      cameraReady: typeof body?.cameraReady === "boolean" ? body.cameraReady : undefined,
      status: body?.status,
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error("[interview/session] patch failed", error);
    const message = error instanceof Error ? error.message : "Failed to update interview session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
