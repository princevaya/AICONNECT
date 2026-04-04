import { prisma } from "@/lib/prisma";
import { externalChatPrisma } from "@/lib/external-chat-prisma";

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
  if (String(process.env.RATE_LIMITING_ENABLED || "true").toLowerCase() === "false") {
    return {
      allowed: true,
      count: 0,
      limit: input.limit,
      resetAt: new Date(Date.now() + input.windowMs),
    };
  }

  const now = Date.now();
  const key = windowKey(input.windowMs, now);
  const client = input.routeKey.startsWith("external-chat:") ? externalChatPrisma : prisma;

  const entry = await client.rateLimitEvent.upsert({
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
