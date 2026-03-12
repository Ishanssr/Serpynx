/*
  Warnings:

  - Added the required column `uploaderId` to the `WorkFile` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('MILESTONE_CREATED', 'MILESTONE_UPDATED', 'MILESTONE_COMPLETED', 'FILE_UPLOADED', 'WORK_SUBMITTED', 'WORK_APPROVED', 'REVISION_REQUESTED', 'MESSAGE_SENT');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REVISION_REQUESTED');

-- AlterTable
ALTER TABLE "WorkFile" ADD COLUMN     "uploaderId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "WorkPart" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMessage" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,

    CONSTRAINT "ProjectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkSubmission" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedBy" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewComment" TEXT,
    "workPartId" TEXT NOT NULL,

    CONSTRAINT "WorkSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");

-- CreateIndex
CREATE INDEX "ActivityLog_actorId_idx" ON "ActivityLog"("actorId");

-- CreateIndex
CREATE INDEX "ActivityLog_taskId_createdAt_idx" ON "ActivityLog"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectMessage_senderId_idx" ON "ProjectMessage"("senderId");

-- CreateIndex
CREATE INDEX "ProjectMessage_taskId_createdAt_idx" ON "ProjectMessage"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkSubmission_status_idx" ON "WorkSubmission"("status");

-- CreateIndex
CREATE INDEX "WorkSubmission_submittedBy_idx" ON "WorkSubmission"("submittedBy");

-- CreateIndex
CREATE INDEX "WorkSubmission_workPartId_idx" ON "WorkSubmission"("workPartId");

-- CreateIndex
CREATE INDEX "WorkFile_uploaderId_idx" ON "WorkFile"("uploaderId");

-- CreateIndex
CREATE INDEX "WorkPart_status_idx" ON "WorkPart"("status");

-- CreateIndex
CREATE INDEX "WorkPart_taskId_idx" ON "WorkPart"("taskId");

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMessage" ADD CONSTRAINT "ProjectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMessage" ADD CONSTRAINT "ProjectMessage_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkFile" ADD CONSTRAINT "WorkFile_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkSubmission" ADD CONSTRAINT "WorkSubmission_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkSubmission" ADD CONSTRAINT "WorkSubmission_workPartId_fkey" FOREIGN KEY ("workPartId") REFERENCES "WorkPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
