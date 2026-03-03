// app/api/_utils/roomStore.ts

export const rooms: Record<
  string,
  {
    hostCreatedAt: Date;
    pending: string[];
    approved: string[];
    rejected: string[];
  }
> = {};

export function normalizeRoomId(roomId: string) {
  return roomId.trim();
}

export function normalizeParticipantName(name: string) {
  return name.trim();
}

export function ensureRoom(roomId: string) {
  const normalizedRoomId = normalizeRoomId(roomId);

  if (!rooms[normalizedRoomId]) {
    rooms[normalizedRoomId] = {
      hostCreatedAt: new Date(),
      pending: [],
      approved: [],
      rejected: [],
    };
  }
  return rooms[normalizedRoomId];
}
