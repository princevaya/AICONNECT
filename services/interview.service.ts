import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import type {
  CandidateDetailsInput,
  InterviewEvaluation,
  InterviewSession,
} from "@/lib/interview-types";

type SessionRecord = {
  id: string;
  userId: string;
  clerkUserId: string | null;
  candidateId: string;
  status: string;
  resumeFileUrl: string | null;
  resumeFileName: string | null;
  resumeStorageProvider: string | null;
  resumeText: string | null;
  overallScore: number | null;
  micReady: boolean;
  cameraReady: boolean;
  createdAt: Date;
  updatedAt: Date;
  candidate: {
    id: string;
    name: string;
    email: string;
    phone: string;
    jobRole: string;
  };
  questions: Array<{
    id: string;
    questionNumber: number;
    questionText: string;
  }>;
  answers: Array<{
    answerText: string;
    questionId: string;
    score: {
      score: number;
      feedback: string;
    } | null;
  }>;
  report: {
    overallScore: number | null;
    summary: string | null;
    reportText: string | null;
  } | null;
};

const globalForInterviewSessions = globalThis as unknown as {
  aiconnectInterviewSessions?: Map<string, InterviewSession>;
};

const localInterviewSessions =
  globalForInterviewSessions.aiconnectInterviewSessions ?? new Map<string, InterviewSession>();

globalForInterviewSessions.aiconnectInterviewSessions = localInterviewSessions;

function isDatabaseUnavailable(error: unknown) {
  if (!(error instanceof Error)) return false;
  return /ETIMEDOUT|timed out|ECONNREFUSED|ENOTFOUND|Can't reach database|Connection terminated/i.test(
    `${error.message} ${JSON.stringify(error)}`
  );
}

function saveLocalSession(session: InterviewSession) {
  const nextSession = {
    ...session,
    updatedAt: new Date().toISOString(),
  };
  localInterviewSessions.set(nextSession.id, nextSession);
  return nextSession;
}

function getLocalSession(sessionId: string, userId: string) {
  const session = localInterviewSessions.get(sessionId);
  if (!session || session.userId !== userId) return null;
  return session;
}

function sanitizeDatabaseText(value: string) {
  return value
    .replace(/\u0000/g, " ")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeQuestion(value: string) {
  return sanitizeDatabaseText(value).slice(0, 280);
}

function calculateOverallScore(evaluations: InterviewEvaluation[]) {
  if (evaluations.length === 0) return null;
  const total = evaluations.reduce((sum, item) => sum + item.score, 0);
  return Number((total / evaluations.length).toFixed(1));
}

function mapSessionRecord(record: SessionRecord): InterviewSession {
  const orderedQuestions = [...record.questions].sort((left, right) => left.questionNumber - right.questionNumber);
  const answerMap = new Map(record.answers.map((answer) => [answer.questionId, answer]));

  const questions = orderedQuestions.map((question) => question.questionText);
  const answers = orderedQuestions.map((question) => {
    const answer = answerMap.get(question.id);
    return answer?.answerText ?? "";
  });
  const evaluations = orderedQuestions.map((question) => {
    const answer = answerMap.get(question.id);
    if (!answer?.score) {
      return { score: 0, feedback: "" };
    }

    return {
      score: Number(answer.score.score || 0),
      feedback: String(answer.score.feedback || ""),
    };
  });

  return {
    id: record.id,
    userId: record.userId,
    clerkUserId: record.clerkUserId,
    candidateName: record.candidate.name,
    candidateEmail: record.candidate.email,
    candidatePhone: record.candidate.phone,
    jobRole: record.candidate.jobRole,
    resumeFileUrl: record.resumeFileUrl,
    resumeFileName: record.resumeFileName,
    resumeStorageProvider: record.resumeStorageProvider,
    resumeText: record.resumeText || "",
    questions,
    answers,
    evaluations,
    overallScore: record.overallScore ?? calculateOverallScore(evaluations),
    status: record.status,
    micReady: record.micReady,
    cameraReady: record.cameraReady,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

async function loadSessionRecord(sessionId: string, userId: string): Promise<SessionRecord | null> {
  const record = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      candidate: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          jobRole: true,
        },
      },
      questions: {
        orderBy: { questionNumber: "asc" },
        select: {
          id: true,
          questionNumber: true,
          questionText: true,
        },
      },
      answers: {
        include: {
          score: {
            select: {
              score: true,
              feedback: true,
            },
          },
        },
      },
      report: {
        select: {
          overallScore: true,
          summary: true,
          reportText: true,
        },
      },
    },
  });

  if (!record) {
    return null;
  }

  return {
    id: record.id,
    userId: record.userId,
    clerkUserId: record.clerkUserId,
    candidateId: record.candidateId,
    status: record.status,
    resumeFileUrl: record.resumeFileUrl,
    resumeFileName: record.resumeFileName,
    resumeStorageProvider: record.resumeStorageProvider,
    resumeText: record.resumeText,
    overallScore: record.overallScore,
    micReady: record.micReady,
    cameraReady: record.cameraReady,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    candidate: {
      id: record.candidate.id,
      name: record.candidate.name,
      email: record.candidate.email,
      phone: record.candidate.phone,
      jobRole: record.candidate.jobRole,
    },
    questions: record.questions.map((question) => ({
      id: question.id,
      questionNumber: question.questionNumber,
      questionText: question.questionText,
    })),
    answers: record.answers.map((answer) => ({
      answerText: answer.answerText,
      questionId: answer.questionId,
      score: answer.score
        ? {
            score: answer.score.score,
            feedback: answer.score.feedback,
          }
        : null,
    })),
    report: record.report
      ? {
          overallScore: record.report.overallScore,
          summary: record.report.summary,
          reportText: record.report.reportText,
        }
      : null,
  };
}

