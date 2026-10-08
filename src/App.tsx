import { useState, type CSSProperties, type KeyboardEvent } from "react";
import { colorValueSchema, presetOptions, presetSpecs, resolveColorToken, resolveCssValue, type Token, type TokenMode } from "./domain/tokens";
import { useTokenLabStore } from "./app/store";
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
  const selectToken = useTokenLabStore((state) => state.selectToken);
  const execute = useTokenLabStore((state) => state.execute);
  const undo = useTokenLabStore((state) => state.undo);
  const [inspectEnabled, setInspectEnabled] = useState(true);
  const [mode, setMode] = useState<TokenMode>("light");
  const [canvasView, setCanvasView] = useState<"app" | "specimens">("app");

  const selectedToken = document.tokens.find((token) => token.id === selectedTokenId)!;
  const primaryColor = resolveColorToken(document, "action.primary.background", mode);
  const preset = presetSpecs[document.presetId];
  const previewStyle: PreviewStyle = {
    "--tl-preview-action-primary-background": primaryColor,
    "--tl-preview-action-primary-foreground": resolveCssValue(document, "action.primary.foreground", mode),
    "--tl-preview-font-family": resolveCssValue(document, "typography.body.family", mode),
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
          <span className={styles.savedStatus}><span aria-hidden="true">●</span> Saved locally</span>
          <button className={styles.secondaryButton} disabled={history.length === 0} onClick={undo}>Undo</button>
          <button className={styles.secondaryButton} disabled title="Available in a later milestone">Compare</button>
          <button className={styles.primaryStudioButton} disabled title="Available in a later milestone">Export</button>
        </div>
      </header>

      <main className={styles.workspace}>
        <aside className={styles.tokenPanel} aria-label="Token library">
          <div className={styles.panelHeading}>
            <div><span>Token library</span><small>{document.tokens.length} tokens</small></div>
            <button className={styles.iconButton} aria-label="Search tokens" disabled>⌕</button>
          </div>
          <div className={styles.categoryLabel}>Colors</div>
          <div className={styles.tokenList}>
            {document.tokens.map((token) => (
              <TokenRow
                key={token.id}
                token={token}
                value={resolveCssValue(document, token.id, mode)}
                selected={token.id === selectedTokenId}
                onSelect={() => selectToken(token.id)}
              />
            ))}
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

        <section className={styles.canvasPanel} aria-label="Living Canvas">
          <div className={styles.canvasToolbar}>
            <div>
              <strong>Living Canvas</strong>
              <span className={styles.viewTabs}>
                <button className={canvasView === "app" ? styles.activeTab : ""} onClick={() => setCanvasView("app")}>App</button>
                <button className={canvasView === "specimens" ? styles.activeTab : ""} onClick={() => setCanvasView("specimens")}>Specimens</button>
              </span>
            </div>
            <div className={styles.canvasControls}>
              <select className={styles.modeSelect} aria-label="Preview mode" value={mode} onChange={(event) => setMode(event.target.value as TokenMode)}><option value="light">Light</option><option value="dark">Dark</option></select>
              <span>{preset.name} · Desktop 1280</span>
              <button
                className={inspectEnabled ? styles.inspectActive : styles.inspectButton}
                aria-pressed={inspectEnabled}
                onClick={() => setInspectEnabled((enabled) => !enabled)}
              >
                Inspect {inspectEnabled ? "on" : "off"}
              </button>
            </div>
          </div>
          {canvasView === "app" ? <FormaPreview
              inspectEnabled={inspectEnabled}
              selectedTokenId={selectedTokenId}
              onInspect={() => selectToken("action.primary.background")}
              style={previewStyle}
            /> : <SpecimenPreview style={previewStyle} />}
        </section>

        <aside className={styles.inspectorPanel} aria-label="Token inspector">
          <div className={styles.inspectorHeading}>
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
          ) : selectedToken.values[mode]?.kind === "reference" || selectedToken.values.light.kind === "reference" ? (
            <AliasInspector token={selectedToken} mode={mode} resolvedValue={resolveCssValue(document, selectedToken.id, mode)} onSelectTarget={selectToken} />
          ) : <ReadOnlyInspector value={resolveCssValue(document, selectedToken.id, mode)} />}
          {(selectedToken.id === "color.brand.600" || selectedToken.id === "action.primary.background") && <div className={styles.inspectorSection}>
            <span className={styles.eyebrow}>Used by</span>
            <button className={styles.usageRow} onClick={() => selectToken("action.primary.background")}>
              <span className={styles.componentGlyph}>▣</span>
              <span><strong>Primary button</strong><small>Forma · Projects header</small></span>
              <span>›</span>
            </button>
          </div>}
        </aside>
      </main>
    </div>
  );
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

