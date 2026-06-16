// services/external-chat/call-cleanup.service.ts
import { externalChatPrisma as prisma } from "@/lib/external-chat-prisma";
import { AppUser } from "@/services/user.service";

export async function cleanupStaleUserCalls(user: AppUser) {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  
  // Find stale ringing calls where user is either starter or participant
  const staleCalls = await prisma.externalChatCallSession.findMany({
    where: {
      status: "ringing",
      startedAt: { lt: oneMinuteAgo },
      OR: [
        { startedBy: user.id },
        { participants: { some: { userId: user.id, state: "invited" } } }
      ]
    },
    select: { id: true }
  });
  
  // Mark them as missed
  for (const call of staleCalls) {
    await prisma.externalChatCallSession.update({
      where: { id: call.id },
      data: {
        status: "missed",
        endedAt: now,
        durationSeconds: 0
      }
    });
    
    // Update participants
    await prisma.externalChatCallParticipant.updateMany({
      where: { callId: call.id, leftAt: null },
      data: { leftAt: now, state: "missed" }
    });
  }
  
  return staleCalls.length;
}