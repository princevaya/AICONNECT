import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createGeneratedImage, listGeneratedImages } from "@/services/image-generation.service";
import { ensureLocalUser } from "@/services/user.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await ensureLocalUser(userId);
    const items = await listGeneratedImages(user);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[generate-image] list failed", error);
    return NextResponse.json({ error: "Failed to load image history" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = (await req.json().catch(() => null)) as
      | {
          prompt?: string;
          stylePreset?: string;
          aspectRatio?: string;
          quality?: string;
          background?: string;
        }
      | null;

    const user = await ensureLocalUser(userId);
    const item = await createGeneratedImage({
      user,
      prompt: body?.prompt || "",
      stylePreset: body?.stylePreset,
      aspectRatio: body?.aspectRatio,
      quality: body?.quality,
      background: body?.background,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed";
    const status = /required|short|long|unsupported|configured|rate limit/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
