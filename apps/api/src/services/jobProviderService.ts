import type { RoleType } from "@ai-job-copilot/shared";
import { env } from "../config/env.js";
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
  focusArea?: string;
  preferenceText?: string;
}

export interface JobProvider {
  search(preferences: JobSearchPreferences): Promise<RawJobOpportunity[]>;
}

interface GreenhouseBoardResponse {
  name?: string;
}

interface GreenhouseJobsResponse {
  jobs?: GreenhouseJobPost[];
}

interface GreenhouseJobPost {
  title?: string;
  location?: {
    name?: string;
  };
  absolute_url?: string;
  content?: string;
  updated_at?: string;
  offices?: Array<{
    location?: string;
    name?: string;
  }>;
}

const mockJobs: RawJobOpportunity[] = [
  {
    title: "Frontend Engineering Intern",
    companyName: "Blue Orbit Labs",
    location: "Riyadh, Saudi Arabia",
    source: "mock",
    sourceUrl: "mock://blue-orbit/frontend-engineering-intern",
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
    source: "mock",
    sourceUrl: "mock://cloud-harbor/backend-summer-training",
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
    source: "mock",
    sourceUrl: "mock://northstar/junior-full-stack-developer",
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
    source: "mock",
    sourceUrl: "mock://metric-bridge/data-analyst-intern",
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
    source: "mock",
    sourceUrl: "mock://crescent-digital/software-engineering-training-program",
    roleType: "summer training",
    remoteType: "hybrid",
    employmentType: "Training program",
    description: "Training program for aspiring software engineers. Required: JavaScript, HTML, CSS, Git, teamwork, self learning. Nice to have: React, Node.js, UI/UX, problem solving. Students will rotate between frontend and backend assignments."
  },
  {
    title: "Junior QA Automation Engineer",
    companyName: "Signal Works",
    location: "Remote",
    source: "mock",
    sourceUrl: "mock://signal-works/junior-qa-automation-engineer",
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
    source: "mock",
    sourceUrl: "mock://vision-grid/machine-learning-intern",
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
    source: "mock",
    sourceUrl: "mock://harbor-studio/ui-ux-design-intern",
    roleType: "internship",
    remoteType: "remote",
    employmentType: "Internship",
    description: "Design internship supporting product discovery and interface refinement. Required: UI/UX, Figma, communication, teamwork. Nice to have: HTML, CSS, adaptability. Candidates should present clear rationale for design decisions and collaborate with engineers."
  }
];

function normalizeRoleType(value: RoleType) {
  return normalizeAnalysisText(value).replace(" ", "_");
}

function parseBoardTokens() {
  return (env.GREENHOUSE_BOARD_TOKENS ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function stripHtml(value: string) {
  return decodeHtml(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferRoleType(text: string): RoleType | undefined {
  const normalized = normalizeAnalysisText(text);

  if (normalized.includes("summer training") || normalized.includes("training program")) {
    return "summer training";
  }

  if (normalized.includes("entry level") || normalized.includes("entry-level") || normalized.includes("junior")) {
    return "entry-level";
  }

  if (normalized.includes("internship") || normalized.includes("intern")) {
    return "internship";
  }

  return undefined;
}

function inferRemoteType(location: string, description: string) {
  const normalized = normalizeAnalysisText(`${location} ${description}`);

  if (normalized.includes("remote")) {
    return "remote";
  }

  if (normalized.includes("hybrid")) {
    return "hybrid";
  }

  if (normalized.includes("onsite") || normalized.includes("on site")) {
    return "onsite";
  }

  return undefined;
}

function filterMockJobs(jobs: RawJobOpportunity[], preferences: JobSearchPreferences) {
  const normalizedKeywords = normalizeAnalysisText([preferences.keywords, preferences.focusArea, preferences.preferenceText].filter(Boolean).join(" "));
  const keywordTokens = normalizedKeywords.split(" ").filter((token) => token.length > 2);
  const normalizedLocation = normalizeAnalysisText(preferences.location ?? "");
  const normalizedRoleType = normalizeRoleType(preferences.roleType);

  return jobs.filter((job) => {
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

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function mapGreenhouseJob(boardToken: string, companyName: string, job: GreenhouseJobPost): RawJobOpportunity | undefined {
  if (!job.title || !job.absolute_url || !job.content) {
    return undefined;
  }

  const description = stripHtml(job.content);

  if (!description) {
    return undefined;
  }

  const location = job.location?.name
    || job.offices?.map((office) => office.location || office.name).find(Boolean)
    || "Location not specified";
  const combinedText = `${job.title} ${location} ${description}`;

  return {
    title: job.title.trim(),
    companyName,
    location,
    source: "greenhouse",
    sourceUrl: job.absolute_url,
    applyUrl: job.absolute_url,
    description,
    employmentType: undefined,
    roleType: inferRoleType(combinedText),
    remoteType: inferRemoteType(location, description)
  };
}

export class MockJobProvider implements JobProvider {
  async search(preferences: JobSearchPreferences) {
    return filterMockJobs(mockJobs, preferences);
  }
}

export class GreenhouseJobProvider implements JobProvider {
  constructor(private readonly boardTokens: string[]) {}

  async search(_preferences: JobSearchPreferences) {
    const jobsByBoard = await Promise.all(
      this.boardTokens.map(async (boardToken) => {
        const boardUrl = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}`;
        const jobsUrl = `${boardUrl}/jobs?content=true`;
        const [board, jobsResponse] = await Promise.all([
          fetchJson<GreenhouseBoardResponse>(boardUrl),
          fetchJson<GreenhouseJobsResponse>(jobsUrl)
        ]);
        const companyName = board.name?.trim() || boardToken.replace(/[-_]+/g, " ");

        return (jobsResponse.jobs ?? [])
          .map((job) => mapGreenhouseJob(boardToken, companyName, job))
          .filter((job): job is RawJobOpportunity => Boolean(job));
      })
    );

    return jobsByBoard.flat();
  }
}

class AutoJobProvider implements JobProvider {
  constructor(
    private readonly greenhouseProvider: JobProvider | undefined,
    private readonly mockProvider = new MockJobProvider()
  ) {}

  async search(preferences: JobSearchPreferences) {
    if (!this.greenhouseProvider) {
      return this.mockProvider.search(preferences);
    }

    try {
      const greenhouseJobs = await this.greenhouseProvider.search(preferences);

      if (greenhouseJobs.length > 0) {
        return greenhouseJobs;
      }
    } catch (error) {
      console.warn("Job discovery provider fallback triggered.", {
        provider: "greenhouse",
        message: error instanceof Error ? error.message : "Unknown provider error"
      });
    }

    return this.mockProvider.search(preferences);
  }
}

export function createJobProvider(): JobProvider {
  const boardTokens = parseBoardTokens();
  const greenhouseProvider = boardTokens.length > 0 ? new GreenhouseJobProvider(boardTokens) : undefined;

  if (env.JOB_DISCOVERY_PROVIDER === "mock") {
    return new MockJobProvider();
  }

  if (env.JOB_DISCOVERY_PROVIDER === "greenhouse") {
    if (!greenhouseProvider) {
      throw new Error("JOB_DISCOVERY_PROVIDER is set to greenhouse but GREENHOUSE_BOARD_TOKENS is not configured.");
    }

    return greenhouseProvider;
  }

  return new AutoJobProvider(greenhouseProvider);
}
