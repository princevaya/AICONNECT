-- Non-destructive additive migration for E2EE keys, preferences, status media attachments, starred messages, and push subscriptions

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "e2ee_public_key" TEXT,
  ADD COLUMN IF NOT EXISTS "e2ee_key_updated_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "preferred_language" TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS "chat_preferences" JSONB;

ALTER TABLE "external_chat_rooms"
  ADD COLUMN IF NOT EXISTS "e2ee_enabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "external_chat_attachments"
  ALTER COLUMN "room_id" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'room',
  ADD COLUMN IF NOT EXISTS "checksum" TEXT;

CREATE TABLE IF NOT EXISTS "external_chat_room_keys" (
  "id" TEXT NOT NULL,
  "room_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "key_version" INTEGER NOT NULL DEFAULT 1,
  "wrapped_key" TEXT NOT NULL,
  "sender_public_key" TEXT NOT NULL,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "external_chat_room_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_external_chat_room_key_user_version"
  ON "external_chat_room_keys"("room_id", "user_id", "key_version");

CREATE INDEX IF NOT EXISTS "idx_external_chat_room_keys_room_version"
  ON "external_chat_room_keys"("room_id", "key_version");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'external_chat_room_keys_room_id_fkey'
  ) THEN
    ALTER TABLE "external_chat_room_keys"
      ADD CONSTRAINT "external_chat_room_keys_room_id_fkey"
      FOREIGN KEY ("room_id") REFERENCES "external_chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'external_chat_room_keys_user_id_fkey'
  ) THEN
    ALTER TABLE "external_chat_room_keys"
      ADD CONSTRAINT "external_chat_room_keys_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "external_chat_starred_messages" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "message_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "external_chat_starred_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_external_chat_starred_user_message"
  ON "external_chat_starred_messages"("user_id", "message_id");

CREATE INDEX IF NOT EXISTS "idx_external_chat_starred_user_created"
  ON "external_chat_starred_messages"("user_id", "created_at");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'external_chat_starred_messages_user_id_fkey'
  ) THEN
    ALTER TABLE "external_chat_starred_messages"
      ADD CONSTRAINT "external_chat_starred_messages_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'external_chat_starred_messages_message_id_fkey'
  ) THEN
    ALTER TABLE "external_chat_starred_messages"
      ADD CONSTRAINT "external_chat_starred_messages_message_id_fkey"
      FOREIGN KEY ("message_id") REFERENCES "external_chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT,
  "auth" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_key"
  ON "push_subscriptions"("endpoint");

CREATE INDEX IF NOT EXISTS "idx_push_subscriptions_user"
  ON "push_subscriptions"("user_id");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_user_id_fkey'
  ) THEN
    ALTER TABLE "push_subscriptions"
      ADD CONSTRAINT "push_subscriptions_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

