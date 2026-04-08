export interface ResumeDto {
  id: number;
  filename: string;
  content: string;
  createdAt: string;
}

export interface AnalysisResult {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  suggestions: string;
  tailoredSummary: string;
  coverLetter: string;
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
  message: string;
}
