import { useRef, useState, type CSSProperties, type ChangeEvent, type KeyboardEvent } from "react";
import { colorValueSchema, getAliasTargets, parseTokenInput, presetOptions, presetSpecs, resolveColorToken, resolveCssValue, type ProjectDocument, type ResolvedTokenValue, type Token, type TokenMode } from "./domain/tokens";
import { diffProjects, type ProjectSnapshot } from "./domain/projects";
import { checkContrast } from "./domain/contrast";
import { buildExports, parseProjectFile, type ExportArtifact } from "./domain/exports";
import { useTokenLabStore } from "./app/store";
import { componentRegistry, consumersForToken, type ComponentKey } from "./preview/registry";
import { useWorkspacePersistence } from "./persistence/useWorkspacePersistence";
import styles from "./App.module.css";

type PreviewStyle = CSSProperties & {
  "--tl-preview-action-primary-background": string;
  "--tl-preview-action-primary-foreground": string;
  "--tl-preview-font-family": string;
  "--tl-preview-font-size": string;
  "--tl-preview-font-weight": string;
  "--tl-preview-strong-weight": string;
  "--tl-preview-line-height": string;
  "--tl-preview-content-padding": string;
  "--tl-preview-card-padding": string;
  "--tl-preview-card-gap": string;
  "--tl-preview-control-radius": string;
  "--tl-preview-card-radius": string;
  "--tl-preview-card-shadow": string;
  "--tl-preview-surface": string;
  "--tl-preview-panel": string;
  "--tl-preview-border": string;
  "--tl-preview-text": string;
  "--tl-preview-muted": string;
};

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
  const [inspectEnabled, setInspectEnabled] = useState(true);
  const [mode, setMode] = useState<TokenMode>("light");
  const [canvasView, setCanvasView] = useState<"app" | "specimens">("app");
  const [selectedComponentKey, setSelectedComponentKey] = useState<ComponentKey | null>(null);
  const [comparisonSnapshotId, setComparisonSnapshotId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [tokenQuery, setTokenQuery] = useState("");
  const [tokenType, setTokenType] = useState<"all" | Token["type"]>("all");
  const [snapshotName, setSnapshotName] = useState("");
  const [mobilePanel, setMobilePanel] = useState<"tokens" | "canvas" | "inspector">("canvas");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const snapshotDialog = useRef<HTMLDialogElement>(null);

  const selectedToken = document.tokens.find((token) => token.id === selectedTokenId)!;
  const preset = presetSpecs[document.presetId];
  const consumers = consumersForToken(selectedTokenId);
  const selectedComponent = componentRegistry.find((component) => component.key === selectedComponentKey);
  const selectComponent = (key: ComponentKey) => {
    const component = componentRegistry.find((candidate) => candidate.key === key)!;
    setSelectedComponentKey(key);
    selectToken(component.tokenIds[0]);
    setMobilePanel("inspector");
    setInspectorOpen(true);
  };
  const previewStyle = createPreviewStyle(document, mode);
  const comparisonSnapshot = snapshots.find((snapshot) => snapshot.id === comparisonSnapshotId);
  const contrastResults = checkContrast(document, mode);
  const contrastFailures = contrastResults.filter((result) => !result.passes).length;
  const visibleTokens = document.tokens.filter((token) => (tokenType === "all" || token.type === tokenType) && `${token.path} ${token.type}`.toLowerCase().includes(tokenQuery.trim().toLowerCase()));

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.brandBlock}>
          <div className={styles.brandMark}>TL</div>
          <div>
            <strong>TokenLab</strong>
            <span>{document.name}</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.savedStatus} role="status" aria-live="polite"><span aria-hidden="true">●</span> {saveStatus}</span>
          <span className={styles.contrastStatus}>{contrastFailures === 0 ? "Contrast checks pass" : `${contrastFailures} contrast pairs need attention`}</span>
          <button className={styles.secondaryButton} disabled={history.length === 0} onClick={undo}>Undo</button>
          <button className={styles.secondaryButton} disabled={future.length === 0} onClick={redo}>Redo</button>
          <button className={styles.secondaryButton} onClick={() => { setSnapshotName(`Baseline ${snapshots.length + 1}`); snapshotDialog.current?.showModal(); }}>Snapshot</button>
          <button className={styles.secondaryButton} disabled={snapshots.length === 0} onClick={() => { setComparisonSnapshotId(snapshots.at(-1)?.id ?? null); setMobilePanel("canvas"); setInspectorOpen(false); }}>Compare</button>
          <button className={styles.primaryStudioButton} onClick={() => { setComparisonSnapshotId(null); setExportOpen(true); setMobilePanel("canvas"); setInspectorOpen(false); }}>Export</button>
        </div>
      </header>

      <dialog ref={snapshotDialog} className={styles.studioDialog} aria-labelledby="snapshot-title">
        <form method="dialog" onSubmit={() => captureSnapshot(snapshotName.trim())}>
          <h2 id="snapshot-title">Name snapshot</h2>
          <p>Save the current token system as a comparison baseline.</p>
          <label>Snapshot name<input autoFocus required value={snapshotName} onChange={(event) => setSnapshotName(event.target.value)} /></label>
          <div><button type="button" onClick={() => snapshotDialog.current?.close()}>Cancel</button><button className={styles.primaryStudioButton} disabled={!snapshotName.trim()}>Save snapshot</button></div>
        </form>
      </dialog>

      <nav className={styles.mobilePanelNav} aria-label="Mobile workspace">
        {(["tokens", "canvas", "inspector"] as const).map((panel) => <button key={panel} aria-pressed={mobilePanel === panel} onClick={() => setMobilePanel(panel)}>{panel[0].toUpperCase() + panel.slice(1)}</button>)}
      </nav>

      <main className={styles.workspace}>
        <aside className={`${styles.tokenPanel} ${mobilePanel !== "tokens" ? styles.mobilePanelHidden : ""}`} aria-label="Token library">
          <div className={styles.panelHeading}>
            <div><span>Token library</span><small>{tokenQuery ? `${visibleTokens.length} of ${document.tokens.length}` : document.tokens.length} tokens</small></div>
          </div>
          <label className={styles.tokenSearch}>⌕<input type="search" aria-label="Search tokens" placeholder="Search tokens" value={tokenQuery} onChange={(event) => setTokenQuery(event.target.value)} /></label>
          <label className={styles.categoryFilter}>Category<select aria-label="Token category" value={tokenType} onChange={(event) => setTokenType(event.target.value as typeof tokenType)}><option value="all">All tokens</option><option value="color">Colors</option><option value="dimension">Dimensions</option><option value="fontFamily">Font families</option><option value="fontWeight">Font weights</option><option value="number">Numbers</option><option value="shadow">Shadows</option></select></label>
          <div className={styles.tokenList}>
            {visibleTokens.map((token) => (
              <TokenRow
                key={token.id}
                token={token}
                value={resolveCssValue(document, token.id, mode)}
                selected={token.id === selectedTokenId}
                onSelect={() => { setSelectedComponentKey(null); selectToken(token.id); setMobilePanel("inspector"); setInspectorOpen(true); }}
              />
            ))}
            {visibleTokens.length === 0 && <p className={styles.emptyTokens}>No matching tokens.</p>}
          </div>
          <div className={styles.presetPicker}>
            <label htmlFor="starting-system">Starting system</label>
            <select
              id="starting-system"
              value={document.presetId}
              onChange={(event) => execute({ type: "select-preset", presetId: event.target.value as typeof document.presetId })}
            >
              {presetOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
            <small>{preset.description}</small>
          </div>
        </aside>

        <section className={`${styles.canvasPanel} ${mobilePanel !== "canvas" ? styles.mobilePanelHidden : ""}`} aria-label="Living Canvas">
          <div className={styles.canvasToolbar}>
            <div>
              <strong>Living Canvas</strong>
              <span className={styles.viewTabs}>
                <button aria-pressed={canvasView === "app"} className={canvasView === "app" ? styles.activeTab : ""} onClick={() => setCanvasView("app")}>App</button>
                <button aria-pressed={canvasView === "specimens"} className={canvasView === "specimens" ? styles.activeTab : ""} onClick={() => setCanvasView("specimens")}>Specimens</button>
              </span>
            </div>
            <div className={styles.canvasControls}>
              <select className={styles.modeSelect} aria-label="Preview mode" value={mode} onChange={(event) => setMode(event.target.value as TokenMode)}><option value="light">Light</option><option value="dark">Dark</option></select>
              <span>{preset.name} · Desktop 1280</span>
              <button className={styles.inspectorDrawerButton} aria-expanded={inspectorOpen} aria-controls="token-inspector" onClick={() => setInspectorOpen(true)}>Open inspector</button>
              <button
                className={inspectEnabled ? styles.inspectActive : styles.inspectButton}
                aria-pressed={inspectEnabled}
                onClick={() => setInspectEnabled((enabled) => !enabled)}
              >
                Inspect {inspectEnabled ? "on" : "off"}
              </button>
            </div>
          </div>
          {exportOpen ? <ExportPanel document={document} snapshots={snapshots} onClose={() => setExportOpen(false)} onImport={(workspace) => { hydrate(workspace.document, workspace.snapshots); setExportOpen(false); }} /> : comparisonSnapshot ? <ComparisonView snapshot={comparisonSnapshot} snapshots={snapshots} current={document} mode={mode} onSelect={setComparisonSnapshotId} onClose={() => setComparisonSnapshotId(null)} onRestore={() => { restoreSnapshot(comparisonSnapshot.id); setComparisonSnapshotId(null); }} /> : canvasView === "app" ? <FormaPreview
              inspectEnabled={inspectEnabled}
              highlightedComponents={consumers.map((consumer) => consumer.key)}
              selectedComponentKey={selectedComponentKey}
              onInspect={selectComponent}
              style={previewStyle}
            /> : <SpecimenPreview style={previewStyle} />}
        </section>

        <aside id="token-inspector" className={`${styles.inspectorPanel} ${!inspectorOpen ? styles.inspectorDrawerClosed : ""} ${mobilePanel !== "inspector" ? styles.mobilePanelHidden : ""}`} aria-label="Token inspector">
          <div className={styles.inspectorHeading}>
            <button className={styles.inspectorDrawerClose} onClick={() => setInspectorOpen(false)} aria-label="Close inspector">×</button>
            <span className={styles.eyebrow}>Selected token</span>
            <strong>{selectedToken.path}</strong>
            <span className={styles.layerBadge}>{selectedToken.layer}</span>
          </div>
          <p className={styles.description}>{selectedToken.description}</p>
          {selectedToken.type === "color" && (selectedToken.values[mode] ?? selectedToken.values.light).kind === "literal" ? (
            <ColorEditor
              key={`${selectedToken.id}-${mode}-${resolveColorToken(document, selectedToken.id, mode)}`}
              mode={mode}
              initialValue={resolveColorToken(document, selectedToken.id, mode)}
              onApply={(value) => execute({ type: "set-color", tokenId: selectedToken.id, mode, value })}
            />
          ) : (selectedToken.values[mode] ?? selectedToken.values.light).kind === "literal" ? (
            <ValueEditor key={`${selectedToken.id}-${mode}-${resolveCssValue(document, selectedToken.id, mode)}`} token={selectedToken} mode={mode} initialValue={resolveCssValue(document, selectedToken.id, mode)} onApply={(value) => execute({ type: "set-token-value", tokenId: selectedToken.id, mode, value })} />
          ) : (
            <AliasEditor document={document} token={selectedToken} mode={mode} resolvedValue={resolveCssValue(document, selectedToken.id, mode)} onApply={(targetId) => execute({ type: "set-token-reference", tokenId: selectedToken.id, mode, targetId })} />
          )}
          {selectedComponent && <div className={styles.inspectorSection}><span className={styles.eyebrow}>{selectedComponent.label} tokens</span>{selectedComponent.tokenIds.map((tokenId) => <button className={styles.registryToken} key={tokenId} onClick={() => selectToken(tokenId)}><code>{tokenId}</code><span>›</span></button>)}</div>}
          {consumers.length > 0 && <div className={styles.inspectorSection}>
            <span className={styles.eyebrow}>Used by</span>
            {consumers.map((consumer) => <button className={styles.usageRow} key={consumer.key} onClick={() => selectComponent(consumer.key)}>
              <span className={styles.componentGlyph}>▣</span>
              <span><strong>{consumer.label}</strong><small>Forma · {consumer.location}</small></span>
              <span>›</span>
            </button>)}
          </div>}
          <div className={styles.inspectorSection}><span className={styles.eyebrow}>Contrast checks · {mode}</span><div className={styles.contrastList}>{contrastResults.map((result) => <div key={result.id} className={result.passes ? styles.contrastPass : styles.contrastFail}><span>{result.label}<small>{result.component}</small></span><strong>{result.ratio}:1</strong><small>{result.passes ? "Pass" : `Needs ${result.threshold}:1`}</small></div>)}</div></div>
        </aside>
      </main>
    </div>
  );
}

