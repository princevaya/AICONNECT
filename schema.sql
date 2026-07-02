-- =====================================================
-- MAIN SUPABASE SCHEMA FILE (CONSOLIDATED)
-- Generated from project migrations and patch files
-- Date: 2026-04-07
-- =====================================================

-- [1/4] Base schema from prisma/migrations/external-chat-system/migration.sql

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('host', 'participant');

-- CreateEnum
CREATE TYPE "ExternalChatRoomType" AS ENUM ('direct', 'group', 'channel');

-- CreateEnum
CREATE TYPE "ExternalChatMessageType" AS ENUM ('text', 'note', 'poll');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "imageUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "scheduled_for" TIMESTAMPTZ(6) NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "duration_mins" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recordings" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "s3_url" TEXT NOT NULL,
    "duration" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recordings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_notes" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_rooms" (
    "id" UUID NOT NULL,
    "meeting_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduled_for" TIMESTAMPTZ(6) NOT NULL,
    "attendees" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "original_url" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "room_id" TEXT,
    "storage_provider" TEXT NOT NULL DEFAULT 'local',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_shares" (
    "id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "shared_by" TEXT NOT NULL,
    "shared_to" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "file_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL DEFAULT 'participant',
    "mic_status" BOOLEAN NOT NULL DEFAULT true,
    "camera_status" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "removed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_chat_workspaces" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_chat_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_chat_rooms" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ExternalChatRoomType" NOT NULL DEFAULT 'group',
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_chat_room_members" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3),
    "left_at" TIMESTAMP(3),
    "removed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_chat_room_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_chat_attachments" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "storage_provider" TEXT NOT NULL DEFAULT 's3',
    "storage_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_chat_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_chat_messages" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "type" "ExternalChatMessageType" NOT NULL DEFAULT 'text',
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "mentions" JSONB,
    "private_to" JSONB,
    "reply_to_id" TEXT,
    "attachment_id" TEXT,
    "edited_at" TIMESTAMP(3),
    "pinned_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_chat_reactions" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_chat_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_chat_read_receipts" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_chat_read_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "meetings_code_key" ON "meetings"("code");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_rooms_meeting_code_key" ON "meeting_rooms"("meeting_code");

-- CreateIndex
CREATE INDEX "idx_meeting_rooms_schedule" ON "meeting_rooms"("scheduled_for");

-- CreateIndex
CREATE INDEX "idx_files_uploaded_by" ON "files"("uploaded_by");

-- CreateIndex
CREATE INDEX "idx_files_room_created_at" ON "files"("room_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "chat_rooms_code_key" ON "chat_rooms"("code");

-- CreateIndex
CREATE INDEX "idx_chat_rooms_created_by" ON "chat_rooms"("created_by_id");

-- CreateIndex
CREATE INDEX "idx_chat_rooms_created_at" ON "chat_rooms"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "chat_messages_file_id_key" ON "chat_messages"("file_id");

-- CreateIndex
CREATE INDEX "idx_chat_messages_room_created_at" ON "chat_messages"("room_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_chat_messages_sender_id" ON "chat_messages"("sender_id");

-- CreateIndex
CREATE INDEX "idx_chat_messages_deleted_at" ON "chat_messages"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_participants_room_left_at" ON "participants"("room_id", "left_at");

-- CreateIndex
CREATE INDEX "idx_participants_room_role" ON "participants"("room_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "uq_participants_room_user" ON "participants"("room_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_chat_workspaces_slug_key" ON "external_chat_workspaces"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "external_chat_rooms_code_key" ON "external_chat_rooms"("code");

-- CreateIndex
CREATE INDEX "idx_external_chat_rooms_workspace" ON "external_chat_rooms"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_external_chat_rooms_type" ON "external_chat_rooms"("type");

-- CreateIndex
CREATE INDEX "idx_external_chat_members_user" ON "external_chat_room_members"("user_id");

-- CreateIndex
CREATE INDEX "idx_external_chat_members_room_left" ON "external_chat_room_members"("room_id", "left_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_external_chat_member_room_user" ON "external_chat_room_members"("room_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_external_chat_attachments_room" ON "external_chat_attachments"("room_id");

-- CreateIndex
CREATE INDEX "idx_external_chat_attachments_uploader" ON "external_chat_attachments"("uploaded_by");

-- CreateIndex
CREATE INDEX "idx_external_chat_messages_room_created" ON "external_chat_messages"("room_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_external_chat_messages_sender" ON "external_chat_messages"("sender_id");

-- CreateIndex
CREATE INDEX "idx_external_chat_messages_reply_to" ON "external_chat_messages"("reply_to_id");

-- CreateIndex
CREATE INDEX "idx_external_chat_messages_pinned" ON "external_chat_messages"("pinned_at");

-- CreateIndex
CREATE INDEX "idx_external_chat_messages_deleted" ON "external_chat_messages"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_external_chat_reaction_message" ON "external_chat_reactions"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_external_chat_reaction" ON "external_chat_reactions"("message_id", "user_id", "emoji");

-- CreateIndex
CREATE INDEX "idx_external_chat_seen_user" ON "external_chat_read_receipts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_external_chat_seen" ON "external_chat_read_receipts"("message_id", "user_id");

-- AddForeignKey
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_notes" ADD CONSTRAINT "meeting_notes_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_shares" ADD CONSTRAINT "file_shares_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_shares" ADD CONSTRAINT "file_shares_shared_by_fkey" FOREIGN KEY ("shared_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_shares" ADD CONSTRAINT "file_shares_shared_to_fkey" FOREIGN KEY ("shared_to") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_chat_workspaces" ADD CONSTRAINT "external_chat_workspaces_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_chat_rooms" ADD CONSTRAINT "external_chat_rooms_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "external_chat_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_chat_rooms" ADD CONSTRAINT "external_chat_rooms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_chat_room_members" ADD CONSTRAINT "external_chat_room_members_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "external_chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_chat_room_members" ADD CONSTRAINT "external_chat_room_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_chat_attachments" ADD CONSTRAINT "external_chat_attachments_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "external_chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_chat_attachments" ADD CONSTRAINT "external_chat_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_chat_messages" ADD CONSTRAINT "external_chat_messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "external_chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_chat_messages" ADD CONSTRAINT "external_chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_chat_messages" ADD CONSTRAINT "external_chat_messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "external_chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_chat_messages" ADD CONSTRAINT "external_chat_messages_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "external_chat_attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_chat_reactions" ADD CONSTRAINT "external_chat_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "external_chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_chat_reactions" ADD CONSTRAINT "external_chat_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_chat_read_receipts" ADD CONSTRAINT "external_chat_read_receipts_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "external_chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_chat_read_receipts" ADD CONSTRAINT "external_chat_read_receipts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- [2/4] AI image + rate limit schema additions

CREATE TYPE "GeneratedImageStatus" AS ENUM ('pending', 'succeeded', 'failed');

CREATE TABLE "generated_images" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "GeneratedImageStatus" NOT NULL DEFAULT 'pending',
    "prompt" TEXT NOT NULL,
    "enhanced_prompt" TEXT,
    "style_preset" TEXT,
    "aspect_ratio" TEXT NOT NULL DEFAULT '1:1',
    "quality" TEXT NOT NULL DEFAULT 'standard',
    "background" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "seed" TEXT,
    "mime_type" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "storage_provider" TEXT,
    "storage_key" TEXT,
    "error_code" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rate_limit_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "route_key" TEXT NOT NULL,
    "subject_key" TEXT NOT NULL,
    "window_key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_generated_images_user_created" ON "generated_images"("user_id", "created_at");
CREATE INDEX "idx_generated_images_status_created" ON "generated_images"("status", "created_at");
CREATE UNIQUE INDEX "uq_rate_limit_route_subject_window" ON "rate_limit_events"("route_key", "subject_key", "window_key");
CREATE INDEX "idx_rate_limit_user_route" ON "rate_limit_events"("user_id", "route_key");

ALTER TABLE "generated_images" ADD CONSTRAINT "generated_images_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rate_limit_events" ADD CONSTRAINT "rate_limit_events_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- [3/4] Consolidated Supabase changes

-- =====================================================
-- AICONNECT EXTERNAL CHAT - CONSOLIDATED SQL CHANGES
-- Safe to run multiple times where possible.
-- Run in Supabase SQL Editor.
-- =====================================================

-- 0) Ensure pgcrypto is available for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) external_chat_rooms enhancements
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'external_chat_rooms' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE "external_chat_rooms" ADD COLUMN "avatar_url" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'external_chat_rooms' AND column_name = 'is_discoverable'
  ) THEN
    ALTER TABLE "external_chat_rooms" ADD COLUMN "is_discoverable" BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'external_chat_rooms' AND column_name = 'invite_code'
  ) THEN
    ALTER TABLE "external_chat_rooms" ADD COLUMN "invite_code" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'external_chat_rooms_invite_code_key'
  ) THEN
    ALTER TABLE "external_chat_rooms"
      ADD CONSTRAINT "external_chat_rooms_invite_code_key" UNIQUE ("invite_code");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_external_chat_rooms_discoverable"
  ON "external_chat_rooms"("is_discoverable");

CREATE INDEX IF NOT EXISTS "idx_external_chat_rooms_invite_code"
  ON "external_chat_rooms"("invite_code");

-- 2) activity logs table
CREATE TABLE IF NOT EXISTS "external_chat_room_activity_logs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "room_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "details" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'external_chat_room_activity_logs_room_id_fkey'
  ) THEN
    ALTER TABLE "external_chat_room_activity_logs"
      ADD CONSTRAINT "external_chat_room_activity_logs_room_id_fkey"
      FOREIGN KEY ("room_id") REFERENCES "external_chat_rooms"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'external_chat_room_activity_logs_user_id_fkey'
  ) THEN
    ALTER TABLE "external_chat_room_activity_logs"
      ADD CONSTRAINT "external_chat_room_activity_logs_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_external_chat_activity_room"
  ON "external_chat_room_activity_logs"("room_id");
