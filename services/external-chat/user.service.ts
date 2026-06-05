import { currentUser } from "@clerk/nextjs/server";
import { externalChatPrisma } from "@/lib/external-chat-prisma";
import { AppUser } from "@/services/user.service";

export async function ensureExternalChatUser(clerkUserId: string): Promise<AppUser> {
  try {
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
          name: name || existing.name,
          email: email || existing.email,
          imageUrl: (existing.imageUrl || clerkProfile.imageUrl) ?? null,
        },
      });
    }

    return externalChatPrisma.user.create({
      data: {
        clerkId: clerkUserId,
        name: name || "User",
        email: email || `user-${clerkUserId.slice(0, 8)}@example.com`,
        imageUrl: clerkProfile.imageUrl ?? null,
      },
    });
  } catch (error) {
    console.error("[External Chat User Service]", error);
    // Return a fallback user for development
    return {
      id: "fallback-user",
      clerkId: clerkUserId,
      name: "User",
      email: null,
      imageUrl: null,
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as AppUser;
  }
}