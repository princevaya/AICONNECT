import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { prisma as primaryPrisma } from "@/lib/prisma";
import { externalChatPrisma } from "@/lib/external-chat-prisma";
import { AppUser } from "@/services/user.service";

type SyncCandidate = {
  clerkId: string;
  name: string | null;
  email: string | null;
  imageUrl: string | null;
};

let lastDirectorySyncAt = 0;
const DIRECTORY_SYNC_TTL_MS = 15_000;

function formatDisplayName(
  fullName?: string | null,
  firstName?: string | null,
  lastName?: string | null,
  username?: string | null
) {
  const combined =
    fullName?.trim() ||
    `${firstName ?? ""} ${lastName ?? ""}`.trim() ||
    username?.trim() ||
    "";
  return combined || null;
}

async function upsertCandidateIntoExternalChat(candidate: SyncCandidate): Promise<AppUser> {
  const existing = await externalChatPrisma.user.findUnique({
    where: { clerkId: candidate.clerkId },
  });

  if (existing) {
    return externalChatPrisma.user.update({
      where: { clerkId: candidate.clerkId },
      data: {
        name: existing.name || candidate.name,
        email: candidate.email ?? existing.email,
        // Preserve custom imageUrl set inside external chat.
        ...(existing.imageUrl ? {} : { imageUrl: candidate.imageUrl }),
      },
    });
  }

  return externalChatPrisma.user.create({
    data: {
      clerkId: candidate.clerkId,
      name: candidate.name,
      email: candidate.email,
      imageUrl: candidate.imageUrl,
    },
  });
}

export async function ensureExternalChatUser(clerkUserId: string): Promise<AppUser> {
  const clerkProfile = await currentUser();
  if (!clerkProfile || clerkProfile.id !== clerkUserId) {
    throw new Error("Unable to resolve authenticated user profile");
  }

  return upsertCandidateIntoExternalChat({
    clerkId: clerkUserId,
    name: formatDisplayName(
      clerkProfile.fullName,
      clerkProfile.firstName,
      clerkProfile.lastName,
      clerkProfile.username
    ),
    email: clerkProfile.emailAddresses[0]?.emailAddress ?? null,
    imageUrl: clerkProfile.imageUrl ?? null,
  });
}

export async function ensureExternalChatUserByClerkId(clerkUserId: string): Promise<AppUser | null> {
  const trimmed = clerkUserId.trim();
  if (!trimmed) return null;

  const existing = await externalChatPrisma.user.findUnique({
    where: { clerkId: trimmed },
  });
  if (existing) return existing;

  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(trimmed);
    const primaryEmail =
      clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
        ?.emailAddress ||
      clerkUser.emailAddresses[0]?.emailAddress ||
      null;
    return upsertCandidateIntoExternalChat({
      clerkId: clerkUser.id,
      name: formatDisplayName(
        clerkUser.fullName,
        clerkUser.firstName,
        clerkUser.lastName,
        clerkUser.username
      ),
      email: primaryEmail,
      imageUrl: clerkUser.imageUrl ?? null,
    });
  } catch {
    try {
      const localUser = await primaryPrisma.user.findUnique({
        where: { clerkId: trimmed },
        select: { clerkId: true, name: true, email: true, imageUrl: true },
      });
      if (!localUser) return null;
      return upsertCandidateIntoExternalChat(localUser);
    } catch {
      return null;
    }
  }
}

export async function syncLoggedInAppUsersToExternalChat(options?: {
  query?: string;
  force?: boolean;
}) {
  const q = options?.query?.trim() || "";
  const now = Date.now();
  if (!options?.force && !q && now - lastDirectorySyncAt < DIRECTORY_SYNC_TTL_MS) {
    return;
  }

  const candidateMap = new Map<string, SyncCandidate>();

  try {
    const client = await clerkClient();
    const clerkUsers = await client.users.getUserList({
      limit: 100,
      ...(q ? { query: q } : {}),
    });
    for (const u of clerkUsers.data) {
      const primaryEmail =
        u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ||
        u.emailAddresses[0]?.emailAddress ||
        null;
      candidateMap.set(u.id, {
        clerkId: u.id,
        name: formatDisplayName(u.fullName, u.firstName, u.lastName, u.username),
        email: primaryEmail,
        imageUrl: u.imageUrl ?? null,
      });
    }
  } catch {
    // Non-fatal: fall back to primary DB users and already-synced chat users.
  }

  try {
    const primaryUsers = await primaryPrisma.user.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { clerkId: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      select: {
        clerkId: true,
        name: true,
        email: true,
        imageUrl: true,
      },
      take: 100,
    });
    for (const u of primaryUsers) {
      if (!candidateMap.has(u.clerkId)) {
        candidateMap.set(u.clerkId, {
          clerkId: u.clerkId,
          name: u.name,
          email: u.email,
          imageUrl: u.imageUrl,
        });
      }
    }
  } catch {
    // Non-fatal when primary database schema differs or is unreachable.
  }

  const candidates = Array.from(candidateMap.values());
  if (candidates.length === 0) {
    if (!q) lastDirectorySyncAt = now;
    return;
  }

  const existing = await externalChatPrisma.user.findMany({
    where: {
      clerkId: { in: candidates.map((c) => c.clerkId) },
    },
    select: {
      clerkId: true,
      name: true,
      email: true,
      imageUrl: true,
    },
  });

  const existingByClerkId = new Map(existing.map((u) => [u.clerkId, u]));
  const missing = candidates.filter((c) => !existingByClerkId.has(c.clerkId));

  if (missing.length > 0) {
    await externalChatPrisma.user.createMany({
      data: missing.map((c) => ({
        clerkId: c.clerkId,
        name: c.name,
        email: c.email,
        imageUrl: c.imageUrl,
      })),
      skipDuplicates: true,
    });
  }

  const updates = candidates.filter((c) => {
    const cur = existingByClerkId.get(c.clerkId);
    if (!cur) return false;
    return (!cur.name && c.name) || (!cur.email && c.email) || (!cur.imageUrl && c.imageUrl);
  });

  if (updates.length > 0) {
    await Promise.all(
      updates.map((c) => {
        const cur = existingByClerkId.get(c.clerkId)!;
        return externalChatPrisma.user.update({
          where: { clerkId: c.clerkId },
          data: {
            ...(cur.name || !c.name ? {} : { name: c.name }),
            ...(cur.email || !c.email ? {} : { email: c.email }),
            ...(cur.imageUrl || !c.imageUrl ? {} : { imageUrl: c.imageUrl }),
          },
        });
      })
    );
  }

  if (!q) {
    lastDirectorySyncAt = now;
  }
}
