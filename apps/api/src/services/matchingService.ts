import { normalizeAnalysisText, uniqueSorted } from "../lib/textNormalization.js";

interface SkillDefinition {
  canonical: string;
  aliases: string[];
}

const technicalSkillBank: SkillDefinition[] = [
  { canonical: "ai", aliases: ["ai", "artificial intelligence"] },
  { canonical: "algorithms", aliases: ["algorithms", "algorithm design"] },
  { canonical: "css", aliases: ["css", "css3"] },
  { canonical: "docker", aliases: ["docker", "containerization"] },
  { canonical: "express", aliases: ["express", "express.js"] },
  { canonical: "figma", aliases: ["figma"] },
  { canonical: "git", aliases: ["git", "version control"] },
  { canonical: "html", aliases: ["html", "html5"] },
  { canonical: "javascript", aliases: ["javascript", "ecmascript", "js"] },
  { canonical: "java", aliases: ["java"] },
  { canonical: "machine learning", aliases: ["machine learning", "ml"] },
  { canonical: "node.js", aliases: ["node.js", "nodejs", "node js"] },
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

function buildSuggestions(missingTechnicalSkills: string[], missingSoftSkills: string[]) {
  const lines: string[] = [];

  if (missingTechnicalSkills.length > 0) {
    lines.push(`Add stronger evidence for: ${missingTechnicalSkills.slice(0, 5).join(", ")}.`);
  }

  if (missingSoftSkills.length > 0) {
    lines.push(`Use project bullets that show ${missingSoftSkills.slice(0, 3).join(", ")} in action.`);
  }

  if (lines.length === 0) {
    return "Your resume already aligns with the main role signals. Focus on measurable outcomes and concise wording.";
  }

  return lines.join(" ");
}

export class MatchingService {
  analyze(resumeText: string, jobText: string) {
    const normalizedResume = normalizeAnalysisText(resumeText);
    const normalizedJob = normalizeAnalysisText(jobText);

    const requestedTechnicalSkills = detectSkills(normalizedJob, technicalSkillBank);
    const requestedSoftSkills = detectSkills(normalizedJob, softSkillBank);
    const resumeTechnicalSkills = detectSkills(normalizedResume, technicalSkillBank);
    const resumeSoftSkills = detectSkills(normalizedResume, softSkillBank);

    const matchedTechnicalSkills = requestedTechnicalSkills.filter((skill) => resumeTechnicalSkills.includes(skill));
    const missingTechnicalSkills = requestedTechnicalSkills.filter((skill) => !resumeTechnicalSkills.includes(skill));
    const matchedSoftSkills = requestedSoftSkills.filter((skill) => resumeSoftSkills.includes(skill));
    const missingSoftSkills = requestedSoftSkills.filter((skill) => !resumeSoftSkills.includes(skill));

    const technicalWeight = requestedTechnicalSkills.length * 0.75;
    const softWeight = requestedSoftSkills.length * 0.25;
    const totalWeight = technicalWeight + softWeight;
    const matchedWeight = (matchedTechnicalSkills.length * 0.75) + (matchedSoftSkills.length * 0.25);
    const score = totalWeight === 0 ? 50 : Math.round((matchedWeight / totalWeight) * 100);

    return {
      score,
      matchedTechnicalSkills,
      missingTechnicalSkills,
      matchedSoftSkills,
      missingSoftSkills,
      suggestions: buildSuggestions(missingTechnicalSkills, missingSoftSkills)
    };
  }
}
