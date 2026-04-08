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
  resumeId?: number;
}

export interface ResumeUploadResponse {
  resume: ResumeDto;
}

export interface JobAnalyzeRequest {
  jobText: string;
  resumeId?: number;
}

export interface JobAnalyzeResponse {
  analysis: JobAnalysisDto;
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: string[];
  };
}
