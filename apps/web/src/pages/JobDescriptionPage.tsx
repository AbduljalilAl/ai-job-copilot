import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeJob } from "../lib/api";
import { useAppState } from "../state/AppState";

export function JobDescriptionPage() {
  const { resume, setAnalysis } = useAppState();
  const [jobText, setJobText] = useState("");
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!resume) {
      setError("Upload a resume before analyzing a job description.");
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
      <form onSubmit={handleSubmit} className="stack">
        <textarea
          rows={14}
          placeholder="Paste the internship or summer training description here..."
          value={jobText}
          onChange={(event) => setJobText(event.target.value)}
        />
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Analyzing..." : "Analyze fit"}
        </button>
      </form>
    </section>
  );
}