CREATE INDEX IF NOT EXISTS "idx_external_chat_activity_user"
  ON "external_chat_room_activity_logs"("user_id");
CREATE INDEX IF NOT EXISTS "idx_external_chat_activity_created"
  ON "external_chat_room_activity_logs"("created_at");

-- 3) reports table
CREATE TABLE IF NOT EXISTS "external_chat_room_reports" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "room_id" TEXT NOT NULL,
  "reporter_id" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "resolved_at" TIMESTAMP(3),
  "resolved_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'external_chat_room_reports_room_id_fkey'
  ) THEN
    ALTER TABLE "external_chat_room_reports"
      ADD CONSTRAINT "external_chat_room_reports_room_id_fkey"
      FOREIGN KEY ("room_id") REFERENCES "external_chat_rooms"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'external_chat_room_reports_reporter_id_fkey'
  ) THEN
    ALTER TABLE "external_chat_room_reports"
      ADD CONSTRAINT "external_chat_room_reports_reporter_id_fkey"
      FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'external_chat_room_reports_resolved_by_fkey'
  ) THEN
    ALTER TABLE "external_chat_room_reports"
      ADD CONSTRAINT "external_chat_room_reports_resolved_by_fkey"
      FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_external_chat_reports_room"
  ON "external_chat_room_reports"("room_id");
