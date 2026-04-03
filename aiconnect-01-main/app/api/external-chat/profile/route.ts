import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { externalChatPrisma } from "@/lib/external-chat-prisma";
import { parseJson, toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await ensureExternalChatUser(userId);
    return NextResponse.json({
      user: {
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
    const body = await parseJson<{ imageDataUrl?: string | null }>(req);
    const nextImage = (body?.imageDataUrl || "").trim();
    if (nextImage && !nextImage.startsWith("data:image/")) {
      return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
    }
    if (nextImage.length > 800_000) {
      return NextResponse.json({ error: "Image too large" }, { status: 400 });
    }

    const updated = await externalChatPrisma.user.update({
      where: { id: user.id },
      data: { imageUrl: nextImage || null },
      select: { id: true, clerkId: true, name: true, email: true, imageUrl: true },
    });
    return NextResponse.json({ user: updated });
  } catch (error) {
    return toError(error, "Failed to update profile");
  }
}
