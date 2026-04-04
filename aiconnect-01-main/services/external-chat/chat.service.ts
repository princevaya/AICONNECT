import { ExternalChatMessageType, ExternalChatRoomType, Prisma } from "@prisma/client";
import { externalChatPrisma as prisma } from "@/lib/external-chat-prisma";
import { AppUser } from "@/services/user.service";

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function parseJsonArray(value: Prisma.JsonValue | null) {
  if (!Array.isArray(value)) return [] as string[];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function mentionsFromContent(content: string) {
  return Array.from(
    new Set(
      (content.match(/@[a-zA-Z0-9._-]+/g) || []).map((m) => m.slice(1).toLowerCase())
    )
  );
}

function mapMessage(
  message: {
    id: string;
    roomId: string;
    senderId: string;
    type: ExternalChatMessageType;
    content: string;
    metadata: Prisma.JsonValue | null;
    mentions: Prisma.JsonValue | null;
    privateTo: Prisma.JsonValue | null;
    replyToId: string | null;
    editedAt: Date | null;
    pinnedAt: Date | null;
    deletedAt: Date | null;
    createdAt: Date;
    sender: { id: string; clerkId: string; name: string | null; email: string | null; imageUrl: string | null };
    attachment: { id: string; fileName: string; mimeType: string; sizeBytes: bigint } | null;
    reactions: Array<{
      emoji: string;
      user: { id: string; clerkId: string; name: string | null; email: string | null; imageUrl: string | null };
    }>;
    seenBy: Array<{
      userId: string;
      seenAt: Date;
      user: { id: string; clerkId: string; name: string | null; email: string | null; imageUrl: string | null };
    }>;
  },
  viewer: AppUser
) {
  const privateTo = parseJsonArray(message.privateTo);
  if (privateTo.length > 0 && !privateTo.includes(viewer.id) && message.senderId !== viewer.id) {
    return null;
  }
  return {
    id: message.id,
    roomId: message.roomId,
    senderId: message.senderId,
    sender: message.sender,
    type: message.type,
    content: message.deletedAt ? "Message deleted" : message.content,
    metadata: message.metadata,
    mentions: parseJsonArray(message.mentions),
    privateTo,
    replyToId: message.replyToId,
    editedAt: message.editedAt,
    pinnedAt: message.pinnedAt,
    deletedAt: message.deletedAt,
    createdAt: message.createdAt,
    attachment: message.attachment
      ? {
          id: message.attachment.id,
          fileName: message.attachment.fileName,
          mimeType: message.attachment.mimeType,
          sizeBytes: Number(message.attachment.sizeBytes),
          downloadUrl: `/api/external-chat/files/${message.attachment.id}/download`,
        }
      : null,
    reactions: message.reactions,
    seenBy: message.seenBy,
  };
}

async function ensureWorkspace(user: AppUser, slug?: string) {
  const code = slugify(slug || "external-chat");
  return prisma.externalChatWorkspace.upsert({
    where: { slug: code },
    update: {},
    create: {
      slug: code,
      name: "External Chat",
      createdBy: user.id,
    },
  });
}

async function ensureMember(roomId: string, user: AppUser) {
  return prisma.externalChatRoomMember.upsert({
    where: {
      roomId_userId: {
        roomId,
        userId: user.id,
      },
    },
    update: {
      leftAt: null,
      removedAt: null,
      lastSeenAt: new Date(),
    },
    create: {
      roomId,
      userId: user.id,
      lastSeenAt: new Date(),
    },
  });
}

async function requireRoom(roomCode: string, user: AppUser) {
  const room = await prisma.externalChatRoom.findUnique({
    where: { code: roomCode },
    include: {
      members: {
        where: { userId: user.id, removedAt: null, leftAt: null },
        select: { id: true, role: true },
      },
    },
  });
  if (!room) throw new Error("Room not found");
  if (room.members.length === 0 && user.role.toLowerCase() !== "admin") {
    throw new Error("Not allowed");
  }
  return room;
}

export async function assertExternalChatRoomAccess(roomCode: string, user: AppUser) {
  return requireRoom(roomCode, user);
}

export async function listRooms(user: AppUser, workspaceSlug?: string) {
  const workspace = await ensureWorkspace(user, workspaceSlug);
  const rooms = await prisma.externalChatRoom.findMany({
    where: {
      workspaceId: workspace.id,
      archivedAt: null,
      members: {
        some: {
          userId: user.id,
          removedAt: null,
        },
      },
    },
    include: {
      members: {
        where: { removedAt: null },
        include: {
          user: {
            select: { id: true, clerkId: true, name: true, email: true, imageUrl: true },
          },
        },
      },
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, content: true, createdAt: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const unread = await prisma.externalChatMessage.groupBy({
    by: ["roomId"],
    where: {
      roomId: { in: rooms.map((room) => room.id) },
      senderId: { not: user.id },
      deletedAt: null,
      seenBy: { none: { userId: user.id } },
    },
    _count: { _all: true },
  });
  const unreadMap = new Map(unread.map((entry) => [entry.roomId, entry._count._all]));

  return {
    workspace: { id: workspace.id, slug: workspace.slug, name: workspace.name },
    rooms: rooms.map((room) => ({
      id: room.id,
      code: room.code,
      name: room.name,
      description: room.description,
      type: room.type,
      isPrivate: room.isPrivate,
      unreadCount: unreadMap.get(room.id) || 0,
      lastMessage: room.messages[0] || null,
      members: room.members.map((member) => ({
        id: member.id,
        userId: member.userId,
        role: member.role,
        user: member.user,
      })),
    })),
  };
}

export async function createRoom(input: {
  user: AppUser;
  workspace?: string;
  name: string;
  description?: string;
  type: ExternalChatRoomType;
  isPrivate?: boolean;
  memberClerkIds?: string[];
}) {
  const workspace = await ensureWorkspace(input.user, input.workspace);
  const name = input.name.trim();
  if (!name) throw new Error("name is required");

  const memberClerkIds = Array.from(new Set((input.memberClerkIds || []).map((id) => id.trim()).filter(Boolean)));
  const memberUsers =
    memberClerkIds.length > 0
      ? await prisma.user.findMany({ where: { clerkId: { in: memberClerkIds } }, select: { id: true, clerkId: true } })
      : [];

  if (input.type === "direct" && memberUsers.length !== 1) {
    throw new Error("Direct chat requires exactly one member");
  }

  const code =
    input.type === "direct" && memberUsers[0]
      ? `dm-${[input.user.id, memberUsers[0].id].sort().join("-")}`
      : `${slugify(input.type)}-${slugify(name)}-${Math.random().toString(36).slice(2, 8)}`;

  const existing = await prisma.externalChatRoom.findUnique({ where: { code } });
  if (existing) {
    await ensureMember(existing.id, input.user);
    for (const member of memberUsers) {
      await prisma.externalChatRoomMember.upsert({
        where: { roomId_userId: { roomId: existing.id, userId: member.id } },
        update: { removedAt: null, leftAt: null },
        create: { roomId: existing.id, userId: member.id },
      });
    }
    return existing;
  }

  const room = await prisma.externalChatRoom.create({
    data: {
      workspaceId: workspace.id,
      code,
      name,
      description: input.description?.trim() || null,
      type: input.type,
      isPrivate: Boolean(input.isPrivate),
      createdBy: input.user.id,
    },
  });

  await prisma.externalChatRoomMember.create({
    data: {
      roomId: room.id,
      userId: input.user.id,
      role: "owner",
      lastSeenAt: new Date(),
    },
  });

  for (const member of memberUsers) {
    await prisma.externalChatRoomMember.upsert({
      where: { roomId_userId: { roomId: room.id, userId: member.id } },
      update: { removedAt: null, leftAt: null },
      create: { roomId: room.id, userId: member.id },
    });
  }

  return room;
}

export async function listMembers(roomCode: string, user: AppUser) {
  const room = await requireRoom(roomCode, user);
  const members = await prisma.externalChatRoomMember.findMany({
    where: { roomId: room.id, removedAt: null },
    include: {
      user: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
    },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });
  return members;
}

export async function addMembers(roomCode: string, actor: AppUser, memberClerkIds: string[]) {
  const room = await requireRoom(roomCode, actor);
  const actorMember = await prisma.externalChatRoomMember.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: actor.id } },
    select: { role: true },
  });
  const allowed =
    actor.role.toLowerCase() === "admin" ||
    actorMember?.role === "owner" ||
    actorMember?.role === "admin";
  if (!allowed) throw new Error("Not allowed");

  const users = await prisma.user.findMany({
    where: { clerkId: { in: Array.from(new Set(memberClerkIds)) } },
    select: { id: true },
  });
  for (const item of users) {
    await prisma.externalChatRoomMember.upsert({
      where: { roomId_userId: { roomId: room.id, userId: item.id } },
      update: { removedAt: null, leftAt: null },
      create: { roomId: room.id, userId: item.id },
    });
  }
}

