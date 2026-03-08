-- CreateEnum
CREATE TYPE "WorkPartStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REVISION_REQUIRED');

-- CreateTable
CREATE TABLE "WorkPart" (
    "id" TEXT NOT NULL,
    "partNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "WorkPartStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "content" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submissionId" TEXT NOT NULL,

    CONSTRAINT "WorkPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkFile" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workPartId" TEXT NOT NULL,

    CONSTRAINT "WorkFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkPart_submissionId_partNumber_key" ON "WorkPart"("submissionId", "partNumber");

-- CreateIndex
CREATE INDEX "WorkFile_workPartId_idx" ON "WorkFile"("workPartId");

-- AddForeignKey
ALTER TABLE "WorkPart" ADD CONSTRAINT "WorkPart_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkFile" ADD CONSTRAINT "WorkFile_workPartId_fkey" FOREIGN KEY ("workPartId") REFERENCES "WorkPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
