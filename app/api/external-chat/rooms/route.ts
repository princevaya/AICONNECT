import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { createRoom, listRooms } from "@/services/external-chat/chat.service";
import { parseJson, toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await ensureExternalChatUser(userId);
    const workspace = req.nextUrl.searchParams.get("workspace") || undefined;
    const result = await listRooms(user, workspace);
    return NextResponse.json(result);
  } catch (error) {
    return toError(error, "Failed to load rooms");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await parseJson<{
      workspace?: string;
      name?: string;
      description?: string;
      type?: "direct" | "group" | "channel";
      isPrivate?: boolean;
      memberClerkIds?: string[];
    }>(req);
    if (!body?.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const user = await ensureExternalChatUser(userId);
    const room = await createRoom({
      user,
      workspace: body.workspace,
      name: body.name,
      description: body.description,
      type: body.type || "group",
      isPrivate: body.isPrivate,
      memberClerkIds: body.memberClerkIds,
    });
    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    const m = error instanceof Error ? error.message.toLowerCase() : "";
    const status =
      m.includes("requires") ||
      m.includes("required") ||
      m.includes("limit exceeded") ||
      m.includes("maximum is")
        ? 400
        : 500;
    return toError(error, "Failed to create room", status);
  }
}

