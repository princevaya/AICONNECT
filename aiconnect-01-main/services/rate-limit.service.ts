import { prisma } from "@/lib/prisma";

type LimitInput = {
  routeKey: string;
  subjectKey: string;
  userId?: string | null;
  limit: number;
  windowMs: number;
};

function windowKey(windowMs: number, now: number) {
  return `${windowMs}:${Math.floor(now / windowMs)}`;
}

export async function enforceRateLimit(input: LimitInput) {
  const now = Date.now();
  const key = windowKey(input.windowMs, now);

  const entry = await prisma.rateLimitEvent.upsert({
    where: {
      routeKey_subjectKey_windowKey: {
        routeKey: input.routeKey,
        subjectKey: input.subjectKey,
        windowKey: key,
      },
    },
    update: {
      count: {
        increment: 1,
      },
    },
    create: {
      routeKey: input.routeKey,
      subjectKey: input.subjectKey,
      windowKey: key,
      userId: input.userId || null,
      count: 1,
    },
    select: {
      count: true,
    },
  });

  const allowed = entry.count <= input.limit;
  const resetAt = new Date((Math.floor(now / input.windowMs) + 1) * input.windowMs);

  return {
    allowed,
    count: entry.count,
    limit: input.limit,
    resetAt,
  };
}
