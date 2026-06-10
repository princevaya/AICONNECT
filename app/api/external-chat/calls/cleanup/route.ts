// app/api/external-chat/calls/cleanup/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { cleanupStaleUserCalls } from "@/services/external-chat/call-cleanup.service";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await ensureExternalChatUser(userId);
    const cleanedCount = await cleanupStaleUserCalls(user);
    return NextResponse.json({ cleaned: cleanedCount, success: true });
  } catch (error) {
    console.error("Cleanup failed:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}