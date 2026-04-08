import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeJob } from "../lib/api";
import { useAppState } from "../state/AppState";

export function JobDescriptionPage() {
  const { jobText, resume, setAnalysis, setJobText } = useAppState();
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!resume) {
      setError("Upload a resume before analyzing a job description.");
      return;
    }

    if (jobText.trim().length < 30) {
      setError("Paste at least a short, realistic internship or summer training description.");
      return;
    }

    setError(undefined);
    setIsSubmitting(true);

    try {
      const response = await analyzeJob(jobText, resume.id);
      setAnalysis(response.analysis);
      navigate("/results");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Analysis failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="panel">
      <h2>2. Paste the opportunity description</h2>
      <p className="muted">Use an internship or summer training description. The MVP runs a keyword-based comparison and draft generation workflow.</p>
      {resume ? (
        <div className="inlineNotice">
          <strong>Using resume:</strong> {resume.filename}
        </div>
      ) : (
        <div className="emptyState compact">
          <h3>No resume uploaded yet</h3>
          <p>Upload a resume first, then return here to analyze a job description.</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="stack">
        <textarea
          rows={14}
          placeholder="Paste the internship or summer training description here..."
          value={jobText}
          onChange={(event) => setJobText(event.target.value)}
          disabled={!resume || isSubmitting}
        />
        <p className="muted">{jobText.trim().length} characters</p>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={isSubmitting || !resume || jobText.trim().length < 30}>
          {isSubmitting ? "Analyzing and generating AI guidance..." : "Analyze fit"}
        </button>
      </form>
    </section>
  );
}
