import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { externalChatPrisma as prisma } from "@/lib/external-chat-prisma";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { assertExternalChatRoomAccess } from "@/services/external-chat/chat.service";
import { parseJson, toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const actor = await ensureExternalChatUser(userId);
    const { roomCode } = await context.params;
    const room = await assertExternalChatRoomAccess(roomCode, actor);

    const [roomDetail, myKeys, members] = await Promise.all([
      prisma.externalChatRoom.findUnique({
        where: { id: room.id },
        select: { id: true, code: true, type: true, e2eeEnabled: true },
      }),
      prisma.externalChatRoomKey.findMany({
        where: { roomId: room.id, userId: actor.id },
        orderBy: { keyVersion: "desc" },
        take: 5,
      }),
      prisma.externalChatRoomMember.findMany({
        where: { roomId: room.id, removedAt: null, leftAt: null },
        include: {
          user: {
            select: { id: true, clerkId: true, name: true, email: true, e2eePublicKey: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      room: roomDetail,
      myKeys,
      memberKeys: members.map((m) => m.user),
    });
  } catch (error) {
    const m = error instanceof Error ? error.message.toLowerCase() : "";
    const status = m.includes("not found") ? 404 : m.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to load room keys", status);
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const actor = await ensureExternalChatUser(userId);
    const { roomCode } = await context.params;
    const room = await assertExternalChatRoomAccess(roomCode, actor);

    const body = await parseJson<{
      e2eeEnabled?: boolean;
      senderPublicKey?: string;
      keyVersion?: number;
      entries?: Array<{ userId: string; wrappedKey: string }>;
    }>(req);

    if (typeof body?.e2eeEnabled === "boolean") {
      await prisma.externalChatRoom.update({
        where: { id: room.id },
        data: { e2eeEnabled: body.e2eeEnabled },
      });
    }

    const entries = body?.entries || [];
    const senderPublicKey = body?.senderPublicKey?.trim() || "";
    const keyVersion = Math.max(1, Math.floor(body?.keyVersion || 1));

    if (entries.length > 0) {
      if (!senderPublicKey) {
        return NextResponse.json({ error: "senderPublicKey is required when uploading keys" }, { status: 400 });
      }
      const activeMembers = await prisma.externalChatRoomMember.findMany({
        where: { roomId: room.id, removedAt: null, leftAt: null },
        select: { userId: true },
      });
      const validIds = new Set(activeMembers.map((m) => m.userId));

      await Promise.all(
        entries
          .filter((entry) => validIds.has(entry.userId) && entry.wrappedKey.trim())
          .map((entry) =>
            prisma.externalChatRoomKey.upsert({
              where: {
                roomId_userId_keyVersion: {
                  roomId: room.id,
                  userId: entry.userId,
                  keyVersion,
                },
              },
              update: {
                wrappedKey: entry.wrappedKey.trim(),
                senderPublicKey,
                createdBy: actor.id,
              },
              create: {
                roomId: room.id,
                userId: entry.userId,
                keyVersion,
                wrappedKey: entry.wrappedKey.trim(),
                senderPublicKey,
                createdBy: actor.id,
              },
            })
          )
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const m = error instanceof Error ? error.message.toLowerCase() : "";
    const status = m.includes("not found") ? 404 : m.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to update room keys", status);
  }
}

