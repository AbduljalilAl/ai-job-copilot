import { prisma } from "../lib/prisma.js";
import { AIService } from "./aiService.js";
import { MatchingService } from "./matchingService.js";
import { ResumeService } from "./resumeService.js";

export class JobAnalysisService {
  constructor(
    private readonly resumeService = new ResumeService(),
    private readonly matchingService = new MatchingService(),
    private readonly aiService = new AIService()
  ) {}

  async analyze(jobText: string, resumeId?: number) {
    const resume = resumeId
      ? await prisma.resume.findUnique({ where: { id: resumeId } })
      : await this.resumeService.getLatestResume();

    if (!resume) {
      throw new Error("No resume found. Upload a resume before running analysis.");
    }

    const match = this.matchingService.analyze(resume.content, jobText);
    const tailoredSummary = this.aiService.generateTailoredSummary(resume.content, jobText, match.matchedSkills, match.missingSkills);
    const coverLetter = this.aiService.generateCoverLetter(jobText, match.matchedSkills);

    return prisma.jobAnalysis.create({
      data: {
        jobText,
        score: match.score,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        suggestions: match.suggestions,
        tailoredSummary,
        coverLetter,
        resumeId: resume.id
      }
    });
  }
}
