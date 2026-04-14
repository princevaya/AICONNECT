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

type MembershipSnapshot = {
  roomId: string;
  userId: string;
  role: string;
  leftAt: Date | null;
  removedAt: Date | null;
};

async function getMembership(roomId: string, userId: string) {
  return prisma.externalChatRoomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: {
      roomId: true,
      userId: true,
      role: true,
      leftAt: true,
      removedAt: true,
    },
  }) as Promise<MembershipSnapshot | null>;
}

function isMembershipActive(membership: MembershipSnapshot | null | undefined) {
  return Boolean(membership && !membership.leftAt && !membership.removedAt);
}

function isGlobalAdmin(user: AppUser) {
  return user.role.toLowerCase() === "admin";
}

type RoomRole = "owner" | "admin" | "member" | null;

function canManageRoom(user: AppUser, actorRole: RoomRole) {
  return isGlobalAdmin(user) || actorRole === "owner" || actorRole === "admin";
}

function canChangeRoles(user: AppUser, actorRole: RoomRole) {
  return isGlobalAdmin(user) || actorRole === "owner" || actorRole === "admin";
}

function canArchiveRoom(user: AppUser, actorRole: RoomRole) {
  return isGlobalAdmin(user) || actorRole === "owner" || actorRole === "admin";
}

function getRoomHiddenDelegate() {
  const delegate = (prisma as unknown as { externalChatRoomHidden?: unknown }).externalChatRoomHidden;
  return delegate as
    | {
        findMany: (args: unknown) => Promise<Array<{ roomId: string; hiddenAt: Date }>>;
        upsert: (args: unknown) => Promise<unknown>;
        deleteMany: (args: unknown) => Promise<unknown>;
      }
    | undefined;
}

