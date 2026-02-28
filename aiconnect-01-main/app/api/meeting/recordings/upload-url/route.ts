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
    const body = (await req.json().catch(() => null)) as
      | {
          roomName?: string;
          contentType?: string;
          extension?: string;
        }
      | null;

    const roomName = (body?.roomName || "").trim();
    const contentType = (body?.contentType || "video/webm").trim();
    const extension = (body?.extension || "webm").replace(/[^a-zA-Z0-9]/g, "") || "webm";

    if (!roomName) {
      return NextResponse.json({ error: "roomName is required" }, { status: 400 });
    }

    const safeRoom = sanitize(roomName);
    const safeUser = sanitize(userId);
    const day = new Date().toISOString().slice(0, 10);
    const key = `meeting/recordings/${safeRoom}/${safeUser}/${day}/${Date.now()}-ui-recording.${extension}`;

    const putUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand({
        Bucket: AWS_S3_BUCKET,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 60 * 10 }
    );

    const downloadUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: AWS_S3_BUCKET,
        Key: key,
      }),
      { expiresIn: 60 * 60 * 24 }
    );

    return NextResponse.json({ ok: true, key, putUrl, downloadUrl }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create upload URL" },
      { status: 500 }
    );
  }
}
