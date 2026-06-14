import { randomUUID } from "crypto";
import { externalChatPrisma as prisma } from "@/lib/external-chat-prisma";
import { AppUser } from "@/services/user.service";
import {
  abortMultipartUploadSession,
  completeMultipartUploadSession,
  createMultipartUploadPartUrl,
  createMultipartUploadSession,  // Fixed typo: was 'createMultultipartUploadSession'
  externalChatSupportsMultipartUploads,
} from "@/services/external-chat/storage.service";
import { assertExternalChatRoomAccess } from "@/services/external-chat/chat.service";
import { queueTranscriptionJob } from "@/services/external-chat/transcription.service";

const DIRECT_UPLOAD_LIMIT = Number(process.env.EXTERNAL_CHAT_MAX_UPLOAD_BYTES || 25 * 1024 * 1024);
const MAX_MULTIPART_UPLOAD_BYTES = Number(
  process.env.EXTERNAL_CHAT_MAX_MULTIPART_UPLOAD_BYTES || 10 * 1024 * 1024 * 1024
);
const DEFAULT_CHUNK_SIZE = Number(process.env.EXTERNAL_CHAT_UPLOAD_CHUNK_SIZE_BYTES || 8 * 1024 * 1024);
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

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
      chunks: true,
    },
  });
  if (!session) throw new Error("Upload session not found");
  if (session.room.members.length === 0 && actor.role.toLowerCase() !== "admin") {
    throw new Error("Not allowed");
  }
  return session;
}

