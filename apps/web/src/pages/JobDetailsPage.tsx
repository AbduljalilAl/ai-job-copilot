import type { JobOpportunityDto } from "@ai-job-copilot/shared";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SkillSection } from "../components/SkillSection";
import { analyzeJob, getJobById } from "../lib/api";
import { useAppState } from "../state/AppState";

export function JobDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { resume, openAnalysis } = useAppState();
  const [job, setJob] = useState<JobOpportunityDto>();
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let isMounted = true;

    async function loadJob() {
      if (!id) {
        setError("Missing job id.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await getJobById(Number(id));

        if (isMounted) {
          setJob(response.job);
          setError(undefined);
        }
      } catch (jobError) {
        if (isMounted) {
          setError(jobError instanceof Error ? jobError.message : "Could not load job details.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadJob();

    return () => {
      isMounted = false;
    };
  }, [id]);

  async function handleRunAnalysis() {
    if (!job) {
      return;
    }

    setIsAnalyzing(true);
    setError(undefined);

    try {
      const response = await analyzeJob(job.description, resume?.id, {
        companyName: job.companyName,
        jobTitle: job.title,
        sourceUrl: job.sourceUrl
      });
      openAnalysis(response.analysis);
      navigate("/results");
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "Could not run full analysis for this job.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (isLoading) {
    return <section className="panel"><p className="muted">Loading job details...</p></section>;
  }

  if (!job) {
    return (
      <section className="panel emptyState">
        <h2>Job not found</h2>
        <p>{error ?? "This job could not be loaded."}</p>
        <Link className="buttonLink" to="/jobs">Back to jobs</Link>
      </section>
    );
  }

  return (
    <section className="dashboard">
      <article className="scoreCard">
        <div className="cardHeader">
          <div>
            <p className="eyebrow">{job.companyName}</p>
            <h2>{job.matchScore}%</h2>
            <p className="muted">{job.title} • {job.location}</p>
          </div>
          <div className="actions">
            <Link className="buttonLink ghostButton" to="/jobs">Back to jobs</Link>
            {job.applyUrl ? <a className="buttonLink" href={job.applyUrl} target="_blank" rel="noreferrer">Open apply link</a> : null}
          </div>
        </div>
        <p>{job.matchReason}</p>
        {!job.applyUrl ? <p className="muted">No apply link is available for this opportunity yet.</p> : null}
      </article>

      {error ? <article className="panel"><p className="error">{error}</p></article> : null}

      <SkillSection title="Matched required skills" skills={job.matchDetails.matchedRequiredSkills} emptyLabel="No required skill matches detected" tone="ok" />
      <SkillSection title="Missing required skills" skills={job.matchDetails.missingRequiredSkills} emptyLabel="No required gaps detected" tone="warn" />
      <SkillSection title="Matched optional skills" skills={job.matchDetails.matchedOptionalSkills} emptyLabel="No optional matches detected" tone="ok" />
      <SkillSection title="Missing optional skills" skills={job.matchDetails.missingOptionalSkills} emptyLabel="No optional gaps detected" tone="warn" />
      <SkillSection title="Matched soft skills" skills={job.matchDetails.matchedSoftSkills} emptyLabel="No soft skill matches detected" tone="ok" />
      <SkillSection title="Missing soft skills" skills={job.matchDetails.missingSoftSkills} emptyLabel="No soft skill gaps detected" tone="warn" />

      <article className="panel">
        <h3>Full description</h3>
        <p>{job.description}</p>
      </article>

      <article className="panel">
        <h3>Next step</h3>
        <p className="muted">Run the full analysis flow to save this opportunity into your existing history and tracking dashboard.</p>
        <button type="button" disabled={isAnalyzing} onClick={handleRunAnalysis}>
          {isAnalyzing ? "Analyzing..." : "Run full analysis"}
        </button>
      </article>
    </section>
  );
}
