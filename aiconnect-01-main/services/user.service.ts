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

  return prisma.user.upsert({
    where: { clerkId: clerkUserId },
    update: {
      name: profile.name,
      email: profile.email,
      imageUrl: profile.imageUrl,
    },
    create: {
      clerkId: clerkUserId,
      name: profile.name,
      email: profile.email,
      imageUrl: profile.imageUrl,
    },
  });
}
