import { externalChatPrisma as prisma } from "@/lib/external-chat-prisma";
import { AppUser } from "@/services/user.service";

export async function queueTranscriptionJob(input: {
  actor: AppUser;
  attachmentId?: string | null;
  messageId?: string | null;
  provider?: string;
  language?: string;
}) {
  const attachmentId = input.attachmentId?.trim() || null;
  const messageId = input.messageId?.trim() || null;
  if (!attachmentId && !messageId) {
    throw new Error("Transcription source is required");
  }

  if (attachmentId) {
    const attachment = await prisma.externalChatAttachment.findFirst({
      where: {
        id: attachmentId,
        uploadedBy: input.actor.id,
      },
      select: { id: true },
    });
    if (!attachment) {
      throw new Error("Attachment not found");
    }
  }

  if (messageId) {
    const message = await prisma.externalChatMessage.findFirst({
      where: {
        id: messageId,
        senderId: input.actor.id,
      },
      select: { id: true },
    });
    if (!message) {
      throw new Error("Message not found");
    }
  }

  return prisma.externalChatTranscriptionJob.create({
    data: {
      sourceAttachmentId: attachmentId,
      sourceMessageId: messageId,
      requestedBy: input.actor.id,
      provider: input.provider || "whisper",
      language: input.language || "auto",
      status: "queued",
    },
  });
}

export async function listTranscriptionJobs(actor: AppUser) {
  try {
    return await prisma.externalChatTranscriptionJob.findMany({
      where: {
        OR: [
          { requestedBy: actor.id },
          { processorId: actor.id },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  } catch (error) {
    console.error("[Transcription] Failed to list jobs:", error);
    return [];
  }
}

export async function completeTranscriptionJob(input: {
  jobId: string;
  actor: AppUser;
  transcript: string;
  language?: string;
}) {
  const transcript = input.transcript.trim();
  if (!transcript) throw new Error("Transcript cannot be empty");

  return prisma.externalChatTranscriptionJob.update({
    where: { id: input.jobId },
    data: {
      status: "completed",
      transcript,
      language: input.language || undefined,
      processorId: input.actor.id,
      processedAt: new Date(),
      errorMessage: null,
    },
  });
}

export async function failTranscriptionJob(input: {
  jobId: string;
  actor: AppUser;
  errorMessage: string;
}) {
  return prisma.externalChatTranscriptionJob.update({
    where: { id: input.jobId },
    data: {
      status: "failed",
      errorMessage: input.errorMessage.trim() || "Transcription failed",
      processorId: input.actor.id,
      processedAt: new Date(),
    },
  });
}

export async function retryTranscriptionJob(input: { jobId: string; actor: AppUser }) {
  const job = await prisma.externalChatTranscriptionJob.findUnique({
    where: { id: input.jobId },
    select: { id: true, requestedBy: true, processorId: true, status: true },
  });
  if (!job) throw new Error("Job not found");
  if (job.requestedBy !== input.actor.id && job.processorId !== input.actor.id && input.actor.role.toLowerCase() !== "admin") {
    throw new Error("Not allowed");
  }

  return prisma.externalChatTranscriptionJob.update({
    where: { id: input.jobId },
    data: {
      status: "queued",
      processorId: null,
      processedAt: null,
      errorMessage: null,
      transcript: null,
    },
  });
}

export async function updateTranscriptionTranscript(input: {
  jobId: string;
  actor: AppUser;
  transcript: string;
  language?: string;
}) {
  const job = await prisma.externalChatTranscriptionJob.findUnique({
    where: { id: input.jobId },
    select: { id: true, requestedBy: true, processorId: true },
  });
  if (!job) throw new Error("Job not found");
  if (job.requestedBy !== input.actor.id && job.processorId !== input.actor.id && input.actor.role.toLowerCase() !== "admin") {
    throw new Error("Not allowed");
  }
  const transcript = input.transcript.trim();
  if (!transcript) throw new Error("Transcript cannot be empty");

  return prisma.externalChatTranscriptionJob.update({
    where: { id: input.jobId },
    data: {
      transcript,
      language: input.language || undefined,
      errorMessage: null,
    },
  });
}

export async function processQueuedTranscriptions(input: { actor: AppUser; limit?: number }) {
  const limit = Math.max(1, Math.min(input.limit || 10, 25));
  const jobs = await prisma.externalChatTranscriptionJob.findMany({
    where: { status: "queued" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  const processed = [];

  for (const job of jobs) {
    const claimed = await prisma.externalChatTranscriptionJob.updateMany({
      where: { id: job.id, status: "queued" },
      data: {
        status: "processing",
        processorId: input.actor.id,
        processedAt: new Date(),
      },
    });
    if (claimed.count === 0) continue;
    processed.push(job.id);
  }

  return { processed, count: processed.length };
}