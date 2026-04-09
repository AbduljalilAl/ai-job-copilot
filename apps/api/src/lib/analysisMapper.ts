import type { JobAnalysisDto, SkillBuckets } from "@ai-job-copilot/shared";

interface StoredAnalysisShape {
  id: number;
  jobText: string;
  companyName: string | null;
  jobTitle: string | null;
  sourceUrl: string | null;
  status: "saved" | "applied" | "interview" | "rejected";
  notes: string | null;
  score: number;
  matchedSkills: unknown;
  missingSkills: unknown;
  suggestions: string;
  tailoredSummary: string;
  coverLetter: string;
  applicationTips: string;
  createdAt: Date;
  savedAt: Date;
  updatedAt: Date;
  resumeId: number | null;
}

function toSkillBuckets(value: unknown): SkillBuckets {
  const buckets = value as Partial<SkillBuckets> | undefined;

  return {
    technical: Array.isArray(buckets?.technical) ? buckets.technical : [],
    soft: Array.isArray(buckets?.soft) ? buckets.soft : []
  };
}

export function mapStoredAnalysis(record: StoredAnalysisShape, aiAssistanceStatus: "available" | "error" = "available", aiAssistanceMessage?: string): JobAnalysisDto {
  const matchedSkills = toSkillBuckets(record.matchedSkills);
  const missingSkills = toSkillBuckets(record.missingSkills);
  const derivedAiStatus = aiAssistanceStatus === "available" && (!record.coverLetter || !record.applicationTips)
    ? "error"
    : aiAssistanceStatus;

  return {
    id: record.id,
    jobText: record.jobText,
    companyName: record.companyName ?? undefined,
    jobTitle: record.jobTitle ?? undefined,
    sourceUrl: record.sourceUrl ?? undefined,
    status: record.status,
    notes: record.notes ?? undefined,
    score: record.score,
    matchedTechnicalSkills: matchedSkills.technical,
    missingTechnicalSkills: missingSkills.technical,
    matchedSoftSkills: matchedSkills.soft,
    missingSoftSkills: missingSkills.soft,
    suggestions: record.suggestions,
    tailoredSummary: record.tailoredSummary,
    coverLetter: record.coverLetter,
    applicationTips: record.applicationTips,
    aiAssistanceStatus: derivedAiStatus,
    aiAssistanceMessage,
    createdAt: record.createdAt.toISOString(),
    savedAt: record.savedAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    resumeId: record.resumeId ?? undefined
  };
}
