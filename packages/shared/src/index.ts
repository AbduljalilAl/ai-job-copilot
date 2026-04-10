export interface ResumeDto {
  id: number;
  filename: string;
  content: string;
  createdAt: string;
}

export interface SkillBuckets {
  technical: string[];
  soft: string[];
}

export type AnalysisStatus = "saved" | "applied" | "interview" | "rejected";
export type RoleType = "internship" | "summer training" | "entry-level";
export type ScoreBand = "strong match" | "good match" | "partial match" | "weak match";

export interface AnalysisResult {
  score: number;
  matchedTechnicalSkills: string[];
  missingTechnicalSkills: string[];
  matchedSoftSkills: string[];
  missingSoftSkills: string[];
  suggestions: string;
  tailoredSummary: string;
  coverLetter: string;
  applicationTips: string;
  aiAssistanceStatus: "available" | "error";
  aiAssistanceMessage?: string;
}

export interface JobAnalysisDto extends AnalysisResult {
  id: number;
  jobText: string;
  createdAt: string;
  savedAt: string;
  updatedAt: string;
  status: AnalysisStatus;
  notes?: string;
  companyName?: string;
  jobTitle?: string;
  sourceUrl?: string;
  resumeId?: number;
}

export interface ResumeUploadResponse {
  resume: ResumeDto;
}

export interface JobAnalyzeRequest {
  jobText: string;
  resumeId?: number;
  companyName?: string;
  jobTitle?: string;
  sourceUrl?: string;
}

export interface JobAnalyzeResponse {
  analysis: JobAnalysisDto;
}

export interface AnalysisHistoryResponse {
  analyses: JobAnalysisDto[];
}

export interface AnalysisResponse {
  analysis: JobAnalysisDto;
}

export interface JobSearchRequest {
  keywords?: string;
  location?: string;
  remoteOnly?: boolean;
  roleType?: RoleType;
  focusArea?: string;
  preferenceText?: string;
}

export interface JobDiscoveryMeta {
  provider: "greenhouse" | "mock";
  fallbackUsed: boolean;
  message?: string;
  boardCount?: number;
  searchProfile?: {
    keywords: string;
    roleType: RoleType;
    focusArea?: string;
    location?: string;
    remoteOnly?: boolean;
    source: "resume-derived" | "user-specified" | "mixed";
  };
}

export interface JobMatchDetails {
  matchedRequiredSkills: string[];
  missingRequiredSkills: string[];
  matchedOptionalSkills: string[];
  missingOptionalSkills: string[];
  matchedSoftSkills: string[];
  missingSoftSkills: string[];
  scoreBand: ScoreBand;
  roleRelevance?: number;
}

export interface JobOpportunityDto {
  id: number;
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
  matchScore: number;
  matchReason: string;
  matchedSkills: string[];
  missingSkills: string[];
  matchDetails: JobMatchDetails;
  createdAt: string;
  updatedAt: string;
}

export interface JobSearchResponse {
  jobs: JobOpportunityDto[];
  meta?: JobDiscoveryMeta;
}

export interface JobResponse {
  job: JobOpportunityDto;
}

export interface UpdateAnalysisStatusRequest {
  status: AnalysisStatus;
}

export interface UpdateAnalysisNotesRequest {
  notes: string;
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: string[];
  };
}
