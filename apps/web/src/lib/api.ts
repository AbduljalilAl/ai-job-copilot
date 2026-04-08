import type { JobAnalyzeResponse, ResumeUploadResponse } from "@ai-job-copilot/shared";

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
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed.");
  }

  return payload as T;
}

