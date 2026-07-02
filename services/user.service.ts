import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export type AppUser = {
  id: string;
  clerkId: string;
  name: string | null;
  email: string | null;
  imageUrl: string | null;
  role: string;
};

export type AuthProfile = {
  clerkId: string;
  name: string | null;
  email: string | null;
  imageUrl: string | null;
};

function isDatabaseUnavailable(error: unknown) {
  if (!(error instanceof Error)) return false;
  return /ETIMEDOUT|timed out|ECONNREFUSED|ENOTFOUND|Can't reach database|Connection terminated/i.test(
    `${error.message} ${JSON.stringify(error)}`
  );
}

function withDatabaseTimeout<T>(promise: Promise<T>) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Database request timed out")), 5000);
    }),
  ]);
}

export async function getAuthenticatedProfile(clerkUserId: string): Promise<AuthProfile> {
  const clerkProfile = await currentUser();
  if (!clerkProfile || clerkProfile.id !== clerkUserId) {
    throw new Error("Unable to resolve authenticated user profile");
  }

  const email = clerkProfile.emailAddresses[0]?.emailAddress ?? null;
  const name =
    clerkProfile.fullName ||
    `${clerkProfile.firstName ?? ""} ${clerkProfile.lastName ?? ""}`.trim() ||
    null;

  return {
    clerkId: clerkUserId,
    name,
    email,
    imageUrl: clerkProfile.imageUrl ?? null,
  };
}

export async function ensureLocalUser(clerkUserId: string): Promise<AppUser> {
  const profile = await getAuthenticatedProfile(clerkUserId);
  const userId = crypto.randomUUID();

  try {
    const rows = await withDatabaseTimeout(prisma.$queryRaw<AppUser[]>`
      INSERT INTO "users" ("id", "clerkId", "name", "email", "imageUrl", "role", "createdAt", "updatedAt")
      VALUES (${userId}, ${clerkUserId}, ${profile.name}, ${profile.email}, ${profile.imageUrl}, 'user', NOW(), NOW())
      ON CONFLICT ("clerkId") DO UPDATE
      SET
        "name" = EXCLUDED."name",
        "email" = EXCLUDED."email",
        "imageUrl" = EXCLUDED."imageUrl",
        "updatedAt" = NOW()
      RETURNING "id", "clerkId", "name", "email", "imageUrl", "role";
    `);

    return rows[0];
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      throw error;
    }

    console.warn("[users] database unavailable, using local dev user fallback");
    return {
      id: `local-${clerkUserId}`,
      clerkId: clerkUserId,
      name: profile.name,
      email: profile.email,
      imageUrl: profile.imageUrl,
      role: "user",
    };
  }
}
