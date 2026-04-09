import type { AnalysisStatus } from "@ai-job-copilot/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SkillSection } from "../components/SkillSection";
import { updateAnalysisNotes, updateAnalysisStatus } from "../lib/api";
import { useAppState } from "../state/AppState";

export function ResultsPage() {
  const { analysis, clearAll, setAnalysis } = useAppState();
  const navigate = useNavigate();
  const [status, setStatus] = useState<AnalysisStatus>("saved");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>();
  const [saveError, setSaveError] = useState<string>();

  useEffect(() => {
    if (!analysis) {
      return;
    }

    setStatus(analysis.status);
    setNotes(analysis.notes ?? "");
    setSaveMessage(undefined);
    setSaveError(undefined);
  }, [analysis]);

  if (!analysis) {
    return (
      <section className="panel emptyState">
        <h2>No analysis yet</h2>
        <p>Upload a resume and analyze a job description to populate this dashboard.</p>
        <div className="actions">
          <button type="button" onClick={() => navigate("/")}>Upload resume</button>
          <button type="button" className="ghostButton" onClick={() => navigate("/job")}>Go to job description</button>
        </div>
      </section>
    );
  }

  const currentAnalysis = analysis;

  async function handleSaveTracking() {
    setIsSaving(true);
    setSaveMessage(undefined);
    setSaveError(undefined);

    try {
      const [statusResponse, notesResponse] = await Promise.all([
        updateAnalysisStatus(currentAnalysis.id, { status }),
        updateAnalysisNotes(currentAnalysis.id, { notes })
      ]);
      const nextAnalysis = {
        ...statusResponse.analysis,
        notes: notesResponse.analysis.notes
      };

      setAnalysis(nextAnalysis);
      setSaveMessage("Tracking details saved.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save tracking details.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="dashboard">
      <article className="scoreCard">
        <div className="cardHeader">
          <div>
            <p className="eyebrow">Overall score</p>
            <h2>{currentAnalysis.score}%</h2>
          </div>
          <div className="actions">
            <button type="button" className="ghostButton" onClick={() => navigate("/job")}>Edit job description</button>
            <button type="button" className="ghostButton" onClick={() => { clearAll(); navigate("/"); }}>Start over</button>
          </div>
        </div>
        <p className="muted">{currentAnalysis.suggestions}</p>
      </article>

      {currentAnalysis.aiAssistanceStatus === "error" ? (
        <article className="panel aiNotice">
          <h3>AI assistance status</h3>
          <p>{currentAnalysis.aiAssistanceMessage ?? "AI-generated cover letter and guidance are currently unavailable."}</p>
        </article>
      ) : null}

      <SkillSection title="Matched technical skills" skills={currentAnalysis.matchedTechnicalSkills} emptyLabel="No technical matches found yet" tone="ok" />
      <SkillSection title="Missing technical skills" skills={currentAnalysis.missingTechnicalSkills} emptyLabel="No major technical gaps found" tone="warn" />
      <SkillSection title="Matched soft skills" skills={currentAnalysis.matchedSoftSkills} emptyLabel="No soft-skill matches found yet" tone="ok" />
      <SkillSection title="Missing soft skills" skills={currentAnalysis.missingSoftSkills} emptyLabel="No soft-skill gaps detected" tone="warn" />

      <article className="panel">
        <h3>Tailored professional summary</h3>
        <p>{currentAnalysis.tailoredSummary}</p>
      </article>

      <article className="panel">
        <h3>Short cover letter draft</h3>
        {currentAnalysis.aiAssistanceStatus === "available"
          ? <pre>{currentAnalysis.coverLetter}</pre>
          : <p className="error">Cover letter generation is currently unavailable.</p>}
      </article>

      <article className="panel">
        <h3>Application tips</h3>
        <p className="muted">This guidance is based only on the uploaded resume and the pasted role description.</p>
        {currentAnalysis.aiAssistanceStatus === "available"
          ? <pre>{currentAnalysis.applicationTips}</pre>
          : <p className="error">Application tips are currently unavailable.</p>}
      </article>

      <article className="panel trackingPanel">
        <h3>Opportunity tracking</h3>
        <p className="muted">Track the current opportunity without re-running analysis.</p>
        <label className="fieldGroup">
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as AnalysisStatus)} disabled={isSaving}>
            <option value="saved">Saved</option>
            <option value="applied">Applied</option>
            <option value="interview">Interview</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <label className="fieldGroup">
          <span>Notes</span>
          <textarea
            rows={5}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={isSaving}
            placeholder="Add short notes about next steps, recruiter replies, or interview prep."
          />
        </label>
        {saveMessage ? <p className="success">{saveMessage}</p> : null}
        {saveError ? <p className="error">{saveError}</p> : null}
        <button type="button" onClick={handleSaveTracking} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save tracking details"}
        </button>
      </article>
    </section>
  );
}
