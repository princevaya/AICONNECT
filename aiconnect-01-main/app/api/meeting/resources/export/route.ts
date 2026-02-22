import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AWS_REGION = process.env.AWS_DEFAULT_REGION || "us-east-1";
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

type ExportBody = {
  feature?: string;
  roomId?: string;
  filename?: string;
  content?: string;
  contentType?: string;
};

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!s3Client || !AWS_S3_BUCKET) {
      return NextResponse.json({ error: "S3 is not configured" }, { status: 503 });
    }

    const body = (await req.json()) as ExportBody;
    const feature = (body.feature || "").trim();
    const roomId = (body.roomId || "").trim();
    const filename = (body.filename || "").trim();
    const content = body.content || "";
    const contentType =
      (body.contentType || "").trim() || "text/plain; charset=utf-8";

    if (!feature || !roomId || !filename || !content) {
      return NextResponse.json(
        { error: "feature, roomId, filename and content are required" },
        { status: 400 }
      );
    }

    const safeFilename = sanitizeFilename(filename);
    const key = `meeting/${sanitizeFilename(feature)}/${sanitizeFilename(
      roomId
    )}/${sanitizeFilename(userId)}/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${safeFilename}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: AWS_S3_BUCKET,
        Key: key,
        Body: Buffer.from(content, "utf8"),
        ContentType: contentType,
        ContentDisposition: `attachment; filename="${safeFilename}"`,
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

    return NextResponse.json({ ok: true, key, url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export resource";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