async function requireRoom(roomCode: string, user: AppUser, allowArchived = false) {
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
  if (!allowArchived && room.archivedAt) throw new Error("Room is archived");
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

  const archivedRooms = await prisma.externalChatRoom.findMany({
    where: {
      workspaceId: workspace.id,
      archivedAt: { not: null },
      members: {
        some: {
          userId: user.id,
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

  const allRooms = [...rooms, ...archivedRooms];
  const roomHiddenDelegate = getRoomHiddenDelegate();
  const hidden = roomHiddenDelegate
    ? await roomHiddenDelegate.findMany({
        where: {
          userId: user.id,
          roomId: { in: allRooms.map((room) => room.id) },
        },
        select: { roomId: true, hiddenAt: true },
      })
    : [];
  const hiddenMap = new Map(hidden.map((entry) => [entry.roomId, entry.hiddenAt]));
  const memberships = await prisma.externalChatRoomMember.findMany({
    where: {
      userId: user.id,
      roomId: { in: allRooms.map((room) => room.id) },
    },
    select: {
      roomId: true,
      role: true,
      leftAt: true,
      removedAt: true,
    },
  });
  const membershipMap = new Map(memberships.map((entry) => [entry.roomId, entry]));

  const unreadEligibleRoomIds = rooms
    .filter((room) => {
      const membership = membershipMap.get(room.id);
      return membership && !membership.leftAt && !membership.removedAt;
    })
    .map((room) => room.id);

  const unread = await prisma.externalChatMessage.groupBy({
    by: ["roomId"],
    where: {
      roomId: { in: unreadEligibleRoomIds },
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
      hiddenAt: hiddenMap.get(room.id) || null,
      viewerMembership: (() => {
        const membership = membershipMap.get(room.id);
        if (!membership) return null;
        return {
          role: membership.role,
          leftAt: membership.leftAt,
          removedAt: membership.removedAt,
        };
      })(),
      canSend: (() => {
        const membership = membershipMap.get(room.id);
        return Boolean(membership && !membership.leftAt && !membership.removedAt && !room.archivedAt);
      })(),
      id: room.id,
      code: room.code,
      name: room.name,
      description: room.description,
      type: room.type,
      isPrivate: room.isPrivate,
      isDiscoverable: room.isDiscoverable,
      avatarUrl: room.avatarUrl,
      archivedAt: room.archivedAt,
      unreadCount: unreadMap.get(room.id) || 0,
      lastMessage: room.messages[0] || null,
      members: room.members.map((member) => ({
        id: member.id,
        userId: member.userId,
        role: member.role,
        user: member.user,
      })),
    })),
    archivedRooms: archivedRooms.map((room) => ({
      hiddenAt: hiddenMap.get(room.id) || null,
      viewerMembership: (() => {
        const membership = membershipMap.get(room.id);
        if (!membership) return null;
        return {
          role: membership.role,
          leftAt: membership.leftAt,
          removedAt: membership.removedAt,
        };
      })(),
      canSend: false,
      id: room.id,
      code: room.code,
      name: room.name,
      description: room.description,
      type: room.type,
      isPrivate: room.isPrivate,
      isDiscoverable: room.isDiscoverable,
      avatarUrl: room.avatarUrl,
      archivedAt: room.archivedAt,
      unreadCount: 0,
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
    where: { roomId: room.id, removedAt: null, leftAt: null },
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
  const allowed = canManageRoom(actor, (actorMember?.role as RoomRole) || null);
  if (!allowed) throw new Error("Not allowed");

  const users = await prisma.user.findMany({
    where: { clerkId: { in: Array.from(new Set(memberClerkIds)) } },
    select: { id: true, name: true, email: true },
  });
  for (const item of users) {
    await prisma.externalChatRoomMember.upsert({
      where: { roomId_userId: { roomId: room.id, userId: item.id } },
      update: { removedAt: null, leftAt: null },
      create: { roomId: room.id, userId: item.id },
    });
  }

  if (users.length > 0) {
    const labels = users
      .map((member) => member.name || member.email || "A member")
      .filter(Boolean)
      .slice(0, 5);
    const others = users.length - labels.length;
    const joinedLabel = labels.join(", ");
    const suffix = others > 0 ? ` and ${others} more` : "";
    await prisma.externalChatMessage.create({
      data: {
        roomId: room.id,
        senderId: actor.id,
        type: "text",
        content: `${joinedLabel}${suffix} ${users.length === 1 ? "was" : "were"} added to the group`,
        metadata: {
          eventType: "members_added",
          addedBy: actor.id,
          userIds: users.map((member) => member.id),
        },
      },
    });
  }
}

export async function leaveRoom(roomCode: string, user: AppUser) {
  const room = await requireRoom(roomCode, user);
  const membership = await prisma.externalChatRoomMember.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: user.id } },
    select: { role: true },
  });
  if (!membership || membership.role === "owner") {
    throw new Error("Not allowed");
  }

  // Update membership record
  await prisma.externalChatRoomMember.update({
    where: { roomId_userId: { roomId: room.id, userId: user.id } },
    data: {
      leftAt: new Date(),
      removedAt: new Date(),
    },
  });

  // Create system message to notify other members
  await prisma.externalChatMessage.create({
    data: {
      roomId: room.id,
      senderId: user.id,
      type: "text",
      content: `${user.name || user.email || "A member"} left the group`,
      metadata: {
        eventType: "member_left",
        userId: user.id,
        userName: user.name || user.email || "Unknown user",
      },
    },
  });

  // Log activity
  await logActivity(room.id, user.id, "member_left", {
    role: membership.role,
  });
}

export async function listMessages(input: {
  roomCode: string;
  viewer: AppUser;
  search?: string;
  pinnedOnly?: boolean;
  before?: string;
  limit?: number;
}) {
  const room = await prisma.externalChatRoom.findUnique({
    where: { code: input.roomCode },
    select: {
      id: true,
      archivedAt: true,
    },
  });
  if (!room) throw new Error("Room not found");
  const membership = await getMembership(room.id, input.viewer.id);
  if (!membership && input.viewer.role.toLowerCase() !== "admin") {
    throw new Error("Not allowed");
  }

  const historyCutoff = membership?.removedAt || membership?.leftAt || null;

  const q = input.search?.trim();
  const requestedLimit = Number.isFinite(input.limit) ? Number(input.limit) : 60;
  const limit = Math.min(Math.max(requestedLimit || 60, 20), 120);
  const cursorId = input.before?.trim() || "";
  let beforeFilter:
    | {
        OR: Array<
          | { createdAt: { lt: Date } }
          | { AND: [{ createdAt: Date }, { id: { lt: string } }] }
        >;
      }
    | undefined;
  if (cursorId) {
    const cursorMessage = await prisma.externalChatMessage.findUnique({
      where: { id: cursorId },
      select: { id: true, roomId: true, createdAt: true },
    });
    if (cursorMessage && cursorMessage.roomId === room.id) {
      beforeFilter = {
        OR: [
          { createdAt: { lt: cursorMessage.createdAt } },
          { AND: [{ createdAt: cursorMessage.createdAt }, { id: { lt: cursorMessage.id } }] },
        ],
      };
    }
  }

  const messages = await prisma.externalChatMessage.findMany({
    where: {
      roomId: room.id,
      ...(historyCutoff ? { createdAt: { lte: historyCutoff } } : {}),
      ...(beforeFilter || {}),
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
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });
  const hasMore = messages.length > limit;
  const windowed = hasMore ? messages.slice(0, limit) : messages;
  const orderedAsc = [...windowed].reverse();
  const nextCursor = hasMore ? windowed[windowed.length - 1]?.id || null : null;

  return {
    messages: orderedAsc.map((entry) => mapMessage(entry, input.viewer)).filter((entry) => entry !== null),
    hasMore,
    nextCursor,
  };
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
  noteColor?: "amber" | "emerald" | "sky" | "rose" | "violet" | null;
}) {
  const room = await requireRoom(input.roomCode, input.sender);
  const senderMembership = await getMembership(room.id, input.sender.id);
  if (!isMembershipActive(senderMembership)) {
    throw new Error("Not allowed");
  }

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

  const allowedNoteColors = new Set(["amber", "emerald", "sky", "rose", "violet"]);
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
    : input.type === "note"
      ? {
          noteColor: allowedNoteColors.has(String(input.noteColor || "")) ? input.noteColor : "amber",
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
          members: { where: { userId: user.id, removedAt: null, leftAt: null }, select: { id: true } },
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
          members: { where: { userId: user.id, removedAt: null, leftAt: null }, select: { id: true } },
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
            where: { userId: input.user.id, removedAt: null, leftAt: null },
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
          members: { where: { userId: user.id, removedAt: null, leftAt: null }, select: { role: true } },
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

export async function deleteRoom(roomCode: string, user: AppUser) {
  const room = await requireRoom(roomCode, user);
  const actorMember = await prisma.externalChatRoomMember.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: user.id } },
    select: { role: true },
  });
  const allowed = isGlobalAdmin(user) || actorMember?.role === "owner";
  if (!allowed) throw new Error("Not allowed");

  await prisma.externalChatRoom.delete({
    where: { id: room.id },
  });

  return { success: true };
}

export async function updateRoom(roomCode: string, user: AppUser, data: {
  name?: string;
  description?: string;
  avatarUrl?: string;
  isPrivate?: boolean;
  isDiscoverable?: boolean;
}) {
  const room = await requireRoom(roomCode, user);
  const actorMember = await prisma.externalChatRoomMember.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: user.id } },
    select: { role: true },
  });
  const allowed = canManageRoom(user, (actorMember?.role as RoomRole) || null);
  if (!allowed) throw new Error("Not allowed");

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.description !== undefined) updateData.description = data.description.trim() || null;
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl || null;
  if (data.isPrivate !== undefined) updateData.isPrivate = data.isPrivate;
  if (data.isDiscoverable !== undefined) updateData.isDiscoverable = data.isDiscoverable;

  const updated = await prisma.externalChatRoom.update({
    where: { id: room.id },
    data: updateData,
  });

  await logActivity(room.id, user.id, "room_updated", {
    changes: Object.keys(updateData),
  });

  return updated;
}

