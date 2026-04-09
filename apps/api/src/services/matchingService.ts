import type { JobMatchDetails, RoleType, ScoreBand } from "@ai-job-copilot/shared";
import { normalizeAnalysisText, uniqueSorted } from "../lib/textNormalization.js";

interface SkillDefinition {
  canonical: string;
  aliases: string[];
}

interface MatchingContext {
  keywords?: string;
  roleType?: RoleType;
  title?: string;
}

interface TechnicalExpectations {
  required: string[];
  optional: string[];
}

const technicalSkillBank: SkillDefinition[] = [
  { canonical: "ai", aliases: ["ai", "artificial intelligence"] },
  { canonical: "algorithms", aliases: ["algorithms", "algorithm design"] },
  { canonical: "aws", aliases: ["aws", "amazon web services"] },
  { canonical: "c++", aliases: ["c++", "cpp"] },
  { canonical: "css", aliases: ["css", "css3"] },
  { canonical: "data analysis", aliases: ["data analysis", "data analytics"] },
  { canonical: "docker", aliases: ["docker", "containerization"] },
  { canonical: "excel", aliases: ["excel", "spreadsheets"] },
  { canonical: "express", aliases: ["express", "express.js"] },
  { canonical: "figma", aliases: ["figma"] },
  { canonical: "git", aliases: ["git", "version control", "github"] },
  { canonical: "html", aliases: ["html", "html5"] },
  { canonical: "javascript", aliases: ["javascript", "ecmascript", "js"] },
  { canonical: "java", aliases: ["java"] },
  { canonical: "linux", aliases: ["linux", "unix"] },
  { canonical: "machine learning", aliases: ["machine learning", "ml"] },
  { canonical: "mongodb", aliases: ["mongodb", "mongo"] },
  { canonical: "next.js", aliases: ["next.js", "nextjs"] },
  { canonical: "node.js", aliases: ["node.js", "nodejs", "node js"] },
  { canonical: "oop", aliases: ["oop", "object oriented programming"] },
  { canonical: "postgresql", aliases: ["postgresql", "postgres"] },
  { canonical: "prisma", aliases: ["prisma"] },
  { canonical: "python", aliases: ["python"] },
  { canonical: "react", aliases: ["react", "react.js"] },
  { canonical: "rest api", aliases: ["rest api", "restful api", "apis"] },
  { canonical: "sql", aliases: ["sql", "queries"] },
  { canonical: "summer training", aliases: ["summer training", "summer internship"] },
  { canonical: "testing", aliases: ["testing", "unit testing"] },
  { canonical: "typescript", aliases: ["typescript", "type script", "ts"] },
  { canonical: "ui/ux", aliases: ["ui/ux", "ux", "user interface", "user experience"] }
];

const softSkillBank: SkillDefinition[] = [
  { canonical: "adaptability", aliases: ["adaptability", "adaptable", "flexible"] },
  { canonical: "communication", aliases: ["communication", "communicate", "presentation"] },
  { canonical: "leadership", aliases: ["leadership", "lead", "mentoring"] },
  { canonical: "problem solving", aliases: ["problem solving", "troubleshooting", "analytical thinking"] },
  { canonical: "self learning", aliases: ["self learning", "self-starter", "fast learner", "quick learner"] },
  { canonical: "teamwork", aliases: ["teamwork", "team player", "collaboration", "collaborative"] },
  { canonical: "time management", aliases: ["time management", "prioritization", "organization"] }
];

const requiredIndicators = [
  "required",
  "requirements",
  "must have",
  "must",
  "need",
  "needs",
  "strong",
  "proficiency",
  "experience with",
  "hands on",
  "knowledge of",
  "solid understanding"
];

const optionalIndicators = [
  "nice to have",
  "preferred",
  "bonus",
  "plus",
  "good to have",
  "would be helpful",
  "familiarity with"
];

const roleTypeSignals: Record<RoleType, string[]> = {
  internship: ["internship", "intern", "student"],
  "summer training": ["summer training", "summer internship", "training program"],
  "entry-level": ["entry level", "entry-level", "junior", "graduate"]
};

function includesAlias(text: string, aliases: string[]) {
  return aliases.some((alias) => text.includes(normalizeAnalysisText(alias)));
}

