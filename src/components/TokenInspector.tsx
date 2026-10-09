import { useState, type KeyboardEvent, type ReactNode } from "react";
import { CheckCircle2, ChevronRight, Grid2X2, X } from "lucide-react";
import { m } from "framer-motion";
import type { checkContrast } from "../domain/contrast";
import {
  colorValueSchema,
  getAliasTargets,
  parseTokenInput,
  resolveColorToken,
  resolveCssValue,
  type ProjectDocument,
  type ResolvedTokenValue,
  type Token,
  type TokenMode,
} from "../domain/tokens";
import type { componentRegistry, ComponentKey, consumersForToken } from "../preview/registry";
import styles from "../App.module.css";

type TokenInspectorProps = {
  className: string;
  document: ProjectDocument;
  token: Token;
  mode: TokenMode;
  selectedComponent?: (typeof componentRegistry)[number];
  consumers: ReturnType<typeof consumersForToken>;
  contrastResults: ReturnType<typeof checkContrast>;
  contrastFailures: number;
  contrastFocusId: string | null;
  onClearContrastFocus: () => void;
  onClose: () => void;
  onSelectToken: (tokenId: string) => void;
  onSelectComponent: (key: ComponentKey) => void;
  onApplyColor: (value: string) => void;
  onApplyValue: (value: ResolvedTokenValue) => void;
  onApplyReference: (targetId: string) => void;
};

export function TokenInspector({
  className,
  document,
  token,
  mode,
  selectedComponent,
  consumers,
  contrastResults,
  contrastFailures,
  contrastFocusId,
  onClearContrastFocus,
  onClose,
  onSelectToken,
  onSelectComponent,
  onApplyColor,
  onApplyValue,
  onApplyReference,
}: TokenInspectorProps) {
  const resolvedValue = resolveCssValue(document, token.id, mode);
  const activeValue = token.values[mode] ?? token.values.light;
  const focusedContrast = contrastResults.find((result) => result.id === contrastFocusId);
  const displayedContrastFailures = contrastFocusId
    ? Number(focusedContrast?.passes === false)
    : contrastFailures;

  return (
    <aside id="token-inspector" className={className} aria-label="Token inspector">
      <div className={styles.inspectorHeading}>
        <button
          className={styles.inspectorDrawerClose}
          onClick={onClose}
          aria-label="Close inspector"
        >
          <X aria-hidden="true" />
        </button>
        <span className={styles.eyebrow}>Selected token</span>
        <div className={styles.inspectorIdentity}>
          {token.type === "color" ? (
            <span
              className={styles.inspectorSwatch}
              style={{ background: resolvedValue }}
              aria-hidden="true"
            />
          ) : (
            <span className={styles.inspectorTypeIcon} aria-hidden="true">
              {token.type.slice(0, 2)}
            </span>
          )}
          <div>
            <strong>{token.path}</strong>
            <span className={styles.inspectorBadges}>
              <small>{token.layer}</small>
              <small>{formatTokenType(token.type)}</small>
              <small>{mode}</small>
            </span>
          </div>
        </div>
        <p>{token.description}</p>
      </div>
      {token.type === "color" && activeValue.kind === "literal" ? (
        <ColorEditor
          key={`${token.id}-${mode}-${resolveColorToken(document, token.id, mode)}`}
          initialValue={resolveColorToken(document, token.id, mode)}
          mode={mode}
          onApply={onApplyColor}
        />
      ) : activeValue.kind === "literal" ? (
        <ValueEditor
          key={`${token.id}-${mode}-${resolvedValue}`}
          token={token}
          mode={mode}
          initialValue={resolvedValue}
          onApply={onApplyValue}
        />
      ) : (
        <AliasEditor
          document={document}
          token={token}
          mode={mode}
          resolvedValue={resolvedValue}
          onApply={onApplyReference}
        />
      )}
      {selectedComponent && (
        <InspectorDisclosure
          key="component-tokens"
          id="component-tokens"
          title={`${selectedComponent.label} tokens`}
          badge={selectedComponent.tokenIds.length}
          defaultOpen
        >
          <div>
            {selectedComponent.tokenIds.map((tokenId) => (
              <button
                className={styles.registryToken}
                key={tokenId}
                onClick={() => onSelectToken(tokenId)}
              >
                <code>{tokenId}</code>
                <ChevronRight aria-hidden="true" />
              </button>
            ))}
          </div>
        </InspectorDisclosure>
      )}
      {consumers.length > 0 && (
        <InspectorDisclosure
          key="token-consumers"
          id="token-consumers"
          title="Used by"
          badge={consumers.length}
          defaultOpen
        >
          <div>
            {consumers.map((consumer) => (
              <button
                className={styles.usageRow}
                key={consumer.key}
                onClick={() => onSelectComponent(consumer.key)}
              >
                <span className={styles.componentGlyph}>
                  <Grid2X2 aria-hidden="true" />
                </span>
                <span>
                  <strong>{consumer.label}</strong>
                  <small>Forma · {consumer.location}</small>
                </span>
                <ChevronRight aria-hidden="true" />
              </button>
            ))}
          </div>
        </InspectorDisclosure>
      )}
      <InspectorDisclosure
        key={`contrast-checks-${mode}-${contrastFocusId ?? "all"}`}
        id="contrast-checks"
        title="Contrast checks"
        badge={
          displayedContrastFailures === 0 ? (
            <>
              <CheckCircle2 aria-hidden="true" />
              Pass
            </>
          ) : (
            displayedContrastFailures
          )
        }
        badgeClassName={displayedContrastFailures === 0 ? styles.passLabel : styles.failLabel}
        defaultOpen={Boolean(contrastFocusId)}
      >
        <div className={styles.contrastList}>
          {contrastFocusId && (
            <button className={styles.textButton} onClick={onClearContrastFocus}>
              Show all contrast checks
            </button>
          )}
          {contrastResults
            .filter((result) => !contrastFocusId || result.id === contrastFocusId)
            .map((result) => (
              <div
                key={result.id}
                className={result.passes ? styles.contrastPass : styles.contrastFail}
              >
                <span>
                  {result.label}
                  <small>{result.component}</small>
                </span>
                <strong>{result.ratio}:1</strong>
                <small>
                  {result.passes ? `Passes ${result.threshold}:1` : `Needs ${result.threshold}:1`}
                </small>
              </div>
            ))}
        </div>
      </InspectorDisclosure>
    </aside>
  );
}

