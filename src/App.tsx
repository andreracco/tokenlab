import { useRef, useState } from "react";
import { AnimatePresence, domMax, LazyMotion, MotionConfig, m } from "framer-motion";
import {
  CheckCircle2,
  Download,
  Eye,
  FileSearch,
  HeartPulse,
  History as HistoryIcon,
  Layers3,
  MousePointer2,
  Redo2,
  Sparkles,
  Undo2,
} from "lucide-react";
import type { TokenMode } from "./domain/tokens";
import { createStyleImportCommand, type StyleMapping } from "./domain/styleImport";
import { checkContrast } from "./domain/contrast";
import { useTokenLabStore } from "./app/store";
import { componentRegistry, consumersForToken, type ComponentKey } from "./preview/registry";
import { FormaPreview } from "./preview/FormaPreview";
import { SystemPreview } from "./preview/SystemPreview";
import { createPreviewStyle } from "./preview/style";
import { getTokenGroupId, TokenLibrary, type TokenGroupId } from "./components/TokenLibrary";
import { ComparisonView, ExportPanel, HistoryPanel } from "./components/WorkspacePanels";
import { SpectrumPopover } from "./components/SpectrumPopover";
import { TokenInspector } from "./components/TokenInspector";
import { SelectControl } from "./components/SelectControl";
import { StyleImportPanel } from "./components/StyleImportPanel";
import { TokenHealthPanel } from "./components/TokenHealthPanel";
import { analyzeTokenHealth } from "./domain/tokenHealth";
import { useWorkspacePersistence } from "./persistence/useWorkspacePersistence";
import styles from "./App.module.css";

type CanvasScreen =
  | { type: "preview" }
  | { type: "system" }
  | { type: "history" }
  | { type: "health" }
  | { type: "style-import" }
  | { type: "export" }
  | { type: "comparison"; snapshotId: string };

