import { prisma } from "../lib/prisma.js";
import { TextExtractionService } from "./textExtractionService.js";

export class ResumeService {
  constructor(private readonly textExtractionService = new TextExtractionService()) {}

  async createResume(file: Express.Multer.File) {
    const content = await this.textExtractionService.extractFromFile(file.path, file.mimetype);

    return prisma.resume.create({
      data: {
        filename: file.originalname,
        content
      }
    });
  }

  async getLatestResume() {
    return prisma.resume.findFirst({
      orderBy: {
        createdAt: "desc"
      }
    });
  }
}

