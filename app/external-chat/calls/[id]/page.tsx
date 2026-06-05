import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { getCallById } from "@/services/external-chat/calls.service";
import CallRoomClient from "@/components/external-chat/call-room-client";

export const dynamic = "force-dynamic";

export default async function ExternalChatCallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  const user = await ensureExternalChatUser(userId);
  const { id } = await params;
  const call = await getCallById(id, user);

  return <CallRoomClient call={call} participantName={user.name || user.email || "You"} />;
}
