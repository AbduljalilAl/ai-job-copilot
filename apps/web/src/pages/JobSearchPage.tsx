import type { JobOpportunityDto, JobSearchRequest, RoleType } from "@ai-job-copilot/shared";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getJobs, searchJobs } from "../lib/api";

const initialSearch: JobSearchRequest = {
  keywords: "",
  location: "",
  remoteOnly: false,
  roleType: "internship",
  focusArea: "",
  preferenceText: ""
};

export function JobSearchPage() {
  const [form, setForm] = useState<JobSearchRequest>(initialSearch);
  const [jobs, setJobs] = useState<JobOpportunityDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let isMounted = true;

    async function loadJobs() {
      try {
        const response = await getJobs();

        if (isMounted) {
          setJobs(response.jobs);
          setError(undefined);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Could not load saved jobs.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadJobs();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSearching(true);
    setError(undefined);

    try {
      const response = await searchJobs({
        ...form,
        keywords: form.keywords.trim(),
        location: form.location?.trim() || undefined
      });
      setJobs(response.jobs);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Could not search jobs.");
    } finally {
      setIsSearching(false);
      setIsLoading(false);
    }
  }

  function updateRoleType(roleType: RoleType) {
    setForm((current) => ({ ...current, roleType }));
  }

  return (
    <section className="stack">
      <article className="panel">
        <h2>Job discovery</h2>
        <p className="muted">Search Greenhouse jobs when board tokens are configured. If not, the app falls back to local development jobs.</p>

        <form className="searchForm" onSubmit={handleSearch}>
          <label className="fieldGroup">
            <span>Keywords</span>
            <input
              value={form.keywords}
              onChange={(event) => setForm((current) => ({ ...current, keywords: event.target.value }))}
              placeholder="react node.js frontend data analyst"
              disabled={isSearching}
            />
          </label>
          <label className="fieldGroup">
            <span>Location</span>
            <input
              value={form.location ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
              placeholder="Riyadh or Remote"
              disabled={isSearching}
            />
          </label>
          <label className="fieldGroup">
            <span>Focus area</span>
            <input
              value={form.focusArea ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, focusArea: event.target.value }))}
              placeholder="software, embedded, IoT, backend"
              disabled={isSearching}
            />
          </label>
          <label className="fieldGroup checkboxField">
            <input
              type="checkbox"
              checked={form.remoteOnly ?? false}
              onChange={(event) => setForm((current) => ({ ...current, remoteOnly: event.target.checked }))}
              disabled={isSearching}
            />
            <span>Remote only</span>
          </label>
          <label className="fieldGroup">
            <span>Role type</span>
            <select value={form.roleType} onChange={(event) => updateRoleType(event.target.value as RoleType)} disabled={isSearching}>
              <option value="internship">Internship</option>
              <option value="summer training">Summer training</option>
              <option value="entry-level">Entry-level</option>
            </select>
          </label>
          <label className="fieldGroup searchFormWide">
            <span>Preference hint</span>
            <textarea
              rows={3}
              value={form.preferenceText ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, preferenceText: event.target.value }))}
              placeholder="Remote-friendly internships in Riyadh focused on Node.js, embedded systems, or IoT."
              disabled={isSearching}
            />
          </label>
          <div className="actions">
            <button type="submit" disabled={isSearching || form.keywords.trim().length < 2}>
              {isSearching ? "Searching..." : "Search jobs"}
            </button>
          </div>
        </form>
      </article>

      {isLoading ? <p className="muted">Loading saved job matches...</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!isLoading && !error && jobs.length === 0 ? (
        <div className="panel emptyState">
          <h3>No jobs yet</h3>
          <p>Run a search after uploading a resume to generate job matches and stored opportunities.</p>
        </div>
      ) : null}

      {!isLoading && jobs.length > 0 ? (
        <div className="jobGrid">
          {jobs.map((job, index) => (
            <article key={job.id} className="panel jobCard">
              <div className="cardHeader">
                <div>
                  <p className="muted">Rank #{index + 1} • {job.source}</p>
                  <p className="eyebrow">{job.companyName}</p>
                  <h3>{job.title}</h3>
                  <p className="muted">{job.location}</p>
                </div>
                <div className="scorePill">{job.matchScore}%</div>
              </div>
              <p>{job.matchReason}</p>
              <div className="actions">
                <Link className="buttonLink" to={`/jobs/${job.id}`}>Open details</Link>
                {job.applyUrl ? (
                  <a className="buttonLink ghostButton" href={job.applyUrl} target="_blank" rel="noreferrer">Apply link</a>
                ) : (
                  <span className="muted">Apply link unavailable</span>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
