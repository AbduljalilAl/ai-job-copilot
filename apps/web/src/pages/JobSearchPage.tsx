import type { JobOpportunityDto, JobSearchRequest, RoleType, WorkMode } from "@ai-job-copilot/shared";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { searchJobs, uploadResume } from "../lib/api";
import { useAppState } from "../state/AppState";

const initialSearch: JobSearchRequest = {
  keywords: "",
  location: "",
  country: "Saudi Arabia",
  remoteOnly: false,
  workMode: undefined,
  roleType: undefined,
  focusArea: "",
  preferenceText: ""
};

const countryOptions = [
  "Saudi Arabia",
  "United Arab Emirates",
  "Qatar",
  "Kuwait",
  "Bahrain",
  "Oman",
  "Egypt",
  "Jordan",
  "United Kingdom",
  "Germany",
  "Netherlands",
  "Ireland",
  "Canada",
  "United States",
  "Remote / Global"
];

function clampIncrement(value: number) {
  return Math.min(20, Math.max(1, value));
}

function getProviderLabel(provider?: "greenhouse" | "ashby" | "lever" | "structured" | "mock") {
  switch (provider) {
    case "greenhouse":
      return "Greenhouse";
    case "lever":
      return "Lever";
    case "structured":
      return "Structured providers";
    case "mock":
      return "Mock fallback";
    default:
      return undefined;
  }
}

function getWorkModeLabel(value?: WorkMode) {
  switch (value) {
    case "onsite":
      return "On-site";
    case "remote":
      return "Remote";
    case "hybrid":
      return "Hybrid";
    default:
      return "Any work mode";
  }
}

