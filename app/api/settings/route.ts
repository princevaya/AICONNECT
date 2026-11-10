import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { externalChatPrisma as prisma } from "@/lib/external-chat-prisma";
import { parseJson, toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_NOTIFICATION_PREFS = {
  newMessages: true,
  mentionsAndReplies: true,
  meetingReminders: true,
  browserNotifications: false,
  soundAlerts: true,
};

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await ensureExternalChatUser(userId);
    const record = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        preferredLanguage: true,
        chatPreferences: true,
      },
    });
    const prefs =
      record?.chatPreferences && typeof record.chatPreferences === "object" && !Array.isArray(record.chatPreferences)
        ? (record.chatPreferences as Record<string, unknown>)
        : {};
    const notifications =
      prefs.notifications && typeof prefs.notifications === "object"
        ? { ...DEFAULT_NOTIFICATION_PREFS, ...(prefs.notifications as Record<string, boolean>) }
        : DEFAULT_NOTIFICATION_PREFS;

    return NextResponse.json({
      profile: {
        name: record?.name || user.name || "",
        email: record?.email || user.email || "",
        preferredLanguage: record?.preferredLanguage || "en",
      },
      notifications,
    });
  } catch (error) {
    return toError(error, "Failed to load settings");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await ensureExternalChatUser(userId);
    const body = await parseJson<{
      name?: string;
      preferredLanguage?: string;
      notifications?: Partial<typeof DEFAULT_NOTIFICATION_PREFS>;
    }>(req);

    const existing = await prisma.user.findUnique({
      where: { id: user.id },
      select: { chatPreferences: true },
    });
    const existingPrefs =
      existing?.chatPreferences && typeof existing.chatPreferences === "object" && !Array.isArray(existing.chatPreferences)
        ? (existing.chatPreferences as Record<string, unknown>)
        : {};

    const updateData: Prisma.UserUpdateInput = {};

    if (typeof body?.name === "string" && body.name.trim()) {
      const trimmed = body.name.trim().slice(0, 120);
      updateData.name = trimmed;
      try {
        const parts = trimmed.split(/\s+/);
        const firstName = parts[0] || trimmed;
        const lastName = parts.slice(1).join(" ") || "";
        const client = await clerkClient();
        await client.users.updateUser(userId, { firstName, lastName });
      } catch {
        // DB profile update still succeeds even if Clerk rate-limits/skips
      }
    }

    if (typeof body?.preferredLanguage === "string" && body.preferredLanguage.trim()) {
      updateData.preferredLanguage = body.preferredLanguage.trim().slice(0, 16);
    }

    if (body?.notifications && typeof body.notifications === "object") {
      const prevNotif =
        existingPrefs.notifications && typeof existingPrefs.notifications === "object"
          ? (existingPrefs.notifications as Record<string, boolean>)
          : DEFAULT_NOTIFICATION_PREFS;
      updateData.chatPreferences = {
        ...existingPrefs,
        notifications: {
          ...prevNotif,
          ...body.notifications,
        },
      } as Prisma.InputJsonValue;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        name: true,
        email: true,
        preferredLanguage: true,
        chatPreferences: true,
      },
    });

    return NextResponse.json({
      saved: true,
      profile: {
        name: updated.name || "",
        email: updated.email || "",
        preferredLanguage: updated.preferredLanguage || "en",
      },
      notifications:
        updated.chatPreferences && typeof updated.chatPreferences === "object" && !Array.isArray(updated.chatPreferences)
          ? (updated.chatPreferences as { notifications?: typeof DEFAULT_NOTIFICATION_PREFS }).notifications || DEFAULT_NOTIFICATION_PREFS
          : DEFAULT_NOTIFICATION_PREFS,
    });
  } catch (error) {
    return toError(error, "Failed to update settings");
  }
}

export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const client = await clerkClient();
    await client.users.deleteUser(userId);
    await prisma.user.deleteMany({ where: { clerkId: userId } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return toError(error, "Failed to delete account");
  }
}

