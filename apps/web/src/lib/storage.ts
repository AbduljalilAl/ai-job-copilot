import type { JobAnalysisDto, ResumeDto } from "@ai-job-copilot/shared";

const storageKey = "ai-job-copilot-state";

export interface PersistedAppState {
  resume?: ResumeDto;
  analysis?: JobAnalysisDto;
  jobText?: string;
}

export function loadPersistedState(): PersistedAppState {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(storageKey);

    if (!raw) {
      return {};
    }

    return JSON.parse(raw) as PersistedAppState;
  } catch {
    return {};
  }
}

export function savePersistedState(state: PersistedAppState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

export function clearPersistedState() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(storageKey);
}
