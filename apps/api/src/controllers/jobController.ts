import type {
  AnalysisHistoryResponse,
  AnalysisResponse,
  DeleteAnalysesResponse,
  UpdateAnalysisNotesRequest,
  UpdateAnalysisStatusRequest
} from "@ai-job-copilot/shared";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { mapStoredAnalysis } from "../lib/analysisMapper.js";
import { JobAnalysisService } from "../services/jobAnalysisService.js";

const analyzeSchema = z.object({
  jobText: z
    .string()
    .trim()
    .min(30, "Job description must be at least 30 characters long.")
    .max(12000, "Job description must be 12000 characters or fewer."),
  resumeId: z.number().int().positive().optional(),
  companyName: z.string().trim().max(120, "Company name must be 120 characters or fewer.").optional(),
  jobTitle: z.string().trim().max(160, "Job title must be 160 characters or fewer.").optional(),
  sourceUrl: z.string().trim().url("Source URL must be a valid URL.").max(500, "Source URL must be 500 characters or fewer.").optional()
});
const paramsSchema = z.object({
  id: z.coerce.number().int().positive()
});
const statusSchema = z.object({
  status: z.enum(["saved", "applied", "interview", "rejected"])
});
const notesSchema = z.object({
  notes: z.string().trim().max(3000, "Notes must be 3000 characters or fewer.")
});

const jobAnalysisService = new JobAnalysisService();

export async function analyzeJob(request: Request, response: Response, next: NextFunction) {
  try {
    const payload = analyzeSchema.parse(request.body);
    const result = await jobAnalysisService.analyze(payload.jobText, payload.resumeId, {
      companyName: payload.companyName,
      jobTitle: payload.jobTitle,
      sourceUrl: payload.sourceUrl
    });
    const responsePayload: AnalysisResponse = {
      analysis: mapStoredAnalysis(result.analysis, result.aiAssistanceStatus, result.aiAssistanceMessage)
    };

    response.status(201).json(responsePayload);
  } catch (error) {
    next(error);
  }
}

export async function getAnalysisHistory(_request: Request, response: Response, next: NextFunction) {
  try {
    const analyses = await jobAnalysisService.getHistory(10);
    const responsePayload: AnalysisHistoryResponse = {
      analyses: analyses.map((analysis) => mapStoredAnalysis(analysis))
    };

    response.json(responsePayload);
  } catch (error) {
    next(error);
  }
}

export async function getAnalysisById(request: Request, response: Response, next: NextFunction) {
  try {
    const { id } = paramsSchema.parse(request.params);
    const analysis = await jobAnalysisService.getById(id);
    const responsePayload: AnalysisResponse = {
      analysis: mapStoredAnalysis(analysis)
    };

    response.json(responsePayload);
  } catch (error) {
    next(error);
  }
}

export async function updateAnalysisStatus(request: Request, response: Response, next: NextFunction) {
  try {
    const { id } = paramsSchema.parse(request.params);
    const payload = statusSchema.parse(request.body) satisfies UpdateAnalysisStatusRequest;
    const analysis = await jobAnalysisService.updateStatus(id, payload.status);
    const responsePayload: AnalysisResponse = {
      analysis: mapStoredAnalysis(analysis)
    };

    response.json(responsePayload);
  } catch (error) {
    next(error);
  }
}

export async function updateAnalysisNotes(request: Request, response: Response, next: NextFunction) {
  try {
    const { id } = paramsSchema.parse(request.params);
    const payload = notesSchema.parse(request.body) satisfies UpdateAnalysisNotesRequest;
    const analysis = await jobAnalysisService.updateNotes(id, payload.notes);
    const responsePayload: AnalysisResponse = {
      analysis: mapStoredAnalysis(analysis)
    };

    response.json(responsePayload);
  } catch (error) {
    next(error);
  }
}

export async function deleteAnalysisById(request: Request, response: Response, next: NextFunction) {
  try {
    const { id } = paramsSchema.parse(request.params);
    await jobAnalysisService.deleteById(id);
    const responsePayload: DeleteAnalysesResponse = {
      deletedCount: 1
    };

    response.json(responsePayload);
  } catch (error) {
    next(error);
  }
}

export async function deleteAllAnalyses(_request: Request, response: Response, next: NextFunction) {
  try {
    const deletedCount = await jobAnalysisService.deleteAll();
    const responsePayload: DeleteAnalysesResponse = {
      deletedCount
    };

    response.json(responsePayload);
  } catch (error) {
    next(error);
  }
}
