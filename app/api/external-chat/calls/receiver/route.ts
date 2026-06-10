// app/api/external-chat/calls/receiver/route.ts
// Endpoint for receiver to check for active calls

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { getActiveCallForUser } from "@/services/external-chat/call-signaling.service";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await ensureExternalChatUser(userId);
  const activeCall = await getActiveCallForUser(user.id);
  
  return NextResponse.json({ activeCall });
}