export function JobSearchPage() {
  const { jobSearchSeed, resume, setJobSearchSeed, setResume, setAnalysis, setJobText } = useAppState();
  const [form, setForm] = useState<JobSearchRequest>(initialSearch);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobs, setJobs] = useState<JobOpportunityDto[]>([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [loadMoreStep, setLoadMoreStep] = useState<"5" | "10" | "custom">("5");
  const [customStep, setCustomStep] = useState("5");
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [error, setError] = useState<string>();
  const [resumeError, setResumeError] = useState<string>();
  const [discoveryMessage, setDiscoveryMessage] = useState<string>();
  const [providerLabel, setProviderLabel] = useState<string>();
  const [searchProfile, setSearchProfile] = useState<string>();
  const [boardCount, setBoardCount] = useState<number>();

  useEffect(() => {
    if (!jobSearchSeed?.trim()) {
      return;
    }

    setForm((current) => ({
      ...current,
      preferenceText: current.preferenceText?.trim() ? current.preferenceText : jobSearchSeed
    }));
    setJobSearchSeed(undefined);
  }, [jobSearchSeed, setJobSearchSeed]);

  async function handleResumeUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!resumeFile) {
      setResumeError("Select a PDF or DOCX resume first.");
      return;
    }

    setResumeError(undefined);
    setIsUploadingResume(true);

    try {
      const response = await uploadResume(resumeFile);
      setResume(response.resume);
      setAnalysis(undefined);
      setJobText("");
      setJobs([]);
      setHasSearched(false);
      setDiscoveryMessage(undefined);
      setProviderLabel(undefined);
      setSearchProfile(undefined);
      setBoardCount(undefined);
      setResumeFile(null);
    } catch (uploadError) {
      setResumeError(uploadError instanceof Error ? uploadError.message : "Resume upload failed.");
    } finally {
      setIsUploadingResume(false);
    }
  }

  async function runSearch(payload: JobSearchRequest, clearSeed = false) {
    setIsSearching(true);
    setError(undefined);
    setHasSearched(true);
    setJobs([]);

    try {
      const response = await searchJobs(payload);
      setJobs(response.jobs);
      setVisibleCount(5);
      setDiscoveryMessage(response.meta?.message);
      setProviderLabel(getProviderLabel(response.meta?.provider));
      setBoardCount(response.meta?.boardCount);
      setSearchProfile(response.meta?.searchProfile
        ? `${response.meta.searchProfile.roleType} - ${response.meta.searchProfile.keywords}${response.meta.searchProfile.country ? ` - ${response.meta.searchProfile.country}` : ""}${response.meta.searchProfile.workMode ? ` - ${getWorkModeLabel(response.meta.searchProfile.workMode)}` : ""}`
        : undefined);

      if (clearSeed) {
        setJobSearchSeed(undefined);
      }
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Could not search jobs.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await runSearch({
      ...form,
      keywords: form.keywords?.trim() || undefined,
      location: form.location?.trim() || undefined,
      country: form.country?.trim() || undefined,
      preferenceText: form.preferenceText?.trim() || undefined
    });
  }

  function updateRoleType(roleType: RoleType | undefined) {
    setForm((current) => ({ ...current, roleType }));
  }

  function updateWorkMode(workMode: WorkMode | undefined) {
    setForm((current) => ({ ...current, workMode, remoteOnly: workMode === "remote" }));
  }

  function handleLoadMore() {
    const increment = loadMoreStep === "custom" ? clampIncrement(Number(customStep) || 5) : Number(loadMoreStep);
    setVisibleCount((current) => Math.min(jobs.length, current + increment));
  }

  const displayedJobs = jobs.slice(0, visibleCount);
  const hasMoreJobs = visibleCount < jobs.length;

  return (
    <section className="stack">
      <article className="panel">
        <h2>Active resume</h2>
        <p className="muted">Job discovery uses the uploaded resume shown here. Uploading a new resume resets the current ranked results so scoring stays tied to the correct source of truth.</p>
        {resume ? (
          <div className="inlineNotice">
            <strong>Current resume:</strong> {resume.filename}
          </div>
        ) : (
          <div className="emptyState compact">
            <p>No resume is active yet. Upload one here before searching for jobs.</p>
          </div>
        )}
        <form className="stack" onSubmit={handleResumeUpload}>
          <label className="uploadBox">
            <span>{resumeFile ? `Selected: ${resumeFile.name}` : "Choose resume file"}</span>
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {resumeFile ? <p className="muted">Ready to upload: {resumeFile.name}</p> : null}
          {resumeError ? <p className="error">{resumeError}</p> : null}
          <div className="actions">
            <button type="submit" disabled={isUploadingResume || !resumeFile}>
              {isUploadingResume ? "Uploading..." : (resume ? "Replace resume" : "Upload resume")}
            </button>
            <Link className="buttonLink ghostButton" to="/resume">Open full resume page</Link>
          </div>
        </form>
      </article>

      <article className="panel">
        <h2>Job discovery</h2>
        <p className="muted">The jobs below are not preloaded. The app only searches after you click the search button, using the active resume shown above as the resume source for matching and scoring.</p>
        {providerLabel ? <p className="muted">Current provider: {providerLabel}</p> : null}
        {boardCount ? <p className="muted">Automatic sources: {boardCount} configured job sources</p> : null}
        {discoveryMessage ? <p className="inlineNotice">{discoveryMessage}</p> : null}
        {searchProfile ? <p className="muted">Active search profile: {searchProfile}</p> : null}
        {!form.location?.trim() && !form.country?.trim() ? <p className="muted">Location is blank, so Saudi Arabia and remote opportunities are prioritized first while still allowing strong matches from outside Saudi Arabia.</p> : null}

        <form className="searchForm" onSubmit={handleSearch}>
          <label className="fieldGroup">
            <span>Keywords</span>
            <input
              value={form.keywords ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, keywords: event.target.value }))}
              placeholder="Optional: react node.js frontend data analyst"
              disabled={isSearching}
            />
          </label>
          <label className="fieldGroup">
            <span>Location</span>
            <input
              value={form.location ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
              placeholder="Optional: Riyadh or Remote"
              disabled={isSearching}
            />
          </label>
          <label className="fieldGroup">
            <span>Country</span>
            <select
              value={form.country ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, country: event.target.value || undefined }))}
              disabled={isSearching}
              className="scrollSelect"
            >
              <option value="">Any country</option>
              {countryOptions.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>
          <label className="fieldGroup">
            <span>Focus area</span>
            <input
              value={form.focusArea ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, focusArea: event.target.value }))}
              placeholder="Optional: software, embedded, IoT, backend"
              disabled={isSearching}
            />
          </label>
          <label className="fieldGroup">
            <span>Work mode</span>
            <select value={form.workMode ?? ""} onChange={(event) => updateWorkMode((event.target.value || undefined) as WorkMode | undefined)} disabled={isSearching}>
              <option value="">Any work mode</option>
              <option value="onsite">On-site</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </select>
          </label>
          <label className="fieldGroup">
            <span>Role type</span>
            <select value={form.roleType ?? ""} onChange={(event) => updateRoleType((event.target.value || undefined) as RoleType | undefined)} disabled={isSearching}>
              <option value="">Auto-detect from resume</option>
              <option value="internship">Internship</option>
              <option value="summer training">Summer training</option>
              <option value="entry-level">Entry-level</option>
            </select>
          </label>
          <label className="fieldGroup searchFormWide">
            <span>Description or targeting hint</span>
            <textarea
              rows={4}
              value={form.preferenceText ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, preferenceText: event.target.value }))}
              placeholder="Optional: paste your target description or a short hint. If you came from the description page, this can stay unchanged."
              disabled={isSearching}
            />
          </label>
          <div className="actions">
            <button type="submit" disabled={isSearching || !resume}>
              {isSearching ? "Searching..." : "Find ranked jobs"}
            </button>
          </div>
        </form>
      </article>

      {error ? <p className="error">{error}</p> : null}

      {!hasSearched && !error ? (
        <div className="panel emptyState">
          <h3>Search when ready</h3>
          <p>Choose your filters, keep or replace the active resume, then click <strong>Find ranked jobs</strong>. No saved jobs are shown before a fresh search.</p>
        </div>
      ) : null}

      {hasSearched && !error && jobs.length === 0 ? (
        <div className="panel emptyState">
          <h3>No matching jobs found</h3>
          <p>Try widening the country, work mode, or keywords. The current engine also excludes clearly unrelated role families like sales, so narrow but wrong-role results should no longer appear.</p>
        </div>
      ) : null}

      {jobs.length > 0 ? (
        <>
          <div className="panel loadMorePanel">
            <div className="cardHeader">
              <div>
                <h3>Ranked jobs</h3>
                <p className="muted">Showing {displayedJobs.length} of {jobs.length} opportunities.</p>
              </div>
              <div className="actions">
                <label className="fieldGroup compactField">
                  <span>More per click</span>
                  <select value={loadMoreStep} onChange={(event) => setLoadMoreStep(event.target.value as "5" | "10" | "custom")}>
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>
                {loadMoreStep === "custom" ? (
                  <label className="fieldGroup compactField">
                    <span>Custom</span>
                    <input value={customStep} onChange={(event) => setCustomStep(event.target.value)} inputMode="numeric" />
                  </label>
                ) : null}
                <button type="button" className="ghostButton" onClick={handleLoadMore} disabled={!hasMoreJobs}>
                  {hasMoreJobs ? "Load more" : "All jobs shown"}
                </button>
              </div>
            </div>
          </div>

          <div className="jobGrid">
            {displayedJobs.map((job, index) => (
              <article key={job.id} className="panel jobCard">
                <div className="cardHeader">
                  <div>
                    <p className="muted">Rank #{index + 1} - {job.source}</p>
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
        </>
      ) : null}
    </section>
  );
}
