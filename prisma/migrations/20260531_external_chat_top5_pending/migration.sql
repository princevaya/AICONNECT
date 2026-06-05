-- Status reactions
CREATE TABLE IF NOT EXISTS "external_chat_status_reactions" (
  "id" TEXT NOT NULL,
  "status_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "external_chat_status_reactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_external_chat_status_reaction" ON "external_chat_status_reactions"("status_id", "user_id", "emoji");
CREATE INDEX IF NOT EXISTS "idx_external_chat_status_reaction_status" ON "external_chat_status_reactions"("status_id");
CREATE INDEX IF NOT EXISTS "idx_external_chat_status_reaction_user" ON "external_chat_status_reactions"("user_id");

DO $$
BEGIN
  ALTER TABLE "external_chat_status_reactions"
    ADD CONSTRAINT "external_chat_status_reactions_status_id_fkey"
    FOREIGN KEY ("status_id") REFERENCES "external_chat_statuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "external_chat_status_reactions"
    ADD CONSTRAINT "external_chat_status_reactions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
