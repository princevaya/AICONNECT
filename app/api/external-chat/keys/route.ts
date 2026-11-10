import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { externalChatPrisma as prisma } from "@/lib/external-chat-prisma";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { parseJson, toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const actor = await ensureExternalChatUser(userId);
    const idsParam = req.nextUrl.searchParams.get("userIds") || "";
    const ids = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 100);

    const targetIds = ids.length > 0 ? ids : [actor.id];
    const keys = await prisma.user.findMany({
      where: { id: { in: targetIds } },
      select: {
        id: true,
        clerkId: true,
        name: true,
        e2eePublicKey: true,
        e2eeKeyUpdatedAt: true,
      },
    });

    return NextResponse.json({ keys });
  } catch (error) {
    return toError(error, "Failed to load public keys");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const actor = await ensureExternalChatUser(userId);
    const body = await parseJson<{ e2eePublicKey?: string }>(req);
    const rawKey = body?.e2eePublicKey?.trim();
    if (!rawKey) {
      return NextResponse.json({ error: "e2eePublicKey is required" }, { status: 400 });
    }

    let parsed: { kty?: string; crv?: string };
    try {
      parsed = JSON.parse(rawKey) as { kty?: string; crv?: string };
    } catch {
      return NextResponse.json({ error: "Invalid JWK format" }, { status: 400 });
    }
    if (parsed.kty !== "EC" || parsed.crv !== "P-256") {
      return NextResponse.json({ error: "Key must be EC P-256 JWK" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: actor.id },
      data: {
        e2eePublicKey: rawKey,
        e2eeKeyUpdatedAt: new Date(),
      },
      select: {
        id: true,
        e2eePublicKey: true,
        e2eeKeyUpdatedAt: true,
      },
    });

    return NextResponse.json({ key: updated });
  } catch (error) {
    return toError(error, "Failed to register public key");
  }
}

