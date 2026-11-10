import { randomUUID } from "crypto";
import { externalChatPrisma as prisma } from "@/lib/external-chat-prisma";
import { AppUser } from "@/services/user.service";
import { assertExternalChatRoomAccess } from "@/services/external-chat/chat.service";
import { publishRoomEvent } from "@/lib/external-chat-realtime";
import { getRoomServiceClient } from "@/lib/livekit-server";

function buildLivekitRoomName(roomCode: string) {
  return `external-chat-${roomCode}-${Date.now()}-${randomUUID().slice(0, 8)}`.replace(/[^a-zA-Z0-9-_]/g, "-");
}

const CALL_RING_TIMEOUT_MS = 65 * 1000;
const CALL_MAX_PARTICIPANTS = Number(process.env.LIVEKIT_MAX_PARTICIPANTS || 100);

async function getRoomForCall(roomCode: string, actor: AppUser) {
  await assertExternalChatRoomAccess(roomCode, actor);
  const room = await prisma.externalChatRoom.findUnique({
    where: { code: roomCode },
    select: { id: true, code: true, name: true, type: true },
  });
  if (!room) throw new Error("Room not found");
  return room;
}

export async function sweepMissedCalls(roomId?: string) {
  try {
    const cutoff = new Date(Date.now() - CALL_RING_TIMEOUT_MS);
    const overdueSessions = await prisma.externalChatCallSession.findMany({
      where: {
        ...(roomId ? { roomId } : {}),
        status: "ringing",
        startedAt: { lt: cutoff },
      },
      select: { id: true },
    });
    if (overdueSessions.length === 0) return;

    const missedAt = new Date();
    const ids = overdueSessions.map((session) => session.id);
    await prisma.externalChatCallSession.updateMany({
      where: { id: { in: ids }, status: "ringing" },
      data: {
        status: "missed",
        endedAt: missedAt,
        durationSeconds: 0,
      },
    });
    await prisma.externalChatCallParticipant.updateMany({
      where: {
        callId: { in: ids },
        leftAt: null,
        state: "invited",
      },
      data: {
        leftAt: missedAt,
        state: "missed",
      },
    });
  } catch (error) {
    console.error("[Calls] Failed to sweep missed calls:", error);
  }
}

async function ensureLivekitRoomExists(livekitRoomName: string): Promise<boolean> {
  try {
    const roomService = getRoomServiceClient();
    const rooms = await roomService.listRooms([livekitRoomName]);
    if (rooms.length === 0) {
      await roomService.createRoom({
        name: livekitRoomName,
        maxParticipants: CALL_MAX_PARTICIPANTS,
        emptyTimeout: 300,
      });
    }
    return true;
  } catch {
    return false;
  }
}

export async function startCall(input: {
  roomCode?: string;
  targetUserId?: string;
  actor: AppUser;
  type: "audio" | "video";
  participantUserIds?: string[];
}) {
  let targetRoomCode = input.roomCode?.trim() || "";

  if (!targetRoomCode && input.targetUserId?.trim()) {
    const targetId = input.targetUserId.trim();
    const [left, right] = input.actor.id < targetId ? [input.actor.id, targetId] : [targetId, input.actor.id];
    const connection = await prisma.externalChatConnection.findFirst({
      where: { userAId: left, userBId: right, removedAt: null },
      include: { directRoom: { select: { code: true } } },
    });
    if (!connection?.directRoom?.code) {
      throw new Error("Connection request must be accepted before calling");
    }
    targetRoomCode = connection.directRoom.code;
  }

  if (!targetRoomCode) {
    throw new Error("roomCode is required");
  }

  const room = await getRoomForCall(targetRoomCode, input.actor);
  const activeMembers = await prisma.externalChatRoomMember.findMany({
    where: { roomId: room.id, removedAt: null, leftAt: null },
    select: { userId: true },
  });
  const activeMemberIds = new Set(activeMembers.map((member) => member.userId));
  const livekitRoomName = buildLivekitRoomName(room.code);

  let participantUserIds = Array.from(
    new Set(
      (input.participantUserIds || [])
        .map((id) => id.trim())
        .filter((id) => Boolean(id) && activeMemberIds.has(id) && id !== input.actor.id)
    )
  );

  // If caller didn't specify participantUserIds (e.g. direct chat or room call), invite active room peers
  if (participantUserIds.length === 0) {
    participantUserIds = activeMembers
      .map((member) => member.userId)
      .filter((id) => id !== input.actor.id)
      .slice(0, 50);
  }

  if (participantUserIds.length === 0) {
    throw new Error("No eligible participants to call in this conversation");
  }

  await ensureLivekitRoomExists(livekitRoomName);

  const session = await prisma.externalChatCallSession.create({
    data: {
      roomId: room.id,
      startedBy: input.actor.id,
      type: input.type,
      status: "ringing",
      livekitRoomName,
      participants: {
        create: [
          {
            userId: input.actor.id,
            state: "joined",
            joinedAt: new Date(),
          },
          ...participantUserIds.map((userId) => ({
            userId,
            state: "invited",
          })),
        ],
      },
    },
    include: {
      room: { select: { id: true, code: true, name: true, type: true } },
      starter: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
      participants: {
        include: {
          user: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
        },
      },
    },
  });

  await publishRoomEvent(room.code, {
    senderId: input.actor.id,
    payload: {
      type: "call_ringing",
      callId: session.id,
      callType: session.type,
      roomCode: room.code,
      starter: session.starter,
      livekitRoomName: session.livekitRoomName,
      participantUserIds,
    },
  }).catch(() => undefined);

  return session;
}