export async function removeMember(roomCode: string, user: AppUser, targetUserId: string) {
  const room = await requireRoom(roomCode, user);
  const actorMember = await prisma.externalChatRoomMember.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: user.id } },
    select: { role: true },
  });
  
  // Owner OR room admin OR global admin can remove members
  const allowed = canManageRoom(user, (actorMember?.role as RoomRole) || null);
  if (!allowed) throw new Error("Not allowed. Only the group owner or admin can remove members.");

  const targetMember = await prisma.externalChatRoomMember.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: targetUserId } },
    select: { role: true, userId: true },
  });
  if (!targetMember) throw new Error("Member not found");
  if (targetMember.role === "owner") throw new Error("Cannot remove the group owner");
  
  // Admins can only remove members (not other admins or owners)
  if (actorMember?.role === "admin" && targetMember.role === "admin") {
    throw new Error("Admins cannot remove other admins. Only the owner can remove admins.");
  }

  await prisma.externalChatRoomMember.update({
    where: { roomId_userId: { roomId: room.id, userId: targetUserId } },
    data: { removedAt: new Date(), leftAt: new Date() },
  });

  // Create system message to notify other members
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { name: true, email: true },
  });
  const targetName = targetUser?.name || targetUser?.email || "A member";
  
  await prisma.externalChatMessage.create({
    data: {
      roomId: room.id,
      senderId: user.id,
      type: "text",
      content: `${targetName} was removed from the group`,
      metadata: {
        eventType: "member_removed",
        userId: targetUserId,
        userName: targetName,
        removedBy: actorMember?.role,
      },
    },
  });

  await logActivity(room.id, user.id, "member_removed", {
    targetUserId,
    targetRole: targetMember.role,
    removedBy: actorMember?.role,
  });

  return { success: true };
}

