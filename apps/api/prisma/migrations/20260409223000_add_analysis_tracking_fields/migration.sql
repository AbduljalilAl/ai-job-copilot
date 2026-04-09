-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('saved', 'applied', 'interview', 'rejected');

-- AlterTable
ALTER TABLE "JobAnalysis"
ADD COLUMN "companyName" TEXT,
ADD COLUMN "jobTitle" TEXT,
ADD COLUMN "sourceUrl" TEXT,
ADD COLUMN "status" "AnalysisStatus" NOT NULL DEFAULT 'saved',
ADD COLUMN "notes" TEXT DEFAULT '',
ADD COLUMN "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "JobAnalysis_status_idx" ON "JobAnalysis"("status");
