import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { externalChatPrisma as prisma } from "@/lib/external-chat-prisma";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { parseJson, toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const actor = await ensureExternalChatUser(userId);

    const starred = await prisma.externalChatStarredMessage.findMany({
      where: { userId: actor.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        message: {
          include: {
            room: { select: { id: true, code: true, name: true, type: true } },
            sender: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
            attachment: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true } },
          },
        },
      },
    });

    const items = starred
      .filter((entry) => !entry.message.deletedAt)
      .map((entry) => ({
        id: entry.message.id,
        starredAt: entry.createdAt.toISOString(),
        roomCode: entry.message.room.code,
        roomName: entry.message.room.name,
        content: entry.message.content,
        metadata: entry.message.metadata,
        createdAt: entry.message.createdAt.toISOString(),
        sender: entry.message.sender,
        attachment: entry.message.attachment
          ? {
              id: entry.message.attachment.id,
              fileName: entry.message.attachment.fileName,
              mimeType: entry.message.attachment.mimeType,
              sizeBytes: Number(entry.message.attachment.sizeBytes),
              downloadUrl: `/api/external-chat/files/${entry.message.attachment.id}/download`,
            }
          : null,
      }));

    return NextResponse.json({ starred: items });
  } catch (error) {
    return toError(error, "Failed to load starred messages");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const actor = await ensureExternalChatUser(userId);
    const body = await parseJson<{ messageId?: string }>(req);
    const messageId = body?.messageId?.trim();
    if (!messageId) {
      return NextResponse.json({ error: "messageId is required" }, { status: 400 });
    }

    const message = await prisma.externalChatMessage.findUnique({
      where: { id: messageId },
      include: {
        room: {
          include: {
            members: {
              where: { userId: actor.id },
              select: { id: true },
            },
          },
        },
      },
    });
    if (!message || message.deletedAt) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    if (message.room.members.length === 0 && actor.role.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    const existing = await prisma.externalChatStarredMessage.findUnique({
      where: { userId_messageId: { userId: actor.id, messageId } },
    });

    if (existing) {
      await prisma.externalChatStarredMessage.delete({ where: { id: existing.id } });
      return NextResponse.json({ starred: false, messageId });
    }

    await prisma.externalChatStarredMessage.create({
      data: { userId: actor.id, messageId },
    });
    return NextResponse.json({ starred: true, messageId }, { status: 201 });
  } catch (error) {
    return toError(error, "Failed to toggle starred message");
  }
}

