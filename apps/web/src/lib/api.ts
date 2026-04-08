import type { ApiErrorPayload, JobAnalyzeResponse, ResumeUploadResponse } from "@ai-job-copilot/shared";

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

export async function analyzeJob(jobText: string, resumeId?: number) {
  const response = await fetch(`${apiBaseUrl}/job/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ jobText, resumeId })
  });

  return handleResponse<JobAnalyzeResponse>(response);
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
