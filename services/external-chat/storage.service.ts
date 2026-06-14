import { createReadStream } from "fs";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { Readable } from "stream";
import { externalChatPrisma as prisma } from "@/lib/external-chat-prisma";
import { AppUser } from "@/services/user.service";
import { queueTranscriptionJob } from "@/services/external-chat/transcription.service";
import {
  writeStorageFile,
  deleteStorageFile,
  createStorageReadStream,
  storageRelativePath,
  getAbsolutePath,
} from "@/lib/local-storage";

const MAX_SIZE = Number(process.env.EXTERNAL_CHAT_MAX_UPLOAD_BYTES || 25 * 1024 * 1024);

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

async function uploadLocal(file: File, buffer: Buffer) {
  const ext = path.extname(file.name).toLowerCase();
  const base = sanitize(path.basename(file.name, ext)) || "file";
  const name = `${Date.now()}-${randomUUID()}-${base}${ext}`;
  const relativePath = storageRelativePath("chat", name);
  await writeStorageFile(relativePath, buffer);
  return { provider: "local", key: relativePath } as const;
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

  const stored = await uploadLocal(input.file, buffer);

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

  if (created.mimeType.startsWith("audio/")) {
    await queueTranscriptionJob({
      actor: input.uploader,
      attachmentId: created.id,
      provider: "whisper",
      language: "auto",
    }).catch(() => undefined);
  }

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

  return {
    mode: "stream" as const,
    stream: createStorageReadStream(file.storageKey),
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

  await deleteStorageFile(file.storageKey);

  await prisma.externalChatAttachment.delete({ where: { id: file.id } }).catch(() => undefined);
}

export function externalChatSupportsMultipartUploads() {
  return false;
}

export async function createMultipartUploadSession(input: {
  roomCode: string;
  uploader: AppUser;
  fileName: string;
  mimeType: string;
  totalSizeBytes: number;
}): Promise<{
  storageProvider: string;
  storageKey: string;
  multipartUploadId: string;
  bucket: string;
  region: string;
}> {
  throw new Error("Multipart uploads are not supported.");
}

export async function createMultipartUploadPartUrl(input: {
  storageKey: string;
  partNumber: number;
  uploadId: string;
  mimeType: string;
}): Promise<{
  uploadUrl: string;
}> {
  throw new Error("Multipart uploads are not supported.");
}

export async function completeMultipartUploadSession(input: {
  storageKey: string;
  uploadId: string;
  parts: Array<{ partNumber: number; etag: string }>;
}): Promise<void> {
  throw new Error("Multipart uploads are not supported.");
}

export async function abortMultipartUploadSession(input: { storageKey: string; uploadId: string }): Promise<void> {
  // no-op
}

export async function getUploadProgress(sessionId: string, actor: AppUser) {
  const session = await prisma.externalChatUploadSession.findUnique({
    where: { id: sessionId },
    include: {
      chunks: true,
    },
  });
  if (!session) throw new Error("Upload session not found");
  
  const completedChunks = session.chunks.filter(chunk => chunk.uploadedAt !== null).length;
  const progress = session.totalChunks > 0 ? (completedChunks / session.totalChunks) * 100 : 0;
  
  return {
    sessionId: session.id,
    totalChunks: session.totalChunks,
    completedChunks,
    progress: Math.round(progress),
    status: session.status,
    fileName: session.fileName,
    totalSizeBytes: Number(session.totalSizeBytes),
  };
}