function ExportPanel({ document, snapshots, onClose, onImport }: { document: ProjectDocument; snapshots: ProjectSnapshot[]; onClose: () => void; onImport: (workspace: { document: ProjectDocument; snapshots: ProjectSnapshot[] }) => void }) {
  const [error, setError] = useState("");
  const artifacts = buildExports(document, snapshots);
  const importProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try { onImport(parseProjectFile(await file.text())); } catch (reason) { setError(reason instanceof Error ? reason.message : "Couldn't import this project."); } finally { input.value = ""; }
  };

  return <div className={styles.exportPanel}><div className={styles.exportHeader}><div><span className={styles.eyebrow}>Export system</span><h2>Production-ready token files</h2><p>Aliases and stable token ordering are preserved.</p></div><button onClick={onClose}>Close</button></div><div className={styles.exportGrid}>{artifacts.map((artifact) => <div className={styles.exportCard} key={artifact.filename}><code>{artifact.filename}</code><small>{formatBytes(artifact.content)}</small><button onClick={() => downloadArtifact(artifact)}>Download</button></div>)}</div><div className={styles.usageExample}><strong>CSS usage</strong><code>{`.button { background: var(--action-primary-background); }`}</code></div><label className={styles.importControl}>Import TokenLab project<input type="file" accept="application/json,.json" onChange={importProject} /></label><div className={styles.importError} role="status">{error}</div></div>;
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

