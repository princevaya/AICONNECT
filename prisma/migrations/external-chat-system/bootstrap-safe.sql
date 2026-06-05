-- External Chat bootstrap (idempotent)
-- Safe to run on a DB that already has non-chat tables.

CREATE SCHEMA IF NOT EXISTS public;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExternalChatRoomType') THEN
    CREATE TYPE "ExternalChatRoomType" AS ENUM ('direct', 'group', 'channel');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExternalChatMessageType') THEN
    CREATE TYPE "ExternalChatMessageType" AS ENUM ('text', 'note', 'poll');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY,
  "clerkId" TEXT NOT NULL UNIQUE,
  "name" TEXT,
  "email" TEXT,
  "imageUrl" TEXT,
  "role" TEXT NOT NULL DEFAULT 'user',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "external_chat_workspaces" (
  "id" TEXT PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "external_chat_rooms" (
  "id" TEXT PRIMARY KEY,
  "workspace_id" TEXT NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" "ExternalChatRoomType" NOT NULL DEFAULT 'group',
  "is_private" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_by" TEXT NOT NULL,
  "archived_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "external_chat_room_members" (
  "id" TEXT PRIMARY KEY,
  "room_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "muted" BOOLEAN NOT NULL DEFAULT FALSE,
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3),
  "left_at" TIMESTAMP(3),
  "removed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "external_chat_attachments" (
  "id" TEXT PRIMARY KEY,
  "room_id" TEXT NOT NULL,
  "uploaded_by" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size_bytes" BIGINT NOT NULL,
  "storage_provider" TEXT NOT NULL DEFAULT 's3',
  "storage_key" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "external_chat_messages" (
  "id" TEXT PRIMARY KEY,
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
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "external_chat_reactions" (
  "id" TEXT PRIMARY KEY,
  "message_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "external_chat_read_receipts" (
  "id" TEXT PRIMARY KEY,
  "message_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "external_chat_connection_requests" (
  "id" TEXT PRIMARY KEY,
  "sender_id" TEXT NOT NULL,
  "receiver_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "responded_at" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "external_chat_connections" (
  "id" TEXT PRIMARY KEY,
  "user_a_id" TEXT NOT NULL,
  "user_b_id" TEXT NOT NULL,
  "direct_room_id" TEXT NOT NULL UNIQUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "removed_at" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "idx_external_chat_rooms_workspace" ON "external_chat_rooms"("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_external_chat_rooms_type" ON "external_chat_rooms"("type");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_external_chat_member_room_user" ON "external_chat_room_members"("room_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_external_chat_members_user" ON "external_chat_room_members"("user_id");
CREATE INDEX IF NOT EXISTS "idx_external_chat_messages_room_created" ON "external_chat_messages"("room_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_external_chat_messages_sender" ON "external_chat_messages"("sender_id");
CREATE INDEX IF NOT EXISTS "idx_external_chat_messages_reply_to" ON "external_chat_messages"("reply_to_id");
CREATE INDEX IF NOT EXISTS "idx_external_chat_messages_pinned" ON "external_chat_messages"("pinned_at");
CREATE INDEX IF NOT EXISTS "idx_external_chat_messages_deleted" ON "external_chat_messages"("deleted_at");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_external_chat_reaction" ON "external_chat_reactions"("message_id", "user_id", "emoji");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_external_chat_seen" ON "external_chat_read_receipts"("message_id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_external_chat_request_sender_receiver" ON "external_chat_connection_requests"("sender_id", "receiver_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_external_chat_connection_pair" ON "external_chat_connections"("user_a_id", "user_b_id");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_chat_workspaces_created_by_fkey') THEN
    ALTER TABLE "external_chat_workspaces" ADD CONSTRAINT "external_chat_workspaces_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_chat_rooms_workspace_id_fkey') THEN
    ALTER TABLE "external_chat_rooms" ADD CONSTRAINT "external_chat_rooms_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "external_chat_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_chat_rooms_created_by_fkey') THEN
    ALTER TABLE "external_chat_rooms" ADD CONSTRAINT "external_chat_rooms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_chat_room_members_room_id_fkey') THEN
    ALTER TABLE "external_chat_room_members" ADD CONSTRAINT "external_chat_room_members_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "external_chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_chat_room_members_user_id_fkey') THEN
    ALTER TABLE "external_chat_room_members" ADD CONSTRAINT "external_chat_room_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_chat_attachments_room_id_fkey') THEN
    ALTER TABLE "external_chat_attachments" ADD CONSTRAINT "external_chat_attachments_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "external_chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_chat_attachments_uploaded_by_fkey') THEN
    ALTER TABLE "external_chat_attachments" ADD CONSTRAINT "external_chat_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_chat_messages_room_id_fkey') THEN
    ALTER TABLE "external_chat_messages" ADD CONSTRAINT "external_chat_messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "external_chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_chat_messages_sender_id_fkey') THEN
    ALTER TABLE "external_chat_messages" ADD CONSTRAINT "external_chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_chat_messages_reply_to_id_fkey') THEN
    ALTER TABLE "external_chat_messages" ADD CONSTRAINT "external_chat_messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "external_chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_chat_messages_attachment_id_fkey') THEN
    ALTER TABLE "external_chat_messages" ADD CONSTRAINT "external_chat_messages_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "external_chat_attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_chat_reactions_message_id_fkey') THEN
    ALTER TABLE "external_chat_reactions" ADD CONSTRAINT "external_chat_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "external_chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_chat_reactions_user_id_fkey') THEN
    ALTER TABLE "external_chat_reactions" ADD CONSTRAINT "external_chat_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_chat_read_receipts_message_id_fkey') THEN
    ALTER TABLE "external_chat_read_receipts" ADD CONSTRAINT "external_chat_read_receipts_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "external_chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_chat_read_receipts_user_id_fkey') THEN
    ALTER TABLE "external_chat_read_receipts" ADD CONSTRAINT "external_chat_read_receipts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_chat_request_sender_fkey') THEN
    ALTER TABLE "external_chat_connection_requests" ADD CONSTRAINT "external_chat_request_sender_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_chat_request_receiver_fkey') THEN
    ALTER TABLE "external_chat_connection_requests" ADD CONSTRAINT "external_chat_request_receiver_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_chat_connection_user_a_fkey') THEN
    ALTER TABLE "external_chat_connections" ADD CONSTRAINT "external_chat_connection_user_a_fkey" FOREIGN KEY ("user_a_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_chat_connection_user_b_fkey') THEN
    ALTER TABLE "external_chat_connections" ADD CONSTRAINT "external_chat_connection_user_b_fkey" FOREIGN KEY ("user_b_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_chat_connection_direct_room_fkey') THEN
    ALTER TABLE "external_chat_connections" ADD CONSTRAINT "external_chat_connection_direct_room_fkey" FOREIGN KEY ("direct_room_id") REFERENCES "external_chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
