// services/external-chat/call-signaling.service.ts
// Centralized call signaling for realtime notifications

import { externalChatPrisma as prisma } from "@/lib/external-chat-prisma";
import { AppUser } from "@/services/user.service";

export async function sendCallInvitation(callId: string, caller: AppUser, receiverId: string) {
  // Get the call details
  const call = await prisma.externalChatCallSession.findUnique({
    where: { id: callId },
    include: {
      starter: true,
      room: true,
    },
  });
  
  if (!call) throw new Error("Call not found");
  
  // Create a notification record (optional - for persistence)
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
  const activeCall = await prisma.externalChatCallParticipant.findFirst({
    where: {
      userId,
      state: { in: ["invited", "joined"] },
      call: {
        status: { in: ["ringing", "active"] },
        endedAt: null,
      },
    },
    include: {
      call: {
        include: {
          starter: true,
          room: true,
          participants: {
            include: { user: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  
  return activeCall?.call || null;
}