function createPreviewStyle(document: ProjectDocument, mode: TokenMode): PreviewStyle {
  const fontFamily = resolveCssValue(document, "typography.body.family", mode);
  return {
    "--tl-preview-action-primary-background": resolveColorToken(document, "action.primary.background", mode),
    "--tl-preview-action-primary-foreground": resolveCssValue(document, "action.primary.foreground", mode),
    "--tl-preview-font-family": fontFamily === "Georgia" ? "Georgia, serif" : `${fontFamily}, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
    "--tl-preview-font-size": resolveCssValue(document, "typography.body.size", mode),
    "--tl-preview-font-weight": resolveCssValue(document, "typography.body.weight", mode),
    "--tl-preview-strong-weight": resolveCssValue(document, "typography.strong.weight", mode),
    "--tl-preview-line-height": resolveCssValue(document, "typography.body.line-height", mode),
    "--tl-preview-content-padding": resolveCssValue(document, "layout.content.padding", mode),
    "--tl-preview-card-padding": resolveCssValue(document, "space.medium", mode),
    "--tl-preview-card-gap": resolveCssValue(document, "layout.card.gap", mode),
    "--tl-preview-control-radius": resolveCssValue(document, "component.control.radius", mode),
    "--tl-preview-card-radius": resolveCssValue(document, "component.card.radius", mode),
    "--tl-preview-card-shadow": resolveCssValue(document, "component.card.shadow", mode),
    "--tl-preview-surface": resolveCssValue(document, "surface.page", mode),
    "--tl-preview-panel": resolveCssValue(document, "surface.panel", mode),
    "--tl-preview-border": resolveCssValue(document, "border.default", mode),
    "--tl-preview-text": resolveCssValue(document, "text.primary", mode),
    "--tl-preview-muted": resolveCssValue(document, "text.muted", mode),
  };
}

function ComparisonView({ snapshot, snapshots, current, mode, onSelect, onClose, onRestore }: { snapshot: ProjectSnapshot; snapshots: ProjectSnapshot[]; current: ProjectDocument; mode: TokenMode; onSelect: (id: string) => void; onClose: () => void; onRestore: () => void }) {
  const changes = diffProjects(snapshot.document, current);
  return <div className={styles.comparison}>
    <div className={styles.comparisonHeader}><select aria-label="Comparison baseline" value={snapshot.id} onChange={(event) => onSelect(event.target.value)}>{snapshots.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select><span>{changes.length} token changes</span><button onClick={onRestore}>Restore baseline</button><button onClick={onClose}>Close</button></div>
    <div className={styles.comparisonGrid}><ComparisonPreview label={snapshot.name} style={createPreviewStyle(snapshot.document, mode)} /><ComparisonPreview label="Current" style={createPreviewStyle(current, mode)} /></div>
    <div className={styles.diffList}>{changes.length === 0 ? <p>No token changes.</p> : changes.map((change) => <div key={`${change.path}-${change.mode}`}><code>{change.path}</code><span>{change.mode}</span><del>{change.before}</del><ins>{change.after}</ins></div>)}</div>
  </div>;
}

function ComparisonPreview({ label, style }: { label: string; style: PreviewStyle }) {
  return <div className={styles.comparisonPreview} style={style}><strong>{label}</strong><div><h2>Projects</h2><p>Plan, track, and ship your team’s best work.</p><article><span>In progress</span><h3>Design system</h3><p>Build reusable foundations for Forma.</p></article><button>Create project</button></div></div>;
}

function TokenRow({ token, value, selected, onSelect }: { token: Token; value: string; selected: boolean; onSelect: () => void }) {
  return (
    <button className={`${styles.tokenRow} ${selected ? styles.tokenRowSelected : ""}`} onClick={onSelect} aria-pressed={selected}>
      {token.type === "color" ? <span className={styles.swatch} style={{ backgroundColor: value }} /> : <span className={styles.tokenTypeIcon}>{token.type.slice(0, 2)}</span>}
      <span><strong>{token.path.split(".").at(-1)}</strong><small>{token.path}</small></span>
      <code>{token.values.light.kind === "reference" ? "↗ alias" : value}</code>
    </button>
  );
}

function ColorEditor({ initialValue, mode, onApply }: { initialValue: string; mode: TokenMode; onApply: (value: string) => void }) {
  const [draft, setDraft] = useState(initialValue);
  const result = colorValueSchema.safeParse(draft);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") setDraft(initialValue);
    if (event.key === "Enter" && result.success) onApply(draft);
  };

  return (
    <div className={styles.editor}>
      <label htmlFor="color-value">{mode === "light" ? "Light" : "Dark"} value</label>
      <div className={styles.colorField}>
        <input aria-label="Choose color" type="color" value={result.success ? draft : initialValue} onChange={(event) => setDraft(event.target.value.toUpperCase())} />
        <input
          id="color-value"
          value={draft}
          aria-invalid={!result.success}
          aria-describedby={!result.success ? "color-error" : undefined}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
        />
      </div>
      <div className={styles.validationSlot} id="color-error" role="status">{result.success ? "" : result.error.issues[0].message}</div>
      <div className={styles.editorActions}>
        <button className={styles.secondaryButton} onClick={() => setDraft(initialValue)}>Cancel</button>
        <button className={styles.primaryStudioButton} disabled={!result.success || draft.toUpperCase() === initialValue.toUpperCase()} onClick={() => onApply(draft)}>Apply</button>
      </div>
    </div>
  );
}

function ValueEditor({ token, mode, initialValue, onApply }: { token: Token; mode: TokenMode; initialValue: string; onApply: (value: ResolvedTokenValue) => void }) {
  const [draft, setDraft] = useState(initialValue);
  let parsed: ResolvedTokenValue | undefined;
  let error = "";
  try { parsed = parseTokenInput(token.type, draft); } catch (reason) { error = reason instanceof Error ? reason.message : "Invalid value."; }
  const apply = () => { if (parsed && draft !== initialValue) onApply(parsed); };

  return <div className={styles.editor}>
    <label htmlFor="token-value">{mode === "light" ? "Light" : "Dark"} value</label>
    {token.type === "fontFamily"
      ? <select id="token-value" className={styles.valueInput} value={draft} onChange={(event) => setDraft(event.target.value)}><option>Inter</option><option>Georgia</option><option>Avenir Next</option></select>
      : <input id="token-value" className={styles.valueInput} value={draft} aria-invalid={Boolean(error)} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setDraft(initialValue); if (event.key === "Enter") apply(); }} onBlur={(event) => { if (!(event.relatedTarget instanceof Element && event.relatedTarget.closest(`.${styles.editor}`))) apply(); }} />}
    <div className={styles.validationSlot} role="status">{error}</div>
    <div className={styles.editorActions}><button className={styles.secondaryButton} onClick={() => setDraft(initialValue)}>Cancel</button><button className={styles.primaryStudioButton} disabled={!parsed || draft === initialValue} onClick={apply}>Apply</button></div>
  </div>;
}

function AliasEditor({ document, token, mode, resolvedValue, onApply }: { document: ProjectDocument; token: Token; mode: TokenMode; resolvedValue: string; onApply: (targetId: string) => void }) {
  const value = token.values[mode] ?? token.values.light;
  const initialTarget = value.kind === "reference" ? value.tokenId : "";
  const [draft, setDraft] = useState(initialTarget);
  const targets = getAliasTargets(document, token.id);
  if (value.kind !== "reference") return null;

  return (
    <div className={styles.editor}>
      <label htmlFor="alias-target">Alias target</label>
      <select id="alias-target" className={styles.valueInput} value={draft} onChange={(event) => setDraft(event.target.value)}>{targets.map((target) => <option key={target.id} value={target.id}>{target.path}</option>)}</select>
      <div className={styles.resolvedRow}><span>Resolved value</span><code>{resolvedValue}</code></div>
      <div className={styles.editorActions}><button className={styles.secondaryButton} onClick={() => setDraft(value.tokenId)}>Cancel</button><button className={styles.primaryStudioButton} disabled={draft === value.tokenId} onClick={() => onApply(draft)}>Apply</button></div>
    </div>
  );
}

function SpecimenPreview({ style }: { style: PreviewStyle }) {
  return (
    <div className={styles.previewStage}>
      <div className={`${styles.previewRoot} ${styles.specimenRoot}`} style={style} data-testid="preview-root">
        <header><span>Forma component specimens</span><small>Representative states</small></header>
        <section><h2>Buttons</h2><div className={styles.specimenRow}><button className={styles.formaPrimary}>Primary</button><button className={`${styles.formaPrimary} ${styles.simulatedFocus}`}>Focus</button><button className={styles.formaPrimary} disabled>Disabled</button><button className={styles.formaPrimary}>••• Loading</button></div></section>
        <section><h2>Inputs</h2><div className={styles.specimenRow}><input placeholder="Default input" /><input className={styles.simulatedFocus} defaultValue="Focused value" /><input className={styles.inputError} defaultValue="Invalid value" /><input disabled placeholder="Disabled" /></div></section>
        <section><h2>Cards and badges</h2><div className={styles.specimenRow}><article className={styles.specimenCard}><span className={styles.specimenBadge}>In progress</span><h3>Design system</h3><p>Build reusable foundations for Forma.</p></article><article className={styles.specimenCard}><span className={styles.specimenBadge}>Complete</span><h3>Navigation audit</h3><p>Improve structure and wayfinding.</p></article></div></section>
        <section><h2>Tabs and menu</h2><div className={styles.specimenRow}><div className={styles.specimenTabs}><button>Overview</button><button className={styles.activeTab}>Activity</button><button>Files</button></div><div className={styles.specimenMenu}><button>Edit project</button><button>Duplicate</button><button>Archive</button></div></div></section>
        <section><h2>Dialog</h2><div className={styles.specimenDialog}><strong>Create project</strong><p>Start with a clear name and an owner.</p><input placeholder="Project name" /><div><button>Cancel</button><button className={styles.formaPrimary}>Create project</button></div></div></section>
      </div>
    </div>
  );
}

function FormaPreview({ inspectEnabled, highlightedComponents, selectedComponentKey, onInspect, style }: { inspectEnabled: boolean; highlightedComponents: ComponentKey[]; selectedComponentKey: ComponentKey | null; onInspect: (key: ComponentKey) => void; style: PreviewStyle }) {
  const createProjectDialog = useRef<HTMLDialogElement>(null);
  const [createdProjects, setCreatedProjects] = useState<{ id: string; name: string }[]>([]);
  const primarySelected = highlightedComponents.includes("primary-button") || selectedComponentKey === "primary-button";
  const cardSelected = highlightedComponents.includes("project-card") || selectedComponentKey === "project-card";

  return (
    <div className={styles.previewStage}>
      <div className={styles.previewRoot} style={style} data-testid="preview-root">
        <aside className={styles.formaSidebar}>
          <div className={styles.formaLogo}><span>F</span> forma</div>
          <button className={styles.workspaceSwitcher}><span className={styles.avatar}>AC</span><span>Acme Studio<small>Product workspace</small></span><span>⌄</span></button>
          <nav aria-label="Forma navigation">
            <a href="#overview"><span>⌂</span> Overview</a>
            <a href="#projects" className={styles.navSelected}><span>▦</span> Projects</a>
            <a href="#tasks"><span>✓</span> My tasks <small>7</small></a>
            <a href="#team"><span>♙</span> Team</a>
          </nav>
          <div className={styles.sidebarFooter}><span className={styles.avatar}>MS</span><span>Maya Santos<small>maya@acme.co</small></span><button aria-label="Account menu">•••</button></div>
        </aside>
        <div className={styles.formaMain}>
          <div className={styles.formaTopbar}><label>⌕ <input aria-label="Search Forma" placeholder="Search projects and tasks" /></label><button aria-label="Notifications">♢</button><span className={styles.avatar}>MS</span></div>
          <div className={styles.formaContent}>
            <div className={styles.pageHeading}>
              <div><span className={styles.breadcrumb}>Workspace / Projects</span><h1>Projects</h1><p>Plan, track, and ship your team’s best work.</p></div>
              <button
                className={`${styles.formaPrimary} ${inspectEnabled && primarySelected ? styles.inspected : ""}`}
                onClick={() => inspectEnabled ? onInspect("primary-button") : createProjectDialog.current?.showModal()}
                aria-label={inspectEnabled ? "Create project; inspect action.primary.background" : "Create project"}
              >
                <span>＋</span> Create project
                {inspectEnabled && primarySelected && <small>action.primary.background</small>}
              </button>
            </div>
            <div className={styles.projectToolbar}><label>⌕ <input aria-label="Search projects" placeholder="Search projects" /></label><button>All statuses⌄</button><button>Last updated⌄</button><span>{8 + createdProjects.length} projects</span></div>
            <div className={styles.projectGrid}>
              <ProjectCard title="Mobile app refresh" category="Product" progress={72} color="#E9A23B" members={["MS", "JL", "AK"]} inspectEnabled={inspectEnabled} selected={cardSelected} onInspect={() => onInspect("project-card")} />
              <ProjectCard title="Q4 campaign" category="Marketing" progress={48} color="#D7648B" members={["OR", "MS"]} inspectEnabled={inspectEnabled} selected={cardSelected} onInspect={() => onInspect("project-card")} />
              <ProjectCard title="Design system" category="Design" progress={86} color="#5A69C8" members={["AK", "JL", "OR"]} inspectEnabled={inspectEnabled} selected={cardSelected} onInspect={() => onInspect("project-card")} />
              {createdProjects.map((project) => <ProjectCard key={project.id} title={project.name} category="New project" progress={0} color="#6F7785" members={["MS"]} inspectEnabled={inspectEnabled} selected={cardSelected} onInspect={() => onInspect("project-card")} />)}
            </div>
            <div className={styles.activityPanel}><div><strong>Recent activity</strong><span>View all</span></div><p><span className={styles.avatar}>JL</span><span><strong>Jon Lee</strong> completed “Review navigation patterns”<small>Mobile app refresh · 18 minutes ago</small></span></p><p><span className={styles.avatar}>AK</span><span><strong>Ana Kim</strong> uploaded 3 files<small>Design system · 1 hour ago</small></span></p></div>
          </div>
        </div>
        <dialog ref={createProjectDialog} className={styles.createProjectDialog} aria-labelledby="create-project-title">
          <form method="dialog" onSubmit={(event) => { const name = String(new FormData(event.currentTarget).get("projectName") ?? "").trim(); if (name) setCreatedProjects((projects) => [...projects, { id: `preview-project-${projects.length + 1}`, name }]); event.currentTarget.reset(); }}>
            <h2 id="create-project-title">Create project</h2>
            <p>Start with a clear name and an owner.</p>
            <label>Project name<input name="projectName" autoFocus required /></label>
            <div><button type="button" onClick={() => createProjectDialog.current?.close()}>Cancel</button><button className={styles.formaPrimary} value="create">Create project</button></div>
          </form>
        </dialog>
      </div>
    </div>
  );
}

function ProjectCard({ title, category, progress, color, members, inspectEnabled, selected, onInspect }: { title: string; category: string; progress: number; color: string; members: string[]; inspectEnabled: boolean; selected: boolean; onInspect: () => void }) {
  return (
    <article className={`${styles.projectCard} ${inspectEnabled && selected ? styles.inspected : ""}`} role={inspectEnabled ? "button" : undefined} aria-label={inspectEnabled ? `Inspect ${title} project card` : undefined} tabIndex={inspectEnabled ? 0 : undefined} onClick={inspectEnabled ? onInspect : undefined} onKeyDown={inspectEnabled ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onInspect(); } } : undefined}>
      <div><span className={styles.projectIcon} style={{ background: color }}>{title[0]}</span><span aria-hidden="true">•••</span></div>
      <h2>{title}</h2><p>{category}</p>
      <div className={styles.progressLabel}><span>Progress</span><strong>{progress}%</strong></div>
      <div className={styles.progressTrack}><span style={{ width: `${progress}%`, background: color }} /></div>
      <div className={styles.cardFooter}><div>{members.map((member) => <span className={styles.avatar} key={member}>{member}</span>)}</div><span>Updated today</span></div>
    </article>
  );
}