export async function transferOwnership(roomCode: string, user: AppUser, newOwnerId: string) {
  const room = await requireRoom(roomCode, user);
  const actorMember = await prisma.externalChatRoomMember.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: user.id } },
    select: { role: true },
  });

  const isOwner = actorMember?.role === "owner";
  const globalAdmin = isGlobalAdmin(user);
  const allowed = isOwner || globalAdmin;

  if (!allowed) {
    throw new Error("Only the group owner or admin can transfer ownership");
  }

  const newOwnerMember = await prisma.externalChatRoomMember.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: newOwnerId } },
    select: { role: true, leftAt: true, removedAt: true },
  });
  if (!newOwnerMember) throw new Error("New owner must be a member of the group");
  if (newOwnerMember.leftAt || newOwnerMember.removedAt) {
    throw new Error("New owner must be an active member of the group");
  }

  const currentOwner = await prisma.externalChatRoomMember.findFirst({
    where: { roomId: room.id, role: "owner", leftAt: null, removedAt: null },
    select: { userId: true },
  });
  if (!currentOwner) throw new Error("Current owner not found");

  await prisma.$transaction(async (tx) => {
    await tx.externalChatRoomMember.update({
      where: { roomId_userId: { roomId: room.id, userId: currentOwner.userId } },
      data: { role: "admin" },
    });
    await tx.externalChatRoomMember.update({
      where: { roomId_userId: { roomId: room.id, userId: newOwnerId } },
      data: { role: "owner" },
    });
  });

  await logActivity(room.id, user.id, "ownership_transferred", {
    newOwnerId,
    previousOwnerId: currentOwner.userId,
  });

  return { success: true };
}

export async function removeOwnerOrAdmin(roomCode: string, user: AppUser) {
  const room = await requireRoom(roomCode, user);
  const actorMember = await prisma.externalChatRoomMember.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: user.id } },
    select: { role: true },
  });
  
  // Only owner or admin can remove themselves from leadership
  const allowed = canManageRoom(user, (actorMember?.role as RoomRole) || null);
  if (!allowed) throw new Error("Not allowed");

  // If owner, check if there's another member to transfer ownership
  if (actorMember?.role === "owner") {
    const otherMembers = await prisma.externalChatRoomMember.findMany({
      where: {
        roomId: room.id,
        userId: { not: user.id },
        removedAt: null,
        leftAt: null,
      },
    });
    if (otherMembers.length === 0) {
      throw new Error("Cannot remove owner - no other members in group. Delete or transfer ownership first.");
    }
  }

  // Remove from owner/admin to regular member
  await prisma.externalChatRoomMember.update({
    where: { roomId_userId: { roomId: room.id, userId: user.id } },
    data: { role: "member" },
  });

  await logActivity(room.id, user.id, "leadership_removed", {
    oldRole: actorMember?.role,
  });

  return { success: true };
}

