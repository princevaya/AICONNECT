import { currentUser } from "@clerk/nextjs/server";
import { externalChatPrisma } from "@/lib/external-chat-prisma";
import { AppUser } from "@/services/user.service";

export async function ensureExternalChatUser(clerkUserId: string): Promise<AppUser> {
  const clerkProfile = await currentUser();
  if (!clerkProfile || clerkProfile.id !== clerkUserId) {
    throw new Error("Unable to resolve authenticated user profile");
  }

  const email = clerkProfile.emailAddresses[0]?.emailAddress ?? null;
  const name =
    clerkProfile.fullName ||
    `${clerkProfile.firstName ?? ""} ${clerkProfile.lastName ?? ""}`.trim() ||
    null;

  const existing = await externalChatPrisma.user.findUnique({
    where: { clerkId: clerkUserId },
  });

  if (existing) {
    return externalChatPrisma.user.update({
      where: { clerkId: clerkUserId },
      data: {
        name,
        email,
        // Preserve custom imageUrl set inside external chat.
        ...(existing.imageUrl ? {} : { imageUrl: clerkProfile.imageUrl ?? null }),
      },
    });
  }

  return externalChatPrisma.user.create({
    data: {
      clerkId: clerkUserId,
      name,
      email,
      imageUrl: clerkProfile.imageUrl ?? null,
    },
  });
}
