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

export async function ensureLocalUser(clerkUserId: string): Promise<AppUser> {
  const clerkProfile = await currentUser();
  if (!clerkProfile || clerkProfile.id !== clerkUserId) {
    throw new Error("Unable to resolve authenticated user profile");
  }

  const email = clerkProfile.emailAddresses[0]?.emailAddress ?? null;
  const name =
    clerkProfile.fullName ||
    `${clerkProfile.firstName ?? ""} ${clerkProfile.lastName ?? ""}`.trim() ||
    null;

  return prisma.user.upsert({
    where: { clerkId: clerkUserId },
    update: {
      name,
      email,
      imageUrl: clerkProfile.imageUrl ?? null,
    },
    create: {
      clerkId: clerkUserId,
      name,
      email,
      imageUrl: clerkProfile.imageUrl ?? null,
    },
  });
}
