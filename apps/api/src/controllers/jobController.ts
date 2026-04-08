import type { JobAnalyzeResponse, SkillBuckets } from "@ai-job-copilot/shared";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { JobAnalysisService } from "../services/jobAnalysisService.js";

const analyzeSchema = z.object({
  jobText: z
    .string()
    .trim()
    .min(30, "Job description must be at least 30 characters long.")
    .max(12000, "Job description must be 12000 characters or fewer."),
  resumeId: z.number().int().positive().optional()
});

const jobAnalysisService = new JobAnalysisService();

export async function analyzeJob(request: Request, response: Response, next: NextFunction) {
  try {
    const payload = analyzeSchema.parse(request.body);
    const result = await jobAnalysisService.analyze(payload.jobText, payload.resumeId);
    const matchedSkills = result.analysis.matchedSkills as unknown as SkillBuckets;
    const missingSkills = result.analysis.missingSkills as unknown as SkillBuckets;

    const responsePayload: JobAnalyzeResponse = {
      analysis: {
        id: result.analysis.id,
        jobText: result.analysis.jobText,
        score: result.analysis.score,
        matchedTechnicalSkills: matchedSkills.technical,
        missingTechnicalSkills: missingSkills.technical,
        matchedSoftSkills: matchedSkills.soft,
        missingSoftSkills: missingSkills.soft,
        suggestions: result.analysis.suggestions,
        tailoredSummary: result.analysis.tailoredSummary,
        coverLetter: result.analysis.coverLetter,
        applicationTips: result.analysis.applicationTips,
        aiAssistanceStatus: result.aiAssistanceStatus,
        aiAssistanceMessage: result.aiAssistanceMessage,
        createdAt: result.analysis.createdAt.toISOString()
      }
    };

    response.status(201).json(responsePayload);
  } catch (error) {
    next(error);
  }
}
