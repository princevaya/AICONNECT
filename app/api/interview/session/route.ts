import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createInterviewSession } from "@/services/interview.service";
import { ensureLocalUser } from "@/services/user.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
      | { name?: string; email?: string; phone?: string; jobRole?: string }
      | null;

    const name = body?.name?.trim() || "";
    const email = body?.email?.trim() || "";
    const phone = body?.phone?.trim() || "";
    const jobRole = body?.jobRole?.trim() || "";

    if (name.length < 2 || !isValidEmail(email) || phone.length < 8 || jobRole.length < 2) {
      return NextResponse.json({ error: "Please enter valid candidate details." }, { status: 400 });
    }

    const user = await ensureLocalUser(clerkUserId);
    const session = await createInterviewSession({
      userId: user.id,
      clerkUserId,
      details: { name, email, phone, jobRole },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error("[interview/session] create failed", error);
    const message = error instanceof Error ? error.message : "Failed to create interview session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
