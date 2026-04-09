import type { RoleType } from "@ai-job-copilot/shared";
import { normalizeAnalysisText } from "../lib/textNormalization.js";

export interface RawJobOpportunity {
  title: string;
  companyName: string;
  location: string;
  source: string;
  sourceUrl: string;
  applyUrl?: string;
  description: string;
  employmentType?: string;
  roleType?: RoleType;
  remoteType?: string;
}

export interface JobSearchPreferences {
  keywords: string;
  location?: string;
  remoteOnly?: boolean;
  roleType: RoleType;
}

export interface JobProvider {
  search(preferences: JobSearchPreferences): Promise<RawJobOpportunity[]>;
}

const mockJobs: RawJobOpportunity[] = [
  {
    title: "Frontend Engineering Intern",
    companyName: "Blue Orbit Labs",
    location: "Riyadh, Saudi Arabia",
    source: "seed",
    sourceUrl: "seed://blue-orbit/frontend-engineering-intern",
    applyUrl: "https://careers.example.com/blue-orbit/frontend-engineering-intern",
    roleType: "internship",
    remoteType: "hybrid",
    employmentType: "Internship",
    description: "Frontend engineering internship focused on React, TypeScript, HTML, CSS, and teamwork. Required: React, JavaScript or TypeScript, Git, problem solving, communication. Nice to have: Next.js, testing, Figma. This role supports product teams building dashboards and internal tools."
  },
  {
    title: "Backend Summer Training Trainee",
    companyName: "Cloud Harbor",
    location: "Jeddah, Saudi Arabia",
    source: "seed",
    sourceUrl: "seed://cloud-harbor/backend-summer-training",
    applyUrl: "https://careers.example.com/cloud-harbor/backend-summer-training",
    roleType: "summer training",
    remoteType: "onsite",
    employmentType: "Summer training",
    description: "Summer training opportunity for backend development. Required: Node.js, Express, REST API design, PostgreSQL, SQL, Git. Strong communication and teamwork are expected. Nice to have: Docker, Prisma, testing. Ideal for students who want hands-on API and database experience."
  },
  {
    title: "Junior Full Stack Developer",
    companyName: "Northstar Systems",
    location: "Remote",
    source: "seed",
    sourceUrl: "seed://northstar/junior-full-stack-developer",
    applyUrl: "https://careers.example.com/northstar/junior-full-stack-developer",
    roleType: "entry-level",
    remoteType: "remote",
    employmentType: "Full-time",
    description: "Entry-level full stack role building internal platforms. Required: React, Node.js, TypeScript, PostgreSQL, Git, problem solving. Nice to have: Docker, AWS, Prisma, testing. Candidates should be comfortable learning quickly and collaborating across product and engineering."
  },
  {
    title: "Data Analyst Intern",
    companyName: "Metric Bridge",
    location: "Dammam, Saudi Arabia",
    source: "seed",
    sourceUrl: "seed://metric-bridge/data-analyst-intern",
    applyUrl: "https://careers.example.com/metric-bridge/data-analyst-intern",
    roleType: "internship",
    remoteType: "hybrid",
    employmentType: "Internship",
    description: "Internship for students interested in data analysis and reporting. Required: SQL, Excel, communication, problem solving. Preferred: Python, machine learning, presentation skills. Responsibilities include dashboard support, data cleanup, and clear reporting."
  },
  {
    title: "Software Engineering Training Program",
    companyName: "Crescent Digital",
    location: "Riyadh, Saudi Arabia",
    source: "seed",
    sourceUrl: "seed://crescent-digital/software-engineering-training-program",
    roleType: "summer training",
    remoteType: "hybrid",
    employmentType: "Training program",
    description: "Training program for aspiring software engineers. Required: JavaScript, HTML, CSS, Git, teamwork, self learning. Nice to have: React, Node.js, UI/UX, problem solving. Students will rotate between frontend and backend assignments."
  },
  {
    title: "Junior QA Automation Engineer",
    companyName: "Signal Works",
    location: "Remote",
    source: "seed",
    sourceUrl: "seed://signal-works/junior-qa-automation-engineer",
    applyUrl: "https://careers.example.com/signal-works/junior-qa-automation-engineer",
    roleType: "entry-level",
    remoteType: "remote",
    employmentType: "Full-time",
    description: "Entry-level QA automation role. Required: testing, JavaScript, REST API, Git, communication, time management. Preferred: TypeScript, Node.js, Docker. The team needs someone detail oriented with strong problem solving habits."
  },
  {
    title: "Machine Learning Intern",
    companyName: "Vision Grid",
    location: "Khobar, Saudi Arabia",
    source: "seed",
    sourceUrl: "seed://vision-grid/machine-learning-intern",
    applyUrl: "https://careers.example.com/vision-grid/machine-learning-intern",
    roleType: "internship",
    remoteType: "onsite",
    employmentType: "Internship",
    description: "Machine learning internship for students with Python and data analysis exposure. Required: Python, machine learning, algorithms, communication. Nice to have: SQL, data analysis, teamwork. This role supports experimentation, model evaluation, and reporting."
  },
  {
    title: "UI/UX Design Intern",
    companyName: "Harbor Studio",
    location: "Remote",
    source: "seed",
    sourceUrl: "seed://harbor-studio/ui-ux-design-intern",
    applyUrl: undefined,
    roleType: "internship",
    remoteType: "remote",
    employmentType: "Internship",
    description: "Design internship supporting product discovery and interface refinement. Required: UI/UX, Figma, communication, teamwork. Nice to have: HTML, CSS, adaptability. Candidates should present clear rationale for design decisions and collaborate with engineers."
  }
];

function normalizeRoleType(value: RoleType) {
  return normalizeAnalysisText(value).replace(" ", "_");
}

export class MockJobProvider implements JobProvider {
  async search(preferences: JobSearchPreferences) {
    const normalizedKeywords = normalizeAnalysisText(preferences.keywords);
    const keywordTokens = normalizedKeywords.split(" ").filter((token) => token.length > 2);
    const normalizedLocation = normalizeAnalysisText(preferences.location ?? "");
    const normalizedRoleType = normalizeRoleType(preferences.roleType);

    return mockJobs.filter((job) => {
      const haystack = normalizeAnalysisText(`${job.title} ${job.companyName} ${job.description}`);
      const matchesKeywords = keywordTokens.length === 0 || keywordTokens.some((token) => haystack.includes(token));
      const matchesLocation = !normalizedLocation
        || normalizeAnalysisText(job.location).includes(normalizedLocation)
        || normalizeAnalysisText(job.remoteType ?? "").includes(normalizedLocation);
      const matchesRemote = !preferences.remoteOnly || job.remoteType === "remote";
      const matchesRoleType = !job.roleType || normalizeRoleType(job.roleType) === normalizedRoleType;

      return matchesKeywords && matchesLocation && matchesRemote && matchesRoleType;
    });
  }
}