function createLocalSession(input: CandidateDetailsInput, id: string, userId: string, clerkUserId: string): InterviewSession {
  const now = new Date().toISOString();

  return {
    id,
    userId,
    clerkUserId,
    candidateName: input.name,
    candidateEmail: input.email,
    candidatePhone: input.phone,
    jobRole: input.jobRole,
    resumeFileUrl: null,
    resumeFileName: null,
    resumeStorageProvider: null,
    resumeText: "",
    questions: [],
    answers: [],
    evaluations: [],
    overallScore: null,
    status: "draft",
    micReady: false,
    cameraReady: false,
    createdAt: now,
    updatedAt: now,
  };
}

export async function createInterviewSession(input: {
  userId: string;
  clerkUserId: string;
  details: CandidateDetailsInput;
}) {
  const id = crypto.randomUUID();

  if (input.userId.startsWith("local-")) {
    const session = createLocalSession(input.details, id, input.userId, input.clerkUserId);
    localInterviewSessions.set(session.id, session);
    return session;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const candidate = await tx.candidate.create({
        data: {
          userId: input.userId,
          clerkUserId: input.clerkUserId,
          name: input.details.name,
          email: input.details.email,
          phone: input.details.phone,
          jobRole: input.details.jobRole,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          jobRole: true,
        },
      });

      const session = await tx.interviewSession.create({
        data: {
          id,
          userId: input.userId,
          clerkUserId: input.clerkUserId,
          candidateId: candidate.id,
          status: "draft",
        },
        select: {
          id: true,
          userId: true,
          clerkUserId: true,
          candidateId: true,
          status: true,
          resumeFileUrl: true,
          resumeFileName: true,
          resumeStorageProvider: true,
          resumeText: true,
          overallScore: true,
          micReady: true,
          cameraReady: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        session,
        candidate,
      };
    });

    return mapSessionRecord({
      id: result.session.id,
      userId: result.session.userId,
      clerkUserId: result.session.clerkUserId,
      candidateId: result.session.candidateId,
      status: result.session.status,
      resumeFileUrl: result.session.resumeFileUrl,
      resumeFileName: result.session.resumeFileName,
      resumeStorageProvider: result.session.resumeStorageProvider,
      resumeText: result.session.resumeText,
      overallScore: result.session.overallScore,
      micReady: result.session.micReady,
      cameraReady: result.session.cameraReady,
      createdAt: result.session.createdAt,
      updatedAt: result.session.updatedAt,
      candidate: {
        id: result.candidate.id,
        name: result.candidate.name,
        email: result.candidate.email,
        phone: result.candidate.phone,
        jobRole: result.candidate.jobRole,
      },
      questions: [],
      answers: [],
      report: null,
    });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      throw error;
    }

    console.warn("[interview] database unavailable, using local dev session fallback");
    const session = createLocalSession(input.details, id, input.userId, input.clerkUserId);
    localInterviewSessions.set(session.id, session);
    return session;
  }
}

export async function getInterviewSessionById(sessionId: string, userId: string) {
  const localSession = getLocalSession(sessionId, userId);
  if (localSession) return localSession;

  try {
    const record = await loadSessionRecord(sessionId, userId);
    return record ? mapSessionRecord(record) : null;
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      throw error;
    }
    console.warn("[interview] database unavailable while loading session");
    return null;
  }
}

