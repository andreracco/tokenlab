import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ArrowLeft, Check, FileCode2, Upload } from "lucide-react";
import { scanStylesheet, type StyleCandidate, type StyleScanResult } from "../domain/styleImport";
import type { ProjectDocument } from "../domain/tokens";
import styles from "../App.module.css";

const maximumFileSize = 1024 * 1024;

type StyleImportPanelProps = {
  document: ProjectDocument;
  onApply: (candidate: StyleCandidate, tokenId: string) => void;
  onClose: () => void;
};

export function StyleImportPanel({ document, onApply, onClose }: StyleImportPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [filename, setFilename] = useState("");
  const [result, setResult] = useState<StyleScanResult | null>(null);
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [applied, setApplied] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  useEffect(() => { headingRef.current?.focus(); }, []);

  const importStylesheet = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setError("");

    try {
      if (file.size > maximumFileSize) throw new Error("Choose a CSS file smaller than 1 MB.");
      const scan = scanStylesheet(await file.text());
      setFilename(file.name);
      setResult(scan);
      setApplied({});
      setTargets(Object.fromEntries(scan.candidates.map((candidate) => [candidate.id, suggestedTarget(candidate, document)])));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't read this stylesheet.");
    } finally {
      input.value = "";
    }
  };

  const applyCandidate = (candidate: StyleCandidate) => {
    const tokenId = targets[candidate.id];
    if (!tokenId) return;
    try {
      onApply(candidate, tokenId);
      setApplied((current) => ({ ...current, [candidate.id]: tokenId }));
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't apply this value.");
    }
  };

  return (
    <div className={styles.styleImportPanel} aria-labelledby="style-import-title">
      <div className={styles.styleImportHeader}>
        <div><span className={styles.eyebrow}>Reverse tokenization</span><h2 id="style-import-title" ref={headingRef} tabIndex={-1}>Import a stylesheet</h2><p>Find reusable values, then map them deliberately into your existing token system.</p></div>
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

        {result && <>
          <div className={styles.styleImportSummary} aria-live="polite">
            <span><strong>{result.candidates.length}</strong> reusable values</span>
            <span><strong>{result.variableCount}</strong> CSS variables</span>
            <span><strong>{result.declarationCount}</strong> declarations scanned</span>
          </div>
          {result.candidates.length === 0 ? <div className={styles.styleImportEmpty}><strong>No compatible values found</strong><p>TokenLab currently recognizes hex colors, px/rem dimensions, supported fonts, weights, line heights, and simple shadows.</p></div> : (
            <div className={styles.styleCandidateList}>{result.candidates.map((candidate) => {
              const compatibleTokens = document.tokens.filter((token) => token.layer === "primitive" && token.type === candidate.type);
              const target = targets[candidate.id] ?? "";
              const appliedTarget = applied[candidate.id];
              return <article className={styles.styleCandidate} key={candidate.id}>
                <span className={styles.candidatePreview}>{candidate.type === "color" ? <i style={{ background: candidate.value }} /> : candidate.type.slice(0, 2).toUpperCase()}</span>
                <span className={styles.candidateValue}><code>{candidate.value}</code><small>{candidate.sources.join(", ")} · {candidate.occurrences} {candidate.occurrences === 1 ? "use" : "uses"}</small></span>
                <label>Map to<select value={target} onChange={(event) => { setTargets((current) => ({ ...current, [candidate.id]: event.target.value })); setApplied((current) => ({ ...current, [candidate.id]: "" })); }}><option value="">Choose token</option>{compatibleTokens.map((token) => <option key={token.id} value={token.id}>{token.path}</option>)}</select></label>
                <button aria-label={target ? `${appliedTarget === target ? "Applied" : "Apply"} ${candidate.value} to ${target}` : `Choose a token for ${candidate.value}`} className={appliedTarget === target ? styles.appliedButton : styles.primaryStudioButton} disabled={!target || appliedTarget === target} onClick={() => applyCandidate(candidate)}>{appliedTarget === target ? <><Check aria-hidden="true" />Applied</> : "Apply"}</button>
              </article>;
            })}</div>
          )}
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
