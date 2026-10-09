import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Component,
  GitBranch,
  Moon,
  Sun,
} from "lucide-react";
import { checkContrast } from "../domain/contrast";
import {
  resolveCssValue,
  type ProjectDocument,
  type Token,
  type TokenMode,
} from "../domain/tokens";
import { componentRegistry, type ComponentKey } from "./registry";
import { SelectControl } from "../components/SelectControl";
import type { PreviewStyle } from "./style";
import styles from "../App.module.css";

type SystemPreviewProps = {
  document: ProjectDocument;
  mode: TokenMode;
  style: PreviewStyle;
  contrastResults: ReturnType<typeof checkContrast>;
  onSelectToken: (tokenId: string) => void;
  onSelectComponent: (key: ComponentKey) => void;
};

export function SystemPreview({
  document,
  mode,
  style,
  contrastResults,
  onSelectToken,
  onSelectComponent,
}: SystemPreviewProps) {
  const colors = document.tokens.filter(
    (token) => token.layer === "primitive" && token.type === "color",
  );
  const spacing = document.tokens.filter(
    (token) => token.layer === "primitive" && token.path.startsWith("space."),
  );
  const radii = document.tokens.filter(
    (token) => token.layer === "primitive" && token.path.startsWith("radius."),
  );
  const typography = document.tokens.filter(
    (token) =>
      token.layer === "primitive" &&
      (token.path.startsWith("font.") || token.path.startsWith("line-height.")),
  );
  const aliases = document.tokens.filter(
    (token) => (token.values[mode] ?? token.values.light).kind === "reference",
  ).length;
  const passedContrast = contrastResults.filter((result) => result.passes).length;
  const primitive = document.tokens.find((token) => token.id === "color.brand.600")!;
  const semantic = document.tokens.find((token) => token.id === "action.primary.background")!;

  return (
    <div className={styles.previewStage}>
      <article
        className={`${styles.previewRoot} ${styles.systemRoot}`}
        style={style}
        data-testid="preview-root"
      >
        <header className={styles.systemHeader}>
          <div>
            <span>Forma design system</span>
            <small>Active project · {mode} mode</small>
          </div>
          <span className={styles.systemMode}>
            {mode === "light" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            {mode}
          </span>
        </header>

        <section className={styles.systemHero} aria-labelledby="system-title">
          <div>
            <span className={styles.systemEyebrow}>System overview</span>
            <h1 id="system-title">From decision to interface.</h1>
            <p>
              Inspect the foundations, relationships, states, and quality checks behind the active
              Forma experience.
            </p>
          </div>
          <dl className={styles.systemStats}>
            <div>
              <dt>Tokens</dt>
              <dd>{document.tokens.length}</dd>
            </div>
            <div>
              <dt>Semantic aliases</dt>
              <dd>{aliases}</dd>
            </div>
            <div>
              <dt>Registered components</dt>
              <dd>{componentRegistry.length}</dd>
            </div>
            <div>
              <dt>Contrast pairs passing</dt>
              <dd>
                {passedContrast}/{contrastResults.length}
              </dd>
            </div>
          </dl>
        </section>

        <section className={styles.systemFlow} aria-labelledby="system-flow-title">
          <div className={styles.systemSectionHeading}>
            <span>
              <GitBranch aria-hidden="true" />
            </span>
            <div>
              <h2 id="system-flow-title">One decision, traced through the system</h2>
              <p>Each layer stays editable, inspectable, and ready to export.</p>
            </div>
          </div>
          <div className={styles.systemFlowTrack}>
            <TokenNode
              label="Primitive"
              token={primitive}
              document={document}
              mode={mode}
              onSelect={onSelectToken}
            />
            <ArrowRight aria-hidden="true" />
            <TokenNode
              label="Semantic role"
              token={semantic}
              document={document}
              mode={mode}
              onSelect={onSelectToken}
            />
            <ArrowRight aria-hidden="true" />
            <button
              className={styles.systemComponentNode}
              onClick={() => onSelectComponent("primary-button")}
            >
              <span>Component</span>
              <strong>Primary button</strong>
              <small>Projects header · 5 tokens</small>
            </button>
          </div>
        </section>

        <section className={styles.systemSection} aria-labelledby="foundations-title">
          <div className={styles.systemSectionHeading}>
            <span>01</span>
            <div>
              <h2 id="foundations-title">Foundations</h2>
              <p>Reusable values define the visual language before components consume it.</p>
            </div>
          </div>
          <div className={styles.foundationGrid}>
            <div className={`${styles.foundationCard} ${styles.colorFoundation}`}>
              <header>
                <strong>Color</strong>
                <small>{colors.length} primitives</small>
              </header>
              <div>
                {colors.map((token) => (
                  <button
                    key={token.id}
                    aria-label={`Inspect ${token.path}`}
                    onClick={() => onSelectToken(token.id)}
                  >
                    <i style={{ background: resolveCssValue(document, token.id, mode) }} />
                    <span>
                      <strong>{shortPath(token.path)}</strong>
                      <code>{resolveCssValue(document, token.id, mode)}</code>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.foundationCard}>
              <header>
                <strong>Typography</strong>
                <small>{typography.length} primitives</small>
              </header>
              <div className={styles.typeSpecimen}>
                <span>Aa</span>
                <p>
                  Clarity at every scale.
                  <small>
                    {typography
                      .map(
                        (token) =>
                          `${shortPath(token.path)} ${resolveCssValue(document, token.id, mode)}`,
                      )
                      .join(" · ")}
                  </small>
                </p>
              </div>
            </div>
            <div className={styles.foundationCard}>
              <header>
                <strong>Rhythm</strong>
                <small>Spacing and radius</small>
              </header>
              <div className={styles.rhythmTokens}>
                {spacing.map((token) => (
                  <button key={token.id} onClick={() => onSelectToken(token.id)}>
                    <span
                      style={{ width: `max(8px, ${resolveCssValue(document, token.id, mode)})` }}
                    />
                    <code>{shortPath(token.path)}</code>
                    <small>{resolveCssValue(document, token.id, mode)}</small>
                  </button>
                ))}
              </div>
              <div className={styles.radiusTokens}>
                {radii.map((token) => (
                  <button
                    key={token.id}
                    style={{ borderRadius: resolveCssValue(document, token.id, mode) }}
                    onClick={() => onSelectToken(token.id)}
                  >
                    <code>{shortPath(token.path)}</code>
                    <small>{resolveCssValue(document, token.id, mode)}</small>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.systemSection} aria-labelledby="components-title">
          <div className={styles.systemSectionHeading}>
            <span>02</span>
            <div>
              <h2 id="components-title">Components and states</h2>
              <p>
                Registered components expose their token dependencies; specimens show operational
                states.
              </p>
            </div>
          </div>
          <div className={styles.systemComponentRegistry}>
            {componentRegistry.map((item) => (
              <button key={item.key} onClick={() => onSelectComponent(item.key)}>
                <Component aria-hidden="true" />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.location}</small>
                </span>
                <span>
                  {item.tokenIds.length} tokens <ArrowRight aria-hidden="true" />
                </span>
              </button>
            ))}
          </div>
          <div className={styles.specimenExamples}>
            <section>
              <h3>Buttons</h3>
              <div className={styles.specimenRow}>
                <button className={`${styles.formaPrimary} ${styles.specimenDisplay}`} disabled>
                  Primary
                </button>
                <button
                  className={`${styles.formaPrimary} ${styles.simulatedFocus} ${styles.specimenDisplay}`}
                  disabled
                >
                  Focus
                </button>
                <button className={styles.formaPrimary} disabled>
                  Disabled
                </button>
                <button className={`${styles.formaPrimary} ${styles.specimenDisplay}`} disabled>
                  ••• Loading
                </button>
              </div>
            </section>
            <section>
              <h3>Inputs</h3>
              <div className={styles.specimenRow}>
                <input disabled placeholder="Default input" />
                <input disabled className={styles.simulatedFocus} defaultValue="Focused value" />
                <input disabled className={styles.inputError} defaultValue="Invalid value" />
                <input disabled placeholder="Disabled" />
              </div>
            </section>
            <section>
              <h3>Cards and badges</h3>
              <div className={styles.specimenRow}>
                <article className={styles.specimenCard}>
                  <span className={styles.specimenBadge}>In progress</span>
                  <h3>Design system</h3>
                  <p>Build reusable foundations for Forma.</p>
                </article>
                <article className={styles.specimenCard}>
                  <span className={styles.specimenBadge}>Complete</span>
                  <h3>Navigation audit</h3>
                  <p>Improve structure and wayfinding.</p>
                </article>
              </div>
            </section>
          </div>
          <FormControlSpecimens
            errorColor={resolveCssValue(document, "feedback.error.text", mode)}
          />
        </section>

        <section className={styles.systemSection} aria-labelledby="quality-title">
          <div className={styles.systemSectionHeading}>
            <span>03</span>
            <div>
              <h2 id="quality-title">Accessibility evidence</h2>
              <p>
                Registered pairs report the colors tested, exact ratio, and applicable threshold.
              </p>
            </div>
          </div>
          <div className={styles.systemQuality}>
            {contrastResults.map((result) => (
              <article
                key={result.id}
                className={result.passes ? styles.systemQualityPass : styles.systemQualityFail}
              >
                {result.passes ? (
                  <CheckCircle2 aria-hidden="true" />
                ) : (
                  <AlertTriangle aria-hidden="true" />
                )}
                <span>
                  <strong>{result.label}</strong>
                  <small>
                    {result.foreground} on {result.background} · {result.component}
                  </small>
                </span>
                <span>
                  <strong>{result.ratio}:1</strong>
                  <small>
                    {result.passes ? "Passes" : "Needs"} {result.threshold}:1
                  </small>
                </span>
              </article>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
}

function FormControlSpecimens({ errorColor }: { errorColor: string }) {
  return (
    <section className={styles.formControlSpecimens} aria-labelledby="form-controls-title">
      <header>
        <h3 id="form-controls-title">Form controls</h3>
        <p>Native controls styled with the active system tokens.</p>
      </header>
      <div className={styles.formControlGrid}>
        <label>
          <span>Status · default</span>
          <SelectControl defaultValue="progress">
            <option value="progress">In progress</option>
            <option value="complete">Complete</option>
            <option value="planning">Planning</option>
          </SelectControl>
        </label>
        <label>
          <span>Status · focus</span>
          <SelectControl className={styles.simulatedFocus} defaultValue="complete">
            <option value="progress">In progress</option>
            <option value="complete">Complete</option>
            <option value="planning">Planning</option>
          </SelectControl>
        </label>
        <label>
          <span>Status · disabled</span>
          <SelectControl disabled defaultValue="planning">
            <option value="planning">Planning</option>
          </SelectControl>
        </label>
        <label>
          <span>Status · invalid</span>
          <SelectControl
            aria-describedby="specimen-status-error"
            aria-invalid="true"
            defaultValue=""
            style={{ borderColor: errorColor }}
          >
            <option value="" disabled>
              Choose a status
            </option>
            <option value="progress">In progress</option>
            <option value="complete">Complete</option>
          </SelectControl>
          <small id="specimen-status-error" style={{ color: errorColor }}>
            Choose a status to continue.
          </small>
        </label>
        <fieldset>
          <legend>Notifications · checkboxes</legend>
          <label>
            <input type="checkbox" defaultChecked />
            <span>Email updates</span>
          </label>
          <label>
            <input type="checkbox" />
            <span>Product news</span>
          </label>
          <label className={styles.specimenDisabledOption}>
            <input type="checkbox" disabled />
            <span>Disabled option</span>
          </label>
        </fieldset>
        <fieldset>
          <legend>Priority · radio group</legend>
          <label>
            <input type="radio" name="specimen-priority" defaultChecked />
            <span>Standard</span>
          </label>
          <label>
            <input type="radio" name="specimen-priority" />
            <span>High priority</span>
          </label>
          <label className={styles.specimenDisabledOption}>
            <input type="radio" name="specimen-priority" disabled />
            <span>Unavailable</span>
          </label>
        </fieldset>
        <fieldset>
          <legend>Switches</legend>
          <label>
            <input type="checkbox" role="switch" defaultChecked />
            <span>Project reminders</span>
          </label>
          <label>
            <input type="checkbox" role="switch" />
            <span>Quiet mode</span>
          </label>
          <label className={styles.specimenDisabledOption}>
            <input type="checkbox" role="switch" disabled />
            <span>Disabled option</span>
          </label>
        </fieldset>
      </div>
    </section>
  );
}

function TokenNode({
  label,
  token,
  document,
  mode,
  onSelect,
}: {
  label: string;
  token: Token;
  document: ProjectDocument;
  mode: TokenMode;
  onSelect: (tokenId: string) => void;
}) {
  return (
    <button className={styles.systemTokenNode} onClick={() => onSelect(token.id)}>
      <span>{label}</span>
      <strong>{token.path}</strong>
      <small>
        <i style={{ background: resolveCssValue(document, token.id, mode) }} />
        {resolveCssValue(document, token.id, mode)}
      </small>
    </button>
  );
}

function shortPath(path: string) {
  return path.split(".").at(-1);
}
