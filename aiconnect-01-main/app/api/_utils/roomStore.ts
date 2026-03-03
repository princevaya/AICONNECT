// app/api/_utils/roomStore.ts

export type RoomState = {
  hostCreatedAt: Date;
  pending: string[];
  approved: string[];
  rejected: string[];
  settings: {
    autoApprove: boolean;
    isLocked: boolean;
  };
};

type RoomStore = Record<string, RoomState>;

const globalForRooms = globalThis as typeof globalThis & {
  __aiconnectRooms?: RoomStore;
};

export const rooms: RoomStore = globalForRooms.__aiconnectRooms ?? {};
if (!globalForRooms.__aiconnectRooms) {
  globalForRooms.__aiconnectRooms = rooms;
}

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
      settings: {
        autoApprove: false,
        isLocked: false,
      },
    };
  }

  // Backfill settings for rooms created before settings existed.
  if (!rooms[normalizedRoomId].settings) {
    rooms[normalizedRoomId].settings = {
      autoApprove: false,
      isLocked: false,
    };
  }

  return rooms[normalizedRoomId];
}
