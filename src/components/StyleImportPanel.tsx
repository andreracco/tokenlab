import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { AlertTriangle, ArrowLeft, FileCode2, Search, ShieldCheck, Upload, X } from "lucide-react";
import { checkContrast } from "../domain/contrast";
import {
  createStyleImportCommand,
  scanStylesheet,
  type StyleCandidate,
  type StyleMapping,
  type StyleScanResult,
} from "../domain/styleImport";
import {
  applyCommands,
  resolveCssValue,
  type ProjectDocument,
  type TokenMode,
} from "../domain/tokens";
import { StyleImportGuide } from "./StyleImportGuide";
import { SelectControl } from "./SelectControl";
import styles from "../App.module.css";

const maximumFileSize = 1024 * 1024;
type ReviewStatus = "all" | "ready" | "unmapped" | "current" | "unsupported";
type ReviewGroup = "all" | "colors" | "spacing" | "typography" | "shadows";

type StyleImportPanelProps = {
  document: ProjectDocument;
  mode: TokenMode;
  onApply: (mappings: StyleMapping[]) => void;
  onClose: () => void;
};

export function StyleImportPanel({ document, mode, onApply, onClose }: StyleImportPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [filename, setFilename] = useState("");
  const [result, setResult] = useState<StyleScanResult | null>(null);
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [automaticTargets, setAutomaticTargets] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [autoMapEnabled, setAutoMapEnabled] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReviewStatus>("all");
  const [groupFilter, setGroupFilter] = useState<ReviewGroup>("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const importStylesheet = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setError("");
    setMessage("");

    try {
      if (file.size > maximumFileSize) throw new Error("Choose a CSS file smaller than 1 MB.");
      const scan = scanStylesheet(await file.text());
      const suggestions = autoMapEnabled
        ? addSuggestions(scan.candidates, {}, document, mode)
        : { targets: {}, automatic: {} };
      setFilename(file.name);
      setResult(scan);
      setTargets(suggestions.targets);
      setAutomaticTargets(suggestions.automatic);
      setSelected(
        Object.fromEntries(
          scan.candidates.map((candidate) => [
            candidate.id,
            valueChanges(candidate, suggestions.targets[candidate.id], document, mode),
          ]),
        ),
      );
      setQuery("");
      setStatusFilter("all");
      setGroupFilter("all");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't read this stylesheet.");
    } finally {
      input.value = "";
    }
  };

  const mappings =
    result?.candidates
      .filter((candidate) => selected[candidate.id] && targets[candidate.id])
      .map((candidate) => ({ candidate, tokenId: targets[candidate.id] })) ?? [];
  const previewDocument = applyCommands(
    document,
    mappings.map((mapping) => createStyleImportCommand(mapping, mode)),
  );
  const currentContrast = checkContrast(document, mode);
  const contrastRegressions = checkContrast(previewDocument, mode).filter(
    (check) => !check.passes && currentContrast.find((current) => current.id === check.id)?.passes,
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filteredCandidates =
    result?.candidates.filter((candidate) => {
      const target = targets[candidate.id];
      const changed = valueChanges(candidate, target, document, mode);
      const statusMatches =
        statusFilter === "all" ||
        (statusFilter === "ready" && changed) ||
        (statusFilter === "unmapped" && !target) ||
        (statusFilter === "current" && Boolean(target) && !changed);
      const groupMatches = groupFilter === "all" || candidateGroup(candidate) === groupFilter;
      const queryMatches =
        !normalizedQuery ||
        `${candidate.value} ${candidate.sources.join(" ")} ${target ?? ""}`
          .toLowerCase()
          .includes(normalizedQuery);
      return statusFilter !== "unsupported" && statusMatches && groupMatches && queryMatches;
    }) ?? [];
  const filteredUnsupported =
    result?.unsupported.filter(
      (item) =>
        !normalizedQuery ||
        `${item.source} ${item.value} ${item.reason}`.toLowerCase().includes(normalizedQuery),
    ) ?? [];
  const candidateGroups = (
    [
      ["colors", "Colors"],
      ["spacing", "Spacing & sizing"],
      ["typography", "Typography"],
      ["shadows", "Shadows"],
    ] as const
  )
    .map(([id, label]) => ({
      id,
      label,
      candidates: filteredCandidates.filter((candidate) => candidateGroup(candidate) === id),
    }))
    .filter((group) => group.candidates.length > 0);
  const selectableCandidates = filteredCandidates.filter((candidate) =>
    valueChanges(candidate, targets[candidate.id], document, mode),
  );
  const allSelected =
    selectableCandidates.length > 0 &&
    selectableCandidates.every((candidate) => selected[candidate.id]);
  const mappedCount = result?.candidates.filter((candidate) => targets[candidate.id]).length ?? 0;

  const toggleAutoMap = (enabled: boolean) => {
    setAutoMapEnabled(enabled);
    if (!result) return;
    if (enabled) {
      const suggestions = addSuggestions(result.candidates, targets, document, mode);
      setTargets(suggestions.targets);
      setAutomaticTargets((current) => ({ ...current, ...suggestions.automatic }));
      setSelected((current) => ({
        ...current,
        ...Object.fromEntries(
          result.candidates.map((candidate) => [
            candidate.id,
            current[candidate.id] ||
              valueChanges(candidate, suggestions.targets[candidate.id], document, mode),
          ]),
        ),
      }));
    } else {
      setTargets((current) =>
        Object.fromEntries(
          result.candidates.map((candidate) => [
            candidate.id,
            automaticTargets[candidate.id] ? "" : current[candidate.id],
          ]),
        ),
      );
      setSelected((current) =>
        Object.fromEntries(
          result.candidates.map((candidate) => [
            candidate.id,
            automaticTargets[candidate.id] ? false : current[candidate.id],
          ]),
        ),
      );
      setAutomaticTargets({});
    }
    setMessage("");
  };

  const applySelection = () => {
    if (mappings.length === 0) return;
    if (new Set(mappings.map((mapping) => mapping.tokenId)).size !== mappings.length) {
      setError("Map each selected value to a different token.");
      return;
    }
    try {
      onApply(mappings);
      setSelected({});
      setMessage(
        `${mappings.length} token ${mappings.length === 1 ? "change" : "changes"} applied as one undo step.`,
      );
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't apply these values.");
    }
  };

  return (
    <div className={styles.styleImportPanel} aria-labelledby="style-import-title">
      <div className={styles.styleImportHeader}>
        <div>
          <span className={styles.eyebrow}>Reverse tokenization</span>
          <h2 id="style-import-title" ref={headingRef} tabIndex={-1}>
            Review imported styles
          </h2>
          <p>
            Map reusable values into your token system, review their impact, then apply the
            selection as one undoable change.
          </p>
        </div>
        <button className={styles.secondaryButton} onClick={onClose}>
          <ArrowLeft aria-hidden="true" />
          Back to preview
        </button>
      </div>

      <div className={styles.styleImportBody}>
        <StyleImportGuide />
        <label className={styles.styleImportUpload}>
          <FileCode2 aria-hidden="true" />
          <span>
            <strong>{filename || "Choose a CSS file"}</strong>
            <small>CSS is read locally and never executed. Maximum 1 MB.</small>
          </span>
          <span className={styles.secondaryButton}>
            <Upload aria-hidden="true" />
            {filename ? "Replace file" : "Browse"}
          </span>
          <input type="file" accept=".css,text/css" onChange={importStylesheet} />
        </label>
        {error && (
          <p className={styles.importError} role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className={styles.importSuccess} role="status">
            {message}
          </p>
        )}

        {result && (
          <>
            <div className={styles.styleImportSummary} aria-live="polite">
              <span>
                <strong>{result.candidates.length}</strong> reusable values
              </span>
              <span>
                <strong>{mappedCount}</strong> mapped
              </span>
              <span>
                <strong>{result.candidates.length - mappedCount}</strong> need mapping
              </span>
              <span>
                <strong>{result.unsupportedCount}</strong> unsupported
              </span>
            </div>
            <div className={styles.styleImportFilters}>
              <label className={styles.styleImportSearch}>
                <Search aria-hidden="true" />
                <input
                  type="search"
                  aria-label="Search imported styles"
                  placeholder="Search variables or values"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query && (
                  <button aria-label="Clear imported style search" onClick={() => setQuery("")}>
                    <X aria-hidden="true" />
                  </button>
                )}
              </label>
              <SelectControl
                aria-label="Import status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ReviewStatus)}
              >
                <option value="all">All values</option>
                <option value="ready">Ready to apply</option>
                <option value="unmapped">Needs mapping</option>
                <option value="current">Already matches</option>
                <option value="unsupported">Unsupported</option>
              </SelectControl>
              <SelectControl
                aria-label="Import group"
                value={groupFilter}
                disabled={statusFilter === "unsupported"}
                onChange={(event) => setGroupFilter(event.target.value as ReviewGroup)}
              >
                <option value="all">All groups</option>
                <option value="colors">Colors</option>
                <option value="spacing">Spacing & sizing</option>
                <option value="typography">Typography</option>
                <option value="shadows">Shadows</option>
              </SelectControl>
            </div>
            {result.candidates.length > 0 && (
              <>
                <div className={styles.styleImportTools}>
                  <div>
                    <strong>Review mappings</strong>
                    <small>
                      {filteredCandidates.length} shown · {mappings.length} changes selected
                    </small>
                  </div>
                  <span className={styles.styleImportToolActions}>
                    <label className={styles.autoMapToggle}>
                      <input
                        type="checkbox"
                        checked={autoMapEnabled}
                        onChange={(event) => toggleAutoMap(event.target.checked)}
                      />
                      Auto-map obvious matches
                    </label>
                    <button
                      className={styles.secondaryButton}
                      disabled={selectableCandidates.length === 0}
                      onClick={() =>
                        setSelected((current) => ({
                          ...current,
                          ...Object.fromEntries(
                            selectableCandidates.map((candidate) => [candidate.id, !allSelected]),
                          ),
                        }))
                      }
                    >
                      {allSelected ? "Clear visible selection" : "Select visible changes"}
                    </button>
                  </span>
                </div>
                <div className={styles.styleImportSticky}>
                  {mappings.length > 0 &&
                    (contrastRegressions.length > 0 ? (
                      <div className={styles.importContrastWarning} role="alert">
                        <AlertTriangle aria-hidden="true" />
                        <div>
                          <strong>
                            {contrastRegressions.length} new contrast{" "}
                            {contrastRegressions.length === 1 ? "issue" : "issues"}
                          </strong>
                          {contrastRegressions.map((check) => (
                            <span key={check.id}>
                              {check.label}: {check.ratio}:1, requires {check.threshold}:1.
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className={styles.importContrastClear}>
                        <ShieldCheck aria-hidden="true" />
                        <span>
                          No new failures across TokenLab’s {currentContrast.length} registered
                          contrast pairs.
                        </span>
                      </div>
                    ))}
                  <div className={styles.styleImportActions}>
                    <span>
                      {mappings.length > 0
                        ? `${mappings.length} selected ${mappings.length === 1 ? "change" : "changes"}`
                        : "Select at least one mapped change"}
                    </span>
                    <button
                      className={styles.primaryStudioButton}
                      disabled={mappings.length === 0}
                      onClick={applySelection}
                    >
                      Apply {mappings.length || "selected"}
                    </button>
                  </div>
                </div>
                {candidateGroups.map((group) => (
                  <section
                    className={styles.styleCandidateGroup}
                    key={group.id}
                    aria-labelledby={`import-group-${group.id}`}
                  >
                    <header>
                      <strong id={`import-group-${group.id}`}>{group.label}</strong>
                      <span>{group.candidates.length} values · usage first</span>
                    </header>
                    <div className={styles.styleCandidateList}>
                      {group.candidates.map((candidate) => {
                        const compatibleTokens = document.tokens.filter(
                          (token) => token.layer === "primitive" && token.type === candidate.type,
                        );
                        const target = targets[candidate.id] ?? "";
                        const currentValue = target ? resolveCssValue(document, target, mode) : "";
                        const changed = Boolean(target) && currentValue !== candidate.value;
                        return (
                          <article className={styles.styleCandidate} key={candidate.id}>
                            <input
                              type="checkbox"
                              aria-label={`Select ${candidate.value}`}
                              checked={Boolean(selected[candidate.id]) && changed}
                              disabled={!changed}
                              onChange={(event) =>
                                setSelected((current) => ({
                                  ...current,
                                  [candidate.id]: event.target.checked,
                                }))
                              }
                            />
                            <span className={styles.candidatePreview}>
                              {candidate.type === "color" ? (
                                <i style={{ background: candidate.value }} />
                              ) : (
                                candidate.type.slice(0, 2).toUpperCase()
                              )}
                            </span>
                            <span className={styles.candidateValue}>
                              <code>{candidate.value}</code>
                              <small>
                                {candidate.sources.join(", ")} · {candidate.occurrences}{" "}
                                {candidate.occurrences === 1 ? "use" : "uses"}
                              </small>
                              <span
                                className={
                                  !target
                                    ? styles.mappingNeeded
                                    : changed
                                      ? styles.mappingReady
                                      : styles.mappingCurrent
                                }
                              >
                                {!target
                                  ? "Needs mapping"
                                  : changed
                                    ? "Ready to apply"
                                    : "Already matches"}
                              </span>
                              {automaticTargets[candidate.id] && (
                                <small className={styles.mappingReason}>
                                  Auto-mapped · {automaticTargets[candidate.id]}
                                </small>
                              )}
                            </span>
                            <span className={styles.candidateChange}>
                              <small>Current</small>
                              <code>{currentValue || "Choose a target"}</code>
                              <small>Imported</small>
                              <code>{candidate.value}</code>
                            </span>
                            <label>
                              Map to
                              <SelectControl
                                value={target}
                                onChange={(event) => {
                                  const tokenId = event.target.value;
                                  setTargets((current) => ({
                                    ...current,
                                    [candidate.id]: tokenId,
                                  }));
                                  setAutomaticTargets((current) => ({
                                    ...current,
                                    [candidate.id]: "",
                                  }));
                                  setSelected((current) => ({
                                    ...current,
                                    [candidate.id]: valueChanges(
                                      candidate,
                                      tokenId,
                                      document,
                                      mode,
                                    ),
                                  }));
                                  setMessage("");
                                }}
                              >
                                <option value="">Choose token</option>
                                {compatibleTokens.map((token) => (
                                  <option
                                    key={token.id}
                                    value={token.id}
                                    disabled={Object.entries(targets).some(
                                      ([candidateId, tokenId]) =>
                                        candidateId !== candidate.id && tokenId === token.id,
                                    )}
                                  >
                                    {token.path}
                                  </option>
                                ))}
                              </SelectControl>
                            </label>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
                {statusFilter !== "unsupported" && filteredCandidates.length === 0 && (
                  <div className={styles.styleImportEmpty}>
                    <strong>No reusable values match</strong>
                    <p>Change the search or filters to continue reviewing this stylesheet.</p>
                  </div>
                )}
              </>
            )}

            {(statusFilter === "all" || statusFilter === "unsupported") &&
              (filteredUnsupported.length > 0 ? (
                <details className={styles.unsupportedStyles} open={statusFilter === "unsupported"}>
                  <summary>
                    <span>
                      <strong>Unsupported declarations</strong>
                      <small>Review what TokenLab skipped and why.</small>
                    </span>
                    <span>
                      {filteredUnsupported.reduce((total, item) => total + item.occurrences, 0)}{" "}
                      uses
                    </span>
                  </summary>
                  <div>
                    {filteredUnsupported.map((item) => (
                      <article key={item.id}>
                        <code>{item.source}</code>
                        <code>{item.value}</code>
                        <span>{item.reason}</span>
                        <small>
                          {item.occurrences} {item.occurrences === 1 ? "use" : "uses"}
                        </small>
                      </article>
                    ))}
                  </div>
                </details>
              ) : (
                statusFilter === "unsupported" && (
                  <div className={styles.styleImportEmpty}>
                    <strong>No unsupported values match</strong>
                    <p>Change the search to review skipped declarations.</p>
                  </div>
                )
              ))}
          </>
        )}
      </div>
    </div>
  );
}

function addSuggestions(
  candidates: StyleCandidate[],
  current: Record<string, string>,
  document: ProjectDocument,
  mode: TokenMode,
) {
  const targets = { ...current };
  const automatic: Record<string, string> = {};
  const claimed = new Set(Object.values(current).filter(Boolean));
  for (const candidate of candidates) {
    if (targets[candidate.id]) continue;
    const suggestion = suggestedTarget(candidate, document, mode);
    if (!suggestion || claimed.has(suggestion.tokenId)) continue;
    targets[candidate.id] = suggestion.tokenId;
    automatic[candidate.id] = suggestion.reason;
    claimed.add(suggestion.tokenId);
  }
  return { targets, automatic };
}

function suggestedTarget(candidate: StyleCandidate, document: ProjectDocument, mode: TokenMode) {
  for (const variable of candidate.sources.filter((source) => source.startsWith("--"))) {
    const path = variable.slice(2).replaceAll("-", ".");
    const exact = document.tokens.find(
      (token) =>
        token.layer === "primitive" && token.type === candidate.type && token.path === path,
    );
    if (exact) return { tokenId: exact.id, reason: `Exact variable path: ${variable}` };
  }
  const valueMatches = document.tokens.filter(
    (token) =>
      token.layer === "primitive" &&
      token.type === candidate.type &&
      resolveCssValue(document, token.id, mode) === candidate.value,
  );
  return valueMatches.length === 1
    ? { tokenId: valueMatches[0].id, reason: "Unique existing value" }
    : null;
}

function candidateGroup(candidate: StyleCandidate): Exclude<ReviewGroup, "all"> {
  if (candidate.type === "color") return "colors";
  if (candidate.type === "dimension") return "spacing";
  if (candidate.type === "shadow") return "shadows";
  return "typography";
}

function valueChanges(
  candidate: StyleCandidate,
  tokenId: string,
  document: ProjectDocument,
  mode: TokenMode,
) {
  return Boolean(tokenId) && resolveCssValue(document, tokenId, mode) !== candidate.value;
}