export async function updateInterviewReadiness(input: {
  sessionId: string;
  userId: string;
  micReady?: boolean;
  cameraReady?: boolean;
  status?: string;
}) {
  const session = await getInterviewSessionById(input.sessionId, input.userId);
  if (!session) {
    throw new Error("Interview session not found.");
  }

  if (localInterviewSessions.has(input.sessionId)) {
    return saveLocalSession({
      ...session,
      micReady: input.micReady ?? session.micReady,
      cameraReady: input.cameraReady ?? session.cameraReady,
      status: input.status ?? session.status,
    });
  }

  const data: {
    micReady?: boolean;
    cameraReady?: boolean;
    status?: string;
  } = {};

  if (typeof input.micReady === "boolean") {
    data.micReady = input.micReady;
  }
  if (typeof input.cameraReady === "boolean") {
    data.cameraReady = input.cameraReady;
  }
  if (input.status) {
    data.status = input.status;
  }

  const updated = await prisma.interviewSession.update({
    where: { id: input.sessionId, userId: input.userId },
    data,
  });

  const record = await loadSessionRecord(updated.id, input.userId);
  if (!record) {
    throw new Error("Interview session not found.");
  }

  return mapSessionRecord(record);
}

export async function saveResumeDetails(input: {
  sessionId: string;
  userId: string;
  resumeText: string;
  resumeFileName: string;
  resumeFileUrl: string;
  resumeStorageProvider: string;
}) {
  const sanitizedResumeText = sanitizeDatabaseText(input.resumeText);

  if (!sanitizedResumeText) {
    throw new Error("Resume text could not be normalized for storage.");
  }

  const localSession = getLocalSession(input.sessionId, input.userId);
  if (localSession) {
    return saveLocalSession({
      ...localSession,
      resumeText: sanitizedResumeText,
      resumeFileName: input.resumeFileName,
      resumeFileUrl: input.resumeFileUrl,
      resumeStorageProvider: input.resumeStorageProvider,
      status: "resume_uploaded",
    });
  }

  const updated = await prisma.interviewSession.update({
    where: { id: input.sessionId, userId: input.userId },
    data: {
      resumeText: sanitizedResumeText,
      resumeFileName: input.resumeFileName,
      resumeFileUrl: input.resumeFileUrl,
      resumeStorageProvider: input.resumeStorageProvider,
      status: "resume_uploaded",
    },
  });

  const record = await loadSessionRecord(updated.id, input.userId);
  if (!record) {
    throw new Error("Interview session not found.");
  }

  return mapSessionRecord(record);
}

