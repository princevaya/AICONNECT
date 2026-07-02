import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import type {
  CandidateDetailsInput,
  InterviewEvaluation,
  InterviewSession,
} from "@/lib/interview-types";

type SessionRow = {
  id: string;
  user_id: string | null;
  clerk_user_id: string | null;
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string;
  job_role: string;
  resume_file_url: string | null;
  resume_file_name: string | null;
  resume_storage_provider: string | null;
  resume_text: string | null;
  questions: unknown;
  answers: unknown;
  evaluations: unknown;
  overall_score: number | null;
  status: string;
  mic_ready: boolean;
  camera_ready: boolean;
  created_at: Date;
  updated_at: Date;
};

const globalForInterviewSessions = globalThis as unknown as {
  aiconnectInterviewSessions?: Map<string, InterviewSession>;
};

const localInterviewSessions =
  globalForInterviewSessions.aiconnectInterviewSessions ?? new Map<string, InterviewSession>();

globalForInterviewSessions.aiconnectInterviewSessions = localInterviewSessions;

let ensureTablesPromise: Promise<void> | null = null;

function isDatabaseUnavailable(error: unknown) {
  if (!(error instanceof Error)) return false;
  return /ETIMEDOUT|timed out|ECONNREFUSED|ENOTFOUND|Can't reach database|Connection terminated/i.test(
    `${error.message} ${JSON.stringify(error)}`
  );
}

function withDatabaseTimeout<T>(promise: Promise<T>) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Database request timed out")), 5000);
    }),
  ]);
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

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item));
}

function normalizeEvaluations(value: unknown): InterviewEvaluation[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const candidate = item as Partial<InterviewEvaluation>;
    return {
      score: Number(candidate.score || 0),
      feedback: String(candidate.feedback || ""),
    };
  });
}