CREATE INDEX IF NOT EXISTS "idx_external_chat_reports_status"
  ON "external_chat_room_reports"("status");
CREATE INDEX IF NOT EXISTS "idx_external_chat_reports_created"
  ON "external_chat_room_reports"("created_at");

-- 4) mutes table
CREATE TABLE IF NOT EXISTS "external_chat_room_mutes" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "room_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "muted" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'external_chat_room_mutes_room_id_user_id_key'
  ) THEN
    ALTER TABLE "external_chat_room_mutes"
      ADD CONSTRAINT "external_chat_room_mutes_room_id_user_id_key"
      UNIQUE ("room_id", "user_id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'external_chat_room_mutes_room_id_fkey'
  ) THEN
    ALTER TABLE "external_chat_room_mutes"
      ADD CONSTRAINT "external_chat_room_mutes_room_id_fkey"
      FOREIGN KEY ("room_id") REFERENCES "external_chat_rooms"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'external_chat_room_mutes_user_id_fkey'
  ) THEN
    ALTER TABLE "external_chat_room_mutes"
      ADD CONSTRAINT "external_chat_room_mutes_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_external_chat_mutes_user"
  ON "external_chat_room_mutes"("user_id");

-- 5) hidden room table for delete-for-me persistence
CREATE TABLE IF NOT EXISTS "external_chat_room_hidden" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "room_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "hidden_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_external_chat_hidden_room_user'
  ) THEN
    ALTER TABLE "external_chat_room_hidden"
      ADD CONSTRAINT "uq_external_chat_hidden_room_user"
      UNIQUE ("room_id", "user_id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'external_chat_room_hidden_room_id_fkey'
  ) THEN
    ALTER TABLE "external_chat_room_hidden"
      ADD CONSTRAINT "external_chat_room_hidden_room_id_fkey"
      FOREIGN KEY ("room_id") REFERENCES "external_chat_rooms"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'external_chat_room_hidden_user_id_fkey'
  ) THEN
    ALTER TABLE "external_chat_room_hidden"
      ADD CONSTRAINT "external_chat_room_hidden_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_external_chat_hidden_user"
  ON "external_chat_room_hidden"("user_id");

