import { useState, type CSSProperties, type KeyboardEvent } from "react";
import { colorValueSchema, presetOptions, presetSpecs, resolveToken, type Token } from "./domain/tokens";
import { useTokenLabStore } from "./app/store";
import styles from "./App.module.css";

type PreviewStyle = CSSProperties & {
  "--tl-preview-action-primary-background": string;
  "--tl-preview-font-family": string;
  "--tl-preview-content-padding": string;
  "--tl-preview-card-padding": string;
  "--tl-preview-card-gap": string;
  "--tl-preview-radius": string;
  "--tl-preview-card-shadow": string;
  "--tl-preview-surface": string;
  "--tl-preview-sidebar": string;
};

export function App() {
  const document = useTokenLabStore((state) => state.document);
  const selectedTokenId = useTokenLabStore((state) => state.selectedTokenId);
  const history = useTokenLabStore((state) => state.history);
  const selectToken = useTokenLabStore((state) => state.selectToken);
  const execute = useTokenLabStore((state) => state.execute);
  const undo = useTokenLabStore((state) => state.undo);
  const [inspectEnabled, setInspectEnabled] = useState(true);

  const selectedToken = document.tokens.find((token) => token.id === selectedTokenId)!;
  const primaryColor = resolveToken(document, "action.primary.background");
  const preset = presetSpecs[document.presetId];
  const previewStyle: PreviewStyle = {
    "--tl-preview-action-primary-background": primaryColor,
    "--tl-preview-font-family": preset.preview.fontFamily,
    "--tl-preview-content-padding": preset.preview.contentPadding,
    "--tl-preview-card-padding": preset.preview.cardPadding,
    "--tl-preview-card-gap": preset.preview.cardGap,
    "--tl-preview-radius": preset.preview.radius,
    "--tl-preview-card-shadow": preset.preview.shadow,
    "--tl-preview-surface": preset.preview.surface,
    "--tl-preview-sidebar": preset.preview.sidebar,
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
            <div><span>Token library</span><small>2 tokens</small></div>
            <button className={styles.iconButton} aria-label="Search tokens" disabled>⌕</button>
          </div>
          <div className={styles.categoryLabel}>Colors</div>
          <div className={styles.tokenList}>
            {document.tokens.map((token) => (
              <TokenRow
                key={token.id}
                token={token}
                value={resolveToken(document, token.id)}
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
              <span className={styles.viewTabs}><button className={styles.activeTab}>App</button><button disabled>Specimens</button></span>
            </div>
            <div className={styles.canvasControls}>
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
          <FormaPreview
            inspectEnabled={inspectEnabled}
            selectedTokenId={selectedTokenId}
            onInspect={() => selectToken("action.primary.background")}
            style={previewStyle}
          />
        </section>

        <aside className={styles.inspectorPanel} aria-label="Token inspector">
          <div className={styles.inspectorHeading}>
            <span className={styles.eyebrow}>Selected token</span>
            <strong>{selectedToken.path}</strong>
            <span className={styles.layerBadge}>{selectedToken.layer}</span>
          </div>
          <p className={styles.description}>{selectedToken.description}</p>
          {selectedToken.values.light.kind === "literal" ? (
            <ColorEditor
              key={`${selectedToken.id}-${selectedToken.values.light.value}`}
              initialValue={selectedToken.values.light.value}
              onApply={(value) => execute({ type: "set-color", tokenId: selectedToken.id, mode: "light", value })}
            />
          ) : (
            <AliasInspector token={selectedToken} resolvedValue={primaryColor} onSelectTarget={selectToken} />
          )}
          <div className={styles.inspectorSection}>
            <span className={styles.eyebrow}>Used by</span>
            <button className={styles.usageRow} onClick={() => selectToken("action.primary.background")}>
              <span className={styles.componentGlyph}>▣</span>
              <span><strong>Primary button</strong><small>Forma · Projects header</small></span>
              <span>›</span>
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}

function TokenRow({ token, value, selected, onSelect }: { token: Token; value: string; selected: boolean; onSelect: () => void }) {
  return (
    <button className={`${styles.tokenRow} ${selected ? styles.tokenRowSelected : ""}`} onClick={onSelect} aria-pressed={selected}>
      <span className={styles.swatch} style={{ backgroundColor: value }} />
      <span><strong>{token.path.split(".").at(-1)}</strong><small>{token.path}</small></span>
      <code>{token.values.light.kind === "reference" ? "↗ alias" : value}</code>
    </button>
  );
}

function ColorEditor({ initialValue, onApply }: { initialValue: string; onApply: (value: string) => void }) {
  const [draft, setDraft] = useState(initialValue);
  const result = colorValueSchema.safeParse(draft);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") setDraft(initialValue);
    if (event.key === "Enter" && result.success) onApply(draft);
  };

  return (
    <div className={styles.editor}>
      <label htmlFor="color-value">Light value</label>
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

function AliasInspector({ token, resolvedValue, onSelectTarget }: { token: Token; resolvedValue: string; onSelectTarget: (tokenId: string) => void }) {
  const value = token.values.light;
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
