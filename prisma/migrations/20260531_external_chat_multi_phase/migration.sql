-- Extend existing external chat message types.
ALTER TYPE "ExternalChatMessageType" ADD VALUE IF NOT EXISTS 'system';
ALTER TYPE "ExternalChatMessageType" ADD VALUE IF NOT EXISTS 'voice';

-- Create new enums.
DO $$ BEGIN
  CREATE TYPE "ExternalChatCallType" AS ENUM ('audio', 'video');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ExternalChatCallStatus" AS ENUM ('ringing', 'active', 'ended', 'missed', 'declined');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ExternalChatStatusVisibility" AS ENUM ('public', 'contacts', 'selected', 'private');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ExternalChatUploadSessionStatus" AS ENUM ('initiated', 'uploading', 'completed', 'aborted', 'expired', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ExternalChatTranscriptionStatus" AS ENUM ('queued', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "external_chat_statuses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "attachment_id" TEXT,
    "text" TEXT,
    "visibility" "ExternalChatStatusVisibility" NOT NULL DEFAULT 'public',
    "allowed_user_ids" JSONB,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_chat_statuses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "external_chat_status_views" (
    "id" TEXT NOT NULL,
    "status_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_chat_status_views_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "external_chat_call_sessions" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "started_by" TEXT NOT NULL,
    "ended_by" TEXT,
    "type" "ExternalChatCallType" NOT NULL,
    "status" "ExternalChatCallStatus" NOT NULL DEFAULT 'ringing',
    "livekit_room_name" TEXT NOT NULL,
    "metadata" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_chat_call_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "external_chat_call_participants" (
    "id" TEXT NOT NULL,
    "call_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'invited',
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "camera_on" BOOLEAN NOT NULL DEFAULT true,
    "audio_on" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMP(3),
    "left_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_chat_call_participants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "external_chat_upload_sessions" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "uploader_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "total_size_bytes" BIGINT NOT NULL,
    "chunk_size_bytes" INTEGER NOT NULL,
    "total_chunks" INTEGER NOT NULL,
    "storage_provider" TEXT NOT NULL DEFAULT 's3',
    "storage_key" TEXT NOT NULL,
    "multipart_upload_id" TEXT,
    "status" "ExternalChatUploadSessionStatus" NOT NULL DEFAULT 'initiated',
    "checksum" TEXT,
    "expires_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_chat_upload_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "external_chat_upload_chunks" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "part_number" INTEGER NOT NULL,
    "storage_key" TEXT,
    "checksum" TEXT,
    "size_bytes" BIGINT,
    "uploaded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_chat_upload_chunks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "external_chat_transcription_jobs" (
    "id" TEXT NOT NULL,
    "source_attachment_id" TEXT,
    "source_message_id" TEXT,
    "requested_by" TEXT NOT NULL,
    "processor_id" TEXT,
    "status" "ExternalChatTranscriptionStatus" NOT NULL DEFAULT 'queued',
    "provider" TEXT,
    "language" TEXT DEFAULT 'auto',
    "transcript" TEXT,
    "error_message" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_chat_transcription_jobs_pkey" PRIMARY KEY ("id")
);

-- Extend attachments with upload session pointer.
ALTER TABLE "external_chat_attachments"
  ADD COLUMN IF NOT EXISTS "upload_session_id" TEXT;

-- CreateIndexes
CREATE UNIQUE INDEX IF NOT EXISTS "uq_external_chat_status_view" ON "external_chat_status_views"("status_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_external_chat_status_view_user" ON "external_chat_status_views"("user_id");
CREATE INDEX IF NOT EXISTS "idx_external_chat_status_user_published" ON "external_chat_statuses"("user_id", "published_at");
CREATE INDEX IF NOT EXISTS "idx_external_chat_status_expires" ON "external_chat_statuses"("expires_at");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_external_chat_call_participant" ON "external_chat_call_participants"("call_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_external_chat_call_participant_user" ON "external_chat_call_participants"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "external_chat_call_sessions_livekit_room_name_key" ON "external_chat_call_sessions"("livekit_room_name");
CREATE INDEX IF NOT EXISTS "idx_external_chat_calls_room_created" ON "external_chat_call_sessions"("room_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_external_chat_calls_status_created" ON "external_chat_call_sessions"("status", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_external_chat_upload_session_room_storage_key" ON "external_chat_upload_sessions"("room_id", "storage_key");
CREATE INDEX IF NOT EXISTS "idx_external_chat_upload_sessions_uploader" ON "external_chat_upload_sessions"("uploader_id");
CREATE INDEX IF NOT EXISTS "idx_external_chat_upload_sessions_room_status" ON "external_chat_upload_sessions"("room_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_external_chat_upload_chunk_part" ON "external_chat_upload_chunks"("session_id", "part_number");
CREATE INDEX IF NOT EXISTS "idx_external_chat_upload_chunks_session" ON "external_chat_upload_chunks"("session_id");
CREATE INDEX IF NOT EXISTS "idx_external_chat_transcription_status_created" ON "external_chat_transcription_jobs"("status", "created_at");
CREATE INDEX IF NOT EXISTS "idx_external_chat_transcription_requester" ON "external_chat_transcription_jobs"("requested_by");
CREATE UNIQUE INDEX IF NOT EXISTS "external_chat_attachments_upload_session_id_key" ON "external_chat_attachments"("upload_session_id");

-- ForeignKeys
ALTER TABLE "external_chat_statuses"
  ADD CONSTRAINT "external_chat_statuses_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "external_chat_statuses"
  ADD CONSTRAINT "external_chat_statuses_attachment_id_fkey"
  FOREIGN KEY ("attachment_id") REFERENCES "external_chat_attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "external_chat_status_views"
  ADD CONSTRAINT "external_chat_status_views_status_id_fkey"
  FOREIGN KEY ("status_id") REFERENCES "external_chat_statuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "external_chat_status_views"
  ADD CONSTRAINT "external_chat_status_views_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "external_chat_call_sessions"
  ADD CONSTRAINT "external_chat_call_sessions_room_id_fkey"
  FOREIGN KEY ("room_id") REFERENCES "external_chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "external_chat_call_sessions"
  ADD CONSTRAINT "external_chat_call_sessions_started_by_fkey"
  FOREIGN KEY ("started_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "external_chat_call_sessions"
  ADD CONSTRAINT "external_chat_call_sessions_ended_by_fkey"
  FOREIGN KEY ("ended_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "external_chat_call_participants"
  ADD CONSTRAINT "external_chat_call_participants_call_id_fkey"
  FOREIGN KEY ("call_id") REFERENCES "external_chat_call_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "external_chat_call_participants"
  ADD CONSTRAINT "external_chat_call_participants_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "external_chat_upload_sessions"
  ADD CONSTRAINT "external_chat_upload_sessions_room_id_fkey"
  FOREIGN KEY ("room_id") REFERENCES "external_chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "external_chat_upload_sessions"
  ADD CONSTRAINT "external_chat_upload_sessions_uploader_id_fkey"
  FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "external_chat_upload_chunks"
  ADD CONSTRAINT "external_chat_upload_chunks_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "external_chat_upload_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "external_chat_transcription_jobs"
  ADD CONSTRAINT "external_chat_transcription_jobs_source_attachment_id_fkey"
  FOREIGN KEY ("source_attachment_id") REFERENCES "external_chat_attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "external_chat_transcription_jobs"
  ADD CONSTRAINT "external_chat_transcription_jobs_source_message_id_fkey"
  FOREIGN KEY ("source_message_id") REFERENCES "external_chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "external_chat_transcription_jobs"
  ADD CONSTRAINT "external_chat_transcription_jobs_requested_by_fkey"
  FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "external_chat_transcription_jobs"
  ADD CONSTRAINT "external_chat_transcription_jobs_processor_id_fkey"
  FOREIGN KEY ("processor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "external_chat_attachments"
  ADD CONSTRAINT "external_chat_attachments_upload_session_id_fkey"
  FOREIGN KEY ("upload_session_id") REFERENCES "external_chat_upload_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
