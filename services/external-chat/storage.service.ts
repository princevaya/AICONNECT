import { createHash, randomUUID } from "crypto";
import { createReadStream, createWriteStream } from "fs";
import fs from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { externalChatPrisma as prisma } from "@/lib/external-chat-prisma";
import { AppUser } from "@/services/user.service";
import { canViewerAccessStatusAttachment } from "@/services/external-chat/status.service";

const MAX_SIZE = Number(process.env.EXTERNAL_CHAT_MAX_UPLOAD_BYTES || 25 * 1024 * 1024);
const LOCAL_ROOT = process.env.EXTERNAL_CHAT_LOCAL_STORAGE_DIR
  ? path.resolve(process.env.EXTERNAL_CHAT_LOCAL_STORAGE_DIR)
  : path.join(process.cwd(), "storage", "chat-system");
const MULTIPART_TEMP_ROOT = path.join(LOCAL_ROOT, "_multipart");
const DIR_MODE = 0o750;
const FILE_MODE = 0o640;

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
  "application/json",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-tar",
  "application/gzip",
  "application/x-7z-compressed",
  "application/octet-stream",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/flac",
]);

const BLOCKED_EXTENSIONS = new Set([".html", ".htm", ".svg", ".exe", ".bat", ".cmd", ".ps1", ".vbs", ".msi"]);

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
}

function resolveSafeStoragePath(storageKey: string): string {
  if (process.env.EXTERNAL_CHAT_LOCAL_STORAGE_DIR) {
    const customRoot = path.resolve(process.env.EXTERNAL_CHAT_LOCAL_STORAGE_DIR);
    const stripped = storageKey.replace(/^storage[\\/]+chat-system[\\/]+/i, "");
    const target = path.resolve(customRoot, stripped);
    if (target !== customRoot && !target.startsWith(`${customRoot}${path.sep}`)) {
      throw new Error("Invalid storage path");
    }
    return target;
  }
  const baseDir = path.resolve(process.cwd(), "storage");
  const target = path.resolve(process.cwd(), storageKey);
  if (target !== baseDir && !target.startsWith(`${baseDir}${path.sep}`)) {
    throw new Error("Invalid storage path");
  }
  return target;
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

export function validateAttachmentMetadata(input: { fileName: string; mimeType: string; sizeBytes: number; maxBytes: number }) {
  const normalizedType = (input.mimeType || "application/octet-stream").split(";")[0]?.trim().toLowerCase() || "application/octet-stream";
  const ext = path.extname(input.fileName || "").toLowerCase();
  if (!input.fileName?.trim()) throw new Error("file name is required");
  if (BLOCKED_EXTENSIONS.has(ext)) throw new Error("file type is not allowed");
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) throw new Error("file is empty");
  if (input.sizeBytes > input.maxBytes) {
    const mb = Math.floor(input.maxBytes / (1024 * 1024));
    throw new Error(mb >= 1024 ? `file exceeds ${Math.floor(mb / 1024)}GB` : `file exceeds ${mb}MB`);
  }
  if (!ALLOWED.has(normalizedType)) throw new Error("file type is not allowed");
  return normalizedType;
}

function validateFile(file: File, buffer: Buffer) {
  if (!file) throw new Error("file is required");
  const normalizedType = validateAttachmentMetadata({
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    maxBytes: MAX_SIZE,
  });
  const inferred = inferMimeFromBytes(buffer);
  if (
    inferred &&
    inferred !== normalizedType &&
    normalizedType !== "application/octet-stream" &&
    !(inferred === "application/zip" && (normalizedType.includes("officedocument") || normalizedType.includes("zip")))
  ) {
    throw new Error("file content does not match file type");
  }
}

export function buildStorageKey(fileName: string, scope: "room" | "status" = "room") {
  const ext = path.extname(fileName).toLowerCase();
  const base = sanitize(path.basename(fileName, ext)) || "file";
  const storedName = `${Date.now()}-${randomUUID()}-${base}${ext}`;
  return scope === "status"
    ? path.posix.join("storage", "chat-system", "statuses", storedName)
    : path.posix.join("storage", "chat-system", storedName);
}

