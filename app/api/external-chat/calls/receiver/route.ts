// app/api/external-chat/calls/receiver/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { getActiveCallForUser } from "@/services/external-chat/call-signaling.service";
import { toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await ensureExternalChatUser(userId);
    const activeCall = await getActiveCallForUser(user.id);

    return NextResponse.json({ activeCall });
  } catch (error) {
    return toError(error, "Failed to check incoming calls", 500);
  }
}