export async function changeMemberRole(roomCode: string, user: AppUser, targetUserId: string, newRole: string) {
  const room = await requireRoom(roomCode, user);
  const actorMember = await prisma.externalChatRoomMember.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: user.id } },
    select: { role: true },
  });
  
  // Owner OR room admin OR global admin can change roles
  const allowed = canChangeRoles(user, (actorMember?.role as RoomRole) || null);
  if (!allowed) throw new Error("Not allowed. Only the group owner or admin can change member roles.");

  if (actorMember?.role === "admin" && !isGlobalAdmin(user)) {
    throw new Error("Only the group owner can assign or deassign admin roles.");
  }

  if (!["member", "admin"].includes(newRole)) throw new Error("Invalid role. Must be 'member' or 'admin'.");

  const targetMember = await prisma.externalChatRoomMember.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: targetUserId } },
    select: { role: true },
  });
  if (!targetMember) throw new Error("Member not found");
  if (targetMember.role === "owner") throw new Error("Cannot change owner role");

  await prisma.externalChatRoomMember.update({
    where: { roomId_userId: { roomId: room.id, userId: targetUserId } },
    data: { role: newRole },
  });

  await logActivity(room.id, user.id, "member_role_changed", {
    targetUserId,
    oldRole: targetMember.role,
    newRole,
    changedBy: actorMember?.role,
  });

  return { success: true };
}

export async function toggleMute(roomCode: string, user: AppUser) {
  const room = await requireRoom(roomCode, user);

  const existing = await prisma.externalChatRoomMute.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: user.id } },
  });

  if (existing) {
    const updated = await prisma.externalChatRoomMute.update({
      where: { roomId_userId: { roomId: room.id, userId: user.id } },
      data: { muted: !existing.muted },
    });
    return { muted: updated.muted };
  } else {
    await prisma.externalChatRoomMute.create({
      data: { roomId: room.id, userId: user.id, muted: true },
    });
    return { muted: true };
  }
}

