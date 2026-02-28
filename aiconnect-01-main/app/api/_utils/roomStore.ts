// app/api/_utils/roomStore.ts

export const rooms: Record<
  string,
  {
    hostCreatedAt: Date;
    pending: string[];
    approved: string[];
  }
> = {};