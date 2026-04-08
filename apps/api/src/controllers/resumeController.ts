import type { ResumeUploadResponse } from "@ai-job-copilot/shared";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import { ResumeService } from "../services/resumeService.js";

const resumeService = new ResumeService();

export async function uploadResume(request: Request, response: Response, next: NextFunction) {
  try {
    if (!request.file) {
      throw new AppError({
        code: "MISSING_RESUME_FILE",
        message: "Select a PDF or DOCX resume file before uploading.",
        statusCode: 400
      });
    }

    const resume = await resumeService.createResume(request.file);

    const payload: ResumeUploadResponse = {
      resume: {
        ...resume,
        createdAt: resume.createdAt.toISOString()
      }
    };

    response.status(201).json(payload);
  } catch (error) {
    next(error);
  }
}
