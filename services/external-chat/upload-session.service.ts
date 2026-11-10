import { randomUUID } from "crypto";
import { externalChatPrisma as prisma } from "@/lib/external-chat-prisma";
import { AppUser } from "@/services/user.service";
import {
  abortMultipartUploadSession,
  completeMultipartUploadSession,
  createMultipartUploadPartUrl,
  createMultipartUploadSession,
  externalChatSupportsMultipartUploads,
  validateAttachmentMetadata,
  writeMultipartPartStream,
} from "@/services/external-chat/storage.service";
import { assertExternalChatRoomAccess } from "@/services/external-chat/chat.service";
import { queueTranscriptionJob } from "@/services/external-chat/transcription.service";

export const DIRECT_UPLOAD_LIMIT = Number(process.env.EXTERNAL_CHAT_MAX_UPLOAD_BYTES || 25 * 1024 * 1024);
export const MAX_MULTIPART_UPLOAD_BYTES = Number(
  process.env.EXTERNAL_CHAT_MAX_MULTIPART_UPLOAD_BYTES || 10 * 1024 * 1024 * 1024
);
export const DEFAULT_CHUNK_SIZE = Number(process.env.EXTERNAL_CHAT_UPLOAD_CHUNK_SIZE_BYTES || 8 * 1024 * 1024);
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;

function serializeSession(session: {
  id: string;
  roomId: string;
  uploaderId: string;
  fileName: string;
  mimeType: string;
  totalSizeBytes: bigint;
  chunkSizeBytes: number;
  totalChunks: number;
  storageProvider: string;
  storageKey: string;
  multipartUploadId: string | null;
  status: string;
  checksum: string | null;
  expiresAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: session.id,
    roomId: session.roomId,
    uploaderId: session.uploaderId,
    fileName: session.fileName,
    mimeType: session.mimeType,
    totalSizeBytes: Number(session.totalSizeBytes),
    chunkSizeBytes: session.chunkSizeBytes,
    totalChunks: session.totalChunks,
    storageProvider: session.storageProvider,
    status: session.status,
    checksum: session.checksum,
    expiresAt: session.expiresAt?.toISOString() || null,
    completedAt: session.completedAt?.toISOString() || null,
    createdAt: session.createdAt.toISOString(),
  };
}

async function getRoom(roomCode: string, actor: AppUser) {
  await assertExternalChatRoomAccess(roomCode, actor);
  const room = await prisma.externalChatRoom.findUnique({
    where: { code: roomCode },
    select: { id: true, code: true, name: true },
  });
  if (!room) throw new Error("Room not found");
  return room;
}

async function getSession(sessionId: string, actor: AppUser) {
  const session = await prisma.externalChatUploadSession.findUnique({
    where: { id: sessionId },
    include: {
      room: {
        include: {
          members: {
            where: { userId: actor.id, removedAt: null, leftAt: null },
            select: { id: true },
          },
        },
      },
      chunks: {
        orderBy: { partNumber: "asc" },
      },
    },
  });
  if (!session) throw new Error("Upload session not found");
  if (session.room.members.length === 0 && actor.role.toLowerCase() !== "admin") {
    throw new Error("Not allowed");
  }
  return session;
}