export async function saveInterviewQuestions(input: {
  sessionId: string;
  userId: string;
  questions: string[];
}) {
  const sanitizedQuestions = input.questions.map(sanitizeQuestion).filter(Boolean);
  const localSession = getLocalSession(input.sessionId, input.userId);
  if (localSession) {
    return saveLocalSession({
      ...localSession,
      questions: sanitizedQuestions,
      status: "questions_ready",
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.interviewQuestion.deleteMany({ where: { sessionId: input.sessionId } });
    await tx.interviewQuestion.createMany({
      data: sanitizedQuestions.map((question, index) => ({
        sessionId: input.sessionId,
        questionNumber: index,
        questionText: question,
      })),
    });
    await tx.interviewSession.update({
      where: { id: input.sessionId, userId: input.userId },
      data: { status: "questions_ready" },
    });
  });

  const record = await loadSessionRecord(input.sessionId, input.userId);
  if (!record) {
    throw new Error("Interview session not found.");
  }

  return mapSessionRecord(record);
}

export async function saveInterviewQuestionAt(input: {
  sessionId: string;
  userId: string;
  questionIndex: number;
  question: string;
}) {
  const session = await getInterviewSessionById(input.sessionId, input.userId);

  if (!session) {
    throw new Error("Interview session not found.");
  }

  if (input.questionIndex < 0) {
    throw new Error("Question index must be zero or greater.");
  }

  const sanitizedQuestion = sanitizeQuestion(input.question);

  if (localInterviewSessions.has(input.sessionId)) {
    const questions = [...session.questions];
    questions[input.questionIndex] = sanitizedQuestion;
    return saveLocalSession({
      ...session,
      questions,
    });
  }

  await prisma.interviewQuestion.upsert({
    where: {
      sessionId_questionNumber: {
        sessionId: input.sessionId,
        questionNumber: input.questionIndex,
      },
    },
    update: { questionText: sanitizedQuestion },
    create: {
      sessionId: input.sessionId,
      questionNumber: input.questionIndex,
      questionText: sanitizedQuestion,
    },
  });

  const record = await loadSessionRecord(input.sessionId, input.userId);
  if (!record) {
    throw new Error("Interview session not found.");
  }

  return mapSessionRecord(record);
}

export async function saveInterviewAnswer(input: {
  sessionId: string;
  userId: string;
  questionIndex: number;
  answer: string;
  evaluation: InterviewEvaluation;
}) {
  const session = await getInterviewSessionById(input.sessionId, input.userId);

  if (!session) {
    throw new Error("Interview session not found.");
  }

  if (localInterviewSessions.has(input.sessionId)) {
    const answers = [...session.answers];
    const evaluations = [...session.evaluations];

    answers[input.questionIndex] = input.answer;
    evaluations[input.questionIndex] = input.evaluation;

    const overallScore = calculateOverallScore(evaluations);
    const answeredCount = evaluations.filter((item) => typeof item?.score === "number").length;
    const isComplete = answeredCount >= session.questions.length && session.questions.length > 0;
    const status = isComplete ? "completed" : "interview_in_progress";

    return saveLocalSession({
      ...session,
      answers,
      evaluations,
      overallScore,
      status,
    });
  }

  const updatedSession = await prisma.$transaction(async (tx) => {
    const question = await tx.interviewQuestion.findFirst({
      where: {
        sessionId: input.sessionId,
        questionNumber: input.questionIndex,
      },
      select: { id: true },
    });

    if (!question) {
      throw new Error("Question not found for that index.");
    }

    const answer = await tx.interviewAnswer.upsert({
      where: { questionId: question.id },
      update: {
        answerText: input.answer,
      },
      create: {
        sessionId: input.sessionId,
        questionId: question.id,
        answerText: input.answer,
      },
      select: { id: true },
    });

    await tx.interviewScore.upsert({
      where: { answerId: answer.id },
      update: {
        score: input.evaluation.score,
        feedback: input.evaluation.feedback,
      },
      create: {
        answerId: answer.id,
        score: input.evaluation.score,
        feedback: input.evaluation.feedback,
      },
    });

    const questionRows = await tx.interviewQuestion.findMany({
      where: { sessionId: input.sessionId },
      orderBy: { questionNumber: "asc" },
      select: { id: true, questionNumber: true, questionText: true },
    });
    const answerRows = await tx.interviewAnswer.findMany({
      where: { sessionId: input.sessionId },
      include: { score: { select: { score: true, feedback: true } } },
    });

    const evaluations = questionRows.map((questionRow) => {
      const answerRow = answerRows.find((row) => row.questionId === questionRow.id);
      if (!answerRow?.score) {
        return { score: 0, feedback: "" };
      }

      return {
        score: Number(answerRow.score.score || 0),
        feedback: String(answerRow.score.feedback || ""),
      };
    });

    const overallScore = calculateOverallScore(evaluations);
    const answeredCount = evaluations.filter((item) => typeof item?.score === "number").length;
    const isComplete = answeredCount >= questionRows.length && questionRows.length > 0;
    const status = isComplete ? "completed" : "interview_in_progress";

    await tx.interviewSession.update({
      where: { id: input.sessionId, userId: input.userId },
      data: {
        overallScore,
        status,
      },
    });

    const summary = `Completed ${answeredCount} of ${questionRows.length} interview responses.`;
    await tx.interviewReport.upsert({
      where: { sessionId: input.sessionId },
      update: {
        overallScore,
        summary,
        reportText: summary,
      },
      create: {
        sessionId: input.sessionId,
        overallScore,
        summary,
        reportText: summary,
      },
    });

    return { questionRows, answerRows };
  });

  const record = await loadSessionRecord(input.sessionId, input.userId);
  if (!record) {
    throw new Error("Interview session not found.");
  }

  return mapSessionRecord(record);
}

export async function saveResumeFile(input: {
  fileName: string;
  buffer: Buffer;
  contentType: string;
}) {
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "interviews");
  await mkdir(uploadsDir, { recursive: true });
  const sanitizedFileName = `${Date.now()}-${input.fileName.replace(/[^a-zA-Z0-9.-]/g, "-")}`;
  await writeFile(path.join(uploadsDir, sanitizedFileName), input.buffer);

  return {
    fileUrl: `/uploads/interviews/${sanitizedFileName}`,
    provider: "local",
  };
}
