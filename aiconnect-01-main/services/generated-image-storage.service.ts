import { createReadStream } from "fs";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/lib/prisma";
import type { AppUser } from "@/services/user.service";

const LOCAL_ROOT = path.join(process.cwd(), "storage", "generated-images");
const PREFIX = (process.env.GENERATED_IMAGES_S3_PREFIX || "generated-images").replace(/^\/+|\/+$/g, "");
const BUCKET = process.env.GENERATED_IMAGES_S3_BUCKET || process.env.AWS_S3_BUCKET;
const REGION = process.env.GENERATED_IMAGES_AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
const TTL = Number(process.env.GENERATED_IMAGES_SIGNED_URL_TTL_SECONDS || 900);

const s3Client =
  process.env.GENERATED_IMAGES_AWS_ACCESS_KEY_ID &&
  process.env.GENERATED_IMAGES_AWS_SECRET_ACCESS_KEY &&
  BUCKET
    ? new S3Client({
        region: REGION,
        credentials: {
          accessKeyId: process.env.GENERATED_IMAGES_AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.GENERATED_IMAGES_AWS_SECRET_ACCESS_KEY,
        },
      })
    : process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && BUCKET
      ? new S3Client({
          region: REGION,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        })
      : null;

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
}

function extensionForMime(mimeType: string) {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/jpeg") return ".jpg";
  return ".bin";
}

function buildS3Key(generationId: string, userId: string, mimeType: string) {
  const ext = extensionForMime(mimeType);
  return `${PREFIX}/${new Date().toISOString().slice(0, 10)}/${sanitize(userId)}/${sanitize(generationId)}-${randomUUID()}${ext}`;
}

async function uploadLocal(buffer: Buffer, generationId: string, mimeType: string) {
  await fs.mkdir(LOCAL_ROOT, { recursive: true });
  const ext = extensionForMime(mimeType);
  const name = `${sanitize(generationId)}-${randomUUID()}${ext}`;
  const absolute = path.join(LOCAL_ROOT, name);
  await fs.writeFile(absolute, buffer);
  return { provider: "local", key: path.posix.join("storage", "generated-images", name) } as const;
}

async function uploadS3(buffer: Buffer, generationId: string, userId: string, mimeType: string) {
  if (!s3Client || !BUCKET) throw new Error("Generated image S3 is not configured");
  const key = buildS3Key(generationId, userId, mimeType);
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ContentDisposition: `inline; filename="${sanitize(generationId)}${extensionForMime(mimeType)}"`,
      CacheControl: "private, max-age=31536000, immutable",
    })
  );
  return { provider: "s3", key } as const;
}

export async function saveGeneratedImage(input: {
  generationId: string;
  userId: string;
  mimeType: string;
  buffer: Buffer;
}) {
  return s3Client && BUCKET
    ? uploadS3(input.buffer, input.generationId, input.userId, input.mimeType)
    : uploadLocal(input.buffer, input.generationId, input.mimeType);
}

export async function buildGeneratedImageDownload(input: { generationId: string; requester: AppUser }) {
  const generation = await prisma.generatedImage.findUnique({
    where: { id: input.generationId },
    select: {
      id: true,
      userId: true,
      mimeType: true,
      storageProvider: true,
      storageKey: true,
    },
  });

  if (!generation || !generation.storageKey || !generation.storageProvider || !generation.mimeType) {
    throw new Error("Generated image not found");
  }

  const isOwner = generation.userId === input.requester.id;
  const isAdmin = input.requester.role.toLowerCase() === "admin";
  if (!isOwner && !isAdmin) {
    throw new Error("Not allowed");
  }

  if (generation.storageProvider === "s3") {
    if (!s3Client || !BUCKET) throw new Error("Generated image storage unavailable");
    const signedUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: BUCKET, Key: generation.storageKey }),
      { expiresIn: TTL }
    );
    return { mode: "redirect" as const, signedUrl };
  }

  return {
    mode: "stream" as const,
    stream: createReadStream(path.join(process.cwd(), generation.storageKey)),
    mimeType: generation.mimeType,
  };
}

export async function cleanupGeneratedImageStorage(generationId: string) {
  const generation = await prisma.generatedImage.findUnique({
    where: { id: generationId },
    select: {
      storageProvider: true,
      storageKey: true,
    },
  });

  if (!generation?.storageKey || !generation.storageProvider) return;

  if (generation.storageProvider === "s3") {
    if (s3Client && BUCKET) {
      await s3Client
        .send(new DeleteObjectCommand({ Bucket: BUCKET, Key: generation.storageKey }))
        .catch(() => undefined);
    }
    return;
  }

  await fs.unlink(path.join(process.cwd(), generation.storageKey)).catch(() => undefined);
}
