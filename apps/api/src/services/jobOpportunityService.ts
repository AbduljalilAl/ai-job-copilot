import type { Prisma } from "@prisma/client";
import type { JobSearchRequest, RoleType, WorkMode } from "@ai-job-copilot/shared";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { getCountryPriority, getDiscoveryLocationSignal, getSaudiPriorityScore, inferWorkModeFromText, matchesCountrySelection } from "../lib/jobDiscoveryUtils.js";
import { normalizeAnalysisText, uniqueSorted } from "../lib/textNormalization.js";
import { MatchingService } from "./matchingService.js";
import { AIService } from "./aiService.js";
import { createJobProvider, type JobSearchPreferences, type RawJobOpportunity } from "./jobProviderService.js";
import { GeoLocationService } from "./geoLocationService.js";
import { ResumeService } from "./resumeService.js";

type PrismaRoleType = "internship" | "summer_training" | "entry_level";
type EnrichedJobOpportunity = RawJobOpportunity & { inferredCountry?: string };

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
  { focusArea: "iot", keywords: ["iot", "embedded", "c++", "linux", "hardware"] },
  { focusArea: "networking", keywords: ["computer networks", "network", "tcp ip", "routing", "switching", "cisco"] },
  { focusArea: "cloud", keywords: ["aws", "cloud", "docker", "linux", "devops", "infrastructure"] },
  { focusArea: "security", keywords: ["cybersecurity", "security", "information security", "penetration testing"] }
];

const genericKeywordTokens = new Set([
  "engineer",
  "engineering",
  "role",
  "intern",
  "internship",
  "training",
  "entry",
  "level",
  "job",
  "opportunity"
]);

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
      normalized.includes("data analysis") ? "data analysis" : undefined,
      normalized.includes("computer networks") || normalized.includes("network") ? "network engineering" : undefined,
      normalized.includes("cloud") ? "cloud" : undefined,
      normalized.includes("aws") ? "aws" : undefined,
      normalized.includes("cybersecurity") || normalized.includes("security") ? "cybersecurity" : undefined,
      normalized.includes("embedded") ? "embedded" : undefined,
      normalized.includes("iot") ? "iot" : undefined
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
    country: request.country?.trim() || undefined,
    remoteOnly: request.workMode === "remote" ? true : (request.remoteOnly ?? false),
    workMode: request.workMode,
    roleType: request.roleType ?? derivedRoleType,
    focusArea: normalizedFocusArea || derivedFocusArea,
    preferenceText: request.preferenceText?.trim() || undefined
  };

  const hasAnyUserSignal = Boolean(normalizedKeywords || request.roleType || normalizedFocusArea || request.location?.trim() || request.country?.trim() || request.preferenceText?.trim() || request.remoteOnly || request.workMode);
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

