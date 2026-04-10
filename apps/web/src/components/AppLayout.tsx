import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Internship and Summer Training Assistant</p>
          <h1>AI Job Copilot</h1>
          <p className="lede">
            Upload a master resume, compare it against a role description, and get a practical first-pass fit analysis.
          </p>
        </div>
        <nav className="nav">
          <Link className={location.pathname === "/" || location.pathname === "/resume" ? "active" : ""} to="/resume">Resume</Link>
          <Link className={location.pathname === "/job" ? "active" : ""} to="/job">Job</Link>
          <Link className={location.pathname.startsWith("/jobs") ? "active" : ""} to="/jobs">Jobs</Link>
          <Link className={location.pathname === "/history" ? "active" : ""} to="/history">History</Link>
          <Link className={location.pathname === "/results" ? "active" : ""} to="/results">Results</Link>
        </nav>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
