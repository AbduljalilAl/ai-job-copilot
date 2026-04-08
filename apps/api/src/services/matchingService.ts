import type { AnalysisResult } from "@ai-job-copilot/shared";

const skillBank = [
  "javascript",
  "typescript",
  "react",
  "node.js",
  "express",
  "postgresql",
  "prisma",
  "sql",
  "python",
  "java",
  "html",
  "css",
  "git",
  "rest api",
  "problem solving",
  "teamwork",
  "communication",
  "data structures",
  "algorithms",
  "testing",
  "docker",
  "figma",
  "ui/ux",
  "machine learning",
  "ai",
  "internship",
  "summer training"
];

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class MatchingService {
  analyze(resumeText: string, jobText: string): Omit<AnalysisResult, "tailoredSummary" | "coverLetter"> {
    const normalizedResume = resumeText.toLowerCase();
    const normalizedJob = jobText.toLowerCase();
    const relevantKeywords = skillBank.filter((keyword) => new RegExp(`\\b${escapeRegex(keyword)}\\b`, "i").test(normalizedJob));
    const keywordPool = relevantKeywords.length > 0 ? relevantKeywords : skillBank.filter((keyword) => normalizedJob.includes(keyword));
    const matchedSkills = keywordPool.filter((keyword) => normalizedResume.includes(keyword));
    const missingSkills = keywordPool.filter((keyword) => !normalizedResume.includes(keyword));
    const score = keywordPool.length === 0 ? 50 : Math.min(100, Math.round((matchedSkills.length / keywordPool.length) * 100));
    const suggestions = missingSkills.length === 0
      ? "Your resume already reflects the main role keywords. Tighten the wording with measurable internship outcomes."
      : `Add evidence for: ${missingSkills.slice(0, 6).join(", ")}. Focus on coursework, projects, and trainee-ready achievements.`;

    return {
      score,
      matchedSkills,
      missingSkills,
      suggestions
    };
  }
}

