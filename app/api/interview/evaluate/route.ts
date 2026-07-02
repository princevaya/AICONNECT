import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { evaluateInterviewAnswer, generateFollowUpQuestion } from "@/lib/gemini";
import {
  getInterviewSessionById,
  saveInterviewAnswer,
  saveInterviewQuestionAt,
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

    const body = (await request.json().catch(() => null)) as
      | { sessionId?: string; questionIndex?: number; answer?: string }
      | null;

    if (!body?.sessionId || typeof body.questionIndex !== "number" || !body.answer?.trim()) {
      return NextResponse.json({ error: "Session ID, question index, and answer are required." }, { status: 400 });
    }

    const user = await ensureLocalUser(clerkUserId);
    const session = await getInterviewSessionById(body.sessionId, user.id);

    if (!session) {
      return NextResponse.json({ error: "Interview session not found." }, { status: 404 });
    }

    const question = session.questions[body.questionIndex];
    if (!question) {
      return NextResponse.json({ error: "Question not found for that index." }, { status: 400 });
    }

    const evaluation = await evaluateInterviewAnswer({
      question,
      answer: body.answer.trim(),
      jobRole: session.jobRole,
      resumeText: session.resumeText,
    });

    let updatedSession = await saveInterviewAnswer({
      sessionId: session.id,
      userId: user.id,
      questionIndex: body.questionIndex,
      answer: body.answer.trim(),
      evaluation,
    });

    let nextQuestion: string | null = null;
    const nextQuestionIndex = body.questionIndex + 1;
    const hasNextQuestionSlot = nextQuestionIndex < session.questions.length;

    if (hasNextQuestionSlot) {
      nextQuestion = await generateFollowUpQuestion({
        candidateName: session.candidateName,
        currentQuestion: question,
        answer: body.answer.trim(),
        jobRole: session.jobRole,
        resumeText: session.resumeText,
        askedQuestions: session.questions.slice(0, nextQuestionIndex),
      });

      updatedSession = await saveInterviewQuestionAt({
        sessionId: session.id,
        userId: user.id,
        questionIndex: nextQuestionIndex,
        question: nextQuestion,
      });
    }

    return NextResponse.json({ session: updatedSession, evaluation, nextQuestion });
  } catch (error) {
    console.error("[interview/evaluate] failed", error);
    const message = error instanceof Error ? error.message : "Failed to evaluate interview answer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
