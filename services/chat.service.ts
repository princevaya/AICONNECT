import { ParticipantRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSignedDownloadUrl } from "@/services/chat-file.service";
import { AppUser } from "@/services/user.service";

type MessageFile = {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  downloadUrl: string;
};

export type ChatMessageItem = {
  id: string;
  roomId: string;
  content: string;
  createdAt: Date;
  sender: {
    id: string;
    clerkId: string;
    name: string | null;
    email: string | null;
  };
  file: MessageFile | null;
};

export type ParticipantItem = {
  id: string;
  userId: string;
  joinedAt: Date;
  leftAt: Date | null;
  role: ParticipantRole;
  micStatus: boolean;
  cameraStatus: boolean;
  removedAt: Date | null;
  user: {
    id: string;
    clerkId: string;
    name: string | null;
    email: string | null;
    imageUrl: string | null;
  };
};

export async function ensureChatRoom(input: {
  roomCode: string;
  title?: string;
  createdBy: AppUser;
}) {
  const { roomCode, title, createdBy } = input;
  return prisma.chatRoom.upsert({
    where: { code: roomCode },
    update: {},
    create: {
      code: roomCode,
      title: title ?? `Room ${roomCode}`,
      createdById: createdBy.id,
    },
  });
}

export async function upsertParticipant(input: {
  roomCode: string;
  user: AppUser;
  micStatus?: boolean;
  cameraStatus?: boolean;
}) {
  const { roomCode, user, micStatus = true, cameraStatus = true } = input;
  const room = await ensureChatRoom({ roomCode, createdBy: user });

  const hostExists = await prisma.participant.findFirst({
    where: { roomId: room.id, role: "host", removedAt: null },
    select: { id: true },
  });

  return prisma.participant.upsert({
    where: {
      roomId_userId: {
        roomId: room.id,
        userId: user.id,
      },
    },
    update: {
      leftAt: null,
      removedAt: null,
      micStatus,
      cameraStatus,
    },
    create: {
      roomId: room.id,
      userId: user.id,
      role: hostExists ? "participant" : "host",
      micStatus,
      cameraStatus,
    },
  });
}

export async function leaveParticipant(input: { roomCode: string; user: AppUser }) {
  const room = await prisma.chatRoom.findUnique({
    where: { code: input.roomCode },
    select: { id: true },
  });
  if (!room) return;

  await prisma.participant.updateMany({
    where: { roomId: room.id, userId: input.user.id, leftAt: null },
    data: { leftAt: new Date() },
  });
}

export async function listParticipants(input: { roomCode: string; requester: AppUser }) {
  const room = await prisma.chatRoom.findUnique({
    where: { code: input.roomCode },
    include: {
      participants: {
        where: { removedAt: null },
        include: {
          user: {
            select: {
              id: true,
              clerkId: true,
              name: true,
              email: true,
              imageUrl: true,
            },
          },
        },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      },
    },
  });

  if (!room) {
    return { roomId: "", participants: [] as ParticipantItem[], isHost: false };
  }

  const requesterParticipant = room.participants.find(
    (participant) => participant.userId === input.requester.id
  );
  const isHost = requesterParticipant?.role === "host" && requesterParticipant.leftAt === null;

  return {
    roomId: room.id,
    participants: room.participants,
    isHost,
  };
}

export async function removeParticipantByHost(input: {
  roomCode: string;
  host: AppUser;
  participantId: string;
}) {
  const room = await prisma.chatRoom.findUnique({
    where: { code: input.roomCode },
    include: {
      participants: {
        where: { removedAt: null },
        select: { id: true, userId: true, role: true, leftAt: true },
      },
    },
  });
  if (!room) throw new Error("Room not found");

  const hostRecord = room.participants.find((p) => p.userId === input.host.id);
  if (!hostRecord || hostRecord.role !== "host" || hostRecord.leftAt !== null) {
    throw new Error("Only active host can remove participants");
  }

  const target = room.participants.find((p) => p.id === input.participantId);
  if (!target) throw new Error("Participant not found");
  if (target.role === "host") throw new Error("Host cannot remove another host");

  await prisma.participant.update({
    where: { id: target.id },
    data: {
      removedAt: new Date(),
      leftAt: new Date(),
    },
  });
}

export async function createMessage(input: {
  roomCode: string;
  sender: AppUser;
  content: string;
  fileId?: string;
}) {
  const { roomCode, sender, content, fileId } = input;
  if (!content.trim() && !fileId) {
    throw new Error("Message cannot be empty");
  }

  const room = await ensureChatRoom({ roomCode, createdBy: sender });
  await upsertParticipant({ roomCode, user: sender });

  if (fileId) {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: { id: true, roomId: true, uploadedBy: true },
    });
    if (!file) throw new Error("Attached file not found");
    if (file.roomId !== room.id || file.uploadedBy !== sender.id) {
      throw new Error("File is not valid for this room");
    }
  }

  return prisma.chatMessage.create({
    data: {
      roomId: room.id,
      senderId: sender.id,
      content: content.trim(),
      fileId: fileId || null,
    },
  });
}

export async function listMessages(input: { roomCode: string; viewer: AppUser }) {
  const room = await prisma.chatRoom.findUnique({
    where: { code: input.roomCode },
    select: { id: true },
  });
  if (!room) return [] as ChatMessageItem[];

  await upsertParticipant({ roomCode: input.roomCode, user: input.viewer });

  const messages = await prisma.chatMessage.findMany({
    where: {
      roomId: room.id,
      deletedAt: null,
    },
    include: {
      sender: {
        select: { id: true, clerkId: true, name: true, email: true },
      },
      file: {
        select: {
          id: true,
          name: true,
          fileType: true,
          fileSize: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  return messages.map((message) => ({
    id: message.id,
    roomId: message.roomId,
    content: message.content,
    createdAt: message.createdAt,
    sender: message.sender,
    file: message.file
      ? {
          id: message.file.id,
          name: message.file.name,
          fileType: message.file.fileType,
          fileSize: Number(message.file.fileSize),
          downloadUrl: createSignedDownloadUrl(message.file.id, input.viewer.id),
        }
      : null,
  }));
}

export async function deleteMessage(input: { messageId: string; requester: AppUser }) {
  const message = await prisma.chatMessage.findUnique({
    where: { id: input.messageId },
    include: {
      room: {
        include: {
          participants: {
            where: {
              userId: input.requester.id,
              leftAt: null,
              removedAt: null,
            },
            select: { role: true },
          },
        },
      },
    },
  });

  if (!message || message.deletedAt) {
    throw new Error("Message not found");
  }

  const isOwner = message.senderId === input.requester.id;
  const requesterParticipant = message.room.participants[0];
  const isHost = requesterParticipant?.role === "host";
  const isAdmin = input.requester.role.toLowerCase() === "admin";

  if (!isOwner && !isHost && !isAdmin) {
    throw new Error("Not allowed to delete this message");
  }

  await prisma.chatMessage.update({
    where: { id: message.id },
    data: { deletedAt: new Date() },
  });
}