function withCallDuration<T extends { startedAt: Date; endedAt: Date | null }>(session: T) {
  return {
    ...session,
    durationSec: session.endedAt
      ? Math.max(0, Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 1000))
      : null,
  };
}

export async function listCalls(roomCode: string, actor: AppUser) {
  const room = await getRoomForCall(roomCode, actor);
  await sweepMissedCalls(room.id);

  try {
    const sessions = await prisma.externalChatCallSession.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        room: { select: { id: true, code: true, name: true, type: true } },
        starter: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
        ender: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
        participants: {
          include: {
            user: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
          },
        },
      },
    });
    return {
      room,
      sessions: sessions.map(withCallDuration),
    };
  } catch (error) {
    console.error("[Calls] Failed to list calls:", error);
    return { room, sessions: [] };
  }
}

export async function listAllCallsForUser(actor: AppUser) {
  await sweepMissedCalls();

  const sessions = await prisma.externalChatCallSession.findMany({
    where: {
      OR: [
        { startedBy: actor.id },
        { participants: { some: { userId: actor.id } } },
        {
          room: {
            members: {
              some: { userId: actor.id, removedAt: null, leftAt: null },
            },
          },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      room: { select: { id: true, code: true, name: true, type: true } },
      starter: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
      ender: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
      participants: {
        include: {
          user: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
        },
      },
    },
  });

  return {
    sessions: sessions.map(withCallDuration),
  };
}

export async function joinCall(callId: string, actor: AppUser) {
  const session = await prisma.externalChatCallSession.findUnique({
    where: { id: callId },
    include: {
      room: {
        include: {
          members: {
            where: { userId: actor.id, removedAt: null, leftAt: null },
            select: { id: true },
          },
        },
      },
    },
  });
  if (!session) throw new Error("Call not found");
  if (session.room.members.length === 0 && actor.role.toLowerCase() !== "admin") {
    throw new Error("Not allowed");
  }
  if (session.status === "ended" || session.status === "declined" || session.status === "missed") {
    throw new Error("Call has ended");
  }

  const isRoomReady = await ensureLivekitRoomExists(session.livekitRoomName);

  const now = new Date();
  await prisma.externalChatCallParticipant.upsert({
    where: { callId_userId: { callId, userId: actor.id } },
    update: { state: "joined", joinedAt: now, leftAt: null },
    create: { callId, userId: actor.id, state: "joined", joinedAt: now },
  });

  await prisma.externalChatCallSession.update({
    where: { id: callId },
    data: { status: "active" },
  });

  return {
    callId,
    roomName: session.livekitRoomName,
    roomCode: session.room.code,
    type: session.type,
    status: "active",
    isRoomReady,
  };
}

export async function respondToCall(callId: string, actor: AppUser, action: "accept" | "reject") {
  const session = await prisma.externalChatCallSession.findUnique({
    where: { id: callId },
    include: {
      room: {
        include: {
          members: {
            where: { userId: actor.id, removedAt: null, leftAt: null },
            select: { id: true },
          },
        },
      },
      participants: true,
    },
  });
  if (!session) throw new Error("Call not found");
  if (session.room.members.length === 0 && actor.role.toLowerCase() !== "admin") {
    throw new Error("Not allowed");
  }
  if (session.status === "ended" || session.status === "missed" || session.status === "declined") {
    throw new Error("Call has ended");
  }

  const now = new Date();
  const nextState = action === "accept" ? "joined" : "rejected";
  const nextStatus = action === "accept" ? "active" : "declined";

  const sessionUpdateData: {
    status: "active" | "declined";
    endedBy?: string | null;
    endedAt?: Date | null;
    durationSeconds?: number | null;
  } = {
    status: nextStatus,
  };
  if (action === "reject") {
    sessionUpdateData.endedBy = actor.id;
    sessionUpdateData.endedAt = now;
    sessionUpdateData.durationSeconds = 0;
  }

  const nextCall = await prisma.externalChatCallSession.update({
    where: { id: callId },
    data: sessionUpdateData,
    include: {
      room: { select: { code: true, id: true, name: true, type: true } },
      starter: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
      participants: {
        include: {
          user: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
        },
      },
    },
  });

  await prisma.externalChatCallParticipant.upsert({
    where: { callId_userId: { callId, userId: actor.id } },
    update: {
      state: nextState,
      joinedAt: action === "accept" ? now : null,
      leftAt: action === "reject" ? now : null,
    },
    create: {
      callId,
      userId: actor.id,
      state: nextState,
      joinedAt: action === "accept" ? now : null,
      leftAt: action === "reject" ? now : null,
    },
  });

  if (action === "reject") {
    await prisma.externalChatCallParticipant.updateMany({
      where: { callId, leftAt: null },
      data: { leftAt: now, state: "rejected" },
    });
  }

  await publishRoomEvent(nextCall.room.code, {
    senderId: actor.id,
    payload: {
      type: action === "accept" ? "call_accepted" : "call_declined",
      callId,
    },
  }).catch(() => undefined);

  return nextCall;
}

export async function endCall(callId: string, actor: AppUser) {
  const session = await prisma.externalChatCallSession.findUnique({
    where: { id: callId },
    include: {
      room: {
        include: {
          members: {
            where: { userId: actor.id, removedAt: null, leftAt: null },
            select: { id: true },
          },
        },
      },
    },
  });
  if (!session) throw new Error("Call not found");
  if (session.room.members.length === 0 && actor.role.toLowerCase() !== "admin") {
    throw new Error("Not allowed");
  }

  if (session.status === "ended" || session.status === "declined" || session.status === "missed") {
    return session;
  }

  const endedAt = new Date();
  const wasRinging = session.status === "ringing";
  const nextStatus = wasRinging ? "missed" : "ended";
  const durationSeconds = wasRinging
    ? 0
    : Math.max(0, Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000));

  const updated = await prisma.externalChatCallSession.update({
    where: { id: callId },
    data: {
      status: nextStatus,
      endedBy: actor.id,
      endedAt,
      durationSeconds,
    },
    include: {
      room: { select: { code: true } },
      participants: true,
    },
  });

  await prisma.externalChatCallParticipant.updateMany({
    where: { callId, leftAt: null },
    data: { leftAt: endedAt, state: wasRinging ? "missed" : "left" },
  });

  await publishRoomEvent(updated.room.code, {
    senderId: actor.id,
    payload: {
      type: "call_ended",
      callId,
      status: nextStatus,
    },
  }).catch(() => undefined);

  return updated;
}

export async function getCallById(callId: string, actor: AppUser) {
  const session = await prisma.externalChatCallSession.findUnique({
    where: { id: callId },
    include: {
      room: {
        include: {
          members: {
            where: { userId: actor.id, removedAt: null, leftAt: null },
            select: { id: true },
          },
        },
      },
      starter: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
      ender: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
      participants: {
        include: {
          user: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!session) throw new Error("Call not found");
  if (session.room.members.length === 0 && actor.role.toLowerCase() !== "admin") {
    throw new Error("Not allowed");
  }

  return session;
}
