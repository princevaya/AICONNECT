-- AlterTable
ALTER TABLE "recordings" ADD COLUMN "user_id" TEXT,
ADD COLUMN "expires_at" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
