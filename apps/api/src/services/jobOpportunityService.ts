import type { Prisma } from "@prisma/client";
import type { JobSearchRequest, RoleType } from "@ai-job-copilot/shared";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { normalizeAnalysisText, uniqueSorted } from "../lib/textNormalization.js";
import { MatchingService } from "./matchingService.js";
import { createJobProvider, type JobSearchPreferences, type RawJobOpportunity } from "./jobProviderService.js";
import { ResumeService } from "./resumeService.js";

type PrismaRoleType = "internship" | "summer_training" | "entry_level";

const prismaWithJobs = prisma as typeof prisma & {
  jobOpportunity: {
    findMany: (args: unknown) => Promise<Array<{ matchScore: number; updatedAt: Date } & Record<string, unknown>>>;
    findUnique: (args: unknown) => Promise<({ matchScore: number; updatedAt: Date } & Record<string, unknown>) | null>;
    upsert: (args: unknown) => Promise<{ matchScore: number; updatedAt: Date } & Record<string, unknown>>;
  };
};

function toPrismaRoleType(value?: JobSearchRequest["roleType"]): PrismaRoleType | undefined {
  if (value === "summer training") {
    return "summer_training";
  }

  if (value === "entry-level") {
    return "entry_level";
  }

  return value;
}

const roleSignals: Array<{ roleType: RoleType; keywords: string[] }> = [
  { roleType: "internship", keywords: ["internship", "intern", "student"] },
  { roleType: "summer training", keywords: ["summer training", "training program", "summer internship"] },
  { roleType: "entry-level", keywords: ["entry level", "entry-level", "junior", "graduate"] }
];

const focusSignals: Array<{ focusArea: string; keywords: string[] }> = [
  { focusArea: "frontend", keywords: ["react", "frontend", "html", "css", "ui ux", "figma"] },
  { focusArea: "backend", keywords: ["node.js", "express", "postgresql", "sql", "rest api", "prisma"] },
  { focusArea: "data", keywords: ["python", "sql", "data analysis", "machine learning", "excel"] },
  { focusArea: "qa", keywords: ["testing", "qa", "automation", "rest api"] },
  { focusArea: "iot", keywords: ["iot", "embedded", "c++", "linux", "hardware"] }
];

function pickBestRoleType(resumeText: string): RoleType {
  const normalized = normalizeAnalysisText(resumeText);
  const ranked = roleSignals
    .map((signal) => ({
      roleType: signal.roleType,
      score: signal.keywords.filter((keyword) => normalized.includes(normalizeAnalysisText(keyword))).length
    }))
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.score > 0 ? ranked[0].roleType : "internship";
}

function pickFocusArea(resumeText: string) {
  const normalized = normalizeAnalysisText(resumeText);
  const ranked = focusSignals
    .map((signal) => ({
      focusArea: signal.focusArea,
      score: signal.keywords.filter((keyword) => normalized.includes(normalizeAnalysisText(keyword))).length
    }))
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.score > 0 ? ranked[0].focusArea : undefined;
}

function deriveKeywordsFromResume(resumeText: string, focusArea?: string) {
  const normalized = normalizeAnalysisText(resumeText);
  const keywordPool = uniqueSorted(
    [
      focusArea,
      normalized.includes("react") ? "react" : undefined,
      normalized.includes("typescript") ? "typescript" : undefined,
      normalized.includes("javascript") ? "javascript" : undefined,
      normalized.includes("node.js") ? "node.js" : undefined,
      normalized.includes("express") ? "express" : undefined,
      normalized.includes("postgresql") ? "postgresql" : undefined,
      normalized.includes("prisma") ? "prisma" : undefined,
      normalized.includes("python") ? "python" : undefined,
      normalized.includes("machine learning") ? "machine learning" : undefined,
      normalized.includes("sql") ? "sql" : undefined,
      normalized.includes("testing") ? "testing" : undefined,
      normalized.includes("ui ux") ? "ui ux" : undefined,
      normalized.includes("figma") ? "figma" : undefined,
      normalized.includes("data analysis") ? "data analysis" : undefined
    ].filter((value): value is string => Boolean(value))
  );

  return keywordPool.slice(0, 5).join(" ") || "software internship";
}

function resolveSearchPreferences(request: JobSearchRequest, resumeText: string) {
  const derivedRoleType = pickBestRoleType(resumeText);
  const derivedFocusArea = pickFocusArea(resumeText);
  const derivedKeywords = deriveKeywordsFromResume(resumeText, derivedFocusArea);
  const normalizedKeywords = request.keywords?.trim();
  const normalizedFocusArea = request.focusArea?.trim();
  const resolved: JobSearchPreferences = {
    keywords: normalizedKeywords || derivedKeywords,
    location: request.location?.trim() || undefined,
    remoteOnly: request.remoteOnly ?? false,
    roleType: request.roleType ?? derivedRoleType,
    focusArea: normalizedFocusArea || derivedFocusArea,
    preferenceText: request.preferenceText?.trim() || undefined
  };

  const hasAnyUserSignal = Boolean(normalizedKeywords || request.roleType || normalizedFocusArea || request.location?.trim() || request.preferenceText?.trim() || request.remoteOnly);
  const hasCoreUserSignal = Boolean(normalizedKeywords || request.roleType || normalizedFocusArea);
  const source = !hasAnyUserSignal
    ? "resume-derived"
    : hasCoreUserSignal
      ? "mixed"
      : "resume-derived";

  return {
    resolved,
    source: source as "resume-derived" | "user-specified" | "mixed"
  };
}

