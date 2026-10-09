import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { AlertTriangle, ArrowLeft, FileCode2, ShieldCheck, Upload } from "lucide-react";
import { checkContrast } from "../domain/contrast";
import { createStyleImportCommand, scanStylesheet, type StyleCandidate, type StyleMapping, type StyleScanResult } from "../domain/styleImport";
import { applyCommands, resolveCssValue, type ProjectDocument, type TokenMode } from "../domain/tokens";
import styles from "../App.module.css";

const maximumFileSize = 1024 * 1024;

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
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { headingRef.current?.focus(); }, []);

  const importStylesheet = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setError("");
    setMessage("");

    try {
      if (file.size > maximumFileSize) throw new Error("Choose a CSS file smaller than 1 MB.");
      const scan = scanStylesheet(await file.text());
      const nextTargets = Object.fromEntries(scan.candidates.map((candidate) => [candidate.id, suggestedTarget(candidate, document)]));
      setFilename(file.name);
      setResult(scan);
      setTargets(nextTargets);
      setSelected(Object.fromEntries(scan.candidates.map((candidate) => [candidate.id, valueChanges(candidate, nextTargets[candidate.id], document, mode)])));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't read this stylesheet.");
    } finally {
      input.value = "";
    }
  };

  const mappings = result?.candidates
    .filter((candidate) => selected[candidate.id] && targets[candidate.id])
    .map((candidate) => ({ candidate, tokenId: targets[candidate.id] })) ?? [];
  const previewDocument = applyCommands(document, mappings.map((mapping) => createStyleImportCommand(mapping, mode)));
  const currentContrast = checkContrast(document, mode);
  const contrastRegressions = checkContrast(previewDocument, mode).filter((check) => !check.passes && currentContrast.find((current) => current.id === check.id)?.passes);
  const selectableCandidates = result?.candidates.filter((candidate) => valueChanges(candidate, targets[candidate.id], document, mode)) ?? [];
  const allSelected = selectableCandidates.length > 0 && selectableCandidates.every((candidate) => selected[candidate.id]);
  const mappedCount = result?.candidates.filter((candidate) => targets[candidate.id]).length ?? 0;

  const applySelection = () => {
    if (mappings.length === 0) return;
    if (new Set(mappings.map((mapping) => mapping.tokenId)).size !== mappings.length) {
      setError("Map each selected value to a different token.");
      return;
    }
    try {
      onApply(mappings);
      setSelected({});
      setMessage(`${mappings.length} token ${mappings.length === 1 ? "change" : "changes"} applied as one undo step.`);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't apply these values.");
    }
  };

  return (
    <div className={styles.styleImportPanel} aria-labelledby="style-import-title">
      <div className={styles.styleImportHeader}>
        <div><span className={styles.eyebrow}>Reverse tokenization</span><h2 id="style-import-title" ref={headingRef} tabIndex={-1}>Review imported styles</h2><p>Map reusable values into your token system, review their impact, then apply the selection as one undoable change.</p></div>
        <button className={styles.secondaryButton} onClick={onClose}><ArrowLeft aria-hidden="true" />Back to preview</button>
      </div>

      <div className={styles.styleImportBody}>
        <label className={styles.styleImportUpload}>
          <FileCode2 aria-hidden="true" />
          <span><strong>{filename || "Choose a CSS file"}</strong><small>CSS is read locally and never executed. Maximum 1 MB.</small></span>
          <span className={styles.secondaryButton}><Upload aria-hidden="true" />{filename ? "Replace file" : "Browse"}</span>
          <input type="file" accept=".css,text/css" onChange={importStylesheet} />
        </label>
        {error && <p className={styles.importError} role="alert">{error}</p>}
        {message && <p className={styles.importSuccess} role="status">{message}</p>}

        {result && <>
          <div className={styles.styleImportSummary} aria-live="polite">
            <span><strong>{result.candidates.length}</strong> reusable values</span>
            <span><strong>{mappedCount}</strong> mapped</span>
            <span><strong>{result.candidates.length - mappedCount}</strong> need mapping</span>
            <span><strong>{result.unsupportedCount}</strong> unsupported</span>
          </div>
          {result.candidates.length === 0 ? <div className={styles.styleImportEmpty}><strong>No compatible values found</strong><p>TokenLab currently recognizes hex colors, px/rem dimensions, supported fonts, weights, line heights, and simple shadows.</p></div> : <>
            <div className={styles.styleImportTools}>
              <div><strong>Review mappings</strong><small>{mappings.length} of {selectableCandidates.length} changes selected</small></div>
              <button className={styles.secondaryButton} disabled={selectableCandidates.length === 0} onClick={() => setSelected(Object.fromEntries(selectableCandidates.map((candidate) => [candidate.id, !allSelected])))}>{allSelected ? "Clear selection" : "Select all changes"}</button>
            </div>
            <div className={styles.styleCandidateList}>{result.candidates.map((candidate) => {
              const compatibleTokens = document.tokens.filter((token) => token.layer === "primitive" && token.type === candidate.type);
              const target = targets[candidate.id] ?? "";
              const currentValue = target ? resolveCssValue(document, target, mode) : "";
              const changed = Boolean(target) && currentValue !== candidate.value;
              return <article className={styles.styleCandidate} key={candidate.id}>
                <input type="checkbox" aria-label={`Select ${candidate.value}`} checked={Boolean(selected[candidate.id]) && changed} disabled={!changed} onChange={(event) => setSelected((current) => ({ ...current, [candidate.id]: event.target.checked }))} />
                <span className={styles.candidatePreview}>{candidate.type === "color" ? <i style={{ background: candidate.value }} /> : candidate.type.slice(0, 2).toUpperCase()}</span>
                <span className={styles.candidateValue}><code>{candidate.value}</code><small>{candidate.sources.join(", ")} · {candidate.occurrences} {candidate.occurrences === 1 ? "use" : "uses"}</small><span className={!target ? styles.mappingNeeded : changed ? styles.mappingReady : styles.mappingCurrent}>{!target ? "Needs mapping" : changed ? "Ready to apply" : "Already matches"}</span></span>
                <span className={styles.candidateChange}><small>Current</small><code>{currentValue || "Choose a target"}</code><small>Imported</small><code>{candidate.value}</code></span>
                <label>Map to<select value={target} onChange={(event) => { const tokenId = event.target.value; setTargets((current) => ({ ...current, [candidate.id]: tokenId })); setSelected((current) => ({ ...current, [candidate.id]: valueChanges(candidate, tokenId, document, mode) })); setMessage(""); }}><option value="">Choose token</option>{compatibleTokens.map((token) => <option key={token.id} value={token.id} disabled={Object.entries(targets).some(([candidateId, tokenId]) => candidateId !== candidate.id && tokenId === token.id)}>{token.path}</option>)}</select></label>
              </article>;
            })}</div>

            {mappings.length > 0 && (contrastRegressions.length > 0 ? <div className={styles.importContrastWarning} role="alert"><AlertTriangle aria-hidden="true" /><div><strong>{contrastRegressions.length} new contrast {contrastRegressions.length === 1 ? "issue" : "issues"}</strong>{contrastRegressions.map((check) => <span key={check.id}>{check.label}: {check.ratio}:1, requires {check.threshold}:1.</span>)}</div></div> : <div className={styles.importContrastClear}><ShieldCheck aria-hidden="true" /><span>No new failures across TokenLab’s {currentContrast.length} registered contrast pairs.</span></div>)}
            <div className={styles.styleImportActions}><span>{mappings.length > 0 ? `${mappings.length} selected ${mappings.length === 1 ? "change" : "changes"}` : "Select at least one mapped change"}</span><button className={styles.primaryStudioButton} disabled={mappings.length === 0} onClick={applySelection}>Apply {mappings.length || "selected"}</button></div>
          </>}
        </>}
      </div>
    </div>
  );
}

function suggestedTarget(candidate: StyleCandidate, document: ProjectDocument) {
  const variable = candidate.sources.find((source) => source.startsWith("--"));
  if (!variable) return "";
  const path = variable.slice(2).replaceAll("-", ".");
  return document.tokens.find((token) => token.layer === "primitive" && token.type === candidate.type && token.path === path)?.id ?? "";
}

function valueChanges(candidate: StyleCandidate, tokenId: string, document: ProjectDocument, mode: TokenMode) {
  return Boolean(tokenId) && resolveCssValue(document, tokenId, mode) !== candidate.value;
}
