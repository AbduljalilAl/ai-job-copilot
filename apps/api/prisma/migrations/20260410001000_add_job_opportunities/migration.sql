-- CreateEnum
CREATE TYPE "JobRoleType" AS ENUM ('internship', 'summer_training', 'entry_level');

-- CreateTable
CREATE TABLE "JobOpportunity" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "applyUrl" TEXT,
    "description" TEXT NOT NULL,
    "employmentType" TEXT,
    "roleType" "JobRoleType",
    "remoteType" TEXT,
    "matchScore" INTEGER NOT NULL,
    "matchedSkills" JSONB NOT NULL,
    "missingSkills" JSONB NOT NULL,
    "matchReason" TEXT NOT NULL,
    "matchDetails" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobOpportunity_source_sourceUrl_key" ON "JobOpportunity"("source", "sourceUrl");

-- CreateIndex
CREATE INDEX "JobOpportunity_matchScore_idx" ON "JobOpportunity"("matchScore");
