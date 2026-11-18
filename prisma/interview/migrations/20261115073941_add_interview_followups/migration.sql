/*
  Warnings:

  - A unique constraint covering the columns `[answerId,sequence]` on the table `InterviewFollowUp` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "InterviewFollowUp_answerId_sequence_key" ON "InterviewFollowUp"("answerId", "sequence");
