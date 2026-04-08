import { Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { JobDescriptionPage } from "./pages/JobDescriptionPage";
import { ResultsPage } from "./pages/ResultsPage";
import { ResumeUploadPage } from "./pages/ResumeUploadPage";
import { AppProvider } from "./state/AppState";

export function App() {
  return (
    <AppProvider>
      <AppLayout>
        <Routes>
          <Route path="/" element={<ResumeUploadPage />} />
          <Route path="/job" element={<JobDescriptionPage />} />
          <Route path="/results" element={<ResultsPage />} />
        </Routes>
      </AppLayout>
    </AppProvider>
  );
}
