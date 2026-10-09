import { useRef, useState } from "react";
import { CheckCircle2, Download, Eye, History as HistoryIcon, Layers3, MousePointer2, Redo2, Sparkles, Undo2 } from "lucide-react";
import { resolveCssValue, type TokenMode } from "./domain/tokens";
import { checkContrast } from "./domain/contrast";
import { useTokenLabStore } from "./app/store";
import { componentRegistry, consumersForToken, type ComponentKey } from "./preview/registry";
import { FormaPreview, SpecimenPreview } from "./preview/FormaPreview";
import { createPreviewStyle } from "./preview/style";
import { getTokenGroupId, TokenLibrary, type TokenGroupId } from "./components/TokenLibrary";
import { ComparisonView, ExportPanel, HistoryPanel } from "./components/WorkspacePanels";
import { TokenInspector } from "./components/TokenInspector";
import { useWorkspacePersistence } from "./persistence/useWorkspacePersistence";
import styles from "./App.module.css";

export function App() {
  const document = useTokenLabStore((state) => state.document);
  const selectedTokenId = useTokenLabStore((state) => state.selectedTokenId);
  const history = useTokenLabStore((state) => state.history);
  const future = useTokenLabStore((state) => state.future);
  const selectToken = useTokenLabStore((state) => state.selectToken);
  const execute = useTokenLabStore((state) => state.execute);
  const undo = useTokenLabStore((state) => state.undo);
  const redo = useTokenLabStore((state) => state.redo);
  const snapshots = useTokenLabStore((state) => state.snapshots);
  const captureSnapshot = useTokenLabStore((state) => state.captureSnapshot);
  const restoreSnapshot = useTokenLabStore((state) => state.restoreSnapshot);
  const hydrate = useTokenLabStore((state) => state.hydrate);
  const saveStatus = useWorkspacePersistence();
  const [inspectEnabled, setInspectEnabled] = useState(false);
  const [mode, setMode] = useState<TokenMode>("light");
  const [previewWidth, setPreviewWidth] = useState<720 | 960 | 1280>(1280);
  const [canvasView, setCanvasView] = useState<"app" | "components" | "history">("app");
  const [selectedComponentKey, setSelectedComponentKey] = useState<ComponentKey | null>(null);
  const [comparisonSnapshotId, setComparisonSnapshotId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [openTokenGroupId, setOpenTokenGroupId] = useState<TokenGroupId | null>("foundations");
  const [snapshotName, setSnapshotName] = useState("");
  const [snapshotError, setSnapshotError] = useState("");
  const [mobilePanel, setMobilePanel] = useState<"tokens" | "canvas" | "inspector">("canvas");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [createdProjects, setCreatedProjects] = useState<{ id: string; name: string }[]>([]);
  const snapshotDialog = useRef<HTMLDialogElement>(null);

  const selectedToken = document.tokens.find((token) => token.id === selectedTokenId)!;
  const selectVisibleToken = (tokenId: string) => {
    const token = document.tokens.find((candidate) => candidate.id === tokenId);
    if (token) setOpenTokenGroupId(getTokenGroupId(token));
    selectToken(tokenId);
  };
  const consumers = consumersForToken(selectedTokenId);
  const selectedComponent = componentRegistry.find((component) => component.key === selectedComponentKey);
  const selectComponent = (key: ComponentKey) => {
    const component = componentRegistry.find((candidate) => candidate.key === key)!;
    setSelectedComponentKey(key);
    selectVisibleToken(component.tokenIds[0]);
    setMobilePanel("inspector");
    setInspectorOpen(true);
  };
  const previewStyle = { ...createPreviewStyle(document, mode), "--tl-preview-viewport-width": `${previewWidth}px` };
  const comparisonSnapshot = snapshots.find((snapshot) => snapshot.id === comparisonSnapshotId);
  const contrastResults = checkContrast(document, mode);
  const contrastFailures = contrastResults.filter((result) => !result.passes).length;
  const spectrum = document.tokens.filter((token) => token.type === "color" && token.layer === "primitive").slice(0, 6);
  const focusedView = exportOpen || canvasView === "history";

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.brandBlock}>
          <div className={styles.brandMark}><Layers3 aria-hidden="true" /></div>
          <div>
            <strong>TokenLab</strong>
            <span>{document.name}</span>
          </div>
        </div>
        <div className={styles.tokenSpectrum} aria-label={`Active palette for ${document.name}`}>
          <span>Active spectrum</span>
          <div>{spectrum.map((token) => <i key={token.id} style={{ background: resolveCssValue(document, token.id, mode) }} title={`${token.path}: ${resolveCssValue(document, token.id, mode)}`} />)}</div>
        </div>
        <nav className={`${styles.viewTabs} ${styles.headerViewTabs}`} aria-label="Canvas views">
          <button aria-pressed={canvasView === "app" && !exportOpen} className={canvasView === "app" && !exportOpen ? styles.activeTab : ""} onClick={() => { setExportOpen(false); setComparisonSnapshotId(null); setCanvasView("app"); }}>Preview</button>
          <button aria-pressed={canvasView === "components" && !exportOpen} className={canvasView === "components" && !exportOpen ? styles.activeTab : ""} onClick={() => { setExportOpen(false); setComparisonSnapshotId(null); setCanvasView("components"); }}>Components</button>
          <button aria-pressed={canvasView === "history" && !exportOpen} className={canvasView === "history" && !exportOpen ? styles.activeTab : ""} onClick={() => { setExportOpen(false); setComparisonSnapshotId(null); setCanvasView("history"); }}><HistoryIcon aria-hidden="true" />History</button>
        </nav>
        <div className={styles.headerActions}>
          <span className={styles.savedStatus} role="status" aria-live="polite"><CheckCircle2 aria-hidden="true" /> {saveStatus}</span>
          <span className={styles.contrastStatus}>{contrastFailures === 0 ? "Contrast checks pass" : `${contrastFailures} contrast pairs need attention`}</span>
          <span className={styles.historyActions}>
            <button className={styles.iconAction} aria-label="Undo" title="Undo" disabled={history.length === 0} onClick={undo}><Undo2 aria-hidden="true" /></button>
            <button className={styles.iconAction} aria-label="Redo" title="Redo" disabled={future.length === 0} onClick={redo}><Redo2 aria-hidden="true" /></button>
          </span>
          <button className={styles.primaryStudioButton} onClick={() => { setComparisonSnapshotId(null); setExportOpen(true); setMobilePanel("canvas"); setInspectorOpen(false); }}><Download aria-hidden="true" />Export</button>
        </div>
      </header>

      <dialog ref={snapshotDialog} className={styles.studioDialog} aria-labelledby="snapshot-title">
        <form method="dialog" noValidate onSubmit={(event) => { if (!snapshotName.trim()) { event.preventDefault(); setSnapshotError("Enter a snapshot name."); return; } captureSnapshot(snapshotName.trim()); }}>
          <h2 id="snapshot-title">Name snapshot</h2>
          <p>Save the current token system as a comparison baseline.</p>
          <label>Snapshot name<input autoFocus required aria-invalid={Boolean(snapshotError)} aria-describedby={snapshotError ? "snapshot-error" : undefined} value={snapshotName} onChange={(event) => { setSnapshotName(event.target.value); setSnapshotError(""); }} /></label>
          <span id="snapshot-error" className={styles.dialogError} role="alert">{snapshotError}</span>
          <div><button type="button" className={styles.secondaryButton} onClick={() => snapshotDialog.current?.close()}>Cancel</button><button className={styles.primaryStudioButton} disabled={!snapshotName.trim()}>Save snapshot</button></div>
        </form>
      </dialog>

      <nav className={`${styles.mobilePanelNav} ${focusedView ? styles.focusedViewHidden : ""}`} aria-label="Mobile workspace">
        {(["tokens", "canvas", "inspector"] as const).map((panel) => <button key={panel} aria-pressed={mobilePanel === panel} onClick={() => setMobilePanel(panel)}>{panel[0].toUpperCase() + panel.slice(1)}</button>)}
      </nav>

      <main className={`${styles.workspace} ${focusedView ? styles.workspaceFocused : ""}`}>
        <TokenLibrary
          className={`${styles.tokenPanel} ${focusedView ? styles.focusedViewHidden : ""} ${mobilePanel !== "tokens" ? styles.mobilePanelHidden : ""}`}
          document={document}
          mode={mode}
          selectedTokenId={selectedTokenId}
          openGroupId={openTokenGroupId}
          onOpenGroupChange={setOpenTokenGroupId}
          onSelectToken={(tokenId) => { setSelectedComponentKey(null); selectVisibleToken(tokenId); setMobilePanel("inspector"); setInspectorOpen(true); }}
          onSelectPreset={(presetId) => execute({ type: "select-preset", presetId })}
        />

        <section className={`${styles.canvasPanel} ${mobilePanel !== "canvas" ? styles.mobilePanelHidden : ""}`} aria-label="Living Canvas">
          {!focusedView && <div className={styles.canvasToolbar}>
            <strong>Living Canvas</strong>
            <div className={styles.canvasControls}>
              <select className={styles.modeSelect} aria-label="Preview mode" value={mode} onChange={(event) => setMode(event.target.value as TokenMode)}><option value="light">Light</option><option value="dark">Dark</option></select>
              <select className={styles.modeSelect} aria-label="Preview width" value={previewWidth} onChange={(event) => setPreviewWidth(Number(event.target.value) as typeof previewWidth)}><option value={1280}>Desktop 1280</option><option value={960}>Compact 960</option><option value={720}>Narrow 720</option></select>
              <button className={styles.inspectorDrawerButton} aria-expanded={inspectorOpen} aria-controls="token-inspector" onClick={() => setInspectorOpen(true)}>Open inspector</button>
              <span className={styles.interactionModes} aria-label="Preview interaction mode">
                <button className={!inspectEnabled ? styles.activeInteractionMode : ""} aria-pressed={!inspectEnabled} onClick={() => setInspectEnabled(false)}><MousePointer2 aria-hidden="true" />Interact</button>
                <button className={inspectEnabled ? styles.activeInteractionMode : ""} aria-pressed={inspectEnabled} onClick={() => setInspectEnabled(true)}><Eye aria-hidden="true" />Inspect</button>
              </span>
            </div>
          </div>}
          {inspectEnabled && !focusedView && <div className={styles.inspectNotice}><Sparkles aria-hidden="true" /><span><strong>Inspect mode</strong> — select a preview element to reveal its tokens.</span></div>}
          {exportOpen ? <ExportPanel document={document} snapshots={snapshots} onClose={() => setExportOpen(false)} onImport={(workspace) => { hydrate(workspace.document, workspace.snapshots); setExportOpen(false); }} /> : comparisonSnapshot ? <ComparisonView snapshot={comparisonSnapshot} snapshots={snapshots} current={document} mode={mode} onSelect={setComparisonSnapshotId} onClose={() => setComparisonSnapshotId(null)} onRestore={() => { restoreSnapshot(comparisonSnapshot.id); setComparisonSnapshotId(null); setCanvasView("app"); }} /> : canvasView === "history" ? <HistoryPanel snapshots={snapshots} onCreate={() => { setSnapshotName(`Baseline ${snapshots.length + 1}`); snapshotDialog.current?.showModal(); }} onCompare={setComparisonSnapshotId} /> : canvasView === "app" ? <FormaPreview
              createdProjects={createdProjects}
              inspectEnabled={inspectEnabled}
              highlightedComponents={consumers.map((consumer) => consumer.key)}
              selectedComponentKey={selectedComponentKey}
              onInspect={selectComponent}
              onCreateProject={(name) => setCreatedProjects((projects) => [...projects, { id: `preview-project-${projects.length + 1}`, name }])}
              style={previewStyle}
            /> : <SpecimenPreview style={previewStyle} />}
        </section>

        <TokenInspector
          className={`${styles.inspectorPanel} ${focusedView ? styles.focusedViewHidden : ""} ${!inspectorOpen ? styles.inspectorDrawerClosed : ""} ${mobilePanel !== "inspector" ? styles.mobilePanelHidden : ""}`}
          document={document}
          token={selectedToken}
          mode={mode}
          selectedComponent={selectedComponent}
          consumers={consumers}
          contrastResults={contrastResults}
          contrastFailures={contrastFailures}
          onClose={() => setInspectorOpen(false)}
          onSelectToken={selectVisibleToken}
          onSelectComponent={selectComponent}
          onApplyColor={(value) => execute({ type: "set-color", tokenId: selectedToken.id, mode, value })}
          onApplyValue={(value) => execute({ type: "set-token-value", tokenId: selectedToken.id, mode, value })}
          onApplyReference={(targetId) => execute({ type: "set-token-reference", tokenId: selectedToken.id, mode, targetId })}
        />
      </main>
    </div>
  );
}