function ReadOnlyInspector({ value }: { value: string }) {
  return <div className={styles.editor}><span className={styles.fieldLabel}>Resolved value</span><div className={styles.readOnlyValue}>{value}</div></div>;
}

function AliasInspector({ token, mode, resolvedValue, onSelectTarget }: { token: Token; mode: TokenMode; resolvedValue: string; onSelectTarget: (tokenId: string) => void }) {
  const value = token.values[mode] ?? token.values.light;
  if (value.kind !== "reference") return null;

  return (
    <div className={styles.editor}>
      <span className={styles.fieldLabel}>Alias target</span>
      <button className={styles.aliasTarget} onClick={() => onSelectTarget(value.tokenId)}>
        <span className={styles.swatch} style={{ backgroundColor: resolvedValue }} />
        <code>{value.tokenId}</code><span>›</span>
      </button>
      <div className={styles.resolvedRow}><span>Resolved value</span><code>{resolvedValue}</code></div>
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

function FormaPreview({ inspectEnabled, selectedTokenId, onInspect, style }: { inspectEnabled: boolean; selectedTokenId: string; onInspect: () => void; style: PreviewStyle }) {
  const primarySelected = selectedTokenId === "action.primary.background" || selectedTokenId === "color.brand.600";

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
                onClick={inspectEnabled ? onInspect : undefined}
                aria-label={inspectEnabled ? "Create project; inspect action.primary.background" : "Create project"}
              >
                <span>＋</span> Create project
                {inspectEnabled && primarySelected && <small>action.primary.background</small>}
              </button>
            </div>
            <div className={styles.projectToolbar}><label>⌕ <input aria-label="Search projects" placeholder="Search projects" /></label><button>All statuses⌄</button><button>Last updated⌄</button><span>8 projects</span></div>
            <div className={styles.projectGrid}>
              <ProjectCard title="Mobile app refresh" category="Product" progress={72} color="#E9A23B" members={["MS", "JL", "AK"]} />
              <ProjectCard title="Q4 campaign" category="Marketing" progress={48} color="#D7648B" members={["OR", "MS"]} />
              <ProjectCard title="Design system" category="Design" progress={86} color="#5A69C8" members={["AK", "JL", "OR"]} />
            </div>
            <div className={styles.activityPanel}><div><strong>Recent activity</strong><span>View all</span></div><p><span className={styles.avatar}>JL</span><span><strong>Jon Lee</strong> completed “Review navigation patterns”<small>Mobile app refresh · 18 minutes ago</small></span></p><p><span className={styles.avatar}>AK</span><span><strong>Ana Kim</strong> uploaded 3 files<small>Design system · 1 hour ago</small></span></p></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ title, category, progress, color, members }: { title: string; category: string; progress: number; color: string; members: string[] }) {
  return (
    <article className={styles.projectCard}>
      <div><span className={styles.projectIcon} style={{ background: color }}>{title[0]}</span><button aria-label={`${title} menu`}>•••</button></div>
      <h2>{title}</h2><p>{category}</p>
      <div className={styles.progressLabel}><span>Progress</span><strong>{progress}%</strong></div>
      <div className={styles.progressTrack}><span style={{ width: `${progress}%`, background: color }} /></div>
      <div className={styles.cardFooter}><div>{members.map((member) => <span className={styles.avatar} key={member}>{member}</span>)}</div><span>Updated today</span></div>
    </article>
  );
}
