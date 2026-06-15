CREATE TABLE IF NOT EXISTS "interview_sessions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "clerk_user_id" TEXT,
  "candidate_name" TEXT NOT NULL,
  "candidate_email" TEXT NOT NULL,
  "candidate_phone" TEXT NOT NULL,
  "job_role" TEXT NOT NULL,
  "resume_file_url" TEXT,
  "resume_file_name" TEXT,
  "resume_storage_provider" TEXT,
  "resume_text" TEXT NOT NULL DEFAULT '',
  "questions" JSONB NOT NULL DEFAULT '[]',
  "answers" JSONB NOT NULL DEFAULT '[]',
  "evaluations" JSONB NOT NULL DEFAULT '[]',
  "overall_score" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "mic_ready" BOOLEAN NOT NULL DEFAULT false,
  "camera_ready" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "interview_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_interview_sessions_user_id" ON "interview_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_interview_sessions_status" ON "interview_sessions"("status");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'interview_sessions_user_id_fkey'
  ) THEN
    ALTER TABLE "interview_sessions"
      ADD CONSTRAINT "interview_sessions_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
