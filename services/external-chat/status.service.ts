// services/external-chat/status.service.ts

import { Prisma } from "@prisma/client";
import { externalChatPrisma as prisma } from "@/lib/external-chat-prisma";
import { AppUser } from "@/services/user.service";

function parseAllowedUserIds(value: Prisma.JsonValue | null) {
  if (!Array.isArray(value)) return [] as string[];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function reactionSummary(reactions: Array<{ emoji: string; userId: string }>, viewerId?: string) {
  const buckets = new Map<string, { emoji: string; count: number; viewerReacted: boolean }>();
  for (const reaction of reactions) {
    const entry = buckets.get(reaction.emoji) || { 
      emoji: reaction.emoji, 
      count: 0, 
      viewerReacted: false 
    };
    entry.count += 1;
    if (viewerId && reaction.userId === viewerId) {
      entry.viewerReacted = true;
    }
    buckets.set(reaction.emoji, entry);
  }
  return Array.from(buckets.values());
}

type StatusUser = { 
  id: string; 
  clerkId: string; 
  name: string | null; 
  email: string | null; 
  imageUrl: string | null 
};

type StatusCommentRecord = {
  id: string;
  statusId: string;
  userId: string;
  parentId: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: StatusUser;
  replies?: Array<{
    id: string;
    statusId: string;
    userId: string;
    parentId: string | null;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    author: StatusUser;
  }>;
};

function mapStatusComment(comment: StatusCommentRecord) {
  return {
    id: comment.id,
    statusId: comment.statusId,
    userId: comment.userId,
    parentId: comment.parentId,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    author: comment.author,
    replies: (comment.replies || []).map((reply) => ({
      id: reply.id,
      statusId: reply.statusId,
      userId: reply.userId,
      parentId: reply.parentId,
      content: reply.content,
      createdAt: reply.createdAt.toISOString(),
      updatedAt: reply.updatedAt.toISOString(),
      author: reply.author,
    })),
  };
}

async function cleanupExpiredStatuses() {
  try {
    const now = new Date();
    await prisma.externalChatStatus.updateMany({
      where: {
        deletedAt: null,
        expiresAt: { lte: now },
      },
      data: {
        deletedAt: now,
      },
    });
  } catch (error) {
    console.error("[Status] Failed to cleanup expired statuses:", error);
  }
}

async function sharesActiveRoom(viewerId: string, authorId: string) {
  try {
    const sharedRoom = await prisma.externalChatRoomMember.findFirst({
      where: {
        userId: viewerId,
        removedAt: null,
        leftAt: null,
        room: {
          members: {
            some: {
              userId: authorId,
              removedAt: null,
              leftAt: null,
            },
          },
        },
      },
      select: { id: true },
    });
    return Boolean(sharedRoom);
  } catch {
    return false;
  }
}

async function canViewStatus(viewer: AppUser, status: {
  userId: string;
  visibility: string;
  allowedUserIds: Prisma.JsonValue | null;
}) {
  // Viewer is the author
  if (status.userId === viewer.id) return true;
  
  // Public visibility
  if (status.visibility === "public") return true;
  
  // Private visibility - only author can see
  if (status.visibility === "private") return false;

  // Selected visibility - check allowed list
  if (status.visibility === "selected") {
    const allowedIds = parseAllowedUserIds(status.allowedUserIds);
    return allowedIds.includes(viewer.id);
  }

  // Contacts visibility - check direct connection
  try {
    const directConnection = await prisma.externalChatConnection.findFirst({
      where: {
        removedAt: null,
        OR: [
          { userAId: viewer.id, userBId: status.userId },
          { userAId: status.userId, userBId: viewer.id },
        ],
      },
      select: { id: true },
    });
    if (directConnection) return true;
  } catch {
    // Ignore connection errors
  }

  // Check shared rooms for contacts fallback
  return sharesActiveRoom(viewer.id, status.userId);
}

export async function createStatus(input: {
  actor: AppUser;
  text?: string | null;
  attachmentId?: string | null;
  visibility?: "public" | "contacts" | "selected" | "private";
  allowedUserIds?: string[];
  expiresAt?: Date;
}) {
  await cleanupExpiredStatuses();
  
  const text = input.text?.trim() || null;
  const attachmentId = input.attachmentId?.trim() || null;
  
  if (!text && !attachmentId) {
    throw new Error("Status requires text or media");
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

  const visibility = input.visibility || "public";
  const allowedUserIds = Array.from(new Set((input.allowedUserIds || []).map((id) => id.trim()).filter(Boolean)));
  
  if (visibility === "selected" && allowedUserIds.length === 0) {
    throw new Error("Selected visibility requires at least one user");
  }

  // Default 24 hour expiry
  const expiresAt = input.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);

  const status = await prisma.externalChatStatus.create({
    data: {
      userId: input.actor.id,
      text,
      attachmentId,
      visibility,
      allowedUserIds: allowedUserIds.length > 0 ? allowedUserIds : Prisma.JsonNull,
      expiresAt,
      publishedAt: new Date(),
    },
    include: {
      author: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
      attachment: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true } },
      viewers: { select: { userId: true, viewedAt: true } },
      reactions: { select: { emoji: true, userId: true } },
    },
  });

  const reactions = reactionSummary(status.reactions, input.actor.id);
  
  return {
    id: status.id,
    userId: status.userId,
    author: status.author,
    text: status.text,
    visibility: status.visibility,
    publishedAt: status.publishedAt.toISOString(),
    expiresAt: status.expiresAt.toISOString(),
    viewedByViewer: false,
    viewerCount: 0,
    reactions,
    attachment: status.attachment
      ? {
          id: status.attachment.id,
          fileName: status.attachment.fileName,
          mimeType: status.attachment.mimeType,
          sizeBytes: Number(status.attachment.sizeBytes),
          downloadUrl: `/api/external-chat/files/${status.attachment.id}/download`,
        }
      : null,
  };
}

