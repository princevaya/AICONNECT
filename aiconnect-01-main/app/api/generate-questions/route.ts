import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { generateInterviewQuestions } from "@/lib/gemini";
import {
  getInterviewSessionById,
  saveInterviewQuestions,
} from "@/services/interview.service";
import { ensureLocalUser } from "@/services/user.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as { sessionId?: string } | null;
    if (!body?.sessionId) {
      return NextResponse.json({ error: "Session ID is required." }, { status: 400 });
    }

    const user = await ensureLocalUser(clerkUserId);
    const session = await getInterviewSessionById(body.sessionId, user.id);

    if (!session) {
      return NextResponse.json({ error: "Interview session not found." }, { status: 404 });
    }

    if (!session.resumeText.trim()) {
      return NextResponse.json({ error: "Upload a resume before generating questions." }, { status: 400 });
    }

    const questions = await generateInterviewQuestions({
      candidateName: session.candidateName,
      jobRole: session.jobRole,
      resumeText: session.resumeText,
    });

    const updatedSession = await saveInterviewQuestions({
      sessionId: session.id,
      userId: user.id,
      questions,
    });

    return NextResponse.json({ session: updatedSession, questions });
  } catch (error) {
    console.error("[generate-questions] failed", error);
    const message = error instanceof Error ? error.message : "Failed to generate interview questions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
