import { useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import { presetOptions, presetSpecs, resolveCssValue, type ProjectDocument, type Token, type TokenMode } from "../domain/tokens";
import styles from "../App.module.css";

export type TokenGroupId = "foundations" | "semantic" | "feedback";

export function getTokenGroupId(token: Token): TokenGroupId {
  if (token.path.startsWith("color.error") || token.path.startsWith("feedback.error")) return "feedback";
  return token.layer === "semantic" ? "semantic" : "foundations";
}

type TokenLibraryProps = {
  className: string;
  document: ProjectDocument;
  mode: TokenMode;
  selectedTokenId: string;
  openGroupId: TokenGroupId | null;
  onOpenGroupChange: (groupId: TokenGroupId | null) => void;
  onSelectToken: (tokenId: string) => void;
  onSelectPreset: (presetId: ProjectDocument["presetId"]) => void;
};

export function TokenLibrary({ className, document, mode, selectedTokenId, openGroupId, onOpenGroupChange, onSelectToken, onSelectPreset }: TokenLibraryProps) {
  const [query, setQuery] = useState("");
  const visibleTokens = document.tokens.filter((token) => `${token.path} ${token.type}`.toLowerCase().includes(query.trim().toLowerCase()));
  const groups = [
    { id: "foundations" as const, label: "Foundations", tokens: visibleTokens.filter((token) => getTokenGroupId(token) === "foundations") },
    { id: "semantic" as const, label: "Semantic", tokens: visibleTokens.filter((token) => getTokenGroupId(token) === "semantic") },
    { id: "feedback" as const, label: "Feedback", tokens: visibleTokens.filter((token) => getTokenGroupId(token) === "feedback") },
  ];
  const visibleOpenGroupId = openGroupId === null
    ? null
    : groups.some((group) => group.id === openGroupId && group.tokens.length > 0)
      ? openGroupId
      : groups.find((group) => group.tokens.length > 0)?.id ?? null;

  return (
    <aside className={className} aria-label="Token library">
      <div className={styles.panelHeading}>
        <div><span>Token library</span><small>{query ? `${visibleTokens.length} of ${document.tokens.length}` : document.tokens.length} tokens</small></div>
      </div>
      <div className={styles.tokenSearch}><Search aria-hidden="true" /><input type="search" aria-label="Search tokens" placeholder="Search tokens" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button aria-label="Clear token search" onClick={() => setQuery("")}><X aria-hidden="true" /></button>}</div>
      <div className={styles.tokenList}>
        {groups.map((group) => {
          if (group.tokens.length === 0) return null;
          const open = visibleOpenGroupId === group.id;
          return <section className={`${styles.tokenGroup} ${open ? styles.tokenGroupOpen : ""}`} key={group.id}>
            <button className={styles.tokenGroupTrigger} aria-expanded={open} onClick={() => onOpenGroupChange(open ? null : group.id)}><ChevronRight aria-hidden="true" /><span>{group.label}</span><small>{group.tokens.length}</small></button>
            {open && <div role="region" aria-label={`${group.label} tokens`}>{group.tokens.map((token) => <TokenRow key={token.id} token={token} value={resolveCssValue(document, token.id, mode)} selected={token.id === selectedTokenId} onSelect={() => onSelectToken(token.id)} />)}</div>}
          </section>;
        })}
        {visibleTokens.length === 0 && <p className={styles.emptyTokens}>No matching tokens.</p>}
      </div>
      <div className={styles.presetPicker}>
        <label htmlFor="starting-system">Starting system</label>
        <select id="starting-system" value={document.presetId} onChange={(event) => onSelectPreset(event.target.value as ProjectDocument["presetId"])}>
          {presetOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
        <small>{presetSpecs[document.presetId].description}</small>
      </div>
    </aside>
  );
}

function TokenRow({ token, value, selected, onSelect }: { token: Token; value: string; selected: boolean; onSelect: () => void }) {
  const swatchValue = token.type === "color" ? value : null;
  return <button className={`${styles.tokenRow} ${selected ? styles.tokenRowSelected : ""}`} onClick={onSelect} aria-pressed={selected}>
    {swatchValue ? <span className={styles.swatch} style={{ background: swatchValue }} /> : <span className={styles.tokenTypeIcon}>{token.type.slice(0, 2)}</span>}
    <span><strong>{token.path.split(".").at(-1)}</strong><small>{token.path}</small></span>
    <code>{token.values.light.kind === "reference" ? "↗ alias" : value}</code>
  </button>;
}
