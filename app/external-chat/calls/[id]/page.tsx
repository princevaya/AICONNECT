import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { getCallById } from "@/services/external-chat/calls.service";
import CallRoomClient from "@/components/external-chat/call-room-client";

export const dynamic = "force-dynamic";

export default async function ExternalChatCallPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ video?: string; audio?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/auth/sign-in");
  }
  const user = await ensureExternalChatUser(userId);
  const { id } = await params;
  const query = await searchParams;
  const call = await getCallById(id, user);

  const initialVideo = query.video !== undefined ? query.video === "1" : call.type === "video";
  const initialAudio = query.audio !== undefined ? query.audio !== "0" : true;

  return (
    <CallRoomClient
      call={call}
      participantName={user.name || user.email || "You"}
      initialVideoEnabled={initialVideo}
      initialAudioEnabled={initialAudio}
    />
  );
}
