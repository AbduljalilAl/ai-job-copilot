import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { JobAnalysisService } from "../services/jobAnalysisService.js";

const analyzeSchema = z.object({
  jobText: z.string().min(30, "Job description must be at least 30 characters long."),
  resumeId: z.number().int().positive().optional()
});

const jobAnalysisService = new JobAnalysisService();

export async function analyzeJob(request: Request, response: Response, next: NextFunction) {
  try {
    const payload = analyzeSchema.parse(request.body);
    const analysis = await jobAnalysisService.analyze(payload.jobText, payload.resumeId);

    response.status(201).json({
      analysis: {
        ...analysis,
        matchedSkills: analysis.matchedSkills as string[],
        missingSkills: analysis.missingSkills as string[],
        createdAt: analysis.createdAt.toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
}