-- 6) enum additions + ownership repair
ALTER TYPE "ExternalChatMessageType" ADD VALUE IF NOT EXISTS 'system';

UPDATE "external_chat_room_members"
SET role = 'owner'
WHERE id IN (
  SELECT m.id
  FROM "external_chat_room_members" m
  INNER JOIN "external_chat_rooms" r ON m.room_id = r.id
  WHERE m.user_id = r.created_by
    AND m.role <> 'owner'
    AND m.removed_at IS NULL
    AND m.left_at IS NULL
);

-- 7) verification helpers
-- SELECT enum_range(NULL::"ExternalChatMessageType");
-- SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'external_chat_room%';
-- SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname LIKE 'idx_external_chat%';

-- =====================================================
-- END
-- =====================================================

-- [4/4] Critical ownership/system-message fixes

-- =====================================================
-- FINAL CRITICAL FIXES MIGRATION
-- Run this ONCE in Supabase SQL Editor
-- =====================================================

-- 1. Add 'system' message type to enum
ALTER TYPE "ExternalChatMessageType" ADD VALUE IF NOT EXISTS 'system';

-- 2. Fix room creators as owners (if not already done)
UPDATE "external_chat_room_members"
SET role = 'owner'
WHERE id IN (
  SELECT m.id
  FROM "external_chat_room_members" m
  INNER JOIN "external_chat_rooms" r ON m.room_id = r.id
  WHERE m.user_id = r.created_by
  AND m.role != 'owner'
  AND m.removed_at IS NULL
  AND m.left_at IS NULL
);

-- 3. Fix leftAt check in archived rooms query
-- (This is handled in code, no DB change needed)

-- 4. Verify system message type was added
SELECT enum_range(NULL::"ExternalChatMessageType") as message_types;

-- 5. Check how many groups now have proper owners
SELECT 
  COUNT(*) as total_groups,
  COUNT(DISTINCT r.id) as groups_with_owner
FROM "external_chat_rooms" r
LEFT JOIN "external_chat_room_members" m ON r.id = m.room_id 
  AND m.role = 'owner' 
  AND m.removed_at IS NULL 
  AND m.left_at IS NULL
WHERE r.archived_at IS NULL;

-- 6. Show any groups still without owners
SELECT 
  r.name as group_name,
  r.code as group_code,
  r.created_by,
  COUNT(m.id) as total_members
FROM "external_chat_rooms" r
LEFT JOIN "external_chat_room_members" m ON r.id = m.room_id 
  AND m.removed_at IS NULL 
  AND m.left_at IS NULL
WHERE r.archived_at IS NULL
AND NOT EXISTS (
  SELECT 1 FROM "external_chat_room_members" m2
  WHERE m2.room_id = r.id
  AND m2.role = 'owner'
  AND m2.removed_at IS NULL
  AND m2.left_at IS NULL
)
GROUP BY r.id;

-- =====================================================
-- ✅ ALL CRITICAL FIXES APPLIED
-- System messages now work
-- Leave notifications now work
-- Group owners properly set
-- =====================================================
