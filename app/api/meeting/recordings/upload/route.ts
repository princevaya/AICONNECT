import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AWS_REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET;

const s3Client =
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  AWS_S3_BUCKET
    ? new S3Client({
        region: AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      })
    : null;

function sanitize(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!s3Client || !AWS_S3_BUCKET) {
    return NextResponse.json({ error: "S3 is not configured" }, { status: 503 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    const roomName = form.get("roomName");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (typeof roomName !== "string" || !roomName.trim()) {
      return NextResponse.json({ error: "roomName is required" }, { status: 400 });
    }

    const safeRoom = sanitize(roomName.trim());
    const safeUser = sanitize(userId);
    const day = new Date().toISOString().slice(0, 10);
    const extension =
      file.type === "video/mp4"
        ? "mp4"
        : file.type.includes("webm")
        ? "webm"
        : "webm";
    const key = `meeting/recordings/${safeRoom}/${safeUser}/${day}/${Date.now()}-ui-recording.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await s3Client.send(
      new PutObjectCommand({
        Bucket: AWS_S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type || "video/webm",
        ContentDisposition: `attachment; filename="${sanitize(file.name || `recording.${extension}`)}"`,
      })
    );

    const url = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: AWS_S3_BUCKET,
        Key: key,
      }),
      { expiresIn: 60 * 60 * 24 }
    );

    return NextResponse.json({ ok: true, key, url }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
