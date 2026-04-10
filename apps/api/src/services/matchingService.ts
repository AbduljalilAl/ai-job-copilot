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

interface RoleFamilyDefinition {
  family: string;
  aliases: string[];
}

interface RoleAlignment {
  score: number;
  candidateFamilies: string[];
  jobFamilies: string[];
  summary: string;
  seniority: "entry" | "mid" | "senior";
  shouldExclude: boolean;
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

const roleFamilyBank: RoleFamilyDefinition[] = [
  { family: "software engineering", aliases: ["software engineer", "software engineering", "backend", "frontend", "full stack", "developer", "web engineer", "application engineer"] },
  { family: "network engineering", aliases: ["network engineer", "computer networks", "networking", "tcp ip", "routing", "switching", "cisco", "ccna"] },
  { family: "cloud and devops", aliases: ["cloud engineer", "devops", "platform engineer", "site reliability", "sre", "aws", "infrastructure"] },
  { family: "cybersecurity", aliases: ["security engineer", "cybersecurity", "information security", "soc", "penetration testing"] },
  { family: "embedded and iot", aliases: ["embedded", "iot", "firmware", "microcontroller", "hardware", "robotics"] },
  { family: "data and ai", aliases: ["data analyst", "data engineer", "machine learning", "ai engineer", "artificial intelligence"] },
  { family: "quality assurance", aliases: ["qa", "quality assurance", "test automation", "automation engineer", "sdet"] }
];

const disfavoredRoleFamilyBank: RoleFamilyDefinition[] = [
  { family: "sales", aliases: ["sales", "sales engineer", "account executive", "business development", "revenue", "quota"] },
  { family: "customer success", aliases: ["customer success", "customer support", "support engineer", "technical support", "implementation specialist"] },
  { family: "marketing", aliases: ["marketing", "growth", "content", "seo", "brand"] },
  { family: "recruiting", aliases: ["recruiter", "recruiting", "talent acquisition", "hr", "human resources"] },
  { family: "finance", aliases: ["finance", "accounting", "controller", "financial analyst"] },
  { family: "legal", aliases: ["legal", "compliance counsel", "paralegal", "contract manager"] }
];

const technicalCareerFamilies = new Set([
  "software engineering",
  "network engineering",
  "cloud and devops",
  "cybersecurity",
  "embedded and iot",
  "data and ai",
  "quality assurance"
]);

const seniorIndicators = ["senior", "staff", "principal", "lead", "manager", "director", "head of", "architect"];
const entryIndicators = ["intern", "internship", "junior", "graduate", "entry level", "entry-level", "trainee", "summer training"];

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

function detectRoleFamilies(text: string, bank: RoleFamilyDefinition[]) {
  return uniqueSorted(
    bank
      .filter((family) => includesAlias(text, family.aliases))
      .map((family) => family.family)
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

function detectSeniority(text: string): "entry" | "mid" | "senior" {
  const normalized = normalizeAnalysisText(text);

  if (seniorIndicators.some((indicator) => normalized.includes(normalizeAnalysisText(indicator)))) {
    return "senior";
  }

  if (entryIndicators.some((indicator) => normalized.includes(normalizeAnalysisText(indicator)))) {
    return "entry";
  }

  return "mid";
}

function deriveCandidateRoleFamilies(resumeText: string, context?: MatchingContext) {
  const combined = normalizeAnalysisText([resumeText, context?.keywords, context?.title].filter(Boolean).join(" "));
  const families = detectRoleFamilies(combined, roleFamilyBank);

  if (families.length > 0) {
    return families;
  }

  const technicalSignals = detectSkills(combined, technicalSkillBank);

  if (technicalSignals.some((skill) => ["react", "typescript", "javascript", "node.js", "express", "postgresql", "prisma"].includes(skill))) {
    return ["software engineering"];
  }

  if (technicalSignals.some((skill) => ["linux", "aws", "docker"].includes(skill)) || combined.includes("computer networks") || combined.includes("network")) {
    return ["network engineering", "cloud and devops"];
  }

  return ["software engineering"];
}

function evaluateRoleAlignment(jobText: string, resumeText: string, context?: MatchingContext): RoleAlignment {
  const normalizedJob = normalizeAnalysisText(jobText);
  const candidateFamilies = deriveCandidateRoleFamilies(resumeText, context);
  const jobFamilies = detectRoleFamilies(normalizedJob, roleFamilyBank);
  const disfavoredJobFamilies = detectRoleFamilies(normalizedJob, disfavoredRoleFamilyBank);
  const seniority = detectSeniority([context?.title, jobText].filter(Boolean).join(" "));
  const overlappingFamilies = candidateFamilies.filter((family) => jobFamilies.includes(family));
  const candidateTechnical = candidateFamilies.some((family) => technicalCareerFamilies.has(family));
  const jobTechnical = jobFamilies.some((family) => technicalCareerFamilies.has(family));

  let score = 0.55;
  let shouldExclude = false;
  let summary = "The role is broadly relevant to the candidate's technical background.";

  if (overlappingFamilies.length > 0) {
    score = 0.95;
    summary = `The role aligns directly with ${overlappingFamilies.join(", ")}.`;
  } else if (candidateTechnical && jobTechnical) {
    score = 0.68;
    summary = "The role is in a related technical track, but not the strongest direct family match.";
  } else if (disfavoredJobFamilies.length > 0 && candidateTechnical) {
    score = 0.08;
    shouldExclude = true;
    summary = `The role is primarily ${disfavoredJobFamilies.join(", ")}, which does not fit the candidate's technical track.`;
  } else if (jobFamilies.length > 0) {
    score = 0.28;
    summary = `The role leans toward ${jobFamilies.join(", ")}, which looks weaker for this resume.`;
  }

  if (seniority === "senior" && context?.roleType && context.roleType !== "entry-level") {
    score = Math.min(score, 0.22);
    shouldExclude = true;
    summary = "The role is senior-level, which is not a realistic fit for an internship or training-focused resume.";
  } else if (seniority === "senior" && context?.roleType === "entry-level") {
    score = Math.min(score, 0.3);
    summary = "The role is senior-level, which is likely too advanced for the candidate's current stage.";
  } else if (seniority === "entry" && context?.roleType) {
    score = Math.min(1, score + 0.08);
  }

  return {
    score: clamp(score, 0, 1),
    candidateFamilies,
    jobFamilies: uniqueSorted([...jobFamilies, ...disfavoredJobFamilies]),
    summary,
    seniority,
    shouldExclude
  };
}

function roleRelevanceScore(jobText: string, resumeText: string, context?: MatchingContext) {
  const normalizedJob = normalizeAnalysisText(jobText);
  const normalizedResume = normalizeAnalysisText(resumeText);
  const keywordScore = keywordOverlapScore(normalizedResume, context?.keywords ?? context?.title);
  const roleAlignment = evaluateRoleAlignment(jobText, resumeText, context);

  if (!context?.roleType) {
    return clamp((0.35 + keywordScore * 0.25) + (roleAlignment.score * 0.4), 0, 1);
  }

  const signals = roleTypeSignals[context.roleType];
  const jobSignalMatch = signals.some((signal) => normalizedJob.includes(normalizeAnalysisText(signal))) ? 1 : 0.45;
  const resumeSignalMatch = signals.some((signal) => normalizedResume.includes(normalizeAnalysisText(signal))) ? 1 : 0.7;

  return clamp((jobSignalMatch * 0.35) + (resumeSignalMatch * 0.1) + (keywordScore * 0.2) + (roleAlignment.score * 0.35), 0, 1);
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
    const roleAlignment = evaluateRoleAlignment(jobText, resumeText, context);

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
    const roleMismatchPenalty = (1 - roleAlignment.score) * 28;
    const exclusionPenalty = roleAlignment.shouldExclude ? 18 : 0;
    const rawScore = 8 + requiredPoints + optionalPoints + softPoints + rolePoints + breadthBonus - requiredPenalty - optionalPenalty - roleMismatchPenalty - exclusionPenalty;
    const scoreCap = roleAlignment.shouldExclude ? 42 : 100;
    const score = clamp(Math.round(rawScore), 0, scoreCap);
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
      shouldAutoExclude: roleAlignment.shouldExclude,
      roleAlignmentSummary: roleAlignment.summary,
      candidateRoleFamilies: roleAlignment.candidateFamilies,
      jobRoleFamilies: roleAlignment.jobFamilies,
      seniority: roleAlignment.seniority,
      roleRelevance: Math.round(roleRelevance * 100),
      suggestions: buildSuggestions(missingRequiredSkills, missingOptionalSkills, missingSoftSkills),
      matchDetails: {
        matchedRequiredSkills,
        missingRequiredSkills,
        matchedOptionalSkills,
        missingOptionalSkills,
        matchedSoftSkills,
        missingSoftSkills,
        scoreBand: finalScoreBand,
        roleAlignmentSummary: roleAlignment.summary,
        candidateRoleFamilies: roleAlignment.candidateFamilies,
        jobRoleFamilies: roleAlignment.jobFamilies,
        seniority: roleAlignment.seniority
      } satisfies JobMatchDetails
    };
  }
}
