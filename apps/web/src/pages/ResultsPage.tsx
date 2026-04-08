import { Navigate } from "react-router-dom";
import { useAppState } from "../state/AppState";

export function ResultsPage() {
  const { analysis } = useAppState();

  if (!analysis) {
    return <Navigate to="/" replace />;
  }

  return (
    <section className="dashboard">
      <article className="scoreCard">
        <p className="eyebrow">Match score</p>
        <h2>{analysis.score}%</h2>
        <p className="muted">{analysis.suggestions}</p>
      </article>

      <article className="panel">
        <h3>Matched skills</h3>
        <div className="chips">
          {analysis.matchedSkills.map((skill) => <span key={skill} className="chip ok">{skill}</span>)}
        </div>
      </article>

      <article className="panel">
        <h3>Missing skills</h3>
        <div className="chips">
          {analysis.missingSkills.length > 0
            ? analysis.missingSkills.map((skill) => <span key={skill} className="chip warn">{skill}</span>)
            : <span className="chip ok">No major keyword gaps found</span>}
        </div>
      </article>

      <article className="panel">
        <h3>Tailored professional summary</h3>
        <p>{analysis.tailoredSummary}</p>
      </article>

      <article className="panel">
        <h3>Short cover letter draft</h3>
        <pre>{analysis.coverLetter}</pre>
      </article>
    </section>
  );
}