async function uploadLocal(file: File, buffer: Buffer, scope: "room" | "status") {
  const key = buildStorageKey(file.name, scope);
  const absolute = resolveSafeStoragePath(key);
  await fs.mkdir(path.dirname(absolute), { recursive: true, mode: DIR_MODE });
  await fs.writeFile(absolute, buffer, { mode: FILE_MODE });
  const checksum = createHash("sha256").update(buffer).digest("hex");
  return { provider: "local", key, checksum } as const;
}

export async function uploadAttachment(input: {
  file: File;
  roomId?: string | null;
  roomCode?: string | null;
  scope?: "room" | "status";
  uploader: AppUser;
}) {
  const scope = input.scope === "status" || !input.roomId ? "status" : "room";
  const buffer = Buffer.from(await input.file.arrayBuffer());
  validateFile(input.file, buffer);

  if (scope === "room") {
    if (!input.roomId) throw new Error("roomId is required");
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
  }

  const stored = await uploadLocal(input.file, buffer, scope);

  const created = await prisma.externalChatAttachment.create({
    data: {
      roomId: scope === "room" ? input.roomId! : null,
      scope,
      uploadedBy: input.uploader.id,
      fileName: input.file.name,
      mimeType: (input.file.type || "application/octet-stream").split(";")[0]?.trim().toLowerCase() || "application/octet-stream",
      sizeBytes: BigInt(input.file.size),
      storageProvider: stored.provider,
      storageKey: stored.key,
      checksum: stored.checksum,
    },
  });

  return {
    id: created.id,
    fileName: created.fileName,
    mimeType: created.mimeType,
    sizeBytes: Number(created.sizeBytes),
    checksum: created.checksum,
    downloadUrl: `/api/external-chat/files/${created.id}/download`,
  };
}

export async function buildAttachmentDownload(input: {
  attachmentId: string;
  requester: AppUser;
  rangeHeader?: string | null;
}): Promise<
  | {
      mode: "stream";
      stream: Readable;
      fileName: string;
      mimeType: string;
      totalBytes: number;
      start: number;
      end: number;
      isPartial: boolean;
      checksum: string | null;
    }
  | { mode: "redirect"; signedUrl: string }
