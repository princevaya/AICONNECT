import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { createStorageReadStream, deleteStorageFile, storageRelativePath, writeStorageFile } from "@/lib/local-storage";
import { AppUser } from "@/services/user.service";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 * 1024 * 1024; // 5 TB
const STORAGE_ROOT = path.join(process.cwd(), "storage", "meeting", "chats");
const DOWNLOAD_TTL_SECONDS = 15 * 60;
const FILE_URL_SECRET =
  process.env.FILE_URL_SECRET || process.env.CLERK_SECRET_KEY || "dev-file-secret";

const ALLOWED_MIME_TYPES = new Set([
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
]);

function isAdmin(user: AppUser) {
  return user.role.toLowerCase() === "admin";
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function buildSignature(payload: string) {
  return createHmac("sha256", FILE_URL_SECRET).update(payload).digest("base64url");
}

async function writeFileToStorage(file: File) {
  const extension = path.extname(file.name);
  const safeName = sanitizeFilename(path.basename(file.name, extension));
  const storedName = `${Date.now()}-${randomUUID()}-${safeName}${extension}`;
  const data = Buffer.from(await file.arrayBuffer());
  return writeStorageFile(storageRelativePath("meeting", "chats", storedName), data);
}

function buildSafeObjectName(originalName: string) {
  const extension = path.extname(originalName).replace(/[^a-zA-Z0-9.]/g, "").toLowerCase();
  const base = path.basename(originalName, path.extname(originalName));
  const safeBase = sanitizeFilename(base) || "file";
  return `${safeBase}${extension}`;
}

export function createSignedDownloadUrl(fileId: string, userId: string) {
  const exp = Date.now() + DOWNLOAD_TTL_SECONDS * 1000;
  const payload = encodeBase64Url(JSON.stringify({ fileId, userId, exp }));
  const signature = buildSignature(payload);
  return `/api/files/download?token=${encodeURIComponent(`${payload}.${signature}`)}`;
}

export function validateDownloadToken(token: string) {
  const [payloadPart, signature] = token.split(".");
  if (!payloadPart || !signature) {
    throw new Error("Invalid token format");
  }

  const expectedSignature = buildSignature(payloadPart);
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error("Invalid token signature");
  }

  const payload = JSON.parse(decodeBase64Url(payloadPart)) as {
    fileId: string;
    userId: string;
    exp: number;
  };

  if (Date.now() > payload.exp) {
    throw new Error("Token expired");
  }

  return payload;
}

function validateFile(file: File) {
  if (!file) throw new Error("File is required");
  if (file.size <= 0) throw new Error("File is empty");
  if (file.size > MAX_FILE_SIZE_BYTES) throw new Error("File exceeds 5 TB limit");
  if (!ALLOWED_MIME_TYPES.has(file.type)) throw new Error("File type is not allowed");
}

export async function uploadChatFile(input: {
  file: File;
  uploadedBy: AppUser;
  roomId: string;
}) {
  const { file, uploadedBy, roomId } = input;
  validateFile(file);

  const originalUrl = (await writeFileToStorage(file)).relativePath;
  const created = await prisma.file.create({
    data: {
      name: file.name,
      originalUrl,
      fileSize: BigInt(file.size),
      fileType: file.type,
      uploadedBy: uploadedBy.id,
      roomId,
      storageProvider: "local",
    },
    include: {
      uploader: {
        select: { id: true, clerkId: true, name: true, email: true },
      },
    },
  });

  return {
    id: created.id,
    name: created.name,
    fileType: created.fileType,
    fileSize: Number(created.fileSize),
    roomId: created.roomId,
    downloadUrl: createSignedDownloadUrl(created.id, uploadedBy.id),
    uploadedBy: created.uploader,
    createdAt: created.createdAt,
  };
}

export async function uploadChatFileS3Fallback(input: {
  file: File;
  roomCode: string;
  uploaderClerkId: string;
}) {
  void input;
  throw new Error("Direct S3 upload has been removed. Use uploadChatFile instead.");
}

export async function buildDownloadResponse(input: { fileId: string; requestedBy: AppUser }) {
  const file = await prisma.file.findUnique({
    where: { id: input.fileId },
    include: {
      room: {
        select: {
          participants: {
            where: { userId: input.requestedBy.id, leftAt: null, removedAt: null },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!file) throw new Error("File not found");

  const canAccess =
    file.uploadedBy === input.requestedBy.id ||
    (file.room?.participants.length ?? 0) > 0 ||
    isAdmin(input.requestedBy);

  if (!canAccess) throw new Error("You are not allowed to download this file");

  return {
    mode: "stream" as const,
    file: {
      id: file.id,
      name: file.name,
      fileType: file.fileType,
      fileSize: Number(file.fileSize),
      absolutePath: path.join(process.cwd(), file.originalUrl),
    },
  };
}

export async function removeStoredFile(input: { storageProvider: string; originalUrl: string }) {
  void input.storageProvider;
  await deleteStorageFile(input.originalUrl);
}
