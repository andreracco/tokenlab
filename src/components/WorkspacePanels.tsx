import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  Archive,
  ArrowLeft,
  Camera,
  Check,
  Copy,
  Download,
  Eye,
  FileCode2,
  FileJson,
  FileText,
  GitCompareArrows,
  History as HistoryIcon,
  Upload,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { buildExports, parseProjectFile, type ExportArtifact } from "../domain/exports";
import { createZip } from "../domain/zip";
import { diffProjects, type ProjectSnapshot } from "../domain/projects";
import type { ProjectDocument, TokenMode } from "../domain/tokens";
import { createPreviewStyle, type PreviewStyle } from "../preview/style";
import { componentRegistry } from "../preview/registry";
import { ReleaseReadinessReport } from "./ReleaseReadinessReport";
import { SelectControl } from "./SelectControl";
import styles from "../App.module.css";

type HistoryPanelProps = {
  snapshots: ProjectSnapshot[];
  onCreate: () => void;
  onCompare: (id: string) => void;
};

export function HistoryPanel({ snapshots, onCreate, onCompare }: HistoryPanelProps) {
  const headingRef = useFocusedHeading();

  return (
    <div className={styles.focusedPanel} aria-labelledby="history-title">
      <div className={styles.focusedHeader}>
        <div>
          <span className={styles.eyebrow}>Version history</span>
          <h2 id="history-title" ref={headingRef} tabIndex={-1}>
            Saved baselines
          </h2>
          <p>Capture a stable point, then compare future token changes against it.</p>
          <span className={styles.viewMeta} aria-live="polite">
            {snapshots.length} {snapshots.length === 1 ? "baseline" : "baselines"}
          </span>
        </div>
        {snapshots.length > 0 && (
          <button className={styles.primaryStudioButton} onClick={onCreate}>
            <Camera aria-hidden="true" />
            Save baseline
          </button>
        )}
      </div>
      {snapshots.length === 0 ? (
        <div className={styles.historyEmpty}>
          <HistoryIcon aria-hidden="true" />
          <strong>No saved baselines yet</strong>
          <p>Save one before a design review or a larger token change.</p>
          <button className={styles.primaryStudioButton} onClick={onCreate}>
            <Camera aria-hidden="true" />
            Save first baseline
          </button>
        </div>
      ) : (
        <div className={styles.historyList}>
          {snapshots.map((snapshot) => (
            <article key={snapshot.id}>
              <span className={styles.historyGlyph}>
                <HistoryIcon aria-hidden="true" />
              </span>
              <span>
                <strong>{snapshot.name}</strong>
                <time dateTime={snapshot.createdAt}>
                  {new Date(snapshot.createdAt).toLocaleString()}
                </time>
              </span>
              <button className={styles.secondaryButton} onClick={() => onCompare(snapshot.id)}>
                <GitCompareArrows aria-hidden="true" />
                Compare
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

type ExportPanelProps = {
  document: ProjectDocument;
  snapshots: ProjectSnapshot[];
  onClose: () => void;
  onImport: (workspace: { document: ProjectDocument; snapshots: ProjectSnapshot[] }) => void;
};

const exportDetails: Record<string, { kind: string; description: string; icon: LucideIcon }> = {
  "tokenlab.css": {
    kind: "CSS",
    description: "Custom properties for both modes, ready to import.",
    icon: FileCode2,
  },
  "tokenlab.light.tokens.json": {
    kind: "JSON",
    description: "Light-mode tokens in the DTCG interchange format.",
    icon: FileJson,
  },
  "tokenlab.dark.tokens.json": {
    kind: "JSON",
    description: "Dark-mode tokens in the DTCG interchange format.",
    icon: FileJson,
  },
  "tokenlab.tailwind.css": {
    kind: "CSS",
    description: "The same variables plus a Tailwind v4 theme mapping.",
    icon: Wind,
  },
  "tokenlab.project.json": {
    kind: "JSON",
    description: "Full project and baselines. Re-import it into TokenLab.",
    icon: FileJson,
  },
  "tokenlab.design-system.md": {
    kind: "Markdown",
    description: "A readable handoff of tokens, contrast and components.",
    icon: FileText,
  },
};

export function ExportPanel({ document, snapshots, onClose, onImport }: ExportPanelProps) {
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const headingRef = useFocusedHeading();
  const artifacts = buildExports(document, snapshots, componentRegistry);
  const previewed = artifacts.find((artifact) => artifact.filename === previewName) ?? artifacts[0];

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    try {
      onImport(parseProjectFile(await file.text()));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't import this project.");
    }
  };
  const importProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    try {
      await importFile(file);
    } finally {
      input.value = "";
    }
  };
  const copyArtifact = async (artifact: ExportArtifact) => {
    try {
      await navigator.clipboard.writeText(artifact.content);
      setCopyStatus(`Copied ${artifact.filename}`);
    } catch {
      setCopyStatus(`Couldn't copy ${artifact.filename}. Download it instead.`);
    }
  };
  const downloadAll = () => {
    const zip = createZip(
      artifacts.map((artifact) => ({ name: artifact.filename, content: artifact.content })),
    );
    saveBlob(new Blob([zip], { type: "application/zip" }), "tokenlab-tokens.zip");
  };

  return (
    <div className={styles.exportPanel} aria-labelledby="export-title">
      <div className={styles.exportHeader}>
        <div>
          <span className={styles.eyebrow}>Export system</span>
          <h2 id="export-title" ref={headingRef} tabIndex={-1}>
            Production-ready token files
          </h2>
          <p>Aliases and stable token ordering are preserved.</p>
        </div>
        <div className={styles.exportHeaderActions}>
          <button className={styles.primaryStudioButton} onClick={downloadAll}>
            <Archive aria-hidden="true" />
            Download all (.zip)
          </button>
          <button className={styles.secondaryButton} onClick={onClose}>
            <ArrowLeft aria-hidden="true" />
            Back to preview
          </button>
        </div>
      </div>
      <div className={styles.exportBody}>
        <div className={styles.exportGrid}>
          {artifacts.map((artifact) => {
            const details = exportDetails[artifact.filename];
            const Icon = details?.icon ?? FileText;
            const active = artifact.filename === previewed.filename;
            return (
              <article
                className={`${styles.exportCard} ${active ? styles.exportCardActive : ""}`}
                key={artifact.filename}
              >
                <span className={styles.exportIcon}>
                  <Icon aria-hidden="true" />
                </span>
                <div className={styles.exportTitle}>
                  <code>{artifact.filename}</code>
                  <small>
                    {details?.kind ?? "File"} · {formatBytes(artifact.content)}
                  </small>
                </div>
                {details && <p>{details.description}</p>}
                <div className={styles.exportActions}>
                  <button
                    className={styles.secondaryButton}
                    aria-pressed={active}
                    aria-label={`Preview ${artifact.filename}`}
                    onClick={() => setPreviewName(artifact.filename)}
                  >
                    {active ? <Check aria-hidden="true" /> : <Eye aria-hidden="true" />}
                    <span aria-hidden="true">{active ? "Previewing" : "Preview"}</span>
                  </button>
                  <button
                    className={styles.secondaryButton}
                    aria-label={`Copy ${artifact.filename}`}
                    onClick={() => copyArtifact(artifact)}
                  >
                    <Copy aria-hidden="true" />
                    <span aria-hidden="true">Copy</span>
                  </button>
                  <button
                    className={styles.exportDownload}
                    aria-label={`Download ${artifact.filename}`}
                    onClick={() => downloadArtifact(artifact)}
                  >
                    <Download aria-hidden="true" />
                    <span aria-hidden="true">Download</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        <p key={copyStatus} className={styles.exportStatus} role="status">
          {copyStatus}
        </p>
        <section className={styles.exportPreview} aria-labelledby="export-preview-title">
          <header>
            <h3 id="export-preview-title">Previewing {previewed.filename}</h3>
          </header>
          <pre
            key={previewed.filename}
            tabIndex={0}
            aria-label={`Contents of ${previewed.filename}`}
          >
            {previewed.content}
          </pre>
        </section>
        <div className={styles.usageExample}>
          <strong>CSS usage</strong>
          <code>{`.button { background: var(--action-primary-background); }`}</code>
        </div>
        <section className={styles.importSection} aria-labelledby="import-title">
          <h3 id="import-title">Import a project</h3>
          <div
            className={`${styles.dropZone} ${dragging ? styles.dropZoneActive : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void importFile(event.dataTransfer.files[0]);
            }}
          >
            <Upload aria-hidden="true" />
            <div>
              <strong>Drop a tokenlab.project.json file here</strong>
              <p>
                Importing replaces the current project and its baselines. Only the .json file
                exported above is accepted.
              </p>
            </div>
            <label className={styles.secondaryButton}>
              Choose file
              <input
                className={styles.srOnly}
                type="file"
                aria-label="Import TokenLab project"
                accept="application/json,.json"
                onChange={importProject}
              />
            </label>
          </div>
          {error && (
            <div className={styles.importError} role="alert">
              {error}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

type ComparisonViewProps = {
  snapshot: ProjectSnapshot;
  snapshots: ProjectSnapshot[];
  current: ProjectDocument;
  mode: TokenMode;
  onSelect: (id: string) => void;
  onClose: () => void;
  onRestore: () => void;
};

export function ComparisonView({
  snapshot,
  snapshots,
  current,
  mode,
  onSelect,
  onClose,
  onRestore,
}: ComparisonViewProps) {
  const changes = diffProjects(snapshot.document, current);
  const headingRef = useFocusedHeading();

  return (
    <div className={styles.comparison} aria-labelledby="comparison-title">
      <div className={styles.comparisonHeading}>
        <span className={styles.eyebrow}>Decision compare</span>
        <h2 id="comparison-title" ref={headingRef} tabIndex={-1}>
          Baseline and current system
        </h2>
        <p>Review the same preview and every changed token before restoring or exporting.</p>
      </div>
      <div className={styles.comparisonHeader}>
        <button className={styles.secondaryButton} onClick={onClose}>
          <ArrowLeft aria-hidden="true" />
          Back to history
        </button>
        <label>
          Baseline
          <SelectControl
            aria-label="Comparison baseline"
            value={snapshot.id}
            onChange={(event) => onSelect(event.target.value)}
          >
            {snapshots.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </SelectControl>
        </label>
        <span role="status">
          {changes.length} token {changes.length === 1 ? "change" : "changes"}
        </span>
        <button className={styles.primaryStudioButton} onClick={onRestore}>
          Restore baseline
        </button>
      </div>
      <div className={styles.comparisonGrid}>
        <ComparisonPreview
          label={snapshot.name}
          style={createPreviewStyle(snapshot.document, mode)}
        />
        <ComparisonPreview label="Current" style={createPreviewStyle(current, mode)} />
      </div>
      {changes.length === 0 ? (
        <p className={styles.diffEmpty}>
          No token changes. The current system matches this baseline.
        </p>
      ) : (
        <div className={styles.diffTableFrame}>
          <table className={styles.diffTable}>
            <caption>Token changes between {snapshot.name} and the current system</caption>
            <thead>
              <tr>
                <th scope="col">Token</th>
                <th scope="col">Mode</th>
                <th scope="col">Baseline</th>
                <th scope="col">Current</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((change) => (
                <tr key={`${change.path}-${change.mode}`}>
                  <th scope="row">
                    <code>{change.path}</code>
                  </th>
                  <td>{change.mode}</td>
                  <td>
                    <del>{change.before}</del>
                  </td>
                  <td>
                    <ins>{change.after}</ins>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ReleaseReadinessReport baselineName={snapshot.name} changes={changes} />
    </div>
  );
}

function ComparisonPreview({ label, style }: { label: string; style: PreviewStyle }) {
  return (
    <div className={styles.comparisonPreview} style={style} aria-label={`${label} preview`}>
      <strong>{label}</strong>
      <div>
        <h3>Projects</h3>
        <p>Plan, track, and ship your team’s best work.</p>
        <article>
          <span>In progress</span>
          <h4>Design system</h4>
          <p>Build reusable foundations for Forma.</p>
        </article>
        <button className={styles.specimenDisplay} disabled>
          Create project
        </button>
      </div>
    </div>
  );
}

function downloadArtifact(artifact: ExportArtifact) {
  saveBlob(new Blob([artifact.content], { type: artifact.mimeType }), artifact.filename);
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatBytes(content: string) {
  return `${new Blob([content]).size.toLocaleString()} bytes`;
}

function useFocusedHeading() {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return ref;
}
