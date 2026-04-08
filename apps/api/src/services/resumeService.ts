import type { Express } from "express";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { safeDeleteFile } from "../lib/fileSystem.js";
import { ResumeParserService } from "./resumeParserService.js";

export class ResumeService {
  constructor(private readonly resumeParserService = new ResumeParserService()) {}

  async createResume(file: Express.Multer.File) {
    try {
      const content = await this.resumeParserService.parseFile(file.path, file.mimetype);

      if (!content) {
        throw new AppError({
          code: "EMPTY_RESUME_TEXT",
          message: "Resume text could not be extracted. Try a cleaner PDF or DOCX export.",
          statusCode: 422
        });
      }

      return await prisma.resume.create({
        data: {
          filename: file.originalname,
          content
        }
      });
    } finally {
      await safeDeleteFile(file.path);
    }
  }

  async getLatestResume() {
    return prisma.resume.findFirst({
      orderBy: {
        createdAt: "desc"
      }
    });
  }

  async getResumeById(id: number) {
    return prisma.resume.findUnique({
      where: {
        id
      }
    });
  }
}
