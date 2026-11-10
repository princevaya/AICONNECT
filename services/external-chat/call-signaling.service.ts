// services/external-chat/call-signaling.service.ts
// Centralized call signaling for realtime notifications

import { externalChatPrisma as prisma } from "@/lib/external-chat-prisma";
import { AppUser } from "@/services/user.service";
import { sweepMissedCalls } from "@/services/external-chat/calls.service";

export async function sendCallInvitation(callId: string, _caller: AppUser, receiverId: string) {
  const call = await prisma.externalChatCallSession.findUnique({
    where: { id: callId },
    include: {
      starter: true,
      room: true,
    },
  });

  if (!call) throw new Error("Call not found");

  await prisma.externalChatCallParticipant.upsert({
    where: { callId_userId: { callId, userId: receiverId } },
    update: { state: "invited" },
    create: { callId, userId: receiverId, state: "invited" },
  });

  return {
    call: {
      id: call.id,
      type: call.type,
      livekitRoomName: call.livekitRoomName,
      startedBy: call.startedBy,
      starter: call.starter,
      roomCode: call.room.code,
    },
  };
}

export async function getActiveCallForUser(userId: string) {
  await sweepMissedCalls();

  const activeInvitation = await prisma.externalChatCallParticipant.findFirst({
    where: {
      userId,
      state: "invited",
      leftAt: null,
      call: {
        status: "ringing",
        endedAt: null,
        startedBy: { not: userId },
      },
    },
    include: {
      call: {
        include: {
          starter: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
          room: { select: { id: true, code: true, name: true, type: true } },
          participants: {
            include: {
              user: { select: { id: true, clerkId: true, name: true, email: true, imageUrl: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!activeInvitation?.call) return null;

  return {
    ...activeInvitation.call,
    roomCode: activeInvitation.call.room.code,
  };
}
