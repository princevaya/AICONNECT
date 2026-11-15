
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  evaluateInterviewAnswer,
  generateFollowUpQuestion,
} from "@/lib/gemini";
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
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => null)) as
      | {
          sessionId?: string;
          questionIndex?: number;
          answer?: string;
        }
      | null;

    if (
      !body?.sessionId ||
      typeof body.questionIndex !== "number" ||
      !Number.isInteger(body.questionIndex) ||
      body.questionIndex < 0 ||
      !body.answer?.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Session ID, valid question index, and answer are required.",
        },
        { status: 400 }
      );
    }

    const user = await ensureLocalUser(clerkUserId);

    const session = await getInterviewSessionById(
      body.sessionId,
      user.id
    );

    if (!session) {
      return NextResponse.json(
        { error: "Interview session not found." },
        { status: 404 }
      );
    }

    const question = session.questions[body.questionIndex];

    if (!question) {
      return NextResponse.json(
        { error: "Question not found for that index." },
        { status: 400 }
      );
    }

    const answer = body.answer.trim();

    // Step 1: Evaluate the candidate's answer.
    const evaluation = await evaluateInterviewAnswer({
      question,
      answer,
      jobRole: session.jobRole,
      resumeText: session.resumeText,
    });

    // Step 2: Save the candidate's answer and evaluation.
    let updatedSession = await saveInterviewAnswer({
      sessionId: session.id,
      userId: user.id,
      questionIndex: body.questionIndex,
      answer,
      evaluation,
    });

    let nextQuestion: string | null = null;
    let followUpGenerated = false;

    const nextQuestionIndex = body.questionIndex + 1;

    const hasNextQuestionSlot =
      nextQuestionIndex < session.questions.length;

    // Step 3: Only consider a follow-up if another question slot exists.
    if (hasNextQuestionSlot) {
      const originalNextQuestion =
        session.questions[nextQuestionIndex];

      const askedQuestions = session.questions.slice(
        0,
        body.questionIndex + 1
      );

      const followUp = await generateFollowUpQuestion({
        candidateName: session.candidateName,
        currentQuestion: question,
        answer,
        jobRole: session.jobRole,
        resumeText: session.resumeText,
        askedQuestions,
      });

      // Step 4: Replace the next slot only when AI returns a valid follow-up.
      if (followUp) {
        nextQuestion = followUp;
        followUpGenerated = true;

        updatedSession = await saveInterviewQuestionAt({
          sessionId: session.id,
          userId: user.id,
          questionIndex: nextQuestionIndex,
          question: followUp,
        });
      } else {
        // No follow-up needed: preserve the original main question.
        nextQuestion = originalNextQuestion;
      }
    }

    return NextResponse.json({
      session: updatedSession,
      evaluation,
      nextQuestion,
      followUpGenerated,
    });
  } catch (error) {
    console.error("[interview/evaluate] failed", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to evaluate interview answer";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
