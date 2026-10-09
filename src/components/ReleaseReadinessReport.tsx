import { Download } from "lucide-react";
import { buildReleaseReport, formatReleaseNotes, type ProjectDiff } from "../domain/projects";
import styles from "../App.module.css";

type ReleaseReadinessReportProps = {
  baselineName: string;
  changes: ProjectDiff[];
};

export function ReleaseReadinessReport({ baselineName, changes }: ReleaseReadinessReportProps) {
  const report = buildReleaseReport(changes);
  const notes = formatReleaseNotes(baselineName, report);

  return (
    <section className={styles.releaseReport} aria-labelledby="release-report-title">
      <header>
        <div>
          <span className={styles.eyebrow}>Release readiness</span>
          <h3 id="release-report-title">
            {report.bump === "none"
              ? "No release needed"
              : `${report.bump[0].toUpperCase()}${report.bump.slice(1)} bump recommended`}
          </h3>
          <p>
            Suggested from token changes: removals are major, additions are minor, and value updates
            are patch. Review the impact before publishing.
          </p>
        </div>
        {report.bump !== "none" && (
          <a
            className={styles.secondaryButton}
            href={downloadUrl(notes)}
            download="tokenlab-release-notes.md"
          >
            <Download aria-hidden="true" />
            Download notes
          </a>
        )}
      </header>
      <dl className={styles.releaseSummary}>
        <div>
          <dt>Added</dt>
          <dd>{report.addedTokens.length}</dd>
        </div>
        <div>
          <dt>Removed</dt>
          <dd>{report.removedTokens.length}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{new Set(report.updates.map((update) => update.path)).size}</dd>
        </div>
      </dl>
      {report.bump !== "none" && (
        <details className={styles.releaseNotes}>
          <summary>Preview generated release notes</summary>
          <pre>{notes}</pre>
        </details>
      )}
    </section>
  );
}

function downloadUrl(content: string) {
  return `data:text/markdown;charset=utf-8,${encodeURIComponent(content)}`;
}
