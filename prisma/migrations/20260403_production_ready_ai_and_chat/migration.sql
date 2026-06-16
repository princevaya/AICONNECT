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
