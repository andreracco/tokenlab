import { useState, type ChangeEvent } from "react";
import { ArrowLeft, Camera, Download, GitCompareArrows, History as HistoryIcon } from "lucide-react";
import { buildExports, parseProjectFile, type ExportArtifact } from "../domain/exports";
import { diffProjects, type ProjectSnapshot } from "../domain/projects";
import type { ProjectDocument, TokenMode } from "../domain/tokens";
import { createPreviewStyle, type PreviewStyle } from "../preview/style";
import styles from "../App.module.css";

export function HistoryPanel({ snapshots, onCreate, onCompare }: { snapshots: ProjectSnapshot[]; onCreate: () => void; onCompare: (id: string) => void }) {
  return <div className={styles.focusedPanel}>
    <div className={styles.focusedHeader}>
      <div><span className={styles.eyebrow}>Version history</span><h2>Saved baselines</h2><p>Capture a stable point, then compare future token changes against it.</p></div>
      <button className={styles.primaryStudioButton} onClick={onCreate}><Camera aria-hidden="true" />Save baseline</button>
    </div>
    {snapshots.length === 0 ? <div className={styles.historyEmpty}><HistoryIcon aria-hidden="true" /><strong>No saved baselines yet</strong><p>Save one before a design review or a larger token change.</p><button className={styles.primaryStudioButton} onClick={onCreate}><Camera aria-hidden="true" />Save first baseline</button></div> : <div className={styles.historyList}>{snapshots.map((snapshot) => <article key={snapshot.id}>
      <span className={styles.historyGlyph}><HistoryIcon aria-hidden="true" /></span>
      <span><strong>{snapshot.name}</strong><small>{new Date(snapshot.createdAt).toLocaleString()}</small></span>
      <button className={styles.secondaryButton} onClick={() => onCompare(snapshot.id)}><GitCompareArrows aria-hidden="true" />Compare</button>
    </article>)}</div>}
  </div>;
}

export function ExportPanel({ document, snapshots, onClose, onImport }: { document: ProjectDocument; snapshots: ProjectSnapshot[]; onClose: () => void; onImport: (workspace: { document: ProjectDocument; snapshots: ProjectSnapshot[] }) => void }) {
  const [error, setError] = useState("");
  const artifacts = buildExports(document, snapshots);
  const importProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try { onImport(parseProjectFile(await file.text())); } catch (reason) { setError(reason instanceof Error ? reason.message : "Couldn't import this project."); } finally { input.value = ""; }
  };

  return <div className={styles.exportPanel}><div className={styles.exportHeader}><div><span className={styles.eyebrow}>Export system</span><h2>Production-ready token files</h2><p>Aliases and stable token ordering are preserved.</p></div><button className={styles.secondaryButton} onClick={onClose}><ArrowLeft aria-hidden="true" />Back to preview</button></div><div className={styles.exportGrid}>{artifacts.map((artifact) => <div className={styles.exportCard} key={artifact.filename}><code>{artifact.filename}</code><small>{formatBytes(artifact.content)}</small><button onClick={() => downloadArtifact(artifact)}><Download aria-hidden="true" />Download</button></div>)}</div><div className={styles.usageExample}><strong>CSS usage</strong><code>{`.button { background: var(--action-primary-background); }`}</code></div><label className={styles.importControl}>Import TokenLab project<input type="file" accept="application/json,.json" onChange={importProject} /></label><div className={styles.importError} role="status">{error}</div></div>;
}

export function ComparisonView({ snapshot, snapshots, current, mode, onSelect, onClose, onRestore }: { snapshot: ProjectSnapshot; snapshots: ProjectSnapshot[]; current: ProjectDocument; mode: TokenMode; onSelect: (id: string) => void; onClose: () => void; onRestore: () => void }) {
  const changes = diffProjects(snapshot.document, current);
  return <div className={styles.comparison}>
    <div className={styles.comparisonHeader}><button className={styles.secondaryButton} onClick={onClose}><ArrowLeft aria-hidden="true" />Back to history</button><select aria-label="Comparison baseline" value={snapshot.id} onChange={(event) => onSelect(event.target.value)}>{snapshots.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select><span>{changes.length} token changes</span><button className={styles.primaryStudioButton} onClick={onRestore}>Restore baseline</button></div>
    <div className={styles.comparisonGrid}><ComparisonPreview label={snapshot.name} style={createPreviewStyle(snapshot.document, mode)} /><ComparisonPreview label="Current" style={createPreviewStyle(current, mode)} /></div>
    <div className={styles.diffList}>{changes.length === 0 ? <p>No token changes.</p> : changes.map((change) => <div key={`${change.path}-${change.mode}`}><code>{change.path}</code><span>{change.mode}</span><del>{change.before}</del><ins>{change.after}</ins></div>)}</div>
  </div>;
}

function ComparisonPreview({ label, style }: { label: string; style: PreviewStyle }) {
  return <div className={styles.comparisonPreview} style={style}><strong>{label}</strong><div><h2>Projects</h2><p>Plan, track, and ship your team’s best work.</p><article><span>In progress</span><h3>Design system</h3><p>Build reusable foundations for Forma.</p></article><button className={styles.specimenDisplay} disabled>Create project</button></div></div>;
}

function downloadArtifact(artifact: ExportArtifact) {
  const url = URL.createObjectURL(new Blob([artifact.content], { type: artifact.mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = artifact.filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatBytes(content: string) {
  return `${new Blob([content]).size.toLocaleString()} bytes`;
}
