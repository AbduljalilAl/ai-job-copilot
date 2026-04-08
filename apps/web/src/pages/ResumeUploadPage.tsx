import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadResume } from "../lib/api";
import { useAppState } from "../state/AppState";

export function ResumeUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setResume } = useAppState();
  const navigate = useNavigate();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!file) {
      setError("Select a PDF or DOCX resume first.");
      return;
    }

    setError(undefined);
    setIsSubmitting(true);

    try {
      const response = await uploadResume(file);
      setResume(response.resume);
      navigate("/job");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="panel">
      <h2>1. Upload master resume</h2>
      <p className="muted">Supported formats: PDF and DOCX. Store one reusable master resume for multiple internship applications.</p>
      <form onSubmit={handleSubmit} className="stack">
        <label className="uploadBox">
          <span>{file ? file.name : "Choose resume file"}</span>
          <input
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Uploading..." : "Upload and continue"}
        </button>
      </form>
    </section>
  );
}