export async function listStatuses(viewer: AppUser) {
  await cleanupExpiredStatuses();
  
  const now = new Date();
  
  const [selfStatus, statuses] = await Promise.all([
    prisma.externalChatStatus.findFirst({
      where: { 
        userId: viewer.id, 
        deletedAt: null, 
        expiresAt: { gt: now } 
      },
      orderBy: { publishedAt: "desc" },
      include: {
        author: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
        attachment: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true } },
        viewers: { select: { userId: true, viewedAt: true } },
        reactions: { select: { emoji: true, userId: true } },
      },
    }),
    prisma.externalChatStatus.findMany({
      where: {
        deletedAt: null,
        expiresAt: { gt: now },
        userId: { not: viewer.id },
      },
      orderBy: { publishedAt: "desc" },
      take: 200,
      include: {
        author: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
        attachment: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true } },
        viewers: { select: { userId: true, viewedAt: true } },
        reactions: { select: { emoji: true, userId: true } },
      },
    }),
  ]);

  const visibleStatuses = [];
  for (const status of statuses) {
    if (await canViewStatus(viewer, status)) {
      visibleStatuses.push({
        id: status.id,
        userId: status.userId,
        author: status.author,
        text: status.text,
        visibility: status.visibility,
        publishedAt: status.publishedAt.toISOString(),
        expiresAt: status.expiresAt.toISOString(),
        viewedByViewer: status.viewers.some((view) => view.userId === viewer.id),
        viewerCount: status.viewers.length,
        reactions: reactionSummary(status.reactions, viewer.id),
        attachment: status.attachment
          ? {
              id: status.attachment.id,
              fileName: status.attachment.fileName,
              mimeType: status.attachment.mimeType,
              sizeBytes: Number(status.attachment.sizeBytes),
              downloadUrl: `/api/external-chat/files/${status.attachment.id}/download`,
            }
          : null,
      });
    }
  }

  return {
    selfStatus: selfStatus
      ? {
          id: selfStatus.id,
          userId: selfStatus.userId,
          author: selfStatus.author,
          text: selfStatus.text,
          visibility: selfStatus.visibility,
          publishedAt: selfStatus.publishedAt.toISOString(),
          expiresAt: selfStatus.expiresAt.toISOString(),
          viewedByViewer: true,
          viewerCount: selfStatus.viewers.length,
          reactions: reactionSummary(selfStatus.reactions, viewer.id),
          attachment: selfStatus.attachment
            ? {
                id: selfStatus.attachment.id,
                fileName: selfStatus.attachment.fileName,
                mimeType: selfStatus.attachment.mimeType,
                sizeBytes: Number(selfStatus.attachment.sizeBytes),
                downloadUrl: `/api/external-chat/files/${selfStatus.attachment.id}/download`,
              }
            : null,
        }
      : null,
    statuses: visibleStatuses,
  };
}

export async function markStatusViewed(statusId: string, viewer: AppUser) {
  await cleanupExpiredStatuses();
  
  const status = await prisma.externalChatStatus.findUnique({
    where: { id: statusId },
    select: { 
      id: true, 
      userId: true, 
      visibility: true, 
      allowedUserIds: true, 
      expiresAt: true, 
      deletedAt: true 
    },
  });
  
  if (!status || status.deletedAt || status.expiresAt <= new Date()) {
    throw new Error("Status not found");
  }
  
  if (!(await canViewStatus(viewer, status))) {
    throw new Error("Not allowed to view this status");
  }

  await prisma.externalChatStatusView.upsert({
    where: { statusId_userId: { statusId, userId: viewer.id } },
    update: { viewedAt: new Date() },
    create: { statusId, userId: viewer.id, viewedAt: new Date() },
  });

  return { viewed: true };
}

