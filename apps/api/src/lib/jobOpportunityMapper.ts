import type { JobMatchDetails, JobOpportunityDto } from "@ai-job-copilot/shared";

interface StoredJobOpportunity {
  id: number;
  title: string;
  companyName: string;
  location: string;
  source: string;
  sourceUrl: string;
  applyUrl: string | null;
  description: string;
  employmentType: string | null;
  roleType: "internship" | "summer_training" | "entry_level" | null;
  remoteType: string | null;
  matchScore: number;
  matchedSkills: unknown;
  missingSkills: unknown;
  matchReason: string;
  matchDetails: unknown;
  createdAt: Date;
  updatedAt: Date;
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toRoleType(value: StoredJobOpportunity["roleType"]): JobOpportunityDto["roleType"] {
  if (value === "summer_training") {
    return "summer training";
  }

  if (value === "entry_level") {
    return "entry-level";
  }

  return value ?? undefined;
}

function toMatchDetails(value: unknown): JobMatchDetails {
  const details = value as Partial<JobMatchDetails> | undefined;

  return {
    matchedRequiredSkills: toStringArray(details?.matchedRequiredSkills),
    missingRequiredSkills: toStringArray(details?.missingRequiredSkills),
    matchedOptionalSkills: toStringArray(details?.matchedOptionalSkills),
    missingOptionalSkills: toStringArray(details?.missingOptionalSkills),
    matchedSoftSkills: toStringArray(details?.matchedSoftSkills),
    missingSoftSkills: toStringArray(details?.missingSoftSkills),
    scoreBand: details?.scoreBand ?? "weak match",
    roleRelevance: typeof details?.roleRelevance === "number" ? details.roleRelevance : undefined
  };
}

export function mapJobOpportunity(record: StoredJobOpportunity): JobOpportunityDto {
  return {
    id: record.id,
    title: record.title,
    companyName: record.companyName,
    location: record.location,
    source: record.source,
    sourceUrl: record.sourceUrl,
    applyUrl: record.applyUrl ?? undefined,
    description: record.description,
    employmentType: record.employmentType ?? undefined,
    roleType: toRoleType(record.roleType),
    remoteType: record.remoteType ?? undefined,
    matchScore: record.matchScore,
    matchReason: record.matchReason,
    matchedSkills: toStringArray(record.matchedSkills),
    missingSkills: toStringArray(record.missingSkills),
    matchDetails: toMatchDetails(record.matchDetails),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}