// Fixed: Retry logic for failed part uploads with proper BodyInit type
async function retryPartUpload(
  partNumber: number,
  storageKey: string,
  uploadId: string,
  chunkData: Buffer,
  mimeType: string,
  attempt: number = 0
): Promise<string> {
  try {
    const result = await createMultipartUploadPartUrl({
      storageKey,
      partNumber,
      uploadId,
      mimeType,
    });
    
    // Convert Buffer to Blob for fetch BodyInit compatibility
    // Use Buffer directly with Uint8Array conversion to avoid type issues
    const blob = new Blob([new Uint8Array(chunkData)], { type: mimeType || "application/octet-stream" });
    
    const putRes = await fetch(result.uploadUrl, {
      method: "PUT",
      body: blob,
      headers: {
        "Content-Type": mimeType || "application/octet-stream",
      },
    });
    
    if (!putRes.ok) {
      throw new Error(`Part ${partNumber} upload failed with status ${putRes.status}`);
    }
    
    const etag = (putRes.headers.get("etag") || "").replace(/^W\//, "").replaceAll('"', "");
    return etag;
  } catch (error) {
    if (attempt < MAX_RETRY_ATTEMPTS) {
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryPartUpload(partNumber, storageKey, uploadId, chunkData, mimeType, attempt + 1);
    }
    throw error;
  }
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
  const totalSizeBytes = Math.max(1, Math.floor(input.totalSizeBytes));
  if (totalSizeBytes > MAX_MULTIPART_UPLOAD_BYTES) {
    throw new Error(`File sharing is limited to ${Math.floor(MAX_MULTIPART_UPLOAD_BYTES / (1024 * 1024 * 1024))}GB`);
  }
  const chunkSizeBytes = Math.max(5 * 1024 * 1024, Math.min(input.chunkSizeBytes || DEFAULT_CHUNK_SIZE, 64 * 1024 * 1024));
  const totalChunks = Math.max(1, Math.ceil(totalSizeBytes / chunkSizeBytes));
  const wantsMultipart = totalSizeBytes > DIRECT_UPLOAD_LIMIT || totalChunks > 1;

  if (!wantsMultipart) {
    throw new Error("Use direct upload for smaller files");
  }
  if (!externalChatSupportsMultipartUploads()) {
    throw new Error("S3 multipart uploads are not configured");
  }

  const multipart = await createMultipartUploadSession({
    roomCode: room.code,
    uploader: input.actor,
    fileName: input.fileName,
    mimeType: input.mimeType,
    totalSizeBytes,
  });

  const session = await prisma.externalChatUploadSession.create({
    data: {
      roomId: room.id,
      uploaderId: input.actor.id,
      fileName: input.fileName,
      mimeType: input.mimeType,
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
    session,
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

// Fixed: Upload a part with retry logic (accepts Buffer or Uint8Array)
export async function uploadPartWithRetry(input: {
  sessionId: string;
  actor: AppUser;
  partNumber: number;
  chunkData: Buffer | Uint8Array;
}): Promise<{ partNumber: number; etag: string }> {
  const session = await getSession(input.sessionId, input.actor);
  if (!session.multipartUploadId) {
    throw new Error("Multipart upload id is missing");
  }
  
  // Convert to Buffer if needed, then to Uint8Array for Blob
  const bufferData = Buffer.isBuffer(input.chunkData) 
    ? input.chunkData 
    : Buffer.from(input.chunkData);
  
  const etag = await retryPartUpload(
    input.partNumber,
    session.storageKey,
    session.multipartUploadId,
    bufferData,
    session.mimeType
  );
  
  // Mark chunk as uploaded
  await prisma.externalChatUploadChunk.update({
    where: { sessionId_partNumber: { sessionId: session.id, partNumber: input.partNumber } },
    data: { uploadedAt: new Date() },
  });
  
  return { partNumber: input.partNumber, etag };
}

export async function completeUploadSession(input: {
  sessionId: string;
  actor: AppUser;
  parts: Array<{ partNumber: number; etag: string; sizeBytes?: number }>;
}) {
  const session = await getSession(input.sessionId, input.actor);
  if (!session.multipartUploadId) {
    throw new Error("Multipart upload id is missing");
  }

  const rawParts = input.parts
    .map((part) => ({
      partNumber: Math.max(1, Math.floor(part.partNumber)),
      etag: part.etag.trim(),
      sizeBytes: part.sizeBytes ? Math.max(0, Math.floor(part.sizeBytes)) : undefined,
    }))
    .filter((part) => part.etag);

  if (rawParts.length === 0) {
    throw new Error("At least one uploaded part is required");
  }

  const totalChunks = Number(session.totalChunks);
  const providedPartNumbers = rawParts.map((p) => p.partNumber);
  const duplicates = new Set<number>();
  for (const pn of providedPartNumbers) {
    const count = providedPartNumbers.filter((x) => x === pn).length;
    if (count > 1) duplicates.add(pn);
  }

  const outOfRange = rawParts.filter((p) => p.partNumber < 1 || p.partNumber > totalChunks).map((p) => p.partNumber);
  if (outOfRange.length > 0) {
    throw new Error("Multipart completion contains out-of-range part numbers");
  }

  if (duplicates.size > 0) {
    throw new Error("Multipart completion contains duplicate part numbers");
  }

  const uniqueByPartNumber = new Map<number, { partNumber: number; etag: string }>();
  for (const p of rawParts) {
    uniqueByPartNumber.set(p.partNumber, { partNumber: p.partNumber, etag: p.etag });
  }

  const uniqueParts = Array.from(uniqueByPartNumber.values());
  const missing: number[] = [];
  for (let pn = 1; pn <= totalChunks; pn += 1) {
    if (!uniqueByPartNumber.has(pn)) missing.push(pn);
  }

  if (missing.length > 0) {
    throw new Error(`Multipart completion missing required parts: ${missing.slice(0, 20).join(", ")}`);
  }

  if (uniqueParts.length !== totalChunks) {
    throw new Error("Multipart completion part count does not match expected totalChunks");
  }

  await completeMultipartUploadSession({
    storageKey: session.storageKey,
    uploadId: session.multipartUploadId,
    parts: uniqueParts
      .sort((a, b) => a.partNumber - b.partNumber)
      .map((part) => ({ partNumber: part.partNumber, etag: part.etag })),
  });

  const attachment = await prisma.externalChatAttachment.create({
    data: {
      roomId: session.roomId,
      uploadedBy: input.actor.id,
      fileName: session.fileName,
      mimeType: session.mimeType,
      sizeBytes: session.totalSizeBytes,
      storageProvider: session.storageProvider,
      storageKey: session.storageKey,
      uploadSessionId: session.id,
    },
  });

  await prisma.externalChatUploadChunk.updateMany({
    where: { sessionId: session.id },
    data: {
      uploadedAt: new Date(),
    },
  });

  await prisma.externalChatUploadSession.update({
    where: { id: session.id },
    data: {
      status: "completed",
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

export async function createUploadSessionHint() {
  return {
    directUploadLimitBytes: DIRECT_UPLOAD_LIMIT,
    maxMultipartUploadBytes: MAX_MULTIPART_UPLOAD_BYTES,
    supportsMultipartUploads: externalChatSupportsMultipartUploads(),
    recommendedChunkSizeBytes: DEFAULT_CHUNK_SIZE,
    sessionPrefix: `upload-${randomUUID().slice(0, 8)}`,
  };
}