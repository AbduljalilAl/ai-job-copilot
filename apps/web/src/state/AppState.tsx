import type { ReactNode } from "react";
import type { JobAnalysisDto, ResumeDto } from "@ai-job-copilot/shared";
import { createContext, useContext, useState } from "react";

interface AppStateValue {
  resume?: ResumeDto;
  analysis?: JobAnalysisDto;
  setResume: (resume: ResumeDto) => void;
  setAnalysis: (analysis: JobAnalysisDto) => void;
}

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [resume, setResume] = useState<ResumeDto>();
  const [analysis, setAnalysis] = useState<JobAnalysisDto>();

  return (
    <AppStateContext.Provider value={{ resume, analysis, setResume, setAnalysis }}>
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
