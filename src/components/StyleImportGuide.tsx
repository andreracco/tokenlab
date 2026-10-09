import { useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Check, ChevronDown, ChevronUp, FileCode2, ScanSearch } from "lucide-react";
import styles from "../App.module.css";

const preferenceKey = "tokenlab:css-import-guide-dismissed:v1";

function readDismissedPreference() {
  try {
    return window.localStorage.getItem(preferenceKey) === "true";
  } catch {
    return false;
  }
}

function writeDismissedPreference(dismissed: boolean) {
  try {
    if (dismissed) window.localStorage.setItem(preferenceKey, "true");
    else window.localStorage.removeItem(preferenceKey);
  } catch {
    // The guide remains usable when browser storage is unavailable.
  }
}

const steps = [
  {
    label: "Choose a stylesheet",
    detail: "Pick a CSS file up to 1 MB. It’s read locally and never executed.",
    Icon: FileCode2,
  },
  {
    label: "Review the matches",
    detail:
      "Check suggested token mappings, selected changes, unsupported values, and contrast warnings.",
    Icon: ScanSearch,
  },
  {
    label: "Apply as one change",
    detail: "Only selected, mapped values are applied—and you can undo the whole batch.",
    Icon: Check,
  },
];

export function StyleImportGuide() {
  const [dismissed, setDismissed] = useState(readDismissedPreference);
  const expanded = !dismissed;

  const toggleGuide = () => {
    const nextDismissed = expanded;
    setDismissed(nextDismissed);
    writeDismissedPreference(nextDismissed);
  };

  return (
    <section className={styles.styleImportGuide} aria-labelledby="style-import-guide-title">
      <header>
        <div>
          <span>Quick guide</span>
          <h3 id="style-import-guide-title">From stylesheet to tokens</h3>
        </div>
        <button
          type="button"
          className={styles.textButton}
          aria-expanded={expanded}
          aria-controls="style-import-guide-steps"
          onClick={toggleGuide}
        >
          {expanded ? "Hide guide" : "Show guide"}
          {expanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
        </button>
      </header>
      <AnimatePresence initial={false}>
        {expanded && (
          <m.ol
            id="style-import-guide-steps"
            className={styles.styleImportGuideSteps}
            aria-hidden={!expanded}
            inert={!expanded}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ height: { duration: 0.2 }, opacity: { duration: 0.15 } }}
          >
            {steps.map(({ label, detail, Icon }, index) => (
              <li key={label}>
                <span className={styles.styleImportGuideNumber} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Icon aria-hidden="true" />
                <span>
                  <strong>{label}</strong>
                  <small>{detail}</small>
                </span>
              </li>
            ))}
          </m.ol>
        )}
      </AnimatePresence>
    </section>
  );
}
