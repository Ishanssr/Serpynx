/*
  Warnings:

  - A unique constraint covering the columns `[taskId,partNumber]` on the table `WorkPart` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "WorkPart" ADD COLUMN     "taskId" TEXT,
ALTER COLUMN "submissionId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "WorkPart_taskId_partNumber_key" ON "WorkPart"("taskId", "partNumber");

-- AddForeignKey
ALTER TABLE "WorkPart" ADD CONSTRAINT "WorkPart_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
