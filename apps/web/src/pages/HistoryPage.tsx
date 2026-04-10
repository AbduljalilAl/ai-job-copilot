import type { AnalysisStatus, JobAnalysisDto } from "@ai-job-copilot/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteAllAnalyses, deleteAnalysisById, getAnalysisById, getAnalysisHistory } from "../lib/api";
import { useAppState } from "../state/AppState";

function summarizeJobText(jobText: string) {
  const normalized = jobText.replace(/\s+/g, " ").trim();
  return normalized.length > 110 ? `${normalized.slice(0, 110)}...` : normalized;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function HistoryPage() {
  const [analyses, setAnalyses] = useState<JobAnalysisDto[]>([]);
  const [error, setError] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<"all" | AnalysisStatus>("all");
  const [openingId, setOpeningId] = useState<number>();
  const [deletingId, setDeletingId] = useState<number>();
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const { analysis: currentAnalysis, clearAnalysis, openAnalysis } = useAppState();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      try {
        const response = await getAnalysisHistory();

        if (isMounted) {
          setAnalyses(response.analyses);
          setError(undefined);
        }
      } catch (historyError) {
        if (isMounted) {
          setError(historyError instanceof Error ? historyError.message : "Could not load history.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleOpenAnalysis(analysis: JobAnalysisDto) {
    setOpeningId(analysis.id);
    setError(undefined);
    setSuccessMessage(undefined);

    try {
      const response = await getAnalysisById(analysis.id);
      openAnalysis(response.analysis);
      navigate("/results");
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Could not open saved analysis.");
    } finally {
      setOpeningId(undefined);
    }
  }

  async function handleDeleteAnalysis(analysis: JobAnalysisDto) {
    setDeletingId(analysis.id);
    setError(undefined);
    setSuccessMessage(undefined);

    try {
      await deleteAnalysisById(analysis.id);
      setAnalyses((current) => current.filter((item) => item.id !== analysis.id));

      if (currentAnalysis?.id === analysis.id) {
        clearAnalysis();
      }

      setSuccessMessage("Saved analysis deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete saved analysis.");
    } finally {
      setDeletingId(undefined);
    }
  }

  async function handleDeleteAll() {
    setIsDeletingAll(true);
    setError(undefined);
    setSuccessMessage(undefined);

    try {
      const response = await deleteAllAnalyses();
      setAnalyses([]);
      clearAnalysis();
      setSuccessMessage(response.deletedCount > 0 ? `Deleted ${response.deletedCount} saved analyses.` : "There were no saved analyses to delete.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete analysis history.");
    } finally {
      setIsDeletingAll(false);
    }
  }

  const filteredAnalyses = selectedStatus === "all"
    ? analyses
    : analyses.filter((analysis) => analysis.status === selectedStatus);

  return (
    <section className="panel">
      <div className="cardHeader">
        <div>
          <h2>Analysis history</h2>
          <p className="muted">Review your most recent saved analyses without re-running the comparison flow.</p>
        </div>
        <div className="actions">
          <button type="button" className="ghostButton" onClick={handleDeleteAll} disabled={isLoading || isDeletingAll || analyses.length === 0}>
            {isDeletingAll ? "Deleting..." : "Delete all"}
          </button>
        </div>
      </div>

      <label className="fieldGroup inlineField">
        <span>Status filter</span>
        <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as "all" | AnalysisStatus)} disabled={isLoading || isDeletingAll}>
          <option value="all">All</option>
          <option value="saved">Saved</option>
          <option value="applied">Applied</option>
          <option value="interview">Interview</option>
          <option value="rejected">Rejected</option>
        </select>
      </label>

      {isLoading ? <p className="muted">Loading analysis history...</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {successMessage ? <p className="success">{successMessage}</p> : null}
      {!isLoading && !error && analyses.length === 0 ? (
        <div className="emptyState compact">
          <h3>No history yet</h3>
          <p>Run an analysis first, then come back here to review previous results.</p>
        </div>
      ) : null}

      {!isLoading && !error && analyses.length > 0 && filteredAnalyses.length === 0 ? (
        <div className="emptyState compact">
          <h3>No matches for this status</h3>
          <p>Try another filter to view other saved opportunities.</p>
        </div>
      ) : null}

      {!isLoading && !error && filteredAnalyses.length > 0 ? (
        <div className="historyList">
          {filteredAnalyses.map((analysis) => (
            <article key={analysis.id} className="historyItem historyCard">
              <button
                type="button"
                className="historyOpenButton"
                disabled={openingId === analysis.id || deletingId === analysis.id || isDeletingAll}
                onClick={() => handleOpenAnalysis(analysis)}
              >
                <div className="historyMeta">
                  <strong>{analysis.score}% match</strong>
                  <span>{formatDate(analysis.createdAt)}</span>
                </div>
                <div className="historyMeta">
                  <span className="statusBadge">{analysis.status}</span>
                </div>
                <p>{analysis.jobTitle?.trim() || summarizeJobText(analysis.jobText)}</p>
              </button>
              <div className="actions">
                <button
                  type="button"
                  className="ghostButton"
                  disabled={deletingId === analysis.id || openingId === analysis.id || isDeletingAll}
                  onClick={() => handleDeleteAnalysis(analysis)}
                >
                  {deletingId === analysis.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