function buildPreferenceKeywords(preferences: JobSearchPreferences) {
  return [preferences.keywords, preferences.focusArea, preferences.preferenceText]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");
}

function matchesLocation(job: RawJobOpportunity, preferences: JobSearchPreferences) {
  const normalizedLocation = normalizeAnalysisText(preferences.location ?? "");

  if (!normalizedLocation) {
    return true;
  }

  const haystack = normalizeAnalysisText(`${job.location} ${job.remoteType ?? ""} ${job.description}`);
  return haystack.includes(normalizedLocation);
}

function matchesRemote(job: RawJobOpportunity, preferences: JobSearchPreferences) {
  if (!preferences.remoteOnly) {
    return true;
  }

  const haystack = normalizeAnalysisText(`${job.location} ${job.remoteType ?? ""} ${job.description}`);
  return haystack.includes("remote");
}

function matchesRoleType(job: RawJobOpportunity, preferences: JobSearchPreferences) {
  if (!job.roleType) {
    return true;
  }

  return job.roleType === preferences.roleType;
}

function matchesKeywords(job: RawJobOpportunity, preferences: JobSearchPreferences) {
  const keywordTokens = uniqueSorted(
    normalizeAnalysisText(buildPreferenceKeywords(preferences))
      .split(" ")
      .filter((token) => token.length > 2)
  );

  if (keywordTokens.length === 0) {
    return true;
  }

  const haystack = normalizeAnalysisText(`${job.title} ${job.companyName} ${job.location} ${job.description}`);
  return keywordTokens.some((token) => haystack.includes(token));
}

export class JobOpportunityService {
  constructor(
    private readonly resumeService = new ResumeService(),
    private readonly matchingService = new MatchingService(),
    private readonly jobProvider = createJobProvider()
  ) {}

  async discover(request: JobSearchRequest) {
    const resume = await this.resumeService.getLatestResume();

    if (!resume) {
      throw new AppError({
        code: "MISSING_RESUME",
        message: "Upload a resume before searching for matching jobs.",
        statusCode: 400
      });
    }

    const { resolved, source } = resolveSearchPreferences(request, resume.content);
    const discovered = await this.jobProvider.search(resolved);
    const filteredJobs = discovered.jobs.filter((job) =>
      matchesKeywords(job, resolved)
      && matchesLocation(job, resolved)
      && matchesRemote(job, resolved)
      && matchesRoleType(job, resolved)
    );
    const rankedJobs = await Promise.all(
      filteredJobs.map((job) => this.upsertScoredOpportunity(job, resume.content, resolved))
    );

    return {
      jobs: rankedJobs.sort(
        (left: { matchScore: number; updatedAt: Date }, right: { matchScore: number; updatedAt: Date }) =>
          right.matchScore - left.matchScore || right.updatedAt.getTime() - left.updatedAt.getTime()
      ),
      meta: {
        provider: discovered.provider,
        fallbackUsed: discovered.fallbackUsed,
        message: discovered.message,
        boardCount: discovered.boardCount,
        searchProfile: {
          keywords: resolved.keywords,
          roleType: resolved.roleType,
          focusArea: resolved.focusArea,
          location: resolved.location,
          remoteOnly: resolved.remoteOnly,
          source
        }
      }
    };
  }

  async list(limit = 20) {
    const jobs = await prismaWithJobs.jobOpportunity.findMany({
      orderBy: [
        { matchScore: "desc" },
        { updatedAt: "desc" }
      ],
      take: limit
    });

    return {
      jobs,
      meta: this.jobProvider.getStatus()
    };
  }

  async getById(id: number) {
    const job = await prismaWithJobs.jobOpportunity.findUnique({
      where: { id }
    });

    if (!job) {
      throw new AppError({
        code: "JOB_NOT_FOUND",
        message: "The requested job opportunity could not be found.",
        statusCode: 404
      });
    }

    return job;
  }

  private async upsertScoredOpportunity(job: RawJobOpportunity, resumeText: string, preferences: JobSearchPreferences) {
    const match = this.matchingService.analyze(resumeText, job.description, {
      keywords: buildPreferenceKeywords(preferences),
      roleType: preferences.roleType,
      title: job.title
    });

    const matchedSkills: Prisma.InputJsonValue = uniqueSorted([...match.matchedTechnicalSkills, ...match.matchedSoftSkills]);
    const missingSkills: Prisma.InputJsonValue = uniqueSorted([...match.missingTechnicalSkills, ...match.missingSoftSkills]);
    const matchDetails: Prisma.InputJsonValue = {
      ...match.matchDetails,
      roleRelevance: match.roleRelevance
    };

    return prismaWithJobs.jobOpportunity.upsert({
      where: {
        source_sourceUrl: {
          source: job.source,
          sourceUrl: job.sourceUrl
        }
      },
      create: {
        title: job.title,
        companyName: job.companyName,
        location: job.location,
        source: job.source,
        sourceUrl: job.sourceUrl,
        applyUrl: job.applyUrl,
        description: job.description,
        employmentType: job.employmentType,
        roleType: toPrismaRoleType(job.roleType),
        remoteType: job.remoteType,
        matchScore: match.score,
        matchedSkills,
        missingSkills,
        matchReason: match.matchReason,
        matchDetails
      },
      update: {
        title: job.title,
        companyName: job.companyName,
        location: job.location,
        applyUrl: job.applyUrl,
        description: job.description,
        employmentType: job.employmentType,
        roleType: toPrismaRoleType(job.roleType),
        remoteType: job.remoteType,
        matchScore: match.score,
        matchedSkills,
        missingSkills,
        matchReason: match.matchReason,
        matchDetails
      }
    });
  }
}
