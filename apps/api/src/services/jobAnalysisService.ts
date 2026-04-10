import type { AnalysisStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { AIService } from "./aiService.js";
import { MatchingService } from "./matchingService.js";
import { ResumeService } from "./resumeService.js";

export class JobAnalysisService {
  constructor(
    private readonly resumeService = new ResumeService(),
    private readonly matchingService = new MatchingService(),
    private readonly aiService = new AIService()
  ) {}

  async analyze(
    jobText: string,
    resumeId?: number,
    metadata?: {
      companyName?: string;
      jobTitle?: string;
      sourceUrl?: string;
    }
  ) {
    const resume = resumeId
      ? await this.resumeService.getResumeById(resumeId)
      : await this.resumeService.getLatestResume();

    if (!resume) {
      throw resumeId
        ? new AppError({
          code: "RESUME_NOT_FOUND",
          message: "The selected resume could not be found.",
          statusCode: 404
        })
        : new AppError({
          code: "MISSING_RESUME",
          message: "Upload a resume before running analysis.",
          statusCode: 400
        });
    }

    const match = this.matchingService.analyze(resume.content, jobText);
    const matchedSkills: Prisma.InputJsonValue = {
      technical: match.matchedTechnicalSkills,
      soft: match.matchedSoftSkills
    };
    const missingSkills: Prisma.InputJsonValue = {
      technical: match.missingTechnicalSkills,
      soft: match.missingSoftSkills
    };
    const aiOutput = await this.aiService.generateGroundedOutputs(resume.content, jobText);
    const tailoredSummary = this.buildTailoredSummary(
      jobText,
      match.matchedTechnicalSkills,
      match.matchedSoftSkills,
      match.missingTechnicalSkills
    );
    const coverLetter = aiOutput.coverLetter;
    const applicationTips = aiOutput.applicationTips;

    const analysis = await prisma.jobAnalysis.create({
      data: {
        jobText,
        companyName: metadata?.companyName,
        jobTitle: metadata?.jobTitle ?? this.extractTarget(jobText),
        sourceUrl: metadata?.sourceUrl,
        score: match.score,
        matchedSkills,
        missingSkills,
        suggestions: match.suggestions,
        tailoredSummary,
        coverLetter,
        applicationTips,
        savedAt: new Date(),
        resumeId: resume.id
      }
    });

    return {
      analysis,
      aiAssistanceStatus: aiOutput.aiAssistanceStatus,
      aiAssistanceMessage: aiOutput.aiAssistanceMessage
    };
  }

  async getHistory(limit = 10) {
    return prisma.jobAnalysis.findMany({
      orderBy: {
        createdAt: "desc"
      },
      take: limit
    });
  }

  async getById(id: number) {
    const analysis = await prisma.jobAnalysis.findUnique({
      where: { id }
    });

    if (!analysis) {
      throw new AppError({
        code: "ANALYSIS_NOT_FOUND",
        message: "The requested analysis could not be found.",
        statusCode: 404
      });
    }

    return analysis;
  }

  async updateStatus(id: number, status: AnalysisStatus) {
    await this.getById(id);

    return prisma.jobAnalysis.update({
      where: { id },
      data: { status }
    });
  }

  async updateNotes(id: number, notes: string) {
    await this.getById(id);

    return prisma.jobAnalysis.update({
      where: { id },
      data: { notes }
    });
  }

  async deleteById(id: number) {
    await this.getById(id);

    await prisma.jobAnalysis.delete({
      where: { id }
    });
  }

  async deleteAll() {
    const result = await prisma.jobAnalysis.deleteMany();
    return result.count;
  }

  private buildTailoredSummary(
    jobText: string,
    matchedTechnicalSkills: string[],
    matchedSoftSkills: string[],
    missingTechnicalSkills: string[]
  ) {
    const target = this.extractTarget(jobText);
    const strongestSignals = [...matchedTechnicalSkills.slice(0, 3), ...matchedSoftSkills.slice(0, 2)].join(", ") || "foundational technical skills";
    const missingSignals = missingTechnicalSkills.slice(0, 3).join(", ") || "the role priorities";

    return `Candidate is targeting ${target} with resume evidence that aligns most strongly to ${strongestSignals}. The main improvement area is showing clearer evidence for ${missingSignals} using experience already present in the uploaded resume.`;
  }

  private extractTarget(jobText: string) {
    const firstLine = jobText.split("\n").find((line) => line.trim().length > 0);
    return firstLine?.trim().slice(0, 80) || "internship program";
  }
}
