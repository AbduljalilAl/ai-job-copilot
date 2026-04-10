import type { JobResponse, JobSearchRequest, JobSearchResponse } from "@ai-job-copilot/shared";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { mapJobOpportunity } from "../lib/jobOpportunityMapper.js";
import { JobOpportunityService } from "../services/jobOpportunityService.js";

const searchSchema = z.object({
  keywords: z.string().trim().min(2, "Enter at least one keyword for job search.").max(120, "Keywords must be 120 characters or fewer."),
  location: z.string().trim().max(120, "Location must be 120 characters or fewer.").optional().or(z.literal("")),
  remoteOnly: z.boolean().optional(),
  roleType: z.enum(["internship", "summer training", "entry-level"]),
  focusArea: z.string().trim().max(120, "Focus area must be 120 characters or fewer.").optional().or(z.literal("")),
  preferenceText: z.string().trim().max(400, "Preference description must be 400 characters or fewer.").optional().or(z.literal(""))
});

const paramsSchema = z.object({
  id: z.coerce.number().int().positive()
});

const jobOpportunityService = new JobOpportunityService();

export async function searchJobs(request: Request, response: Response, next: NextFunction) {
  try {
    const payload = searchSchema.parse(request.body) satisfies JobSearchRequest;
    const jobs = await jobOpportunityService.search(payload);
    const responsePayload: JobSearchResponse = {
      jobs: jobs.map(mapJobOpportunity)
    };

    response.status(201).json(responsePayload);
  } catch (error) {
    next(error);
  }
}

export async function getJobs(_request: Request, response: Response, next: NextFunction) {
  try {
    const jobs = await jobOpportunityService.list();
    const responsePayload: JobSearchResponse = {
      jobs: jobs.map(mapJobOpportunity)
    };

    response.json(responsePayload);
  } catch (error) {
    next(error);
  }
}

export async function getJobById(request: Request, response: Response, next: NextFunction) {
  try {
    const { id } = paramsSchema.parse(request.params);
    const job = await jobOpportunityService.getById(id);
    const responsePayload: JobResponse = {
      job: mapJobOpportunity(job)
    };

    response.json(responsePayload);
  } catch (error) {
    next(error);
  }
}
