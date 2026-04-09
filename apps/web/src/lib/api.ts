import type {
  AnalysisHistoryResponse,
  AnalysisResponse,
  ApiErrorPayload,
  JobAnalyzeRequest,
  JobAnalyzeResponse,
  JobResponse,
  JobSearchRequest,
  JobSearchResponse,
  ResumeUploadResponse,
  UpdateAnalysisNotesRequest,
  UpdateAnalysisStatusRequest
} from "@ai-job-copilot/shared";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export async function uploadResume(file: File) {
  const formData = new FormData();
  formData.append("resume", file);

  const response = await fetch(`${apiBaseUrl}/resume/upload`, {
    method: "POST",
    body: formData
  });

  return handleResponse<ResumeUploadResponse>(response);
}

export async function analyzeJob(jobText: string, resumeId?: number, metadata?: Omit<JobAnalyzeRequest, "jobText" | "resumeId">) {
  const response = await fetch(`${apiBaseUrl}/job/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ jobText, resumeId, ...metadata })
  });

  return handleResponse<JobAnalyzeResponse>(response);
}

export async function searchJobs(payload: JobSearchRequest) {
  const response = await fetch(`${apiBaseUrl}/jobs/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return handleResponse<JobSearchResponse>(response);
}

export async function getJobs() {
  const response = await fetch(`${apiBaseUrl}/jobs`);

  return handleResponse<JobSearchResponse>(response);
}

export async function getJobById(id: number) {
  const response = await fetch(`${apiBaseUrl}/jobs/${id}`);

  return handleResponse<JobResponse>(response);
}

export async function getAnalysisHistory() {
  const response = await fetch(`${apiBaseUrl}/analysis/history`);

  return handleResponse<AnalysisHistoryResponse>(response);
}

export async function getAnalysisById(id: number) {
  const response = await fetch(`${apiBaseUrl}/analysis/${id}`);

  return handleResponse<AnalysisResponse>(response);
}

export async function updateAnalysisStatus(id: number, payload: UpdateAnalysisStatusRequest) {
  const response = await fetch(`${apiBaseUrl}/analysis/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return handleResponse<AnalysisResponse>(response);
}

export async function updateAnalysisNotes(id: number, payload: UpdateAnalysisNotesRequest) {
  const response = await fetch(`${apiBaseUrl}/analysis/${id}/notes`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return handleResponse<AnalysisResponse>(response);
}

async function handleResponse<T>(response: Response) {
  const payload = await parseJson(response) as Partial<ApiErrorPayload> | T;

  if (!response.ok) {
    const apiError = payload as Partial<ApiErrorPayload>;
    const message = apiError.error?.details?.[0] ?? apiError.error?.message ?? "Request failed.";
    throw new Error(message);
  }

  return payload as T;
}

async function parseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}
