import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Check, ChevronDown, Copy } from "lucide-react";
import {
  resolveCssValue,
  type ProjectDocument,
  type Token,
  type TokenMode,
} from "../domain/tokens";
import styles from "../App.module.css";

type SpectrumPopoverProps = {
  document: ProjectDocument;
  mode: TokenMode;
  onSelectToken: (tokenId: string) => void;
};

type Layer = Token["layer"];

export function SpectrumPopover({ document, mode, onSelectToken }: SpectrumPopoverProps) {
  const [open, setOpen] = useState(false);
  const [layer, setLayer] = useState<Layer>("primitive");
  const [viewMode, setViewMode] = useState<TokenMode>(mode);
  const [copied, setCopied] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const colors = document.tokens.filter((token) => token.type === "color");
  const primitives = colors.filter((token) => token.layer === "primitive");
  const shown = colors.filter((token) => token.layer === layer);
  const strip = primitives.slice(0, 6);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", closeOnOutside);
    return () => window.removeEventListener("pointerdown", closeOnOutside);
  }, [open]);

  const toggle = () => {
    if (!open) {
      setViewMode(mode);
      setCopied("");
    }
    setOpen(!open);
  };
  const copy = async (token: Token) => {
    const value = resolveCssValue(document, token.id, viewMode);
    try {
      await navigator.clipboard.writeText(value);
      setCopied(`Copied ${value}`);
    } catch {
      setCopied(`Couldn't copy ${value}`);
    }
  };

  return (
    <div
      ref={rootRef}
      className={styles.tokenSpectrum}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={styles.spectrumTrigger}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`Active palette for ${document.name}`}
        onClick={toggle}
      >
        <span>Active spectrum</span>
        <div>
          {strip.map((token) => (
            <i
              key={token.id}
              style={{ background: resolveCssValue(document, token.id, mode) }}
              title={`${token.path}: ${resolveCssValue(document, token.id, mode)}`}
            />
          ))}
        </div>
        <ChevronDown className={styles.spectrumChevron} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <m.section
            id={panelId}
            className={styles.spectrumPanel}
            aria-label="Color palette"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <header>
              <div className={styles.spectrumToggle} role="group" aria-label="Token layer">
                {(["primitive", "semantic"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={layer === option}
                    onClick={() => setLayer(option)}
                  >
                    {option === "primitive" ? "Primitive" : "Semantic"}{" "}
                    <small>{colors.filter((token) => token.layer === option).length}</small>
                  </button>
                ))}
              </div>
              <div className={styles.spectrumToggle} role="group" aria-label="Mode">
                {(["light", "dark"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={viewMode === option}
                    onClick={() => setViewMode(option)}
                  >
                    {option === "light" ? "Light" : "Dark"}
                  </button>
                ))}
              </div>
            </header>
            {shown.length === 0 ? (
              <p className={styles.spectrumEmpty}>No {layer} colors in this project.</p>
            ) : (
              <ul className={styles.spectrumList}>
                {shown.map((token) => {
                  const value = resolveCssValue(document, token.id, viewMode);
                  return (
                    <li key={token.id}>
                      <button
                        type="button"
                        className={styles.spectrumSwatch}
                        onClick={() => {
                          onSelectToken(token.id);
                          setOpen(false);
                        }}
                      >
                        <i style={{ background: value }} aria-hidden="true" />
                        <span>
                          <strong title={token.path}>{token.path.replace(/^color\./, "")}</strong>
                          <code>{value}</code>
                        </span>
                        <span className={styles.srOnly}>Select token</span>
                      </button>
                      <button
                        type="button"
                        className={styles.spectrumCopy}
                        aria-label={`Copy ${token.path} value`}
                        onClick={() => copy(token)}
                      >
                        {copied === `Copied ${value}` ? (
                          <Check className={styles.iconPop} aria-hidden="true" />
                        ) : (
                          <Copy aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className={styles.spectrumStatus} role="status">
              {copied}
            </p>
          </m.section>
        )}
      </AnimatePresence>
    </div>
  );
}