export async function listMessages(input: {
  roomCode: string;
  viewer: AppUser;
  search?: string;
  pinnedOnly?: boolean;
}) {
  const room = await requireRoom(input.roomCode, input.viewer);
  await ensureMember(room.id, input.viewer);

  const q = input.search?.trim();
  const messages = await prisma.externalChatMessage.findMany({
    where: {
      roomId: room.id,
      ...(input.pinnedOnly ? { pinnedAt: { not: null } } : {}),
      ...(q
        ? {
            OR: [
              { content: { contains: q, mode: "insensitive" } },
              { attachment: { fileName: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      sender: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
      attachment: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true } },
      reactions: {
        include: { user: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } } },
      },
      seenBy: {
        include: { user: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 800,
  });

  return messages.map((entry) => mapMessage(entry, input.viewer)).filter((entry) => entry !== null);
}

export async function createMessage(input: {
  roomCode: string;
  sender: AppUser;
  content: string;
  type?: ExternalChatMessageType;
  replyToId?: string | null;
  attachmentId?: string | null;
  privateToUserIds?: string[];
  poll?: { question: string; options: string[] } | null;
}) {
  const room = await requireRoom(input.roomCode, input.sender);
  await ensureMember(room.id, input.sender);

  const content = input.content.trim();
  const type = input.type || "text";
  if (content.length > Number(process.env.EXTERNAL_CHAT_MAX_MESSAGE_LENGTH || 4000)) {
    throw new Error("Message is too long");
  }

  if (input.privateToUserIds?.length) {
    const allowedRecipients = await prisma.externalChatRoomMember.findMany({
      where: {
        roomId: room.id,
        userId: { in: input.privateToUserIds },
        removedAt: null,
        leftAt: null,
      },
      select: { userId: true },
    });
    if (allowedRecipients.length !== input.privateToUserIds.length) {
      throw new Error("Invalid private message recipients");
    }
  }

  if (input.poll) {
    const question = input.poll.question.trim();
    const options = input.poll.options.map((option) => option.trim()).filter(Boolean);
    if (!question) throw new Error("Poll question is required");
    if (options.length < 2) throw new Error("Poll requires at least 2 options");
    if (options.length > 6) throw new Error("Poll supports up to 6 options");
  }

  const metadata: Prisma.InputJsonValue | undefined = input.poll
    ? {
        poll: {
          question: input.poll.question.trim(),
          options: input.poll.options.map((option) => option.trim()).filter(Boolean).map((option) => ({
            id: Math.random().toString(36).slice(2, 9),
            text: option,
            voters: [] as string[],
          })),
        },
      }
    : undefined;

  if (!content && !input.attachmentId && !metadata) throw new Error("Message cannot be empty");

  if (input.replyToId) {
    const parent = await prisma.externalChatMessage.findFirst({
      where: { id: input.replyToId, roomId: room.id },
      select: { id: true },
    });
    if (!parent) throw new Error("Reply target not found");
  }

  if (input.attachmentId) {
    const upload = await prisma.externalChatAttachment.findFirst({
      where: { id: input.attachmentId, roomId: room.id },
      select: { id: true },
    });
    if (!upload) throw new Error("Attachment not found");
  }

  const privateTo = Array.from(new Set([input.sender.id, ...(input.privateToUserIds || [])]));

  const created = await prisma.externalChatMessage.create({
    data: {
      roomId: room.id,
      senderId: input.sender.id,
      type,
      content,
      metadata,
      mentions: mentionsFromContent(content),
      privateTo: privateTo.length > 1 ? privateTo : Prisma.JsonNull,
      replyToId: input.replyToId || null,
      attachmentId: input.attachmentId || null,
    },
  });

  await prisma.externalChatReadReceipt.upsert({
    where: { messageId_userId: { messageId: created.id, userId: input.sender.id } },
    update: { seenAt: new Date() },
    create: { messageId: created.id, userId: input.sender.id, seenAt: new Date() },
  });

  return created;
}

export async function markSeen(messageId: string, user: AppUser) {
  const message = await prisma.externalChatMessage.findUnique({
    where: { id: messageId },
    include: {
      room: {
        include: {
          members: { where: { userId: user.id, removedAt: null }, select: { id: true } },
        },
      },
    },
  });
  if (!message) throw new Error("Message not found");
  if (message.room.members.length === 0 && user.role.toLowerCase() !== "admin") {
    throw new Error("Not allowed");
  }

  await prisma.externalChatReadReceipt.upsert({
    where: { messageId_userId: { messageId, userId: user.id } },
    update: { seenAt: new Date() },
    create: { messageId, userId: user.id, seenAt: new Date() },
  });
}

export async function toggleReaction(messageId: string, emoji: string, user: AppUser) {
  const msg = await prisma.externalChatMessage.findUnique({
    where: { id: messageId },
    include: {
      room: {
        include: {
          members: { where: { userId: user.id, removedAt: null }, select: { id: true } },
        },
      },
    },
  });
  if (!msg) throw new Error("Message not found");
  if (msg.room.members.length === 0 && user.role.toLowerCase() !== "admin") {
    throw new Error("Not allowed");
  }
  const value = emoji.trim();
  if (!value) throw new Error("emoji is required");

  const existing = await prisma.externalChatReaction.findFirst({
    where: { messageId, userId: user.id, emoji: value },
    select: { id: true },
  });
  if (existing) {
    await prisma.externalChatReaction.delete({ where: { id: existing.id } });
    return { active: false };
  }
  try {
    await prisma.externalChatReaction.create({
      data: { messageId, userId: user.id, emoji: value },
    });
    return { active: true };
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? (error as { code?: string }).code : undefined;
    if (code === "P2002") {
      // A concurrent duplicate toggle can race between the existence check and create.
      return { active: true };
    }
    throw error;
  }
}

export async function updateMessage(input: {
  messageId: string;
  user: AppUser;
  content?: string;
  pinned?: boolean;
  pollVoteOptionId?: string;
}) {
  const msg = await prisma.externalChatMessage.findUnique({
    where: { id: input.messageId },
    include: {
      room: {
        include: {
          members: {
            where: { userId: input.user.id, removedAt: null },
            select: { role: true },
          },
        },
      },
    },
  });
  if (!msg) throw new Error("Message not found");
  const isOwner = msg.senderId === input.user.id;
  const isRoomAdmin =
    msg.room.members[0]?.role === "owner" || msg.room.members[0]?.role === "admin";
  const isGlobalAdmin = input.user.role.toLowerCase() === "admin";
  if (!isOwner && !isRoomAdmin && !isGlobalAdmin) throw new Error("Not allowed");

  const data: Prisma.ExternalChatMessageUpdateInput = {};
  if (typeof input.content === "string") {
    const nextContent = input.content.trim();
    if (nextContent.length > Number(process.env.EXTERNAL_CHAT_MAX_MESSAGE_LENGTH || 4000)) {
      throw new Error("Message is too long");
    }
    data.content = nextContent;
    data.editedAt = new Date();
    data.mentions = mentionsFromContent(input.content);
  }
  if (typeof input.pinned === "boolean") {
    data.pinnedAt = input.pinned ? new Date() : null;
  }
  if (input.pollVoteOptionId) {
    const payload = msg.metadata as
      | { poll?: { question?: string; options?: Array<{ id: string; text: string; voters?: string[] }> } }
      | null;
    const poll = payload?.poll;
    if (!poll?.options) throw new Error("Poll not found");
    const options = poll.options.map((opt) => ({
      ...opt,
      voters: (opt.voters || []).filter((v) => v !== input.user.id),
    }));
    const chosen = options.find((opt) => opt.id === input.pollVoteOptionId);
    if (!chosen) throw new Error("Poll option not found");
    chosen.voters = Array.from(new Set([...(chosen.voters || []), input.user.id]));
    data.metadata = { poll: { question: poll.question || "", options } };
  }
  if (Object.keys(data).length === 0) return;
  await prisma.externalChatMessage.update({ where: { id: msg.id }, data });
}

export async function deleteMessage(messageId: string, user: AppUser) {
  const msg = await prisma.externalChatMessage.findUnique({
    where: { id: messageId },
    include: {
      room: {
        include: {
          members: { where: { userId: user.id, removedAt: null }, select: { role: true } },
        },
      },
    },
  });
  if (!msg || msg.deletedAt) throw new Error("Message not found");

  const allowed =
    msg.senderId === user.id ||
    msg.room.members[0]?.role === "owner" ||
    msg.room.members[0]?.role === "admin" ||
    user.role.toLowerCase() === "admin";
  if (!allowed) throw new Error("Not allowed");

  await prisma.externalChatMessage.update({
    where: { id: msg.id },
    data: { deletedAt: new Date() },
  });
}
