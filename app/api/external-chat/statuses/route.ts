// app/api/external-chat/statuses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { createStatus, listStatuses } from "@/services/external-chat/status.service";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await ensureExternalChatUser(userId);
  const data = await listStatuses(user);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await ensureExternalChatUser(userId);
  const body = await req.json();
  
  const status = await createStatus({
    actor: user,
    text: body.text,
    attachmentId: body.attachmentId,
    visibility: body.visibility || "contacts",
    allowedUserIds: body.allowedUserIds,
  });
  
  return NextResponse.json({ status });
}