function mapSession(row: SessionRow): InterviewSession {
  return {
    id: row.id,
    userId: row.user_id,
    clerkUserId: row.clerk_user_id,
    candidateName: row.candidate_name,
    candidateEmail: row.candidate_email,
    candidatePhone: row.candidate_phone,
    jobRole: row.job_role,
    resumeFileUrl: row.resume_file_url,
    resumeFileName: row.resume_file_name,
    resumeStorageProvider: row.resume_storage_provider,
    resumeText: row.resume_text || "",
    questions: normalizeStringArray(row.questions),
    answers: normalizeStringArray(row.answers),
    evaluations: normalizeEvaluations(row.evaluations),
    overallScore: row.overall_score,
    status: row.status,
    micReady: row.mic_ready,
    cameraReady: row.camera_ready,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function ensureInterviewTables() {
  if (!ensureTablesPromise) {
    ensureTablesPromise = prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS interview_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        clerk_user_id TEXT,
        candidate_name TEXT NOT NULL,
        candidate_email TEXT NOT NULL,
        candidate_phone TEXT NOT NULL,
        job_role TEXT NOT NULL,
        resume_file_url TEXT,
        resume_file_name TEXT,
        resume_storage_provider TEXT,
        resume_text TEXT DEFAULT '',
        questions JSONB NOT NULL DEFAULT '[]'::jsonb,
        answers JSONB NOT NULL DEFAULT '[]'::jsonb,
        evaluations JSONB NOT NULL DEFAULT '[]'::jsonb,
        overall_score DOUBLE PRECISION,
        status TEXT NOT NULL DEFAULT 'draft',
        mic_ready BOOLEAN NOT NULL DEFAULT false,
        camera_ready BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON interview_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_interview_sessions_status ON interview_sessions(status);
    `).then(() => undefined);
  }

  await ensureTablesPromise;
}

function calculateOverallScore(evaluations: InterviewEvaluation[]) {
  if (evaluations.length === 0) return null;
  const total = evaluations.reduce((sum, item) => sum + item.score, 0);
  return Number((total / evaluations.length).toFixed(1));
}

export async function createInterviewSession(input: {
  userId: string;
  clerkUserId: string;
  details: CandidateDetailsInput;
}) {
  const id = crypto.randomUUID();

  if (input.userId.startsWith("local-")) {
    const now = new Date().toISOString();
    const session: InterviewSession = {
      id,
      userId: input.userId,
      clerkUserId: input.clerkUserId,
      candidateName: input.details.name,
      candidateEmail: input.details.email,
      candidatePhone: input.details.phone,
      jobRole: input.details.jobRole,
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
    localInterviewSessions.set(session.id, session);
    return session;
  }

  try {
    await withDatabaseTimeout(ensureInterviewTables());

    const rows = await withDatabaseTimeout(prisma.$queryRawUnsafe<SessionRow[]>(
      `
        INSERT INTO interview_sessions (
          id, user_id, clerk_user_id, candidate_name, candidate_email, candidate_phone, job_role
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `,
      id,
      input.userId,
      input.clerkUserId,
      input.details.name,
      input.details.email,
      input.details.phone,
      input.details.jobRole
    ));

    return mapSession(rows[0]);
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      throw error;
    }

    console.warn("[interview] database unavailable, using local dev session fallback");
    const now = new Date().toISOString();
    const session: InterviewSession = {
      id,
      userId: input.userId,
      clerkUserId: input.clerkUserId,
      candidateName: input.details.name,
      candidateEmail: input.details.email,
      candidatePhone: input.details.phone,
      jobRole: input.details.jobRole,
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
    localInterviewSessions.set(session.id, session);
    return session;
  }
}

export async function getInterviewSessionById(sessionId: string, userId: string) {
  const localSession = getLocalSession(sessionId, userId);
  if (localSession) return localSession;

  try {
    await withDatabaseTimeout(ensureInterviewTables());
    const rows = await withDatabaseTimeout(prisma.$queryRawUnsafe<SessionRow[]>(
      `SELECT * FROM interview_sessions WHERE id = $1 AND user_id = $2 LIMIT 1;`,
      sessionId,
      userId
    ));
    return rows[0] ? mapSession(rows[0]) : null;
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

  const rows = await prisma.$queryRawUnsafe<SessionRow[]>(
    `
      UPDATE interview_sessions
      SET
        mic_ready = COALESCE($3, mic_ready),
        camera_ready = COALESCE($4, camera_ready),
        status = COALESCE($5, status),
        updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *;
    `,
    input.sessionId,
    input.userId,
    input.micReady,
    input.cameraReady,
    input.status
  );

  return mapSession(rows[0]);
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

  await ensureInterviewTables();

  const rows = await prisma.$queryRawUnsafe<SessionRow[]>(
    `
      UPDATE interview_sessions
      SET
        resume_text = $3,
        resume_file_name = $4,
        resume_file_url = $5,
        resume_storage_provider = $6,
        status = 'resume_uploaded',
        updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *;
    `,
    input.sessionId,
    input.userId,
    sanitizedResumeText,
    input.resumeFileName,
    input.resumeFileUrl,
    input.resumeStorageProvider
  );

  if (!rows[0]) {
    throw new Error("Interview session not found.");
  }

  return mapSession(rows[0]);
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

  await ensureInterviewTables();

  const rows = await prisma.$queryRawUnsafe<SessionRow[]>(
    `
      UPDATE interview_sessions
      SET
        questions = $3::jsonb,
        status = 'questions_ready',
        updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *;
    `,
    input.sessionId,
    input.userId,
    JSON.stringify(sanitizedQuestions)
  );

  if (!rows[0]) {
    throw new Error("Interview session not found.");
  }

  return mapSession(rows[0]);
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

  const questions = [...session.questions];
  questions[input.questionIndex] = sanitizeQuestion(input.question);

  if (localInterviewSessions.has(input.sessionId)) {
    return saveLocalSession({
      ...session,
      questions,
    });
  }

  const rows = await prisma.$queryRawUnsafe<SessionRow[]>(
    `
      UPDATE interview_sessions
      SET
        questions = $3::jsonb,
        updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *;
    `,
    input.sessionId,
    input.userId,
    JSON.stringify(questions)
  );

  return mapSession(rows[0]);
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

  const answers = [...session.answers];
  const evaluations = [...session.evaluations];

  answers[input.questionIndex] = input.answer;
  evaluations[input.questionIndex] = input.evaluation;

  const overallScore = calculateOverallScore(evaluations);
  const answeredCount = evaluations.filter((item) => typeof item?.score === "number").length;
  const isComplete = answeredCount >= session.questions.length && session.questions.length > 0;
  const status = isComplete ? "completed" : "interview_in_progress";

  if (localInterviewSessions.has(input.sessionId)) {
    return saveLocalSession({
      ...session,
      answers,
      evaluations,
      overallScore,
      status,
    });
  }

  const rows = await prisma.$queryRawUnsafe<SessionRow[]>(
    `
      UPDATE interview_sessions
      SET
        answers = $3::jsonb,
        evaluations = $4::jsonb,
        overall_score = $5,
        status = $6,
        updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *;
    `,
    input.sessionId,
    input.userId,
    JSON.stringify(answers),
    JSON.stringify(evaluations),
    overallScore,
    status
  );

  return mapSession(rows[0]);
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
