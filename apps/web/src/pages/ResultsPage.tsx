import { useNavigate } from "react-router-dom";
import { SkillSection } from "../components/SkillSection";
import { useAppState } from "../state/AppState";

export function ResultsPage() {
  const { analysis, clearAll } = useAppState();
  const navigate = useNavigate();

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

  return (
    <section className="dashboard">
      <article className="scoreCard">
        <div className="cardHeader">
          <div>
            <p className="eyebrow">Overall score</p>
            <h2>{analysis.score}%</h2>
          </div>
          <div className="actions">
            <button type="button" className="ghostButton" onClick={() => navigate("/job")}>Edit job description</button>
            <button type="button" className="ghostButton" onClick={() => { clearAll(); navigate("/"); }}>Start over</button>
          </div>
        </div>
        <p className="muted">{analysis.suggestions}</p>
      </article>

      {analysis.aiAssistanceStatus === "error" ? (
        <article className="panel aiNotice">
          <h3>AI assistance status</h3>
          <p>{analysis.aiAssistanceMessage ?? "AI-generated cover letter and guidance are currently unavailable."}</p>
        </article>
      ) : null}

      <SkillSection title="Matched technical skills" skills={analysis.matchedTechnicalSkills} emptyLabel="No technical matches found yet" tone="ok" />
      <SkillSection title="Missing technical skills" skills={analysis.missingTechnicalSkills} emptyLabel="No major technical gaps found" tone="warn" />
      <SkillSection title="Matched soft skills" skills={analysis.matchedSoftSkills} emptyLabel="No soft-skill matches found yet" tone="ok" />
      <SkillSection title="Missing soft skills" skills={analysis.missingSoftSkills} emptyLabel="No soft-skill gaps detected" tone="warn" />

      <article className="panel">
        <h3>Tailored professional summary</h3>
        <p>{analysis.tailoredSummary}</p>
      </article>

      <article className="panel">
        <h3>Short cover letter draft</h3>
        {analysis.aiAssistanceStatus === "available"
          ? <pre>{analysis.coverLetter}</pre>
          : <p className="error">Cover letter generation is currently unavailable.</p>}
      </article>

      <article className="panel">
        <h3>Application tips</h3>
        <p className="muted">This guidance is based only on the uploaded resume and the pasted role description.</p>
        {analysis.aiAssistanceStatus === "available"
          ? <pre>{analysis.applicationTips}</pre>
          : <p className="error">Application tips are currently unavailable.</p>}
      </article>
    </section>
  );
}
