import { useEffect, useRef, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CopyCheck,
  Link2Off,
  ScanEye,
} from "lucide-react";
import type { AliasIssue, ContrastSuggestion, TokenHealthReport } from "../domain/tokenHealth";
import type { TokenMode } from "../domain/tokens";
import styles from "../App.module.css";

type TokenHealthPanelProps = {
  report: TokenHealthReport;
  onClose: () => void;
  onSelectToken: (tokenId: string) => void;
  onInspectContrast: (mode: TokenMode, pairId: string, tokenId: string) => void;
  onApplyContrastSuggestion: (
    mode: TokenMode,
    pairId: string,
    tokenId: string,
    suggestion: ContrastSuggestion,
  ) => void;
};

export function TokenHealthPanel({
  report,
  onClose,
  onSelectToken,
  onInspectContrast,
  onApplyContrastSuggestion,
}: TokenHealthPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const contrastFailures = report.contrastChecks.filter(({ result }) => !result.passes);

  useEffect(() => headingRef.current?.focus(), []);

  return (
    <section className={styles.healthPanel} aria-labelledby="health-title">
      <header className={styles.healthHeader}>
        <div>
          <span className={styles.eyebrow}>Design system report</span>
          <h2 id="health-title" ref={headingRef} tabIndex={-1}>
            Token health
          </h2>
          <p>
            Review token usage, repeated values, aliases, and contrast in your registered preview.
          </p>
        </div>
        <button className={styles.secondaryButton} onClick={onClose}>
          <ArrowLeft aria-hidden="true" /> Back to preview
        </button>
      </header>

      <div className={styles.healthSummary} aria-label="Token health summary">
        <Summary
          icon={<ScanEye aria-hidden="true" />}
          label="Preview references"
          value={`${report.referencedTokenCount} / ${report.tokenCount}`}
        />
        <Summary
          icon={<Activity aria-hidden="true" />}
          label="Not used in preview"
          value={report.unusedTokens.length}
        />
        <Summary
          icon={<CopyCheck aria-hidden="true" />}
          label="Repeated values"
          value={report.duplicateValues.length}
        />
        <Summary
          icon={<Link2Off aria-hidden="true" />}
          label="Alias issues"
          value={report.aliasIssues.length}
        />
        <Summary
          icon={<AlertTriangle aria-hidden="true" />}
          label="Contrast attention"
          value={contrastFailures.length}
        />
      </div>

      <div className={styles.healthSections}>
        <section className={styles.healthSection} aria-labelledby="health-contrast-title">
          <div className={styles.healthSectionHeading}>
            <div>
              <span className={styles.eyebrow}>Accessibility check</span>
              <h3 id="health-contrast-title">Contrast pairs</h3>
            </div>
            <span>{report.contrastChecks.length} checks · light and dark modes</span>
          </div>
          {report.contrastChecks.length === 0 ? (
            <p className={styles.healthEmpty}>No registered contrast pairs to check yet.</p>
          ) : (
            <ul className={styles.healthList}>
              {report.contrastChecks.map(({ mode, result, suggestion }) => (
                <li key={`${mode}:${result.id}`}>
                  <span className={result.passes ? styles.healthPass : styles.healthAttention}>
                    {result.passes ? (
                      <CheckCircle2 aria-hidden="true" />
                    ) : (
                      <AlertTriangle aria-hidden="true" />
                    )}
                    {result.passes ? "Pass" : "Review"}
                  </span>
                  <div className={styles.healthFindingMain}>
                    <strong>{result.label}</strong>
                    <span>
                      {result.component} · {mode} mode
                    </span>
                  </div>
                  <div className={styles.healthFindingDetail}>
                    <span>
                      {result.foreground} on {result.background}
                    </span>
                    <strong>
                      {result.ratio.toFixed(2)}:1 <small>(minimum {result.threshold}:1)</small>
                    </strong>
                  </div>
                  <button
                    className={styles.textButton}
                    onClick={() => onInspectContrast(mode, result.id, result.foreground)}
                  >
                    Inspect pair
                  </button>
                  {!result.passes && suggestion && (
                    <div className={styles.healthSuggestion}>
                      <span>
                        Suggested: <code>{suggestion.tokenPath}</code> · projected{" "}
                        {suggestion.projectedRatio.toFixed(2)}:1
                      </span>
                      <button
                        className={styles.secondaryButton}
                        onClick={() =>
                          onApplyContrastSuggestion(mode, result.id, result.foreground, suggestion)
                        }
                      >
                        Apply suggestion
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className={styles.healthNote}>
            Checks cover these registered pairs only; this report is not a full accessibility
            certification.
          </p>
        </section>

        <section className={styles.healthSection} aria-labelledby="health-alias-title">
          <div className={styles.healthSectionHeading}>
            <div>
              <span className={styles.eyebrow}>Reference integrity</span>
              <h3 id="health-alias-title">Alias chains</h3>
            </div>
            <span>{report.aliasCount} tokens use aliases</span>
          </div>
          {report.aliasIssues.length === 0 ? (
            <p className={styles.healthEmpty}>
              <CheckCircle2 aria-hidden="true" /> No missing, incompatible, or circular references.
            </p>
          ) : (
            <ul className={styles.healthList}>
              {report.aliasIssues.map((issue, index) => (
                <AliasFinding
                  key={`${issue.kind}:${issue.mode}:${index}`}
                  issue={issue}
                  onSelectToken={onSelectToken}
                />
              ))}
            </ul>
          )}
        </section>

        <section className={styles.healthSection} aria-labelledby="health-usage-title">
          <div className={styles.healthSectionHeading}>
            <div>
              <span className={styles.eyebrow}>Preview coverage</span>
              <h3 id="health-usage-title">Tokens not used in preview</h3>
            </div>
            <span>
              {report.unusedTokens.length} of {report.tokenCount}
            </span>
          </div>
          <p className={styles.healthNote}>
            Usage is measured against TokenLab’s registered preview components, not arbitrary
            websites or application code.
          </p>
          {report.unusedTokens.length === 0 ? (
            <p className={styles.healthEmpty}>
              <CheckCircle2 aria-hidden="true" /> Every token is referenced by the preview.
            </p>
          ) : (
            <ul className={styles.healthTokenList}>
              {report.unusedTokens.map((token) => (
                <li key={token.id}>
                  <span>
                    <strong>{token.path}</strong>
                    <small>
                      {token.type} · {token.layer}
                    </small>
                  </span>
                  <button className={styles.textButton} onClick={() => onSelectToken(token.id)}>
                    Inspect token
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.healthSection} aria-labelledby="health-duplicate-title">
          <div className={styles.healthSectionHeading}>
            <div>
              <span className={styles.eyebrow}>Consistency review</span>
              <h3 id="health-duplicate-title">Repeated literal values</h3>
            </div>
            <span>{report.duplicateValues.length} groups</span>
          </div>
          {report.duplicateValues.length === 0 ? (
            <p className={styles.healthEmpty}>
              <CheckCircle2 aria-hidden="true" /> No repeated literal values found.
            </p>
          ) : (
            <ul className={styles.healthTokenList}>
              {report.duplicateValues.map((group) => (
                <li key={`${group.type}:${group.tokenIds.join(":")}`}>
                  <span>
                    <strong>{group.value}</strong>
                    <small>
                      {group.type} · {group.modes.join(" and ")} mode
                      {group.modes.length > 1 ? "s" : ""} · consider aliasing if intentional
                    </small>
                    <span className={styles.healthTokenPaths}>
                      {group.paths.map((path, index) => (
                        <button
                          key={path}
                          className={styles.textButton}
                          onClick={() => onSelectToken(group.tokenIds[index])}
                        >
                          {path}
                        </button>
                      ))}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}

function Summary({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className={styles.healthSummaryItem}>
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AliasFinding({
  issue,
  onSelectToken,
}: {
  issue: AliasIssue;
  onSelectToken: (tokenId: string) => void;
}) {
  const tokenId = issue.kind === "cycle" ? issue.tokenIds[0] : issue.tokenId;
  const description =
    issue.kind === "cycle"
      ? `Circular chain: ${issue.tokenIds.join(" → ")}`
      : `${issue.tokenId} → ${issue.targetId} (${issue.kind} target)`;
  return (
    <li>
      <span className={styles.healthAttention}>
        <AlertTriangle aria-hidden="true" /> {issue.mode}
      </span>
      <div className={styles.healthFindingMain}>
        <strong>{description}</strong>
        <span>Alias integrity issue</span>
      </div>
      <button className={styles.textButton} onClick={() => onSelectToken(tokenId)}>
        Inspect token
      </button>
    </li>
  );
}