export function App() {
  const document = useTokenLabStore((state) => state.document);
  const selectedTokenId = useTokenLabStore((state) => state.selectedTokenId);
  const history = useTokenLabStore((state) => state.history);
  const future = useTokenLabStore((state) => state.future);
  const selectToken = useTokenLabStore((state) => state.selectToken);
  const execute = useTokenLabStore((state) => state.execute);
  const executeBatch = useTokenLabStore((state) => state.executeBatch);
  const undo = useTokenLabStore((state) => state.undo);
  const redo = useTokenLabStore((state) => state.redo);
  const snapshots = useTokenLabStore((state) => state.snapshots);
  const previewWorkspace = useTokenLabStore((state) => state.previewWorkspace);
  const createPreviewProject = useTokenLabStore((state) => state.createPreviewProject);
  const updatePreviewProject = useTokenLabStore((state) => state.updatePreviewProject);
  const captureSnapshot = useTokenLabStore((state) => state.captureSnapshot);
  const restoreSnapshot = useTokenLabStore((state) => state.restoreSnapshot);
  const hydrate = useTokenLabStore((state) => state.hydrate);
  const saveStatus = useWorkspacePersistence();
  const [inspectEnabled, setInspectEnabled] = useState(false);
  const [mode, setMode] = useState<TokenMode>("light");
  const [previewWidth, setPreviewWidth] = useState<720 | 960 | 1280>(1280);
  const [canvasScreen, setCanvasScreen] = useState<CanvasScreen>({ type: "preview" });
  const [contrastFocus, setContrastFocus] = useState<{ mode: TokenMode; pairId: string } | null>(
    null,
  );
  const [selectedComponentKey, setSelectedComponentKey] = useState<ComponentKey | null>(null);
  const [openTokenGroupId, setOpenTokenGroupId] = useState<TokenGroupId | null>("foundations");
  const [snapshotName, setSnapshotName] = useState("");
  const [snapshotError, setSnapshotError] = useState("");
  const [mobilePanel, setMobilePanel] = useState<"tokens" | "canvas" | "inspector">("canvas");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const snapshotDialog = useRef<HTMLDialogElement>(null);
  const snapshotNameInput = useRef<HTMLInputElement>(null);
  const previewViewButton = useRef<HTMLButtonElement>(null);

  const selectedToken = document.tokens.find((token) => token.id === selectedTokenId)!;
  const selectVisibleToken = (tokenId: string) => {
    const token = document.tokens.find((candidate) => candidate.id === tokenId);
    if (token) setOpenTokenGroupId(getTokenGroupId(token));
    selectToken(tokenId);
  };
  const consumers = consumersForToken(selectedTokenId);
  const selectedComponent = componentRegistry.find(
    (component) => component.key === selectedComponentKey,
  );
  const selectComponent = (key: ComponentKey) => {
    const component = componentRegistry.find((candidate) => candidate.key === key)!;
    setSelectedComponentKey(key);
    selectVisibleToken(component.tokenIds[0]);
    setMobilePanel("inspector");
    setInspectorOpen(true);
  };
  const previewStyle = {
    ...createPreviewStyle(document, mode),
    "--tl-preview-viewport-width": `${previewWidth}px`,
  };
  const comparisonSnapshot =
    canvasScreen.type === "comparison"
      ? snapshots.find((snapshot) => snapshot.id === canvasScreen.snapshotId)
      : undefined;
  const contrastResults = checkContrast(document, mode);
  const contrastFailures = contrastResults.filter((result) => !result.passes).length;
  const tokenHealth = analyzeTokenHealth(document, componentRegistry);
  const focusedView = ["history", "comparison", "style-import", "export", "health"].includes(
    canvasScreen.type,
  );
  const canvasContentKey =
    canvasScreen.type === "comparison"
      ? `comparison-${canvasScreen.snapshotId}`
      : canvasScreen.type;
  const openSnapshotDialog = () => {
    setSnapshotName(`Baseline ${snapshots.length + 1}`);
    setSnapshotError("");
    snapshotDialog.current?.showModal();
  };
  const closeFocusedView = () => {
    setCanvasScreen({ type: "preview" });
    requestAnimationFrame(() => previewViewButton.current?.focus());
  };
  const inspectContrast = (targetMode: TokenMode, pairId: string, tokenId: string) => {
    setMode(targetMode);
    setContrastFocus({ mode: targetMode, pairId });
    selectVisibleToken(tokenId);
    setSelectedComponentKey(null);
    setCanvasScreen({ type: "preview" });
    setMobilePanel("inspector");
    setInspectorOpen(true);
    requestAnimationFrame(() => previewViewButton.current?.focus());
  };
  const applyStyleMappings = (mappings: StyleMapping[]) => {
    executeBatch(mappings.map((mapping) => createStyleImportCommand(mapping, mode)));
    selectVisibleToken(mappings.at(-1)!.tokenId);
  };

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domMax}>
        <div className={styles.app}>
          <header className={styles.header}>
            <div className={styles.brandBlock}>
              <div className={styles.brandMark}>
                <Layers3 aria-hidden="true" />
              </div>
              <div>
                <strong>TokenLab</strong>
                <span>{document.name}</span>
              </div>
            </div>
            <SpectrumPopover
              document={document}
              mode={mode}
              onSelectToken={(tokenId) => {
                setCanvasScreen({ type: "preview" });
                selectVisibleToken(tokenId);
                setInspectorOpen(true);
              }}
            />
            <nav
              className={`${styles.viewTabs} ${styles.headerViewTabs}`}
              aria-label="Canvas views"
            >
              <m.button
                ref={previewViewButton}
                aria-pressed={canvasScreen.type === "preview"}
                className={canvasScreen.type === "preview" ? styles.activeTab : ""}
                whileTap={{ scale: 0.96 }}
                onClick={() => setCanvasScreen({ type: "preview" })}
              >
                {canvasScreen.type === "preview" && (
                  <m.span
                    layoutId="header-view-indicator"
                    className={styles.tabIndicator}
                    transition={{ type: "spring", stiffness: 520, damping: 38 }}
                    aria-hidden="true"
                  />
                )}
                <span className={styles.tabLabel}>Preview</span>
              </m.button>
              <m.button
                aria-pressed={canvasScreen.type === "system"}
                className={canvasScreen.type === "system" ? styles.activeTab : ""}
                whileTap={{ scale: 0.96 }}
                onClick={() => setCanvasScreen({ type: "system" })}
              >
                {canvasScreen.type === "system" && (
                  <m.span
                    layoutId="header-view-indicator"
                    className={styles.tabIndicator}
                    transition={{ type: "spring", stiffness: 520, damping: 38 }}
                    aria-hidden="true"
                  />
                )}
                <span className={styles.tabLabel}>System</span>
              </m.button>
              <m.button
                aria-pressed={canvasScreen.type === "history" || canvasScreen.type === "comparison"}
                className={
                  canvasScreen.type === "history" || canvasScreen.type === "comparison"
                    ? styles.activeTab
                    : ""
                }
                whileTap={{ scale: 0.96 }}
                onClick={() => setCanvasScreen({ type: "history" })}
              >
                {(canvasScreen.type === "history" || canvasScreen.type === "comparison") && (
                  <m.span
                    layoutId="header-view-indicator"
                    className={styles.tabIndicator}
                    transition={{ type: "spring", stiffness: 520, damping: 38 }}
                    aria-hidden="true"
                  />
                )}
                <span className={styles.tabLabel}>
                  <HistoryIcon aria-hidden="true" />
                  History
                </span>
              </m.button>
              <m.button
                aria-pressed={canvasScreen.type === "health"}
                className={canvasScreen.type === "health" ? styles.activeTab : ""}
                whileTap={{ scale: 0.96 }}
                onClick={() => setCanvasScreen({ type: "health" })}
              >
                {canvasScreen.type === "health" && (
                  <m.span
                    layoutId="header-view-indicator"
                    className={styles.tabIndicator}
                    transition={{ type: "spring", stiffness: 520, damping: 38 }}
                    aria-hidden="true"
                  />
                )}
                <span className={styles.tabLabel}>
                  <HeartPulse aria-hidden="true" />
                  Health
                </span>
              </m.button>
            </nav>
            <div className={styles.headerActions}>
              <span className={styles.savedStatus} role="status" aria-live="polite">
                <CheckCircle2 aria-hidden="true" /> {saveStatus}
              </span>
              <span className={styles.contrastStatus}>
                {contrastFailures === 0
                  ? "Contrast checks pass"
                  : `${contrastFailures} contrast pairs need attention`}
              </span>
              <span className={styles.historyActions}>
                <m.button
                  className={styles.iconAction}
                  aria-label="Undo"
                  title="Undo"
                  disabled={history.length === 0}
                  whileTap={{ scale: 0.9 }}
                  onClick={undo}
                >
                  <Undo2 aria-hidden="true" />
                </m.button>
                <m.button
                  className={styles.iconAction}
                  aria-label="Redo"
                  title="Redo"
                  disabled={future.length === 0}
                  whileTap={{ scale: 0.9 }}
                  onClick={redo}
                >
                  <Redo2 aria-hidden="true" />
                </m.button>
              </span>
              <m.button
                className={styles.headerSecondaryButton}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setCanvasScreen({ type: "style-import" });
                  setMobilePanel("canvas");
                  setInspectorOpen(false);
                }}
              >
                <FileSearch aria-hidden="true" />
                Import CSS
              </m.button>
              <m.button
                className={styles.primaryStudioButton}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setCanvasScreen({ type: "export" });
                  setMobilePanel("canvas");
                  setInspectorOpen(false);
                }}
              >
                <Download aria-hidden="true" />
                Export
              </m.button>
            </div>
          </header>

          <dialog
            ref={snapshotDialog}
            className={styles.studioDialog}
            aria-labelledby="snapshot-title"
            aria-describedby="snapshot-description"
            onClose={() => setSnapshotError("")}
          >
            <form
              method="dialog"
              noValidate
              onSubmit={(event) => {
                if (!snapshotName.trim()) {
                  event.preventDefault();
                  setSnapshotError("Enter a snapshot name.");
                  snapshotNameInput.current?.focus();
                  return;
                }
                captureSnapshot(snapshotName.trim());
              }}
            >
              <h2 id="snapshot-title">Name snapshot</h2>
              <p id="snapshot-description">
                Save the current token system as a comparison baseline.
              </p>
              <label>
                Snapshot name
                <input
                  ref={snapshotNameInput}
                  autoFocus
                  required
                  aria-invalid={Boolean(snapshotError)}
                  aria-describedby={snapshotError ? "snapshot-error" : "snapshot-description"}
                  value={snapshotName}
                  onChange={(event) => {
                    setSnapshotName(event.target.value);
                    setSnapshotError("");
                  }}
                />
              </label>
              <span id="snapshot-error" className={styles.dialogError} role="alert">
                {snapshotError}
              </span>
              <div>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => snapshotDialog.current?.close()}
                >
                  Cancel
                </button>
                <button className={styles.primaryStudioButton}>Save snapshot</button>
              </div>
            </form>
          </dialog>

          <nav
            className={`${styles.mobilePanelNav} ${focusedView ? styles.focusedViewHidden : ""}`}
            aria-label="Mobile workspace"
          >
            {(["tokens", "canvas", "inspector"] as const).map((panel) => (
              <m.button
                key={panel}
                aria-controls={
                  panel === "tokens"
                    ? "token-library"
                    : panel === "canvas"
                      ? "living-canvas"
                      : "token-inspector"
                }
                aria-pressed={mobilePanel === panel}
                whileTap={{ scale: 0.97 }}
                onClick={() => setMobilePanel(panel)}
              >
                {mobilePanel === panel && (
                  <m.span
                    layoutId="mobile-panel-indicator"
                    className={styles.tabIndicator}
                    transition={{ type: "spring", stiffness: 520, damping: 38 }}
                    aria-hidden="true"
                  />
                )}
                <span className={styles.tabLabel}>{panel[0].toUpperCase() + panel.slice(1)}</span>
              </m.button>
            ))}
          </nav>
          <p className={styles.srOnly} role="status" aria-live="polite">
            {selectedComponent
              ? `${selectedComponent.label} selected. ${selectedComponent.tokenIds.length} related tokens are available in the inspector.`
              : ""}
          </p>

          <main className={`${styles.workspace} ${focusedView ? styles.workspaceFocused : ""}`}>
            <TokenLibrary
              className={`${styles.tokenPanel} ${focusedView ? styles.focusedViewHidden : ""} ${mobilePanel !== "tokens" ? styles.mobilePanelHidden : ""}`}
              document={document}
              mode={mode}
              selectedTokenId={selectedTokenId}
              openGroupId={openTokenGroupId}
              onOpenGroupChange={setOpenTokenGroupId}
              onSelectToken={(tokenId) => {
                setSelectedComponentKey(null);
                selectVisibleToken(tokenId);
                setMobilePanel("inspector");
                setInspectorOpen(true);
              }}
              onSelectPreset={(presetId) => execute({ type: "select-preset", presetId })}
            />

            <section
              id="living-canvas"
              className={`${styles.canvasPanel} ${mobilePanel !== "canvas" ? styles.mobilePanelHidden : ""}`}
              aria-label={canvasScreen.type === "system" ? "Design system" : "Living Canvas"}
            >
              {!focusedView && (
                <div className={styles.canvasToolbar}>
                  <strong>
                    {canvasScreen.type === "system" ? "Design system" : "Living Canvas"}
                  </strong>
                  <div className={styles.canvasControls}>
                    <SelectControl
                      className={styles.modeSelect}
                      aria-label="Preview mode"
                      value={mode}
                      onChange={(event) => {
                        setMode(event.target.value as TokenMode);
                        setContrastFocus(null);
                      }}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </SelectControl>
                    <SelectControl
                      className={styles.modeSelect}
                      aria-label="Preview width"
                      value={previewWidth}
                      onChange={(event) =>
                        setPreviewWidth(Number(event.target.value) as typeof previewWidth)
                      }
                    >
                      <option value={1280}>Desktop 1280</option>
                      <option value={960}>Compact 960</option>
                      <option value={720}>Narrow 720</option>
                    </SelectControl>
                    <button
                      className={styles.inspectorDrawerButton}
                      aria-expanded={inspectorOpen}
                      aria-controls="token-inspector"
                      onClick={() => setInspectorOpen(true)}
                    >
                      Open inspector
                    </button>
                    {canvasScreen.type === "preview" && (
                      <span
                        className={styles.interactionModes}
                        aria-label="Preview interaction mode"
                      >
                        <m.button
                          className={!inspectEnabled ? styles.activeInteractionMode : ""}
                          aria-pressed={!inspectEnabled}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setInspectEnabled(false)}
                        >
                          {!inspectEnabled && (
                            <m.span
                              layoutId="interaction-mode-indicator"
                              className={styles.tabIndicator}
                              transition={{ type: "spring", stiffness: 520, damping: 38 }}
                              aria-hidden="true"
                            />
                          )}
                          <span className={styles.tabLabel}>
                            <MousePointer2 aria-hidden="true" />
                            Interact
                          </span>
                        </m.button>
                        <m.button
                          className={inspectEnabled ? styles.activeInteractionMode : ""}
                          aria-pressed={inspectEnabled}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setInspectEnabled(true)}
                        >
                          {inspectEnabled && (
                            <m.span
                              layoutId="interaction-mode-indicator"
                              className={styles.tabIndicator}
                              transition={{ type: "spring", stiffness: 520, damping: 38 }}
                              aria-hidden="true"
                            />
                          )}
                          <span className={styles.tabLabel}>
                            <Eye aria-hidden="true" />
                            Inspect
                          </span>
                        </m.button>
                      </span>
                    )}
                  </div>
                </div>
              )}
              {inspectEnabled && !focusedView && canvasScreen.type === "preview" && (
                <div className={styles.inspectNotice} role="status">
                  <Sparkles aria-hidden="true" />
                  <span>
                    <strong>Inspect mode</strong> — select a preview element to reveal its tokens.
                  </span>
                </div>
              )}
              <AnimatePresence mode="wait" initial={false}>
                <m.div
                  key={canvasContentKey}
                  className={styles.canvasViewContent}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                >
                  {canvasScreen.type === "style-import" ? (
                    <StyleImportPanel
                      document={document}
                      mode={mode}
                      onApply={applyStyleMappings}
                      onClose={closeFocusedView}
                    />
                  ) : canvasScreen.type === "export" ? (
                    <ExportPanel
                      document={document}
                      snapshots={snapshots}
                      onClose={closeFocusedView}
                      onImport={(workspace) => {
                        hydrate(workspace.document, workspace.snapshots);
                        closeFocusedView();
                      }}
                    />
                  ) : canvasScreen.type === "health" ? (
                    <TokenHealthPanel
                      report={tokenHealth}
                      onClose={closeFocusedView}
                      onSelectToken={(tokenId) => {
                        selectVisibleToken(tokenId);
                        setSelectedComponentKey(null);
                        setCanvasScreen({ type: "preview" });
                        setMobilePanel("inspector");
                        setInspectorOpen(true);
                      }}
                      onInspectContrast={(targetMode, pairId, tokenId) => {
                        inspectContrast(targetMode, pairId, tokenId);
                      }}
                      onApplyContrastSuggestion={(targetMode, pairId, tokenId, suggestion) => {
                        execute({
                          type: "set-token-reference",
                          tokenId,
                          mode: targetMode,
                          targetId: suggestion.tokenId,
                        });
                        inspectContrast(targetMode, pairId, tokenId);
                      }}
                    />
                  ) : canvasScreen.type === "comparison" && comparisonSnapshot ? (
                    <ComparisonView
                      snapshot={comparisonSnapshot}
                      snapshots={snapshots}
                      current={document}
                      mode={mode}
                      onSelect={(snapshotId) => setCanvasScreen({ type: "comparison", snapshotId })}
                      onClose={() => setCanvasScreen({ type: "history" })}
                      onRestore={() => {
                        restoreSnapshot(comparisonSnapshot.id);
                        setCanvasScreen({ type: "preview" });
                        requestAnimationFrame(() => previewViewButton.current?.focus());
                      }}
                    />
                  ) : canvasScreen.type === "history" || canvasScreen.type === "comparison" ? (
                    <HistoryPanel
                      snapshots={snapshots}
                      onCreate={openSnapshotDialog}
                      onCompare={(snapshotId) =>
                        setCanvasScreen({ type: "comparison", snapshotId })
                      }
                    />
                  ) : canvasScreen.type === "preview" ? (
                    <FormaPreview
                      workspace={previewWorkspace}
                      inspectEnabled={inspectEnabled}
                      highlightedComponents={consumers.map((consumer) => consumer.key)}
                      selectedComponentKey={selectedComponentKey}
                      onInspect={selectComponent}
                      onCreateProject={createPreviewProject}
                      onUpdateProject={updatePreviewProject}
                      style={previewStyle}
                    />
                  ) : (
                    <SystemPreview
                      document={document}
                      mode={mode}
                      style={previewStyle}
                      contrastResults={contrastResults}
                      onSelectToken={(tokenId) => {
                        setSelectedComponentKey(null);
                        selectVisibleToken(tokenId);
                        setMobilePanel("inspector");
                        setInspectorOpen(true);
                      }}
                      onSelectComponent={selectComponent}
                    />
                  )}
                </m.div>
              </AnimatePresence>
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
              contrastFocusId={contrastFocus?.mode === mode ? contrastFocus.pairId : null}
              onClearContrastFocus={() => setContrastFocus(null)}
              onClose={() => setInspectorOpen(false)}
              onSelectToken={selectVisibleToken}
              onSelectComponent={selectComponent}
              onApplyColor={(value) =>
                execute({ type: "set-color", tokenId: selectedToken.id, mode, value })
              }
              onApplyValue={(value) =>
                execute({ type: "set-token-value", tokenId: selectedToken.id, mode, value })
              }
              onApplyReference={(targetId) =>
                execute({ type: "set-token-reference", tokenId: selectedToken.id, mode, targetId })
              }
            />
          </main>
        </div>
      </LazyMotion>
    </MotionConfig>
  );
}