export async function startUploadSession(input: {
  roomCode: string;
  actor: AppUser;
  fileName: string;
  mimeType: string;
  totalSizeBytes: number;
  chunkSizeBytes?: number;
}) {
  const room = await getRoom(input.roomCode, input.actor);
  const totalSizeBytes = Math.floor(input.totalSizeBytes);
  const normalizedMimeType = validateAttachmentMetadata({
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: totalSizeBytes,
    maxBytes: MAX_MULTIPART_UPLOAD_BYTES,
  });

  const chunkSizeBytes = Math.max(
    5 * 1024 * 1024,
    Math.min(input.chunkSizeBytes || DEFAULT_CHUNK_SIZE, 64 * 1024 * 1024)
  );
  const totalChunks = Math.max(1, Math.ceil(totalSizeBytes / chunkSizeBytes));
  if (totalChunks > 10_000) {
    throw new Error("File requires too many chunks; increase chunkSizeBytes");
  }

  const wantsMultipart = totalSizeBytes > DIRECT_UPLOAD_LIMIT || totalChunks > 1;
  if (!wantsMultipart) {
    throw new Error("Use direct upload for smaller files");
  }
  if (!externalChatSupportsMultipartUploads()) {
    throw new Error("Multipart uploads are not configured");
  }

  const multipart = await createMultipartUploadSession({
    roomCode: room.code,
    uploader: input.actor,
    fileName: input.fileName,
    mimeType: normalizedMimeType,
    totalSizeBytes,
  });

  const session = await prisma.externalChatUploadSession.create({
    data: {
      roomId: room.id,
      uploaderId: input.actor.id,
      fileName: input.fileName,
      mimeType: normalizedMimeType,
      totalSizeBytes: BigInt(totalSizeBytes),
      chunkSizeBytes,
      totalChunks,
      storageProvider: multipart.storageProvider,
      storageKey: multipart.storageKey,
      multipartUploadId: multipart.multipartUploadId,
      status: "initiated",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return {
    session: serializeSession(session),
    totalChunks,
    chunkSizeBytes,
    uploadMode: "multipart" as const,
  };
}

export async function getUploadPartUrl(input: {
  sessionId: string;
  actor: AppUser;
  partNumber: number;
}) {
  const session = await getSession(input.sessionId, input.actor);
  if (session.status === "completed" || session.status === "aborted") {
    throw new Error("Upload session is closed");
  }
  if (!session.multipartUploadId) {
    throw new Error("Multipart upload id is missing");
  }

  const partNumber = Math.max(1, Math.floor(input.partNumber));
  if (partNumber > session.totalChunks) {
    throw new Error("Part number exceeds expected chunk count");
  }

  const result = await createMultipartUploadPartUrl({
    sessionId: session.id,
    storageKey: session.storageKey,
    partNumber,
    uploadId: session.multipartUploadId,
    mimeType: session.mimeType,
  });

  await prisma.externalChatUploadChunk.upsert({
    where: { sessionId_partNumber: { sessionId: session.id, partNumber } },
    update: {
      storageKey: session.storageKey,
    },
    create: {
      sessionId: session.id,
      partNumber,
      storageKey: session.storageKey,
    },
  });

  await prisma.externalChatUploadSession.update({
    where: { id: session.id },
    data: { status: "uploading" },
  });

  return {
    sessionId: session.id,
    partNumber,
    uploadUrl: result.uploadUrl,
  };
}

export async function uploadPartStream(input: {
  sessionId: string;
  actor: AppUser;
  partNumber: number;
  body: ReadableStream<Uint8Array> | Buffer;
}) {
  const session = await getSession(input.sessionId, input.actor);
  if (session.status === "completed" || session.status === "aborted") {
    throw new Error("Upload session is closed");
  }
  if (session.expiresAt && session.expiresAt <= new Date()) {
    throw new Error("Upload session expired");
  }
  if (!session.multipartUploadId) {
    throw new Error("Multipart upload id is missing");
  }

  const partNumber = Math.floor(input.partNumber);
  if (!Number.isFinite(partNumber) || partNumber < 1 || partNumber > session.totalChunks) {
    throw new Error("Invalid partNumber");
  }

  const { etag, sizeBytes } = await writeMultipartPartStream({
    uploadId: session.multipartUploadId,
    partNumber,
    body: input.body,
    maxPartBytes: session.chunkSizeBytes + 1024 * 1024,
  });

  await prisma.externalChatUploadChunk.upsert({
    where: { sessionId_partNumber: { sessionId: session.id, partNumber } },
    update: {
      storageKey: session.storageKey,
      checksum: etag,
      sizeBytes: BigInt(sizeBytes),
      uploadedAt: new Date(),
    },
    create: {
      sessionId: session.id,
      partNumber,
      storageKey: session.storageKey,
      checksum: etag,
      sizeBytes: BigInt(sizeBytes),
      uploadedAt: new Date(),
    },
  });

  if (session.status === "initiated") {
    await prisma.externalChatUploadSession.update({
      where: { id: session.id },
      data: { status: "uploading" },
    });
  }

  return {
    sessionId: session.id,
    partNumber,
    etag,
    sizeBytes,
  };
}

export async function uploadPartWithRetry(input: {
  sessionId: string;
  actor: AppUser;
  partNumber: number;
  chunkData: Buffer | Uint8Array;
}): Promise<{ partNumber: number; etag: string; sizeBytes: number }> {
  const bufferData = Buffer.isBuffer(input.chunkData)
    ? input.chunkData
    : Buffer.from(input.chunkData);

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const res = await uploadPartStream({
        sessionId: input.sessionId,
        actor: input.actor,
        partNumber: input.partNumber,
        body: bufferData,
      });
      return { partNumber: res.partNumber, etag: res.etag, sizeBytes: res.sizeBytes };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRY_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Part upload failed");
}

export async function completeUploadSession(input: {
  sessionId: string;
  actor: AppUser;
  parts?: Array<{ partNumber: number; etag: string; sizeBytes?: number }>;
}) {
  const session = await getSession(input.sessionId, input.actor);
  if (session.status === "aborted") {
    throw new Error("Upload session was aborted");
  }
  if (!session.multipartUploadId) {
    throw new Error("Multipart upload id is missing");
  }

  if (session.status === "completed") {
    const existingAttachment = await prisma.externalChatAttachment.findUnique({
      where: { uploadSessionId: session.id },
    });
    if (existingAttachment) {
      return {
        attachment: {
          id: existingAttachment.id,
          fileName: existingAttachment.fileName,
          mimeType: existingAttachment.mimeType,
          sizeBytes: Number(existingAttachment.sizeBytes),
          checksum: existingAttachment.checksum,
          downloadUrl: `/api/external-chat/files/${existingAttachment.id}/download`,
        },
      };
    }
  }

  const totalChunks = Number(session.totalChunks);
  const suppliedParts = (input.parts || [])
    .map((part) => ({
      partNumber: Math.max(1, Math.floor(part.partNumber)),
      etag: part.etag.trim(),
    }))
    .filter((part) => part.etag);

  const dbParts = session.chunks
    .filter((c) => c.uploadedAt && c.checksum)
    .map((c) => ({ partNumber: c.partNumber, etag: c.checksum! }));

  const rawParts = suppliedParts.length > 0 ? suppliedParts : dbParts;
  if (rawParts.length === 0) {
    throw new Error("At least one uploaded part is required");
  }

  const duplicates = new Set<number>();
  const seen = new Set<number>();
  for (const part of rawParts) {
    if (part.partNumber < 1 || part.partNumber > totalChunks) {
      throw new Error("Multipart completion contains out-of-range part numbers");
    }
    if (seen.has(part.partNumber)) duplicates.add(part.partNumber);
    seen.add(part.partNumber);
  }
  if (duplicates.size > 0) {
    throw new Error("Multipart completion contains duplicate part numbers");
  }

  const byPart = new Map(rawParts.map((p) => [p.partNumber, p]));
  const missing: number[] = [];
  for (let pn = 1; pn <= totalChunks; pn += 1) {
    if (!byPart.has(pn)) missing.push(pn);
  }
  if (missing.length > 0) {
    throw new Error(`Multipart completion missing required parts: ${missing.slice(0, 20).join(", ")}`);
  }

  const sortedParts = Array.from(byPart.values()).sort((a, b) => a.partNumber - b.partNumber);
  const { checksum } = await completeMultipartUploadSession({
    storageKey: session.storageKey,
    uploadId: session.multipartUploadId,
    parts: sortedParts,
    expectedTotalSizeBytes: Number(session.totalSizeBytes),
  });

  const attachment = await prisma.externalChatAttachment.create({
    data: {
      roomId: session.roomId,
      scope: "room",
      uploadedBy: input.actor.id,
      fileName: session.fileName,
      mimeType: session.mimeType,
      sizeBytes: session.totalSizeBytes,
      storageProvider: session.storageProvider,
      storageKey: session.storageKey,
      checksum,
      uploadSessionId: session.id,
    },
  });

  await prisma.externalChatUploadSession.update({
    where: { id: session.id },
    data: {
      status: "completed",
      checksum,
      completedAt: new Date(),
    },
  });

  if (session.mimeType.startsWith("audio/")) {
    await queueTranscriptionJob({
      actor: input.actor,
      attachmentId: attachment.id,
      provider: "whisper",
      language: "auto",
    }).catch(() => undefined);
  }

  return {
    attachment: {
      id: attachment.id,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      sizeBytes: Number(attachment.sizeBytes),
      checksum: attachment.checksum,
      downloadUrl: `/api/external-chat/files/${attachment.id}/download`,
    },
  };
}

export async function abortUploadSession(input: { sessionId: string; actor: AppUser }) {
  const session = await getSession(input.sessionId, input.actor);
  if (session.multipartUploadId) {
    await abortMultipartUploadSession({
      storageKey: session.storageKey,
      uploadId: session.multipartUploadId,
    });
  }

  await prisma.externalChatUploadSession.update({
    where: { id: session.id },
    data: {
      status: "aborted",
      completedAt: new Date(),
    },
  });

  return { aborted: true };
}

export async function getUploadProgress(input: { sessionId: string; actor: AppUser }) {
  const session = await getSession(input.sessionId, input.actor);
  const uploadedParts = session.chunks
    .filter((chunk) => chunk.uploadedAt !== null && Boolean(chunk.checksum))
    .map((chunk) => ({
      partNumber: chunk.partNumber,
      etag: chunk.checksum as string,
      sizeBytes: Number(chunk.sizeBytes || 0),
    }));
  const completedChunks = uploadedParts.length;
  const uploadedBytes = uploadedParts.reduce((sum, p) => sum + p.sizeBytes, 0);
  const progress = session.totalChunks > 0 ? (completedChunks / session.totalChunks) * 100 : 0;

  return {
    sessionId: session.id,
    totalChunks: session.totalChunks,
    chunkSizeBytes: session.chunkSizeBytes,
    completedChunks,
    uploadedBytes,
    progress: Math.round(progress),
    status: session.status,
    fileName: session.fileName,
    mimeType: session.mimeType,
    totalSizeBytes: Number(session.totalSizeBytes),
    uploadedParts,
  };
}

export async function createUploadSessionHint() {
  return {
    directUploadLimitBytes: DIRECT_UPLOAD_LIMIT,
    maxMultipartUploadBytes: MAX_MULTIPART_UPLOAD_BYTES,
    supportsMultipartUploads: externalChatSupportsMultipartUploads(),
    recommendedChunkSizeBytes: DEFAULT_CHUNK_SIZE,
    sessionPrefix: `upload-${randomUUID().slice(0, 8)}`,
  };
}
