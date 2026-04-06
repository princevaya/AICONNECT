import { createReadStream } from "fs";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { externalChatPrisma as prisma } from "@/lib/external-chat-prisma";
import { AppUser } from "@/services/user.service";

const MAX_SIZE = Number(process.env.EXTERNAL_CHAT_MAX_UPLOAD_BYTES || 25 * 1024 * 1024);
const LOCAL_ROOT = path.join(process.cwd(), "storage", "chat-system");
const PREFIX = (process.env.EXTERNAL_CHAT_S3_PREFIX || "chat-system").replace(/^\/+|\/+$/g, "");
const BUCKET = process.env.EXTERNAL_CHAT_S3_BUCKET || process.env.AWS_S3_BUCKET;
const REGION = process.env.EXTERNAL_CHAT_AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
const TTL = Number(process.env.EXTERNAL_CHAT_SIGNED_URL_TTL_SECONDS || 900);

const s3Client =
  process.env.EXTERNAL_CHAT_AWS_ACCESS_KEY_ID &&
  process.env.EXTERNAL_CHAT_AWS_SECRET_ACCESS_KEY &&
  BUCKET
    ? new S3Client({
        region: REGION,
        credentials: {
          accessKeyId: process.env.EXTERNAL_CHAT_AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.EXTERNAL_CHAT_AWS_SECRET_ACCESS_KEY,
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

const ALLOWED = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
]);

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
}

function inferMimeFromBytes(buffer: Buffer) {
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return "application/pdf";
  }
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return "application/zip";
  }
  return null;
}

function validateFile(file: File, buffer: Buffer) {
  const normalizedType = (file.type || "").split(";")[0]?.trim().toLowerCase();
  if (!file) throw new Error("file is required");
  if (file.size <= 0) throw new Error("file is empty");
  if (file.size > MAX_SIZE) throw new Error(`file exceeds ${Math.floor(MAX_SIZE / (1024 * 1024))}MB`);
  if (!normalizedType || !ALLOWED.has(normalizedType)) throw new Error("file type is not allowed");
  const inferred = inferMimeFromBytes(buffer);
  if (inferred && inferred !== normalizedType && !(inferred === "application/zip" && normalizedType.includes("officedocument"))) {
    throw new Error("file content does not match file type");
  }
}

function s3Key(input: { roomCode: string; uploader: string; originalName: string }) {
  const ext = path.extname(input.originalName).toLowerCase();
  const base = sanitize(path.basename(input.originalName, ext)) || "file";
  return `${PREFIX}/${new Date().toISOString().slice(0, 10)}/${sanitize(input.roomCode)}/${sanitize(input.uploader)}/${Date.now()}-${randomUUID()}-${base}${ext}`;
}

async function uploadLocal(file: File, buffer: Buffer) {
  await fs.mkdir(LOCAL_ROOT, { recursive: true });
  const ext = path.extname(file.name).toLowerCase();
  const base = sanitize(path.basename(file.name, ext)) || "file";
  const name = `${Date.now()}-${randomUUID()}-${base}${ext}`;
  const absolute = path.join(LOCAL_ROOT, name);
  await fs.writeFile(absolute, buffer);
  return { provider: "local", key: path.posix.join("storage", "chat-system", name) } as const;
}

async function uploadS3(file: File, buffer: Buffer, roomCode: string, uploader: string) {
  if (!s3Client || !BUCKET) throw new Error("S3 is not configured");
  const key = s3Key({ roomCode, uploader, originalName: file.name });
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type || "application/octet-stream",
      ContentDisposition: `attachment; filename="${sanitize(file.name) || "file"}"`,
    })
  );
  return { provider: "s3", key } as const;
}

export async function uploadAttachment(input: {
  file: File;
  roomId: string;
  roomCode: string;
  uploader: AppUser;
}) {
  const buffer = Buffer.from(await input.file.arrayBuffer());
  validateFile(input.file, buffer);

  const member = await prisma.externalChatRoomMember.findFirst({
    where: {
      roomId: input.roomId,
      userId: input.uploader.id,
      removedAt: null,
      leftAt: null,
    },
    select: { id: true },
  });
  if (!member) throw new Error("Not allowed");

  const stored =
    s3Client && BUCKET
      ? await uploadS3(input.file, buffer, input.roomCode, input.uploader.clerkId)
      : await uploadLocal(input.file, buffer);

  const created = await prisma.externalChatAttachment.create({
    data: {
      roomId: input.roomId,
      uploadedBy: input.uploader.id,
      fileName: input.file.name,
      mimeType: (input.file.type || "application/octet-stream").split(";")[0]?.trim().toLowerCase() || "application/octet-stream",
      sizeBytes: BigInt(input.file.size),
      storageProvider: stored.provider,
      storageKey: stored.key,
    },
  });

  return {
    id: created.id,
    fileName: created.fileName,
    mimeType: created.mimeType,
    sizeBytes: Number(created.sizeBytes),
    downloadUrl: `/api/external-chat/files/${created.id}/download`,
  };
}

export async function buildAttachmentDownload(input: { attachmentId: string; requester: AppUser }) {
  const file = await prisma.externalChatAttachment.findUnique({
    where: { id: input.attachmentId },
    include: {
      room: {
        include: {
          members: {
            where: { userId: input.requester.id },
            select: { id: true, leftAt: true, removedAt: true },
          },
        },
      },
    },
  });
  if (!file) throw new Error("Attachment not found");
  const membership = file.room.members[0] || null;
  if (!membership && input.requester.role.toLowerCase() !== "admin") {
    throw new Error("Not allowed");
  }
  const historyCutoff = membership?.removedAt || membership?.leftAt || null;
  if (historyCutoff) {
    const messageBeforeCutoff = await prisma.externalChatMessage.findFirst({
      where: {
        roomId: file.room.id,
        attachmentId: file.id,
        createdAt: { lte: historyCutoff },
      },
      select: { id: true },
    });
    if (!messageBeforeCutoff) {
      throw new Error("Not allowed");
    }
  }

  if (file.storageProvider === "s3") {
    if (!s3Client || !BUCKET) throw new Error("S3 unavailable");
    const signedUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: BUCKET, Key: file.storageKey }),
      { expiresIn: TTL }
    );
    return { mode: "redirect" as const, signedUrl };
  }

  return {
    mode: "stream" as const,
    stream: createReadStream(path.join(process.cwd(), file.storageKey)),
    fileName: file.fileName,
    mimeType: file.mimeType,
  };
}

export async function cleanupAttachmentIfUnused(attachmentId: string) {
  const file = await prisma.externalChatAttachment.findUnique({
    where: { id: attachmentId },
    include: { messages: { where: { deletedAt: null }, select: { id: true }, take: 1 } },
  });
  if (!file || file.messages.length > 0) return;

  if (file.storageProvider === "s3") {
    if (s3Client && BUCKET) {
      await s3Client
        .send(new DeleteObjectCommand({ Bucket: BUCKET, Key: file.storageKey }))
        .catch(() => undefined);
    }
  } else {
    await fs.unlink(path.join(process.cwd(), file.storageKey)).catch(() => undefined);
  }

  await prisma.externalChatAttachment.delete({ where: { id: file.id } }).catch(() => undefined);
}
