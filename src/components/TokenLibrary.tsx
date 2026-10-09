import { useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import { AnimatePresence, m } from "framer-motion";
import {
  presetOptions,
  presetSpecs,
  resolveCssValue,
  type ProjectDocument,
  type Token,
  type TokenMode,
} from "../domain/tokens";
import { SelectControl } from "./SelectControl";
import styles from "../App.module.css";

export type TokenGroupId = "foundations" | "semantic" | "feedback";

export function getTokenGroupId(token: Token): TokenGroupId {
  if (token.path.startsWith("color.error") || token.path.startsWith("feedback.error"))
    return "feedback";
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

export function TokenLibrary({
  className,
  document,
  mode,
  selectedTokenId,
  openGroupId,
  onOpenGroupChange,
  onSelectToken,
  onSelectPreset,
}: TokenLibraryProps) {
  const [query, setQuery] = useState("");
  const visibleTokens = document.tokens.filter((token) =>
    `${token.path} ${token.type}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const groups = [
    {
      id: "foundations" as const,
      label: "Foundations",
      tokens: visibleTokens.filter((token) => getTokenGroupId(token) === "foundations"),
    },
    {
      id: "semantic" as const,
      label: "Semantic",
      tokens: visibleTokens.filter((token) => getTokenGroupId(token) === "semantic"),
    },
    {
      id: "feedback" as const,
      label: "Feedback",
      tokens: visibleTokens.filter((token) => getTokenGroupId(token) === "feedback"),
    },
  ];
  const visibleOpenGroupId =
    openGroupId === null
      ? null
      : groups.some((group) => group.id === openGroupId && group.tokens.length > 0)
        ? openGroupId
        : (groups.find((group) => group.tokens.length > 0)?.id ?? null);

  return (
    <aside id="token-library" className={className} aria-label="Token library">
      <div className={styles.panelHeading}>
        <div>
          <span>Token library</span>
          <small>
            {query
              ? `${visibleTokens.length} of ${document.tokens.length}`
              : document.tokens.length}{" "}
            tokens
          </small>
        </div>
      </div>
      <div className={styles.tokenSearch}>
        <Search aria-hidden="true" />
        <input
          type="search"
          aria-label="Search tokens"
          placeholder="Search tokens"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <button aria-label="Clear token search" onClick={() => setQuery("")}>
            <X aria-hidden="true" />
          </button>
        )}
      </div>
      <div className={styles.tokenList}>
        {groups.map((group) => {
          if (group.tokens.length === 0) return null;
          const open = visibleOpenGroupId === group.id;
          return (
            <section
              className={`${styles.tokenGroup} ${open ? styles.tokenGroupOpen : ""}`}
              key={group.id}
            >
              <m.button
                className={styles.tokenGroupTrigger}
                aria-expanded={open}
                aria-controls={`token-group-${group.id}`}
                whileTap={{ scale: 0.985 }}
                onClick={() => onOpenGroupChange(open ? null : group.id)}
              >
                <m.span
                  className={styles.tokenGroupChevron}
                  animate={{ rotate: open ? 90 : 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                >
                  <ChevronRight aria-hidden="true" />
                </m.span>
                <span>{group.label}</span>
                <small>{group.tokens.length}</small>
              </m.button>
              <AnimatePresence initial={false}>
                {open && (
                  <m.div
                    key={group.id}
                    id={`token-group-${group.id}`}
                    role="region"
                    aria-label={`${group.label} tokens`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      height: { duration: 0.26, ease: [0.22, 1, 0.36, 1] },
                      opacity: { duration: 0.16 },
                    }}
                    className={styles.tokenGroupContent}
                  >
                    <div className={styles.tokenGroupRows}>
                      {group.tokens.map((token) => (
                        <TokenRow
                          key={token.id}
                          token={token}
                          value={resolveCssValue(document, token.id, mode)}
                          selected={token.id === selectedTokenId}
                          onSelect={() => onSelectToken(token.id)}
                        />
                      ))}
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </section>
          );
        })}
        {visibleTokens.length === 0 && <p className={styles.emptyTokens}>No matching tokens.</p>}
      </div>
      <div className={styles.presetPicker}>
        <label htmlFor="starting-system">Starting system</label>
        <SelectControl
          id="starting-system"
          value={document.presetId}
          onChange={(event) => onSelectPreset(event.target.value as ProjectDocument["presetId"])}
        >
          {presetOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </SelectControl>
        <small>{presetSpecs[document.presetId].description}</small>
      </div>
    </aside>
  );
}

function TokenRow({
  token,
  value,
  selected,
  onSelect,
}: {
  token: Token;
  value: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const swatchValue = token.type === "color" ? value : null;
  return (
    <m.button
      className={`${styles.tokenRow} ${selected ? styles.tokenRowSelected : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
      whileTap={{ scale: 0.985 }}
    >
      {swatchValue ? (
        <span className={styles.swatch} style={{ background: swatchValue }} />
      ) : (
        <span className={styles.tokenTypeIcon}>{token.type.slice(0, 2)}</span>
      )}
      <span>
        <strong>{token.path.split(".").at(-1)}</strong>
        <span className={styles.tokenMeta}>
          <small>{token.path}</small>
          <code>{token.values.light.kind === "reference" ? "↗ alias" : value}</code>
        </span>
      </span>
    </m.button>
  );
}
