import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { externalChatPrisma } from "@/lib/external-chat-prisma";
import { publishRoomEvent } from "@/lib/external-chat-realtime";
import { parseJson, toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await ensureExternalChatUser(userId);
    const full = await externalChatPrisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        clerkId: true,
        name: true,
        email: true,
        imageUrl: true,
        e2eePublicKey: true,
        preferredLanguage: true,
        chatPreferences: true,
      },
    });
    return NextResponse.json({
      user: full || {
        id: user.id,
        clerkId: user.clerkId,
        name: user.name,
        email: user.email,
        imageUrl: user.imageUrl,
      },
    });
  } catch (error) {
    return toError(error, "Failed to load profile");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await ensureExternalChatUser(userId);
    const body = await parseJson<{
      imageDataUrl?: string | null;
      name?: string;
      preferredLanguage?: string;
      chatPreferences?: Record<string, unknown>;
      e2eePublicKey?: string;
    }>(req);

    const updateData: Prisma.UserUpdateInput = {};

    if (body?.imageDataUrl !== undefined) {
      const nextImage = (body.imageDataUrl || "").trim();
      if (nextImage && !nextImage.startsWith("data:image/")) {
        return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
      }
      if (nextImage.length > 2_400_000) {
        return NextResponse.json({ error: "Image too large" }, { status: 400 });
      }
      updateData.imageUrl = nextImage || null;
    }

    if (typeof body?.name === "string" && body.name.trim()) {
      updateData.name = body.name.trim().slice(0, 120);
    }

    if (typeof body?.preferredLanguage === "string" && body.preferredLanguage.trim()) {
      updateData.preferredLanguage = body.preferredLanguage.trim().slice(0, 16);
    }

    if (body?.chatPreferences && typeof body.chatPreferences === "object") {
      const existing = await externalChatPrisma.user.findUnique({
        where: { id: user.id },
        select: { chatPreferences: true },
      });
      const currentPrefs =
        existing?.chatPreferences && typeof existing.chatPreferences === "object" && !Array.isArray(existing.chatPreferences)
          ? (existing.chatPreferences as Record<string, unknown>)
          : {};
      updateData.chatPreferences = {
        ...currentPrefs,
        ...body.chatPreferences,
      } as Prisma.InputJsonValue;
    }

    if (typeof body?.e2eePublicKey === "string" && body.e2eePublicKey.trim()) {
      updateData.e2eePublicKey = body.e2eePublicKey.trim();
      updateData.e2eeKeyUpdatedAt = new Date();
    }

    const updated = await externalChatPrisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        clerkId: true,
        name: true,
        email: true,
        imageUrl: true,
        e2eePublicKey: true,
        preferredLanguage: true,
        chatPreferences: true,
      },
    });

    const memberships = await externalChatPrisma.externalChatRoomMember.findMany({
      where: {
        userId: user.id,
        removedAt: null,
        leftAt: null,
      },
      select: {
        room: {
          select: {
            code: true,
          },
        },
      },
    });

    await Promise.allSettled(
      memberships.map((membership) =>
        publishRoomEvent(membership.room.code, {
          senderId: user.id,
          payload: {
            type: "profile",
            user: updated,
          },
        })
      )
    );

    return NextResponse.json({ user: updated });
  } catch (error) {
    return toError(error, "Failed to update profile");
  }
}