export async function toggleStatusReaction(statusId: string, emoji: string, viewer: AppUser) {
  await cleanupExpiredStatuses();
  
  const status = await prisma.externalChatStatus.findUnique({
    where: { id: statusId },
    select: { 
      id: true, 
      userId: true, 
      visibility: true, 
      allowedUserIds: true, 
      expiresAt: true, 
      deletedAt: true 
    },
  });
  
  if (!status || status.deletedAt || status.expiresAt <= new Date()) {
    throw new Error("Status not found");
  }
  
  if (!(await canViewStatus(viewer, status))) {
    throw new Error("Not allowed to react to this status");
  }

  const value = emoji.trim();
  if (!value) throw new Error("emoji is required");

  const existing = await prisma.externalChatStatusReaction.findFirst({
    where: { statusId, userId: viewer.id, emoji: value },
    select: { id: true },
  });
  
  if (existing) {
    await prisma.externalChatStatusReaction.delete({ where: { id: existing.id } });
    return { active: false };
  }

  try {
    await prisma.externalChatStatusReaction.create({
      data: { statusId, userId: viewer.id, emoji: value },
    });
    return { active: true };
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? (error as { code?: string }).code : undefined;
    if (code === "P2002") return { active: true };
    throw error;
  }
}

export async function getStatusInsights(statusId: string, viewer: AppUser) {
  await cleanupExpiredStatuses();
  
  const status = await prisma.externalChatStatus.findUnique({
    where: { id: statusId },
    include: {
      author: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
      viewers: { 
        include: { 
          user: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } } 
        } 
      },
      reactions: { 
        include: { 
          user: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } } 
        } 
      },
    },
  });
  
  if (!status) throw new Error("Status not found");
  
  const allowed = status.userId === viewer.id || viewer.role?.toLowerCase() === "admin";
  if (!allowed) throw new Error("Not allowed to view insights");
  
  const commentCount = await prisma.externalChatStatusComment.count({
    where: { statusId: status.id },
  });

  return {
    id: status.id,
    viewerCount: status.viewers.length,
    commentCount,
    reactionSummary: reactionSummary(
      status.reactions.map((reaction) => ({ emoji: reaction.emoji, userId: reaction.userId })), 
      viewer.id
    ),
    viewers: status.viewers.map((entry) => ({
      user: entry.user,
      viewedAt: entry.viewedAt.toISOString(),
    })),
    reactions: status.reactions.map((reaction) => ({
      emoji: reaction.emoji,
      user: reaction.user,
    })),
  };
}

export async function listStatusComments(statusId: string, viewer: AppUser) {
  await cleanupExpiredStatuses();
  
  const status = await prisma.externalChatStatus.findUnique({
    where: { id: statusId },
    select: { 
      id: true, 
      userId: true, 
      visibility: true, 
      allowedUserIds: true, 
      expiresAt: true, 
      deletedAt: true 
    },
  });
  
  if (!status || status.deletedAt || status.expiresAt <= new Date()) {
    throw new Error("Status not found");
  }
  
  if (!(await canViewStatus(viewer, status))) {
    throw new Error("Not allowed to view comments on this status");
  }

  const comments = await prisma.externalChatStatusComment.findMany({
    where: { statusId, parentId: null },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
        },
      },
    },
  });

  return comments.map((comment) => mapStatusComment(comment as StatusCommentRecord));
}

export async function createStatusComment(input: {
  statusId: string;
  viewer: AppUser;
  content: string;
  parentId?: string | null;
}) {
  await cleanupExpiredStatuses();
  
  const status = await prisma.externalChatStatus.findUnique({
    where: { id: input.statusId },
    select: { 
      id: true, 
      userId: true, 
      visibility: true, 
      allowedUserIds: true, 
      expiresAt: true, 
      deletedAt: true 
    },
  });
  
  if (!status || status.deletedAt || status.expiresAt <= new Date()) {
    throw new Error("Status not found");
  }
  
  if (!(await canViewStatus(input.viewer, status))) {
    throw new Error("Not allowed to comment on this status");
  }

  const content = input.content.trim();
  if (!content) throw new Error("Comment cannot be empty");
  if (content.length > 1000) throw new Error("Comment is too long (max 1000 characters)");

  let parentId: string | null = null;
  if (input.parentId?.trim()) {
    const parent = await prisma.externalChatStatusComment.findFirst({
      where: {
        id: input.parentId.trim(),
        statusId: input.statusId,
      },
      select: { id: true },
    });
    if (!parent) throw new Error("Parent comment not found");
    parentId = parent.id;
  }

  const comment = await prisma.externalChatStatusComment.create({
    data: {
      statusId: input.statusId,
      userId: input.viewer.id,
      parentId,
      content,
    },
    include: {
      author: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
    },
  });

  return mapStatusComment({
    ...comment,
    replies: [],
  } as StatusCommentRecord);
}