export async function generateInviteCode(roomCode: string, user: AppUser) {
  const room = await requireRoom(roomCode, user);
  const actorMember = await prisma.externalChatRoomMember.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: user.id } },
    select: { role: true },
  });
  const allowed = isGlobalAdmin(user) || Boolean(actorMember?.role);
  if (!allowed) throw new Error("Not allowed");

  const inviteCode = `invite-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;

  await prisma.externalChatRoom.update({
    where: { id: room.id },
    data: { inviteCode },
  });

  await logActivity(room.id, user.id, "invite_code_generated");

  return { inviteCode };
}

export async function joinByInviteCode(inviteCode: string, user: AppUser) {
  const room = await prisma.externalChatRoom.findFirst({
    where: { inviteCode, archivedAt: null },
  });
  if (!room) throw new Error("Invalid invite code");

  const existing = await prisma.externalChatRoomMember.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: user.id } },
  });
  if (existing) {
    await prisma.externalChatRoomMember.update({
      where: { roomId_userId: { roomId: room.id, userId: user.id } },
      data: { removedAt: null, leftAt: null },
    });
  } else {
    await prisma.externalChatRoomMember.create({
      data: { roomId: room.id, userId: user.id },
    });
  }

  await logActivity(room.id, user.id, "joined_via_invite");

  return { room };
}

export async function previewInviteCode(inviteCode: string, user: AppUser) {
  const room = await prisma.externalChatRoom.findFirst({
    where: { inviteCode, archivedAt: null },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      avatarUrl: true,
      type: true,
      members: {
        where: { removedAt: null, leftAt: null },
        select: { userId: true },
      },
    },
  });
  if (!room) throw new Error("Invalid invite code");
  return {
    room: {
      id: room.id,
      code: room.code,
      name: room.name,
      description: room.description,
      avatarUrl: room.avatarUrl,
      type: room.type,
      memberCount: room.members.length,
    },
    alreadyMember: room.members.some((member) => member.userId === user.id),
  };
}

async function logActivity(roomId: string, userId: string, action: string, details?: any) {
  await prisma.externalChatRoomActivityLog.create({
    data: { roomId, userId, action, details: details || {} },
  });
}

export async function getActivityLogs(roomCode: string, user: AppUser, limit: number = 50) {
  const room = await requireRoom(roomCode, user);
  const actorMember = await prisma.externalChatRoomMember.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: user.id } },
    select: { role: true },
  });
  const allowed = canManageRoom(user, (actorMember?.role as RoomRole) || null);
  if (!allowed) throw new Error("Not allowed");

  const logs = await prisma.externalChatRoomActivityLog.findMany({
    where: { roomId: room.id },
    include: {
      user: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return logs;
}

export async function searchGroups(user: AppUser, query: string, limit: number = 20) {
  const groups = await prisma.externalChatRoom.findMany({
    where: {
      type: "group",
      archivedAt: null,
      isDiscoverable: true,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
      members: {
        some: {
          userId: user.id,
          removedAt: null,
          leftAt: null,
        },
      },
    },
    include: {
      members: {
        where: { removedAt: null, leftAt: null },
        include: {
          user: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
        },
        take: 10,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  return groups;
}

export async function archiveRoom(roomCode: string, user: AppUser, archive: boolean = true) {
  const room = await requireRoom(roomCode, user, true); // Allow archived rooms
  const actorMember = await prisma.externalChatRoomMember.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: user.id } },
    select: { role: true },
  });
  const allowed = canArchiveRoom(user, (actorMember?.role as RoomRole) || null);
  if (!allowed) throw new Error("Not allowed");

  const updated = await prisma.externalChatRoom.update({
    where: { id: room.id },
    data: { archivedAt: archive ? new Date() : null },
  });

  await logActivity(room.id, user.id, archive ? "room_archived" : "room_unarchived");

  return updated;
}

export async function hideRoomForUser(roomCode: string, user: AppUser) {
  const room = await prisma.externalChatRoom.findUnique({
    where: { code: roomCode },
    select: { id: true },
  });
  if (!room) throw new Error("Room not found");

  const membership = await prisma.externalChatRoomMember.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: user.id } },
    select: { role: true },
  });
  if (!membership && !isGlobalAdmin(user)) throw new Error("Not allowed");

  const roomHiddenDelegate = getRoomHiddenDelegate();
  if (!roomHiddenDelegate) {
    return { success: true, persisted: false as const };
  }

  await roomHiddenDelegate.upsert({
    where: { roomId_userId: { roomId: room.id, userId: user.id } },
    update: { hiddenAt: new Date() },
    create: { roomId: room.id, userId: user.id, hiddenAt: new Date() },
  });

  await logActivity(room.id, user.id, "room_hidden_for_user");
  return { success: true };
}

export async function unhideRoomForUser(roomCode: string, user: AppUser) {
  const room = await prisma.externalChatRoom.findUnique({
    where: { code: roomCode },
    select: { id: true },
  });
  if (!room) throw new Error("Room not found");

  const roomHiddenDelegate = getRoomHiddenDelegate();
  if (!roomHiddenDelegate) {
    return { success: true, persisted: false as const };
  }

  await roomHiddenDelegate.deleteMany({
    where: { roomId: room.id, userId: user.id },
  });
  await logActivity(room.id, user.id, "room_unhidden_for_user");
  return { success: true };
}

export async function exportGroupData(roomCode: string, user: AppUser) {
  const room = await requireRoom(roomCode, user);
  const actorMember = await prisma.externalChatRoomMember.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: user.id } },
    select: { role: true },
  });
  const allowed =
    user.role.toLowerCase() === "admin" ||
    actorMember?.role === "owner" ||
    actorMember?.role === "admin";
  if (!allowed) throw new Error("Not allowed");

  const [members, messages, activityLogs] = await Promise.all([
    prisma.externalChatRoomMember.findMany({
      where: { roomId: room.id, removedAt: null, leftAt: null },
      include: {
        user: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
      },
    }),
    prisma.externalChatMessage.findMany({
      where: { roomId: room.id, deletedAt: null },
      include: {
        sender: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
        reactions: {
          include: { user: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.externalChatRoomActivityLog.findMany({
      where: { roomId: room.id },
      include: {
        user: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return {
    room: {
      id: room.id,
      code: room.code,
      name: room.name,
      description: room.description,
      type: room.type,
      isPrivate: room.isPrivate,
      createdAt: room.createdAt,
    },
    members: members.map((m) => ({
      user: m.user,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
    messages: messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      content: m.content,
      type: m.type,
      createdAt: m.createdAt,
      reactions: m.reactions,
    })),
    activityLogs: activityLogs.map((log) => ({
      action: log.action,
      user: log.user,
      createdAt: log.createdAt,
    })),
  };
}

export async function reportRoom(roomCode: string, user: AppUser, data: {
  reason: string;
  description?: string;
}) {
  const room = await requireRoom(roomCode, user);

  const report = await prisma.externalChatRoomReport.create({
    data: {
      roomId: room.id,
      reporterId: user.id,
      reason: data.reason.trim(),
      description: data.description?.trim() || null,
    },
  });

  await logActivity(room.id, user.id, "room_reported", {
    reason: data.reason,
  });

  return report;
}