function buildFilterKeywords(preferences: JobSearchPreferences) {
  return [preferences.keywords, preferences.focusArea]
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

function matchesCountry(job: EnrichedJobOpportunity, preferences: JobSearchPreferences) {
  return matchesCountrySelection(preferences.country, `${job.location} ${job.remoteType ?? ""}`, job.inferredCountry);
}

function getLocationPriority(job: Pick<RawJobOpportunity, "location" | "remoteType">, preferredLocation?: string, inferredCountry?: string) {
  const { preferredLocation: normalizedLocation, defaultSaudiBias } = getDiscoveryLocationSignal(preferredLocation);
  const haystack = normalizeAnalysisText(`${job.location} ${job.remoteType ?? ""}`);

  if (normalizedLocation) {
    return haystack.includes(normalizedLocation) ? 2 : 0;
  }

  if (defaultSaudiBias) {
    return getSaudiPriorityScore(inferredCountry ?? job.location, job.remoteType);
  }

  return 0;
}

function matchesRemote(job: RawJobOpportunity, preferences: JobSearchPreferences) {
  const effectiveWorkMode = job.remoteType ?? inferWorkModeFromText(`${job.location} ${job.description}`);

  if (preferences.workMode) {
    return effectiveWorkMode === preferences.workMode;
  }

  if (!preferences.remoteOnly) {
    return true;
  }

  return effectiveWorkMode === "remote";
}

function normalizeWorkMode(value?: string | null): WorkMode | undefined {
  if (value === "remote" || value === "hybrid" || value === "onsite") {
    return value;
  }

  return undefined;
}

function matchesRoleType(job: RawJobOpportunity, preferences: JobSearchPreferences) {
  if (!job.roleType) {
    return true;
  }

  return job.roleType === preferences.roleType;
}

function matchesKeywords(job: RawJobOpportunity, preferences: JobSearchPreferences) {
  const keywordTokens = uniqueSorted(
    normalizeAnalysisText(buildFilterKeywords(preferences))
      .split(" ")
      .filter((token) => token.length > 2 && !genericKeywordTokens.has(token))
  );

  if (keywordTokens.length === 0) {
    return true;
  }

  const titleHaystack = normalizeAnalysisText(`${job.title} ${job.companyName} ${job.location} ${job.remoteType ?? ""}`);
  const descriptionHaystack = normalizeAnalysisText(job.description);
  const overlapScore = keywordTokens.reduce((score, token) => {
    if (titleHaystack.includes(token)) {
      return score + 2;
    }

    if (descriptionHaystack.includes(token)) {
      return score + 1;
    }

    return score;
  }, 0);
  const requiredOverlap = keywordTokens.length >= 4 ? 2 : 1;

  return overlapScore >= requiredOverlap;
}

export class JobOpportunityService {
  constructor(
    private readonly resumeService = new ResumeService(),
    private readonly matchingService = new MatchingService(),
    private readonly aiService = new AIService(),
    private readonly jobProvider = createJobProvider(),
    private readonly geoLocationService = new GeoLocationService()
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
    const jobsWithCountry = await this.enrichCountryInformation(discovered.jobs, resolved.country);
    const filteredJobs = jobsWithCountry.filter((job) =>
      matchesKeywords(job, resolved)
      && matchesLocation(job, resolved)
      && matchesCountry(job, resolved)
      && matchesRemote(job, resolved)
      && matchesRoleType(job, resolved)
    );
    const scoredJobs = await Promise.all(
      filteredJobs.map((job) => this.buildScoredOpportunity(job, resume.content, resolved))
    );
    const eligibleJobs = scoredJobs.filter((job) => !job.shouldAutoExclude && job.score >= 28);
    const aiRefinedJobs = await this.applyAiFitRefinement(eligibleJobs, resume.content);
    const persistedJobs = await Promise.all(
      aiRefinedJobs.map((job) => this.upsertScoredOpportunity(job))
    );
    const sortedJobs = persistedJobs.sort((left, right) =>
      this.compareRankedJobs(left, right, resolved.location, resolved.country)
    );

    return {
      jobs: sortedJobs,
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
          country: resolved.country,
          remoteOnly: resolved.remoteOnly,
          workMode: resolved.workMode,
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
      take: Math.max(limit * 3, limit)
    });

    return {
      jobs: jobs
        .sort((left, right) => this.compareRankedJobs(left, right))
        .slice(0, limit),
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

  private async buildScoredOpportunity(job: EnrichedJobOpportunity, resumeText: string, preferences: JobSearchPreferences) {
    const match = this.matchingService.analyze(resumeText, job.description, {
      keywords: buildPreferenceKeywords(preferences),
      roleType: preferences.roleType,
      title: job.title
    });

    return {
      job,
      score: match.score,
      matchReason: match.matchReason,
      matchedSkills: uniqueSorted([...match.matchedTechnicalSkills, ...match.matchedSoftSkills]),
      missingSkills: uniqueSorted([...match.missingTechnicalSkills, ...match.missingSoftSkills]),
      matchDetails: {
        ...match.matchDetails,
        roleRelevance: match.roleRelevance,
        inferredCountry: job.inferredCountry,
        baseScore: match.score,
        aiAdjustedScore: match.score
      },
      deterministic: match,
      shouldAutoExclude: match.shouldAutoExclude
    };
  }

  private async applyAiFitRefinement(
    scoredJobs: Array<{
      job: EnrichedJobOpportunity;
      score: number;
      matchReason: string;
      matchedSkills: string[];
      missingSkills: string[];
      matchDetails: Record<string, unknown>;
      deterministic: ReturnType<MatchingService["analyze"]>;
      shouldAutoExclude: boolean;
    }>,
    resumeText: string
  ) {
    const sortedByBase = [...scoredJobs].sort((left, right) => right.score - left.score);
    const topJobs = new Set(sortedByBase.slice(0, Math.min(3, sortedByBase.length)).map((item) => item.job.sourceUrl));

    return Promise.all(
      scoredJobs.map(async (item) => {
        if (!topJobs.has(item.job.sourceUrl)) {
          return item;
        }

        const aiFit = await this.aiService.generateJobFitAssessment(resumeText, item.job.description, {
          baseScore: item.score,
          matchedRequiredSkills: item.deterministic.matchedRequiredSkills,
          missingRequiredSkills: item.deterministic.missingRequiredSkills,
          matchedOptionalSkills: item.deterministic.matchedOptionalSkills,
          missingOptionalSkills: item.deterministic.missingOptionalSkills,
          matchedSoftSkills: item.deterministic.matchedSoftSkills,
          missingSoftSkills: item.deterministic.missingSoftSkills,
          matchReason: item.matchReason
        });

        return {
          ...item,
          score: aiFit.adjustedScore,
          matchReason: aiFit.fitSummary,
          matchDetails: {
            ...item.matchDetails,
            aiAdjustedScore: aiFit.adjustedScore,
            aiFitSummary: aiFit.fitSummary,
            aiStrengths: aiFit.strengths,
            aiGaps: aiFit.gaps,
            aiConfidence: aiFit.confidence,
            aiAssistanceStatus: aiFit.aiAssistanceStatus,
            aiAssistanceMessage: aiFit.aiAssistanceMessage
          }
        };
      })
    );
  }

  private async upsertScoredOpportunity(scoredJob: {
    job: EnrichedJobOpportunity;
    score: number;
    matchReason: string;
    matchedSkills: string[];
    missingSkills: string[];
    matchDetails: Record<string, unknown>;
  }) {
    const { job } = scoredJob;
    const matchedSkills: Prisma.InputJsonValue = scoredJob.matchedSkills;
    const missingSkills: Prisma.InputJsonValue = scoredJob.missingSkills;
    const matchDetails = scoredJob.matchDetails as Prisma.InputJsonValue;

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
        matchScore: scoredJob.score,
        matchedSkills,
        missingSkills,
        matchReason: scoredJob.matchReason,
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
        matchScore: scoredJob.score,
        matchedSkills,
        missingSkills,
        matchReason: scoredJob.matchReason,
        matchDetails
      }
    });
  }

  private compareRankedJobs(
    left: { matchScore: number; updatedAt: Date; location?: string | null; remoteType?: string | null; matchDetails?: unknown },
    right: { matchScore: number; updatedAt: Date; location?: string | null; remoteType?: string | null; matchDetails?: unknown },
    preferredLocation?: string,
    preferredCountry?: string
  ) {
    const leftLocationPriority = getLocationPriority({
      location: left.location ?? "",
      remoteType: normalizeWorkMode(left.remoteType)
    }, preferredLocation, this.extractInferredCountry(left.matchDetails));
    const rightLocationPriority = getLocationPriority({
      location: right.location ?? "",
      remoteType: normalizeWorkMode(right.remoteType)
    }, preferredLocation, this.extractInferredCountry(right.matchDetails));
    const leftCountryPriority = getCountryPriority(preferredCountry, left.location ?? "", normalizeWorkMode(left.remoteType), this.extractInferredCountry(left.matchDetails));
    const rightCountryPriority = getCountryPriority(preferredCountry, right.location ?? "", normalizeWorkMode(right.remoteType), this.extractInferredCountry(right.matchDetails));

    return rightCountryPriority - leftCountryPriority
      || rightLocationPriority - leftLocationPriority
      || right.matchScore - left.matchScore
      || right.updatedAt.getTime() - left.updatedAt.getTime();
  }

  private async enrichCountryInformation(jobs: RawJobOpportunity[], preferredCountry?: string): Promise<EnrichedJobOpportunity[]> {
    const resolvedCountries = await this.geoLocationService.resolveCountriesForLocations(
      jobs.map((job) => job.location),
      preferredCountry
    );

    return jobs.map((job) => {
      const location = job.location.trim();

      return {
        ...job,
        inferredCountry: location ? resolvedCountries[location] : undefined
      };
    });
  }

  private extractInferredCountry(matchDetails: unknown) {
    if (!matchDetails || typeof matchDetails !== "object") {
      return undefined;
    }

    const inferredCountry = (matchDetails as { inferredCountry?: unknown }).inferredCountry;
    return typeof inferredCountry === "string" ? inferredCountry : undefined;
  }
}