> {
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

  const isGlobalAdmin = input.requester.role.toLowerCase() === "admin";
  if (file.roomId && file.room) {
    const membership = file.room.members[0] || null;
    if (!membership && !isGlobalAdmin) {
      throw new Error("Not allowed");
    }
    const historyCutoff = membership?.removedAt || membership?.leftAt || null;
    if (historyCutoff && !isGlobalAdmin) {
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
  } else if (file.uploadedBy !== input.requester.id && !isGlobalAdmin) {
    const allowedStatus = await canViewerAccessStatusAttachment(file.id, input.requester);
    if (!allowedStatus) {
      throw new Error("Not allowed");
    }
  }

  if (file.storageProvider === "s3") {
    throw new Error("S3 storage provider is no longer supported.");
  }

  const absolutePath = resolveSafeStoragePath(file.storageKey);
  const stat = await fs.stat(absolutePath).catch(() => null);
  if (!stat || !stat.isFile()) {
    throw new Error("Attachment file is missing");
  }

  const totalBytes = stat.size;
  let start = 0;
  let end = Math.max(0, totalBytes - 1);
  let isPartial = false;

  if (input.rangeHeader && totalBytes > 0) {
    const match = /^bytes=(\d*)-(\d*)$/i.exec(input.rangeHeader.trim());
    if (match) {
      const rawStart = match[1];
      const rawEnd = match[2];
      if (rawStart === "" && rawEnd !== "") {
        const suffixLen = Number.parseInt(rawEnd, 10);
        if (Number.isFinite(suffixLen) && suffixLen > 0) {
          start = Math.max(0, totalBytes - suffixLen);
          end = totalBytes - 1;
          isPartial = true;
        }
      } else if (rawStart !== "") {
        const parsedStart = Number.parseInt(rawStart, 10);
        const parsedEnd = rawEnd ? Number.parseInt(rawEnd, 10) : totalBytes - 1;
        if (Number.isFinite(parsedStart) && parsedStart >= 0 && parsedStart < totalBytes) {
          start = parsedStart;
          end = Number.isFinite(parsedEnd) ? Math.min(parsedEnd, totalBytes - 1) : totalBytes - 1;
          if (end >= start) isPartial = true;
        }
      }
    }
  }

  const stream =
    totalBytes === 0
      ? Readable.from([])
      : createReadStream(absolutePath, { start, end });

  return {
    mode: "stream" as const,
    stream,
    fileName: file.fileName,
    mimeType: file.mimeType,
    totalBytes,
    start,
    end,
    isPartial,
    checksum: file.checksum || null,
  };
}

export async function cleanupAttachmentIfUnused(attachmentId: string) {
  const file = await prisma.externalChatAttachment.findUnique({
    where: { id: attachmentId },
    include: { messages: { where: { deletedAt: null }, select: { id: true }, take: 1 } },
  });
  if (!file || file.messages.length > 0) return;

  if (file.storageProvider !== "s3") {
    const safePath = resolveSafeStoragePath(file.storageKey);
    await fs.unlink(safePath).catch(() => undefined);
  }

  await prisma.externalChatAttachment.delete({ where: { id: file.id } }).catch(() => undefined);
}

// Local disk streaming multipart upload implementation (supports up to 10GB without buffering in memory)
export function externalChatSupportsMultipartUploads() {
  return true;
}

function getSessionTempDir(uploadId: string) {
  const safeId = sanitize(uploadId);
  if (!safeId) throw new Error("Invalid multipart upload id");
  const dir = path.resolve(MULTIPART_TEMP_ROOT, safeId);
  const root = path.resolve(MULTIPART_TEMP_ROOT);
  if (!dir.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid multipart session path");
  }
  return dir;
}

export async function createMultipartUploadSession(input: {
  roomCode: string;
  uploader: AppUser;
  fileName: string;
  mimeType: string;
  totalSizeBytes: number;
}): Promise<{ storageProvider: string; storageKey: string; multipartUploadId: string }> {
  const multipartUploadId = `mp-${Date.now()}-${randomUUID()}`;
  const storageKey = buildStorageKey(input.fileName, "room");
  const tempDir = getSessionTempDir(multipartUploadId);
  await fs.mkdir(tempDir, { recursive: true, mode: DIR_MODE });
  return {
    storageProvider: "local",
    storageKey,
    multipartUploadId,
  };
}

export async function createMultipartUploadPartUrl(input: {
  storageKey: string;
  partNumber: number;
  uploadId: string;
  mimeType: string;
  sessionId?: string;
}): Promise<{ uploadUrl: string }> {
  if (input.sessionId) {
    return {
      uploadUrl: `/api/external-chat/uploads/sessions/${encodeURIComponent(input.sessionId)}/parts/${input.partNumber}`,
    };
  }
  return {
    uploadUrl: `/api/external-chat/uploads/parts/${encodeURIComponent(input.uploadId)}/${input.partNumber}`,
  };
}

export async function writeMultipartPartStream(input: {
  uploadId: string;
  partNumber: number;
  body: ReadableStream<Uint8Array> | Buffer;
  maxPartBytes?: number;
}): Promise<{ etag: string; sizeBytes: number }> {
  const tempDir = getSessionTempDir(input.uploadId);
  await fs.mkdir(tempDir, { recursive: true, mode: DIR_MODE });
  const partPath = path.join(tempDir, `part-${input.partNumber}.bin`);
  const partTmpPath = `${partPath}.tmp-${randomUUID().slice(0, 8)}`;

  const hash = createHash("sha256");
  let sizeBytes = 0;
  const maxBytes = input.maxPartBytes ?? 64 * 1024 * 1024;

  if (Buffer.isBuffer(input.body)) {
    if (input.body.length === 0) throw new Error("Chunk payload cannot be empty");
    if (input.body.length > maxBytes) throw new Error("Chunk exceeds maximum part size");
    hash.update(input.body);
    sizeBytes = input.body.length;
    await fs.writeFile(partTmpPath, input.body, { mode: FILE_MODE });
    await fs.rename(partTmpPath, partPath);
    return { etag: hash.digest("hex"), sizeBytes };
  }

  const nodeReadable = Readable.fromWeb(input.body as unknown as import("stream/web").ReadableStream);
  const writeStream = createWriteStream(partTmpPath, { mode: FILE_MODE });

  try {
    for await (const chunk of nodeReadable) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
      sizeBytes += buf.length;
      if (sizeBytes > maxBytes) {
        throw new Error("Chunk exceeds maximum part size");
      }
      hash.update(buf);
      if (!writeStream.write(buf)) {
        await new Promise<void>((resolve, reject) => {
          writeStream.once("drain", resolve);
          writeStream.once("error", reject);
        });
      }
    }
    await new Promise<void>((resolve, reject) => {
      writeStream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });
    if (sizeBytes === 0) {
      throw new Error("Chunk payload cannot be empty");
    }
    await fs.rename(partTmpPath, partPath);
    return { etag: hash.digest("hex"), sizeBytes };
  } catch (err) {
    writeStream.destroy();
    await fs.unlink(partTmpPath).catch(() => undefined);
    throw err;
  }
}

