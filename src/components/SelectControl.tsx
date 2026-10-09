import type { ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import styles from "../App.module.css";

type SelectControlProps = ComponentProps<"select">;

export function SelectControl({ className, children, ...props }: SelectControlProps) {
  return (
    <span className={styles.selectControl} data-select-control>
      <select {...props} className={className}>
        {children}
      </select>
      <ChevronDown className={styles.selectChevron} aria-hidden="true" focusable="false" />
    </span>
  );
}
