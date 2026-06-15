import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import InterviewReport from "@/components/interview/interview-report";
import { getInterviewSessionById } from "@/services/interview.service";
import { ensureLocalUser } from "@/services/user.service";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ sessionId: string }>;
};

export default async function InterviewReportPage({ params }: Props) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    redirect("/auth/sign-in");
  }

  const user = await ensureLocalUser(clerkUserId);
  const { sessionId } = await params;
  const session = await getInterviewSessionById(sessionId, user.id);

  if (!session) {
    notFound();
  }

  return <InterviewReport session={session} />;
}
