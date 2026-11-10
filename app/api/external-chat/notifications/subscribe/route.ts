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
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: actor.id },
      select: { id: true, endpoint: true, createdAt: true },
    });
    return NextResponse.json({
      subscriptions,
      vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null,
    });
  } catch (error) {
    return toError(error, "Failed to load notification subscriptions");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const actor = await ensureExternalChatUser(userId);
    const body = await parseJson<{
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    }>(req);
    const endpoint = body?.endpoint?.trim();
    if (!endpoint) {
      return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
    }

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: actor.id,
        p256dh: body?.keys?.p256dh || null,
        auth: body?.keys?.auth || null,
        userAgent: req.headers.get("user-agent") || null,
      },
      create: {
        userId: actor.id,
        endpoint,
        p256dh: body?.keys?.p256dh || null,
        auth: body?.keys?.auth || null,
        userAgent: req.headers.get("user-agent") || null,
      },
    });

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    return toError(error, "Failed to save push subscription");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const actor = await ensureExternalChatUser(userId);
    const body = await parseJson<{ endpoint?: string }>(req);
    const endpoint = body?.endpoint?.trim();
    if (!endpoint) {
      return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
      where: { userId: actor.id, endpoint },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toError(error, "Failed to remove push subscription");
  }
}

