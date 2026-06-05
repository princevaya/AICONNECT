import { randomUUID } from "crypto";
import { externalChatPrisma as prisma } from "@/lib/external-chat-prisma";
import { AppUser } from "@/services/user.service";
import { assertExternalChatRoomAccess } from "@/services/external-chat/chat.service";

function buildLivekitRoomName(roomCode: string) {
  return `external-chat-${roomCode}-${Date.now()}-${randomUUID().slice(0, 8)}`.replace(/[^a-zA-Z0-9-_]/g, "-");
}

const CALL_RING_TIMEOUT_MS = 2 * 60 * 1000;
const LIVEKIT_ROOM_READY_TIMEOUT_MS = 5000;

async function getRoomForCall(roomCode: string, actor: AppUser) {
  await assertExternalChatRoomAccess(roomCode, actor);
  const room = await prisma.externalChatRoom.findUnique({
    where: { code: roomCode },
    select: { id: true, code: true, name: true },
  });
  if (!room) throw new Error("Room not found");
  return room;
}

async function sweepMissedCalls(roomId: string) {
  try {
    const cutoff = new Date(Date.now() - CALL_RING_TIMEOUT_MS);
    const overdueSessions = await prisma.externalChatCallSession.findMany({
      where: {
        roomId,
        status: "ringing",
        startedAt: { lt: cutoff },
      },
      select: { id: true, startedAt: true },
    });
    if (overdueSessions.length === 0) return;

    const missedAt = new Date();
    await prisma.externalChatCallSession.updateMany({
      where: { id: { in: overdueSessions.map((session) => session.id) } },
      data: {
        status: "missed",
        endedAt: missedAt,
        durationSeconds: 0,
      },
    });
    await prisma.externalChatCallParticipant.updateMany({
      where: {
        callId: { in: overdueSessions.map((session) => session.id) },
        leftAt: null,
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

// FIXED P4a: Added room readiness check with timeout
async function waitForLiveKitRoomReady(livekitRoomName: string, maxWaitMs: number = LIVEKIT_ROOM_READY_TIMEOUT_MS): Promise<boolean> {
  const startTime = Date.now();
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!livekitUrl) return false;

  const checkInterval = 500;
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await fetch(`${livekitUrl}/api/rooms/${livekitRoomName}`, {
        headers: {
          Authorization: `Bearer ${process.env.LIVEKIT_API_KEY}:${process.env.LIVEKIT_API_SECRET}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.room && data.room.name === livekitRoomName) {
          return true;
        }
      }
    } catch {
      // Room not ready yet, continue waiting
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  return false;
}

export async function startCall(input: {
  roomCode: string;
  actor: AppUser;
  type: "audio" | "video";
  participantUserIds?: string[];
}) {
  const room = await getRoomForCall(input.roomCode, input.actor);
  const activeMembers = await prisma.externalChatRoomMember.findMany({
    where: { roomId: room.id, removedAt: null, leftAt: null },
    select: { userId: true },
  });
  const activeMemberIds = new Set(activeMembers.map((member) => member.userId));
  const livekitRoomName = buildLivekitRoomName(room.code);
  const participantUserIds = Array.from(
    new Set(
      (input.participantUserIds || [])
        .map((id) => id.trim())
        .filter((id) => Boolean(id) && activeMemberIds.has(id))
    )
  );

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
          ...participantUserIds
            .filter((userId) => userId !== input.actor.id)
            .map((userId) => ({
              userId,
              state: "invited",
            })),
        ],
      },
    },
    include: {
      room: { select: { id: true, code: true, name: true } },
      starter: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
      participants: {
        include: {
          user: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
        },
      },
    },
  });

  return session;
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
        starter: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
        ender: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
        participants: {
          include: {
            user: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
          },
        },
      },
    });
    return { room, sessions };
  } catch (error) {
    console.error("[Calls] Failed to list calls:", error);
    return { room, sessions: [] };
  }
}

// FIXED P4a: Enhanced joinCall with readiness check
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
  if (session.status === "ended") {
    throw new Error("Call has ended");
  }

  // Wait for LiveKit room to be ready before joining
  const isRoomReady = await waitForLiveKitRoomReady(session.livekitRoomName);
  if (!isRoomReady) {
    // Room not ready, but we'll still try to join - the client will handle retry
    console.warn(`[Calls] LiveKit room ${session.livekitRoomName} not ready yet, attempting join anyway`);
  }

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
  if (session.status === "ended" || session.status === "missed") {
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
      room: { select: { code: true, id: true, name: true } },
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

  if (action === "accept") {
    await prisma.externalChatCallSession.update({
      where: { id: callId },
      data: { status: "active" },
    });
  } else {
    await prisma.externalChatCallParticipant.updateMany({
      where: { callId, leftAt: null },
      data: { leftAt: now, state: "rejected" },
    });
  }

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

  const endedAt = new Date();
  const durationSeconds = Math.max(0, Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000));

  const updated = await prisma.externalChatCallSession.update({
    where: { id: callId },
    data: {
      status: "ended",
      endedBy: actor.id,
      endedAt,
      durationSeconds,
    },
    include: {
      participants: true,
    },
  });

  await prisma.externalChatCallParticipant.updateMany({
    where: { callId, leftAt: null },
    data: { leftAt: endedAt, state: "left" },
  });

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