import { Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { HistoryPage } from "./pages/HistoryPage";
import { JobDetailsPage } from "./pages/JobDetailsPage";
import { JobDescriptionPage } from "./pages/JobDescriptionPage";
import { JobSearchPage } from "./pages/JobSearchPage";
import { ResultsPage } from "./pages/ResultsPage";
import { ResumeUploadPage } from "./pages/ResumeUploadPage";
import { AppProvider } from "./state/AppState";

export function App() {
  return (
    <AppProvider>
      <AppLayout>
        <Routes>
          <Route path="/" element={<ResumeUploadPage />} />
          <Route path="/resume" element={<ResumeUploadPage />} />
          <Route path="/job" element={<JobDescriptionPage />} />
          <Route path="/jobs" element={<JobSearchPage />} />
          <Route path="/jobs/:id" element={<JobDetailsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/results" element={<ResultsPage />} />
        </Routes>
      </AppLayout>
    </AppProvider>
  );
}