function InspectorDisclosure({
  id,
  title,
  badge,
  badgeClassName,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  badge: ReactNode;
  badgeClassName?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={styles.inspectorDisclosure}>
      <button
        id={`${id}-trigger`}
        className={styles.inspectorDisclosureTrigger}
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-content`}
        onClick={() => setOpen((current) => !current)}
      >
        <m.span
          className={styles.disclosureChevron}
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
        >
          <ChevronRight aria-hidden="true" />
        </m.span>
        {title}
        <span className={badgeClassName}>{badge}</span>
      </button>
      <m.div
        id={`${id}-content`}
        className={styles.inspectorDisclosureContent}
        role="region"
        aria-labelledby={`${id}-trigger`}
        aria-hidden={!open}
        inert={!open}
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{
          height: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
          opacity: { duration: 0.16 },
        }}
      >
        {children}
      </m.div>
    </section>
  );
}

function ColorEditor({
  initialValue,
  mode,
  onApply,
}: {
  initialValue: string;
  mode: TokenMode;
  onApply: (value: string) => void;
}) {
  const [draft, setDraft] = useState(initialValue);
  const result = colorValueSchema.safeParse(draft);
  const dirty = draft.toUpperCase() !== initialValue.toUpperCase();
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") setDraft(initialValue);
    if (event.key === "Enter" && result.success && dirty) onApply(draft);
  };

  return (
    <div className={styles.editor}>
      <div className={styles.editorHeading}>
        <span>Edit value</span>
        <small>{mode} mode</small>
      </div>
      <label htmlFor="color-value">{capitalize(mode)} value</label>
      <div className={styles.colorField}>
        <input
          aria-label="Choose color"
          type="color"
          value={result.success ? draft : initialValue}
          onChange={(event) => setDraft(event.target.value.toUpperCase())}
        />
        <input
          id="color-value"
          value={draft}
          aria-invalid={!result.success}
          aria-describedby="color-message"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
        />
      </div>
      <p
        className={`${styles.fieldMessage} ${!result.success ? styles.fieldError : ""}`}
        id="color-message"
        role="status"
      >
        {result.success
          ? dirty
            ? "Ready to apply."
            : "Use a six-digit hex color."
          : result.error.issues[0].message}
      </p>
      <EditorActions
        dirty={dirty}
        valid={result.success}
        onCancel={() => setDraft(initialValue)}
        onApply={() => onApply(draft)}
      />
    </div>
  );
}

function ValueEditor({
  token,
  mode,
  initialValue,
  onApply,
}: {
  token: Token;
  mode: TokenMode;
  initialValue: string;
  onApply: (value: ResolvedTokenValue) => void;
}) {
  const [draft, setDraft] = useState(initialValue);
  let parsed: ResolvedTokenValue | undefined;
  let error = "";
  try {
    parsed = parseTokenInput(token.type, draft);
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Invalid value.";
  }
  const dirty = draft !== initialValue;
  const apply = () => {
    if (parsed && dirty) onApply(parsed);
  };
  const messageId = "token-value-message";

  return (
    <div className={styles.editor}>
      <div className={styles.editorHeading}>
        <span>Edit value</span>
        <small>{mode} mode</small>
      </div>
      {token.type === "fontFamily" ? (
        <fieldset className={styles.fontChoices} aria-describedby={messageId}>
          <legend>{capitalize(mode)} value</legend>
          {["Inter", "Georgia", "Avenir Next"].map((font) => (
            <label key={font}>
              <input
                type="radio"
                name="token-font-family"
                value={font}
                checked={draft === font}
                onChange={(event) => setDraft(event.target.value)}
              />
              <span>{font}</span>
            </label>
          ))}
        </fieldset>
      ) : (
        <>
          <label htmlFor="token-value">{capitalize(mode)} value</label>
          <input
            id="token-value"
            className={styles.valueInput}
            value={draft}
            aria-invalid={Boolean(error)}
            aria-describedby={messageId}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setDraft(initialValue);
              if (event.key === "Enter") apply();
            }}
            onBlur={(event) => {
              if (!(
                event.relatedTarget instanceof Element &&
                event.relatedTarget.closest(`.${styles.editor}`)
              ))
                apply();
            }}
          />
        </>
      )}
      <p
        className={`${styles.fieldMessage} ${error ? styles.fieldError : ""}`}
        id={messageId}
        role="status"
      >
        {error || (dirty ? "Ready to apply." : valueHint(token.type))}
      </p>
      <EditorActions
        dirty={dirty}
        valid={Boolean(parsed)}
        onCancel={() => setDraft(initialValue)}
        onApply={apply}
      />
    </div>
  );
}

function AliasEditor({
  document,
  token,
  mode,
  resolvedValue,
  onApply,
}: {
  document: ProjectDocument;
  token: Token;
  mode: TokenMode;
  resolvedValue: string;
  onApply: (targetId: string) => void;
}) {
  const value = token.values[mode] ?? token.values.light;
  const initialTarget = value.kind === "reference" ? value.tokenId : "";
  const [draft, setDraft] = useState(initialTarget);
  const targets = getAliasTargets(document, token.id);
  if (value.kind !== "reference") return null;

  return (
    <div className={styles.editor}>
      <div className={styles.editorHeading}>
        <span>Edit alias</span>
        <small>{mode} mode</small>
      </div>
      <label htmlFor="alias-target">Token reference</label>
      <select
        id="alias-target"
        className={styles.valueInput}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      >
        {targets.map((target) => (
          <option key={target.id} value={target.id}>
            {target.path}
          </option>
        ))}
      </select>
      <div className={styles.resolvedRow}>
        <span>Resolved value</span>
        <code>{resolvedValue}</code>
      </div>
      <EditorActions
        dirty={draft !== value.tokenId}
        valid
        onCancel={() => setDraft(value.tokenId)}
        onApply={() => onApply(draft)}
      />
    </div>
  );
}

function EditorActions({
  dirty,
  valid,
  onCancel,
  onApply,
}: {
  dirty: boolean;
  valid: boolean;
  onCancel: () => void;
  onApply: () => void;
}) {
  return (
    <div className={styles.editorActions}>
      <button className={styles.secondaryButton} disabled={!dirty} onClick={onCancel}>
        Cancel
      </button>
      <button className={styles.primaryStudioButton} disabled={!dirty || !valid} onClick={onApply}>
        Apply
      </button>
    </div>
  );
}

function formatTokenType(type: Token["type"]): string {
  return type.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

function capitalize(value: string): string {
  return value[0].toUpperCase() + value.slice(1);
}

function valueHint(type: Token["type"]): string {
  if (type === "dimension") return "Use px or rem.";
  if (type === "fontWeight") return "Use a weight from 100 to 900.";
  if (type === "shadow") return "Use x, y, blur, spread, and a hex color.";
  return "Enter a valid token value.";
}