function detectSkills(text: string, bank: SkillDefinition[]) {
  return uniqueSorted(
    bank
      .filter((skill) => includesAlias(text, skill.aliases))
      .map((skill) => skill.canonical)
  );
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function coverageScore(matched: number, total: number, fallback: number) {
  if (total === 0) {
    return fallback;
  }

  return matched / total;
}

function scoreBand(score: number): ScoreBand {
  if (score >= 85) {
    return "strong match";
  }

  if (score >= 70) {
    return "good match";
  }

  if (score >= 50) {
    return "partial match";
  }

  return "weak match";
}

function buildSuggestions(missingRequiredSkills: string[], missingOptionalSkills: string[], missingSoftSkills: string[]) {
  const lines: string[] = [];

  if (missingRequiredSkills.length > 0) {
    lines.push(`Add clearer evidence for key requirements such as ${missingRequiredSkills.slice(0, 4).join(", ")}.`);
  }

  if (missingOptionalSkills.length > 0) {
    lines.push(`If accurate, surface supporting detail for nice-to-have skills like ${missingOptionalSkills.slice(0, 3).join(", ")}.`);
  }

  if (missingSoftSkills.length > 0) {
    lines.push(`Use project bullets that demonstrate ${missingSoftSkills.slice(0, 3).join(", ")}.`);
  }

  if (lines.length === 0) {
    return "Your resume already aligns with the main role signals. Focus on concise bullets and measurable outcomes.";
  }

  return lines.join(" ");
}

function splitSentences(text: string) {
  return text
    .toLowerCase()
    .split(/[\n.!?;:]+/)
    .map((sentence) => normalizeAnalysisText(sentence))
    .filter((sentence) => sentence.length > 0);
}

function classifyTechnicalExpectations(jobText: string) {
  const required = new Set<string>();
  const optional = new Set<string>();

  for (const sentence of splitSentences(jobText)) {
    const detected = detectSkills(sentence, technicalSkillBank);

    if (detected.length === 0) {
      continue;
    }

    const optionalSentence = optionalIndicators.some((indicator) => sentence.includes(normalizeAnalysisText(indicator)));
    const requiredSentence = requiredIndicators.some((indicator) => sentence.includes(normalizeAnalysisText(indicator)));

    for (const skill of detected) {
      if (optionalSentence && !requiredSentence) {
        optional.add(skill);
      } else {
        required.add(skill);
      }
    }
  }

  const allMentioned = detectSkills(normalizeAnalysisText(jobText), technicalSkillBank);
  const missingClassification = allMentioned.filter((skill) => !required.has(skill) && !optional.has(skill));

  for (const skill of missingClassification) {
    if (required.size < 4) {
      required.add(skill);
    } else {
      optional.add(skill);
    }
  }

  return {
    required: uniqueSorted(Array.from(required)),
    optional: uniqueSorted(Array.from(optional).filter((skill) => !required.has(skill)))
  } satisfies TechnicalExpectations;
}

function keywordOverlapScore(resumeText: string, keywords?: string) {
  const normalizedKeywords = normalizeAnalysisText(keywords ?? "");

  if (!normalizedKeywords) {
    return 0.65;
  }

  const keywordTokens = uniqueSorted(
    normalizedKeywords
      .split(" ")
      .filter((token) => token.length > 2)
  );

  if (keywordTokens.length === 0) {
    return 0.65;
  }

  const matched = keywordTokens.filter((token) => resumeText.includes(token)).length;
  return clamp(matched / keywordTokens.length, 0, 1);
}

function roleRelevanceScore(jobText: string, resumeText: string, context?: MatchingContext) {
  const normalizedJob = normalizeAnalysisText(jobText);
  const normalizedResume = normalizeAnalysisText(resumeText);
  const keywordScore = keywordOverlapScore(normalizedResume, context?.keywords ?? context?.title);

  if (!context?.roleType) {
    return clamp(0.55 + keywordScore * 0.35, 0, 1);
  }

  const signals = roleTypeSignals[context.roleType];
  const jobSignalMatch = signals.some((signal) => normalizedJob.includes(normalizeAnalysisText(signal))) ? 1 : 0.45;
  const resumeSignalMatch = signals.some((signal) => normalizedResume.includes(normalizeAnalysisText(signal))) ? 1 : 0.7;

  return clamp((jobSignalMatch * 0.55) + (resumeSignalMatch * 0.15) + (keywordScore * 0.3), 0, 1);
}

function buildMatchReason(
  score: number,
  matchedRequiredSkills: string[],
  missingRequiredSkills: string[],
  matchedOptionalSkills: string[],
  matchedSoftSkills: string[]
) {
  const leadStrengths = [...matchedRequiredSkills.slice(0, 2), ...matchedOptionalSkills.slice(0, 1), ...matchedSoftSkills.slice(0, 1)]
    .filter(Boolean)
    .slice(0, 3);

  if (score >= 85) {
    return `Strong coverage across the main requirements, especially ${leadStrengths.join(", ") || "the core technical signals"}.`;
  }

  if (score >= 70) {
    return missingRequiredSkills.length > 0
      ? `Good overall fit with evidence for ${leadStrengths.join(", ") || "several key skills"}, but some important gaps remain in ${missingRequiredSkills.slice(0, 2).join(", ")}.`
      : `Good fit with clear alignment in ${leadStrengths.join(", ") || "the required skills"} and only minor gaps.`;
  }

  if (score >= 50) {
    return `Partial fit: the resume supports ${leadStrengths.join(", ") || "some relevant skills"}, but missing requirements reduce confidence.`;
  }

  return `Weak fit because too many high-priority requirements are not clearly supported by the resume yet.`;
}

export class MatchingService {
  analyze(resumeText: string, jobText: string, context?: MatchingContext) {
    const normalizedResume = normalizeAnalysisText(resumeText);
    const normalizedJob = normalizeAnalysisText(jobText);

    const technicalExpectations = classifyTechnicalExpectations(jobText);
    const requestedSoftSkills = detectSkills(normalizedJob, softSkillBank);
    const resumeTechnicalSkills = detectSkills(normalizedResume, technicalSkillBank);
    const resumeSoftSkills = detectSkills(normalizedResume, softSkillBank);

    const matchedRequiredSkills = technicalExpectations.required.filter((skill) => resumeTechnicalSkills.includes(skill));
    const missingRequiredSkills = technicalExpectations.required.filter((skill) => !resumeTechnicalSkills.includes(skill));
    const matchedOptionalSkills = technicalExpectations.optional.filter((skill) => resumeTechnicalSkills.includes(skill));
    const missingOptionalSkills = technicalExpectations.optional.filter((skill) => !resumeTechnicalSkills.includes(skill));
    const matchedSoftSkills = requestedSoftSkills.filter((skill) => resumeSoftSkills.includes(skill));
    const missingSoftSkills = requestedSoftSkills.filter((skill) => !resumeSoftSkills.includes(skill));

    const requiredCoverage = coverageScore(matchedRequiredSkills.length, technicalExpectations.required.length, 0.72);
    const optionalCoverage = coverageScore(matchedOptionalSkills.length, technicalExpectations.optional.length, 0.55);
    const softCoverage = coverageScore(matchedSoftSkills.length, requestedSoftSkills.length, 0.6);
    const roleRelevance = roleRelevanceScore(jobText, resumeText, context);

    const requiredPoints = 52 * Math.pow(requiredCoverage, 0.92);
    const optionalPoints = 18 * Math.pow(optionalCoverage, 0.95);
    const softPoints = 10 * Math.pow(softCoverage, 0.9);
    const rolePoints = 12 * roleRelevance;
    const breadthBonus = Math.min(
      8,
      uniqueSorted([...matchedRequiredSkills, ...matchedOptionalSkills]).length * 1.6
    );
    const requiredPenalty = technicalExpectations.required.length === 0
      ? 0
      : (missingRequiredSkills.length / technicalExpectations.required.length) * 24;
    const optionalPenalty = technicalExpectations.optional.length === 0
      ? 0
      : (missingOptionalSkills.length / technicalExpectations.optional.length) * 5;
    const rawScore = 8 + requiredPoints + optionalPoints + softPoints + rolePoints + breadthBonus - requiredPenalty - optionalPenalty;
    const score = clamp(Math.round(rawScore), 0, 100);
    const matchedTechnicalSkills = uniqueSorted([...matchedRequiredSkills, ...matchedOptionalSkills]);
    const missingTechnicalSkills = uniqueSorted([...missingRequiredSkills, ...missingOptionalSkills]);
    const finalScoreBand = scoreBand(score);
    const matchReason = buildMatchReason(
      score,
      matchedRequiredSkills,
      missingRequiredSkills,
      matchedOptionalSkills,
      matchedSoftSkills
    );

    return {
      score,
      scoreBand: finalScoreBand,
      matchReason,
      matchedRequiredSkills,
      missingRequiredSkills,
      matchedOptionalSkills,
      missingOptionalSkills,
      matchedTechnicalSkills,
      missingTechnicalSkills,
      matchedSoftSkills,
      missingSoftSkills,
      roleRelevance: Math.round(roleRelevance * 100),
      suggestions: buildSuggestions(missingRequiredSkills, missingOptionalSkills, missingSoftSkills),
      matchDetails: {
        matchedRequiredSkills,
        missingRequiredSkills,
        matchedOptionalSkills,
        missingOptionalSkills,
        matchedSoftSkills,
        missingSoftSkills,
        scoreBand: finalScoreBand
      } satisfies JobMatchDetails
    };
  }
}
