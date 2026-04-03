import { externalChatPrisma as prisma } from "@/lib/external-chat-prisma";
const db = prisma as any;
import { AppUser } from "@/services/user.service";

function orderedPair(a: string, b: string) {
  return a < b ? [a, b] : [b, a];
}

async function ensureWorkspace(user: AppUser) {
  return prisma.externalChatWorkspace.upsert({
    where: { slug: "external-chat" },
    update: {},
    create: {
      slug: "external-chat",
      name: "External Chat",
      createdBy: user.id,
    },
  });
}

async function ensureDirectRoom(userA: AppUser, userB: { id: string; clerkId: string; name: string | null; email: string | null }) {
  const [left, right] = orderedPair(userA.id, userB.id);
  const code = `dm-${left}-${right}`;

  const workspace = await ensureWorkspace(userA);
  const existing = await prisma.externalChatRoom.findUnique({ where: { code } });
  if (existing) {
    await prisma.externalChatRoomMember.upsert({
      where: { roomId_userId: { roomId: existing.id, userId: left } },
      update: { removedAt: null, leftAt: null },
      create: { roomId: existing.id, userId: left, role: "member" },
    });
    await prisma.externalChatRoomMember.upsert({
      where: { roomId_userId: { roomId: existing.id, userId: right } },
      update: { removedAt: null, leftAt: null },
      create: { roomId: existing.id, userId: right, role: "member" },
    });
    return existing;
  }

  const room = await prisma.externalChatRoom.create({
    data: {
      workspaceId: workspace.id,
      code,
      name: userB.name || userB.email || userB.clerkId,
      type: "direct",
      isPrivate: true,
      createdBy: userA.id,
    },
  });

  await prisma.externalChatRoomMember.createMany({
    data: [
      { roomId: room.id, userId: left, role: "member" },
      { roomId: room.id, userId: right, role: "member" },
    ],
    skipDuplicates: true,
  });

  return room;
}

export async function searchUsers(actor: AppUser, query: string) {
  const q = query.trim();
  if (!q) return [];
  const users = await prisma.user.findMany({
    where: {
      id: { not: actor.id },
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { clerkId: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      clerkId: true,
      name: true,
      email: true,
      imageUrl: true,
    },
    take: 20,
  });
  return users;
}

export async function listConnectionState(actor: AppUser) {
  const outgoing = await db.externalChatConnectionRequest.findMany({
    where: { senderId: actor.id, status: "pending" },
    include: {
      receiver: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const incoming = await db.externalChatConnectionRequest.findMany({
    where: { receiverId: actor.id, status: "pending" },
    include: {
      sender: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const connections = await db.externalChatConnection.findMany({
    where: {
      removedAt: null,
      OR: [{ userAId: actor.id }, { userBId: actor.id }],
    },
    include: {
      userA: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
      userB: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
      directRoom: { select: { id: true, code: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return { outgoing, incoming, connections };
}

export async function requestConnection(actor: AppUser, targetClerkId: string, message?: string) {
  const target = await prisma.user.findUnique({
    where: { clerkId: targetClerkId.trim() },
    select: { id: true, clerkId: true, name: true, email: true },
  });
  if (!target) throw new Error("User not found");
  if (target.id === actor.id) throw new Error("Cannot connect with yourself");

  const [left, right] = orderedPair(actor.id, target.id);
  const existingConnection = await db.externalChatConnection.findFirst({
    where: {
      userAId: left,
      userBId: right,
      removedAt: null,
    },
    select: { id: true },
  });
  if (existingConnection) throw new Error("Already connected");

  const existingReverse = await db.externalChatConnectionRequest.findFirst({
    where: {
      senderId: target.id,
      receiverId: actor.id,
      status: "pending",
    },
    select: { id: true },
  });

  if (existingReverse) {
    return acceptConnectionRequest(actor, existingReverse.id);
  }

  return db.externalChatConnectionRequest.upsert({
    where: {
      senderId_receiverId: {
        senderId: actor.id,
        receiverId: target.id,
      },
    },
    update: {
      status: "pending",
      message: message?.trim() || null,
      respondedAt: null,
    },
    create: {
      senderId: actor.id,
      receiverId: target.id,
      message: message?.trim() || null,
    },
  });
}

export async function acceptConnectionRequest(actor: AppUser, requestId: string) {
  const request = await db.externalChatConnectionRequest.findUnique({
    where: { id: requestId },
    include: {
      sender: { select: { id: true, clerkId: true, name: true, email: true } },
    },
  });
  if (!request || request.status !== "pending") throw new Error("Request not found");
  if (request.receiverId !== actor.id) throw new Error("Not allowed");

  const [left, right] = orderedPair(request.senderId, request.receiverId);
  const room = await ensureDirectRoom(actor, request.sender);

  const connection = await db.externalChatConnection.upsert({
    where: {
      userAId_userBId: {
        userAId: left,
        userBId: right,
      },
    },
    update: {
      removedAt: null,
      directRoomId: room.id,
    },
    create: {
      userAId: left,
      userBId: right,
      directRoomId: room.id,
    },
  });

  await db.externalChatConnectionRequest.update({
    where: { id: request.id },
    data: {
      status: "accepted",
      respondedAt: new Date(),
    },
  });

  return {
    connection,
    roomCode: room.code,
  };
}

export async function declineConnectionRequest(actor: AppUser, requestId: string) {
  const request = await db.externalChatConnectionRequest.findUnique({
    where: { id: requestId },
    select: { id: true, receiverId: true, status: true },
  });
  if (!request || request.status !== "pending") throw new Error("Request not found");
  if (request.receiverId !== actor.id) throw new Error("Not allowed");

  await db.externalChatConnectionRequest.update({
    where: { id: request.id },
    data: {
      status: "declined",
      respondedAt: new Date(),
    },
  });
}

export async function removeConnection(actor: AppUser, connectionId: string) {
  const connection = await db.externalChatConnection.findUnique({
    where: { id: connectionId },
    include: {
      directRoom: {
        select: { id: true },
      },
    },
  });
  if (!connection || connection.removedAt) throw new Error("Connection not found");
  const ownsConnection = connection.userAId === actor.id || connection.userBId === actor.id;
  if (!ownsConnection && actor.role.toLowerCase() !== "admin") throw new Error("Not allowed");

  await db.externalChatConnection.update({
    where: { id: connection.id },
    data: { removedAt: new Date() },
  });

  await prisma.externalChatRoomMember.updateMany({
    where: { roomId: connection.directRoomId },
    data: { removedAt: new Date(), leftAt: new Date() },
  });
}

