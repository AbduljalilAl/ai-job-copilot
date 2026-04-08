import type { ReactNode } from "react";
import type { JobAnalysisDto, ResumeDto } from "@ai-job-copilot/shared";
import { createContext, useContext, useEffect, useState } from "react";
import { clearPersistedState, loadPersistedState, savePersistedState } from "../lib/storage";

interface AppStateValue {
  resume?: ResumeDto;
  analysis?: JobAnalysisDto;
  jobText: string;
  setResume: (resume?: ResumeDto) => void;
  setAnalysis: (analysis?: JobAnalysisDto) => void;
  setJobText: (jobText: string) => void;
  clearAll: () => void;
}

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [persistedState] = useState(loadPersistedState);
  const [resume, setResume] = useState<ResumeDto | undefined>(persistedState.resume);
  const [analysis, setAnalysis] = useState<JobAnalysisDto | undefined>(persistedState.analysis);
  const [jobText, setJobText] = useState(persistedState.jobText ?? "");

  useEffect(() => {
    savePersistedState({ resume, analysis, jobText });
  }, [analysis, jobText, resume]);

  function clearAll() {
    setResume(undefined);
    setAnalysis(undefined);
    setJobText("");
    clearPersistedState();
  }

  return (
    <AppStateContext.Provider value={{ resume, analysis, jobText, setResume, setAnalysis, setJobText, clearAll }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);

  if (!context) {
    throw new Error("useAppState must be used within AppProvider");
  }

  return context;
}
