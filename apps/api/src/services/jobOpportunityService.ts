import type { Prisma } from "@prisma/client";
import type { JobSearchRequest } from "@ai-job-copilot/shared";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { uniqueSorted } from "../lib/textNormalization.js";
import { MatchingService } from "./matchingService.js";
import { MockJobProvider, type JobSearchPreferences, type RawJobOpportunity } from "./jobProviderService.js";
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

export class JobOpportunityService {
  constructor(
    private readonly resumeService = new ResumeService(),
    private readonly matchingService = new MatchingService(),
    private readonly jobProvider = new MockJobProvider()
  ) {}

  async search(preferences: JobSearchPreferences) {
    const resume = await this.resumeService.getLatestResume();

    if (!resume) {
      throw new AppError({
        code: "MISSING_RESUME",
        message: "Upload a resume before searching for matching jobs.",
        statusCode: 400
      });
    }

    const discoveredJobs = await this.jobProvider.search(preferences);
    const scoredJobs = await Promise.all(
      discoveredJobs.map((job) => this.upsertScoredOpportunity(job, resume.content, preferences))
    );

    return scoredJobs.sort(
      (left: { matchScore: number; updatedAt: Date }, right: { matchScore: number; updatedAt: Date }) =>
        right.matchScore - left.matchScore || right.updatedAt.getTime() - left.updatedAt.getTime()
    );
  }

  async list(limit = 20) {
    return prismaWithJobs.jobOpportunity.findMany({
      orderBy: [
        { matchScore: "desc" },
        { updatedAt: "desc" }
      ],
      take: limit
    });
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
      keywords: preferences.keywords,
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