export async function completeMultipartUploadSession(input: {
  storageKey: string;
  uploadId: string;
  parts: Array<{ partNumber: number; etag: string }>;
  expectedTotalSizeBytes?: number;
}): Promise<{ checksum: string; totalBytesWritten: number }> {
  const tempDir = getSessionTempDir(input.uploadId);
  const targetPath = resolveSafeStoragePath(input.storageKey);
  await fs.mkdir(path.dirname(targetPath), { recursive: true, mode: DIR_MODE });

  const sortedParts = [...input.parts].sort((a, b) => a.partNumber - b.partNumber);
  const finalHash = createHash("sha256");
  let totalBytesWritten = 0;

  const targetTempPath = `${targetPath}.assembling-${randomUUID().slice(0, 8)}`;
  const outStream = createWriteStream(targetTempPath, { mode: FILE_MODE });

  try {
    for (const part of sortedParts) {
      const partPath = path.join(tempDir, `part-${part.partNumber}.bin`);
      const stat = await fs.stat(partPath).catch(() => null);
      if (!stat || !stat.isFile()) {
        throw new Error(`Missing chunk file for part ${part.partNumber}`);
      }

      const partHash = createHash("sha256");
      const inStream = createReadStream(partPath);
      for await (const chunk of inStream) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
        partHash.update(buf);
        finalHash.update(buf);
        totalBytesWritten += buf.length;
        if (!outStream.write(buf)) {
          await new Promise<void>((resolve, reject) => {
            const onDrain = () => {
              outStream.off("error", onError);
              resolve();
            };
            const onError = (err: Error) => {
              outStream.off("drain", onDrain);
              reject(err);
            };
            outStream.once("drain", onDrain);
            outStream.once("error", onError);
          });
        }
      }

      const actualPartEtag = partHash.digest("hex");
      if (actualPartEtag !== part.etag) {
        throw new Error(`Checksum mismatch on part ${part.partNumber}`);
      }
    }

    await new Promise<void>((resolve, reject) => {
      outStream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });

    if (
      typeof input.expectedTotalSizeBytes === "number" &&
      totalBytesWritten !== input.expectedTotalSizeBytes
    ) {
      throw new Error(
        `Assembled file size mismatch (expected ${input.expectedTotalSizeBytes}, got ${totalBytesWritten})`
      );
    }

    await fs.rename(targetTempPath, targetPath);
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);

    return {
      checksum: finalHash.digest("hex"),
      totalBytesWritten,
    };
  } catch (err) {
    outStream.destroy();
    await fs.unlink(targetTempPath).catch(() => undefined);
    throw err;
  }
}

export async function abortMultipartUploadSession(input: {
  storageKey: string;
  uploadId: string;
}): Promise<void> {
  const tempDir = getSessionTempDir(input.uploadId);
  await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  const safePath = resolveSafeStoragePath(input.storageKey);
  await fs.unlink(safePath).catch(() => undefined);
}
