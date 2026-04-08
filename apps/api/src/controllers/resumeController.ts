import type { NextFunction, Request, Response } from "express";
import { ResumeService } from "../services/resumeService.js";

const resumeService = new ResumeService();

export async function uploadResume(request: Request, response: Response, next: NextFunction) {
  try {
    if (!request.file) {
      response.status(400).json({ message: "Resume file is required." });
      return;
    }

    const resume = await resumeService.createResume(request.file);

    response.status(201).json({
      resume: {
        ...resume,
        createdAt: resume.createdAt.toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
}
